import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';

interface FrontendStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  /** ALB DNS name from EKS Ingress. If provided, CloudFront proxies /api/* to ALB. */
  albDnsName?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config, albDnsName } = props;
    const prefix = `coffeeshop-${config.environment}`;

    // S3 Bucket for static frontend assets
    // Let CDK auto-generate the bucket name to avoid cross-account/region collisions
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'production',
    });

    // WAF Web ACL (production only, from assessment-2 Q5d)
    let webAclArn: string | undefined;
    if (config.waf.enabled) {
      const webAcl = new wafv2.CfnWebACL(this, 'FrontendWaf', {
        name: `${prefix}-frontend-waf`,
        scope: 'CLOUDFRONT',
        defaultAction: { allow: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `${prefix}-frontend-waf`,
          sampledRequestsEnabled: true,
        },
        rules: [
          {
            name: 'AWSManagedRulesCommonRuleSet',
            priority: 1,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesCommonRuleSet',
              },
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'CommonRules',
              sampledRequestsEnabled: true,
            },
          },
          {
            name: 'RateLimit',
            priority: 2,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                limit: 2000,
                aggregateKeyType: 'IP',
              },
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'RateLimit',
              sampledRequestsEnabled: true,
            },
          },
        ],
      });
      webAclArn = webAcl.attrArn;
    }

    // CloudFront Distribution with OAC
    // Dual-origin: S3 for static assets (default), ALB for /api/* (if available)
    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};
    if (albDnsName) {
      additionalBehaviors['/api/*'] = {
        origin: new origins.HttpOrigin(albDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      };
    }

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: `${prefix} Frontend SPA`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors,
      defaultRootObject: 'index.html',
      // SPA routing — return index.html for 404s (only affects default S3 behavior, not /api/*)
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: config.cloudfront.priceClass === 'PRICE_CLASS_200'
        ? cloudfront.PriceClass.PRICE_CLASS_200
        : cloudfront.PriceClass.PRICE_CLASS_100,
      webAclId: webAclArn,
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', { value: this.bucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: this.distribution.distributionId });
    new cdk.CfnOutput(this, 'DistributionDomain', { value: this.distribution.distributionDomainName });
  }
}
