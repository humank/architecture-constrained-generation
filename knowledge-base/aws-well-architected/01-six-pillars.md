# AWS Well-Architected Framework: Six Pillars

## Pillar 1: Operational Excellence

**Goal**: Build software correctly, deliver great customer experience, continuously improve.

### Design Principles (8)

1. Organize teams around business outcomes
2. Implement observability for actionable insights
3. Safely automate where possible
4. Make frequent, small, reversible changes
5. Refine operations procedures frequently
6. Anticipate failure
7. Learn from all operational events and metrics
8. Use managed services

### Best Practice Areas

- **Organization** — Leadership defines objectives; understand requirements
- **Prepare** — Workload emits operational info; implement CI/CD; create **runbooks** (routine) and **playbooks** (investigation)
- **Operate** — Monitor risks; derive metrics; respond to incidents; run **game days**
- **Evolve** — Use feedback loops for continuous improvement

### Key Services

CloudFormation/CDK/SAM, CloudWatch, X-Ray, Systems Manager, Config, CodePipeline/Deploy/Build,
EventBridge, Fault Injection Service

---

## Pillar 2: Security

**Goal**: Protect data, systems, and assets.

### Design Principles (7)

1. Implement strong identity foundation (least privilege)
2. Maintain traceability
3. Apply security at all layers (defense in depth)
4. Automate security best practices
5. Protect data in transit and at rest
6. Keep people away from data
7. Prepare for security events

### Best Practice Areas

Security Foundations, IAM, Detection, Infrastructure Protection, Data Protection,
Incident Response, Application Security

### Key Services

IAM/Identity Center, GuardDuty, Security Hub, Shield/WAF, KMS, CloudTrail, Macie,
Inspector, Secrets Manager, Detective

---

## Pillar 3: Reliability

**Goal**: Workload performs correctly and consistently.

### Design Principles (5)

1. Automatically recover from failure
2. Test recovery procedures
3. Scale horizontally to increase availability
4. Stop guessing capacity
5. Manage change through automation

### Best Practice Areas

- **Foundations** — Service quotas, network topology, bandwidth
- **Workload Architecture** — Distributed design, fault tolerance
- **Change Management** — Monitor behavior, automated change processes
- **Failure Management** — Detection, healing, backup, DR

### Key Concepts

- **RTO** (Recovery Time Objective) — Max acceptable downtime
- **RPO** (Recovery Point Objective) — Max acceptable data loss window
- **Fault Isolation** — Limit failure impact to defined boundary
- **Bulkhead/Cell-Based Architecture** — Isolated cells each handle subset of requests

### Key Services

CloudWatch, Auto Scaling, Route 53, ELB, Backup, CloudFormation, S3/Glacier,
Trusted Advisor, Fault Injection Service, RDS Multi-AZ, DynamoDB Global Tables

---

## Pillar 4: Performance Efficiency

**Goal**: Use cloud resources efficiently to meet performance requirements.

### Design Principles (5)

1. Democratize advanced technologies (consume as service)
2. Go global in minutes
3. Use serverless architectures
4. Experiment more often
5. Consider mechanical sympathy

### Best Practice Areas

Selection (compute, storage, database, network), Review, Monitoring, Trade-offs

### Key Services

Lambda, CloudFront, ElastiCache/DAX, Auto Scaling, EBS/S3, RDS/Aurora/DynamoDB,
Global Accelerator, Compute Optimizer

---

## Pillar 5: Cost Optimization

**Goal**: Deliver business value at lowest price point.

### Design Principles (5)

1. Implement Cloud Financial Management
2. Adopt consumption model (pay for what you use)
3. Measure overall efficiency
4. Stop spending on undifferentiated heavy lifting
5. Analyze and attribute expenditure

### Best Practice Areas

Cloud Financial Management, Expenditure/Usage Awareness, Cost-Effective Resources,
Manage Demand/Supply, Optimize Over Time

### Key Services

Cost Explorer, Budgets, Trusted Advisor, S3 Intelligent-Tiering, Savings Plans/RI,
Compute Optimizer, Cost and Usage Report, Spot Instances

---

## Pillar 6: Sustainability

**Goal**: Minimize environmental impact, especially energy consumption.

### Design Principles (6)

1. Understand your impact
2. Establish sustainability goals
3. Maximize utilization
4. Anticipate and adopt efficient offerings
5. Use managed services
6. Reduce downstream impact

### Best Practice Areas

Region Selection, Alignment to Demand, Software & Architecture, Data Management,
Hardware & Services, Process & Culture

### Key Services

EC2 Auto Scaling, Graviton (energy-efficient ARM), S3 Lifecycle, Instance Scheduler,
Compute Optimizer, Customer Carbon Footprint Tool
