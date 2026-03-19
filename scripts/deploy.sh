#!/usr/bin/env bash
set -euo pipefail

#──────────────────────────────────────────────────────────────────
# Coffeeshop one-click deploy script
#
# Usage:
#   ./scripts/deploy.sh                  # deploy everything (backend + frontend)
#   ./scripts/deploy.sh backend          # backend only (build, push, helm)
#   ./scripts/deploy.sh frontend         # frontend only (build + S3 + CloudFront)
#   ./scripts/deploy.sh infra            # CDK infrastructure only
#   ./scripts/deploy.sh --service ordering-service  # single service
#──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Config ───────────────────────────────────────────────────────
AWS_ACCOUNT="584518143473"
AWS_REGION="us-east-1"
ECR_REGISTRY="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_PREFIX="coffeeshop-staging"
EKS_CLUSTER="coffeeshop-staging-cluster"
NAMESPACE="staging"
HELM_RELEASE="coffeeshop"
HELM_CHART="${PROJECT_ROOT}/k8s/coffeeshop"
PLATFORM="linux/amd64"

SERVICES=(ordering-service preparation-service inventory-service reporting-service)
declare -A SERVICE_PORTS=(
  [ordering-service]=8081
  [preparation-service]=8082
  [inventory-service]=8083
  [reporting-service]=8084
)

# ── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()    { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✔${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $*"; }
err()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✘${NC} $*" >&2; }

# ── Prerequisites check ─────────────────────────────────────────
check_prereqs() {
  local missing=()
  for cmd in aws docker kubectl helm; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    exit 1
  fi

  # Verify AWS identity
  local identity
  identity=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null) || {
    err "AWS credentials not configured. Run 'aws sso login' first."
    exit 1
  }
  if [[ "$identity" != "$AWS_ACCOUNT" ]]; then
    err "Wrong AWS account: $identity (expected $AWS_ACCOUNT)"
    exit 1
  fi
  ok "AWS identity verified (account: $AWS_ACCOUNT)"
}

# ── ECR login ────────────────────────────────────────────────────
ecr_login() {
  log "Logging in to ECR..."
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY" 2>/dev/null
  ok "ECR login successful"
}

# ── Build JARs ───────────────────────────────────────────────────
build_jars() {
  log "Building all service JARs..."
  cd "$PROJECT_ROOT"
  ./gradlew bootJar -x test --parallel --quiet
  ok "All JARs built"
}

# ── Build & push a single Docker image ───────────────────────────
build_and_push_service() {
  local svc="$1"
  local port="${SERVICE_PORTS[$svc]}"
  local jar_path="${PROJECT_ROOT}/services/${svc}/build/libs"
  local image="${ECR_REGISTRY}/${ECR_PREFIX}/${svc}:latest"

  # Find the bootJar (exclude -plain.jar)
  local jar
  jar=$(find "$jar_path" -name "*.jar" ! -name "*-plain.jar" | head -1)
  if [[ -z "$jar" ]]; then
    err "No JAR found for $svc at $jar_path"
    return 1
  fi

  log "Building Docker image: $svc"

  # Create a temp Dockerfile for runtime-only image
  local tmpdir
  tmpdir=$(mktemp -d)
  trap "rm -rf $tmpdir" RETURN

  cp "$jar" "$tmpdir/app.jar"
  cat > "$tmpdir/Dockerfile" <<EOF
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY app.jar app.jar
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:${port}/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
EOF

  docker build --platform "$PLATFORM" -t "$image" "$tmpdir" --quiet
  ok "Built $svc"

  log "Pushing $svc to ECR..."
  docker push "$image" --quiet
  ok "Pushed $svc"
}

