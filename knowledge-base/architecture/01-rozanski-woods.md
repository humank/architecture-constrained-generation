# Rozanski & Woods: Software Systems Architecture

## Overview

A practitioner-oriented guide to designing and implementing effective architectures using
**Viewpoints** (structural perspectives on the system) and **Perspectives** (cross-cutting
quality attributes).

---

## The Six Core Viewpoints

### 1. Functional Viewpoint

Describes the functional structure and how it meets stakeholder requirements.

- System functions and responsibility assignment
- Interfaces: how functions are offered to users and other systems
- External system interactions
- Functional element relationships and dependencies

**Stakeholders**: Product managers, business analysts, end-users

### 2. Information Viewpoint

Examines how the system stores, manages, and manipulates data.

- Information structure (logical data models, entity relationships)
- Information flow: data movement through system
- Data ownership and responsibility
- Information quality attributes (accuracy, timeliness, consistency)
- Data lifecycle and retention policies

**Stakeholders**: Data architects, business analysts, compliance officers

### 3. Concurrency Viewpoint

Addresses how the system achieves concurrency and handles distributed processing.

- Concurrency units (processes, threads, co-routines)
- Inter-process communication mechanisms and protocols
- Synchronization and mutual exclusion strategies
- State management across concurrent elements
- Deadlock prevention and recovery
- Timing and ordering constraints

**Stakeholders**: System designers, performance engineers

### 4. Development Viewpoint

Supports the system's construction and maintenance.

- Module organization (layering, package structure)
- Common design patterns and standards
- Codeline organization (version control, branching strategies)
- Build system architecture
- Development environments and tools
- Code reusability and standards

**Stakeholders**: Developers, build engineers, team leads

### 5. Deployment Viewpoint

Describes the physical runtime environment and deployment topology.

- Runtime platform requirements (hardware, OS, middleware)
- Network topology and connectivity
- Technology stack and dependencies
- Hardware resource allocation
- Environment configuration and parameterization
- Scalability and capacity planning

**Stakeholders**: Operations engineers, DevOps teams, infrastructure architects

### 6. Operational Viewpoint

Addresses how the system is installed, managed, and supported in production.

- Installation and initialization procedures
- System migration and upgrade strategies
- Configuration and parameterization
- Monitoring, logging, and diagnostics
- System support and maintenance procedures
- Backup and disaster recovery
- Performance tuning and optimization

**Stakeholders**: Operations staff, support engineers, system administrators

---

## Ten Architectural Perspectives

Perspectives are cross-cutting quality concerns that apply across multiple viewpoints.

### 1. Security

- Threat identification and analysis
- Security policies and mechanisms
- Access control, authentication, authorization
- Encryption and data protection
- Audit trails and compliance
- Vulnerability management

### 2. Performance and Scalability

- Response time requirements
- Throughput and transaction rate expectations
- Scalability dimensions (vertical, horizontal, data)
- Performance monitoring and measurement
- Load balancing and caching strategies
- Resource utilization optimization

### 3. Availability and Resilience

- Fault tolerance mechanisms
- Redundancy and failover strategies
- Recovery procedures and RTO/RPO targets
- Health checking and monitoring
- Graceful degradation approaches
- Disaster recovery planning

### 4. Evolution

- Dimensions of change (functional, non-functional, platform)
- Change impact analysis
- Extensibility and modifiability strategies
- Technical debt management
- Migration pathways
- Backward compatibility requirements

### 5. Accessibility

- WCAG compliance requirements
- Alternative input/output mechanisms
- Assistive technology compatibility
- Accessibility testing strategies

### 6. Development Resource

- Team size and composition
- Skill requirements
- Training and knowledge transfer
- Staffing and allocation strategies

### 7. Internationalization

- Language and locale support
- Cultural adaptation
- Character encoding and Unicode
- Regional regulatory compliance

### 8. Location

- Data sovereignty and residency
- Geographic distribution
- Latency constraints
- Network topology implications

### 9. Regulation

- GDPR, HIPAA, PCI-DSS, SOX compliance
- Audit requirements
- Retention policies
- Reporting and transparency

### 10. Usability

- User interface design principles
- Workflow optimization
- User testing integration
- Documentation requirements

---

## Stakeholder Analysis

- **Purpose**: Identify all parties with interest in the system and their concerns
- **Activities**: Identification, categorization, concern elicitation, prioritization
- **Outcome**: Stakeholder register with documented concerns, needs, and success criteria

## Architectural Concerns

Specific interests, problems, or requirements that stakeholders have. Concerns drive
architectural decisions and viewpoint selection.

## Scenario-Based Evaluation

A crisp, concise description of a situation the system will face, with expected response.

### Process

1. Identify candidate architectures
2. Generate representative scenarios
3. Test each architecture against scenarios
4. Evaluate architectural fit
5. Document trade-offs
