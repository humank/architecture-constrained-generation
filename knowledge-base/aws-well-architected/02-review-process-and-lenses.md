# AWS Well-Architected: Review Process and Lenses

## Review Process

### Principles

- Blame-free, lightweight (hours, not days)
- A **conversation, not an audit**
- Identify critical issues and improvement areas

### Five Steps

1. **Preparation** (~3 weeks before) — Assemble team, decide workload/pillars, collect data
2. **Review Meeting** — Answer questions using AWS WA Tool, record answers
3. **Read-Out** — Present findings: HRI (High Risk Issues), MRI (Medium Risk Issues)
4. **Quick Wins** — Address easy-to-fix issues immediately
5. **Follow-Up** — Prioritize remaining; create improvement plan; track progress

### When to Conduct

- Early in design phase
- Before go-live
- Post-production, every ~6 months
- After significant architecture changes
- Nearly continuous: update as architecture evolves

### AWS Well-Architected Tool

- Free in AWS Console
- Define workloads, apply lenses
- Answer questions per pillar
- Auto-classifies risks (HRI/MRI)
- Generates improvement plans
- Tracks improvements over time
- Supports milestones for snapshot comparison

### Custom Lenses

- Incorporate organizational best practices (governance, legal, compliance)
- Include: pillars, questions, best practices, resources, improvement plans
- Specify HRI/MRI rules
- Created via JSON template
- Up to 15 custom lenses per account
- Shareable across AWS accounts

---

## Official Lenses (16+)

### Technology-Focused

| Lens | Focus |
|---|---|
| **Serverless Applications** | RESTful microservices, mobile backends, event-driven |
| **Container Build** | Image building, scanning, registry management |
| **Data Analytics** | Data lake, serverless pipelines, performance tuning |
| **Machine Learning** | Model training, deployment, monitoring, security |
| **Generative AI** | LLM architectures, SageMaker HyperPod, Agentic AI |
| **Responsible AI** | Safe, fair, secure AI; governance, bias mitigation |
| **IoT** | Device management, data processing, edge computing |
| **HPC** | Batch processing, scientific computing |
| **DevOps** | High-velocity, security-focused culture |

### Industry-Specific

| Lens | Focus |
|---|---|
| **Financial Services** | Regulatory compliance, secure transactions |
| **Healthcare** | HIPAA compliance, healthcare workloads |
| **Government** | Public sector compliance and scalability |
| **SaaS** | Multi-tenancy, operational efficiency |
| **SAP** | SAP workloads on AWS |
| **Games Industry** | Gaming platform best practices |

### Operations & Hybrid

| Lens | Focus |
|---|---|
| **Migration** | Migrating workloads to AWS |
| **Connected Mobility** | IoT + ML for automotive/transportation |
| **Data Residency / Hybrid Cloud** | Data sovereignty, classification |
| **Mergers and Acquisitions** | Workload integration during M&A |
| **Streaming Media** | Cloud-based streaming workloads |

---

## Mapping to Rozanski & Woods

| AWS WAF Pillar | R&W Perspective(s) | R&W Viewpoint(s) |
|---|---|---|
| **Operational Excellence** | Evolution, Development Resource | Operational, Development |
| **Security** | Security, Regulation | Functional, Information |
| **Reliability** | Availability & Resilience | Deployment, Concurrency |
| **Performance Efficiency** | Performance & Scalability, Location | Deployment, Concurrency |
| **Cost Optimization** | Development Resource | Deployment |
| **Sustainability** | (No direct equivalent) | Deployment |

### Key Differences

- R&W is **general software architecture**; AWS WAF is **cloud-infrastructure-specific**
- R&W viewpoints not in WAF: Context, Information, Concurrency, Development (as structure)
- R&W perspectives not in WAF: Accessibility, Internationalization, Usability
- WAF Cost Optimization and Sustainability have no R&W equivalents
- R&W separates structure (viewpoints) from quality (perspectives); WAF blends into "pillars"
- **Complementary use**: R&W for application architecture review, WAF for infrastructure review