# ── Backend deploy ───────────────────────────────────────────────
deploy_backend() {
  local services_to_deploy=("${@}")
  if [[ ${#services_to_deploy[@]} -eq 0 ]]; then
    services_to_deploy=("${SERVICES[@]}")
  fi

  check_prereqs
  ecr_login
  build_jars

  for svc in "${services_to_deploy[@]}"; do
    build_and_push_service "$svc"
  done

  # Update kubeconfig
  log "Updating kubeconfig for $EKS_CLUSTER..."
  aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION" --quiet 2>/dev/null || true

  # Helm upgrade
  log "Deploying to EKS via Helm..."
  helm upgrade "$HELM_RELEASE" "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --wait \
    --timeout 5m
  ok "Helm upgrade complete"

  # Restart deployments to pick up new images (since we use :latest)
  for svc in "${services_to_deploy[@]}"; do
    kubectl rollout restart deployment/"$svc" -n "$NAMESPACE"
  done
  log "Waiting for rollout..."
  for svc in "${services_to_deploy[@]}"; do
    kubectl rollout status deployment/"$svc" -n "$NAMESPACE" --timeout=180s
  done
  ok "All services rolled out"

  # Show status
  echo ""
  kubectl get pods -n "$NAMESPACE"
  echo ""

  # Check ALB
  local alb_dns
  alb_dns=$(kubectl get ingress coffeeshop-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  if [[ -n "$alb_dns" ]]; then
    ok "ALB: http://$alb_dns"
  else
    warn "ALB not yet available — check 'kubectl get ingress -n $NAMESPACE'"
  fi
}

# ── Frontend deploy ──────────────────────────────────────────────
deploy_frontend() {
  check_prereqs

  log "Building frontend..."
  cd "$PROJECT_ROOT/frontend"
  npm ci --silent
  npm run build

  # Get S3 bucket name from CloudFormation
  local bucket
  bucket=$(aws cloudformation describe-stacks \
    --stack-name coffeeshop-staging-frontend \
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
    --output text 2>/dev/null)

  if [[ -z "$bucket" || "$bucket" == "None" ]]; then
    err "Cannot find frontend S3 bucket. Deploy infra first: ./scripts/deploy.sh infra"
    exit 1
  fi

  log "Syncing to S3: $bucket"
  aws s3 sync dist/ "s3://$bucket/" --delete --quiet
  ok "Frontend uploaded to S3"

  # Invalidate CloudFront cache
  local dist_id
  dist_id=$(aws cloudformation describe-stacks \
    --stack-name coffeeshop-staging-frontend \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
    --output text 2>/dev/null)

  if [[ -n "$dist_id" && "$dist_id" != "None" ]]; then
    log "Invalidating CloudFront cache ($dist_id)..."
    aws cloudfront create-invalidation \
      --distribution-id "$dist_id" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text
    ok "CloudFront invalidation started"
  fi

  # Check if ALB origin needs to be added
  local alb_dns
  alb_dns=$(kubectl get ingress coffeeshop-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  if [[ -n "$alb_dns" ]]; then
    log "ALB found: $alb_dns — updating CloudFront with API proxy..."
    cd "$PROJECT_ROOT/iac"
    npx cdk deploy coffeeshop-staging-frontend \
      -c environment=staging \
      -c "albDnsName=$alb_dns" \
      --require-approval never
    ok "CloudFront updated with ALB origin for /api/*"
  else
    warn "No ALB found — CloudFront /api/* proxy not configured"
  fi

  local cf_domain
  cf_domain=$(aws cloudformation describe-stacks \
    --stack-name coffeeshop-staging-frontend \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomain'].OutputValue" \
    --output text 2>/dev/null)
  ok "Frontend live at: https://$cf_domain"
}

# ── CDK infrastructure deploy ────────────────────────────────────
deploy_infra() {
  check_prereqs

  log "Deploying CDK infrastructure..."
  cd "$PROJECT_ROOT/iac"
  npx cdk deploy --all \
    -c environment=staging \
    --require-approval never \
    --concurrency 3
  ok "All CDK stacks deployed"
}

# ── Main ─────────────────────────────────────────────────────────
main() {
  local target="${1:-all}"
  shift || true

  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   ☕ Coffeeshop Deploy Script        ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
  echo ""

  local start_time=$SECONDS

  case "$target" in
    all)
      deploy_backend
      deploy_frontend
      ;;
    backend)
      deploy_backend
      ;;
    frontend)
      deploy_frontend
      ;;
    infra)
      deploy_infra
      ;;
    --service)
      local svc="${1:?Usage: deploy.sh --service <service-name>}"
      deploy_backend "$svc"
      ;;
    *)
      echo "Usage: $0 {all|backend|frontend|infra|--service <name>}"
      echo ""
      echo "  all       Deploy backend + frontend (default)"
      echo "  backend   Build JARs, Docker images, push to ECR, Helm upgrade"
      echo "  frontend  Build React app, sync to S3, invalidate CloudFront"
      echo "  infra     Deploy all CDK stacks"
      echo "  --service Deploy a single service (e.g., ordering-service)"
      exit 1
      ;;
  esac

  local elapsed=$(( SECONDS - start_time ))
  echo ""
  ok "Done in $(( elapsed / 60 ))m $(( elapsed % 60 ))s"
}

main "$@"
