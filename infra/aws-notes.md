# CloudGuardian AI - AWS Production Deployment Notes

This document outlines the target cloud architecture and operational blueprint for transitioning CloudGuardian AI from local/container simulation to an enterprise AWS cloud production environment.

---

## 1. Container Workloads: AWS ECS / EKS / EC2

### Option A: AWS ECS (Elastic Container Service) on AWS Fargate (Recommended)
- **Architecture**: Serverless container orchestration eliminating EC2 host maintenance.
- **Service Breakdown**:
  - `backend-service`: Node.js Express service configured behind an Application Load Balancer (ALB). Tasks run with auto-scaling based on CPU/Request count.
  - `ml-service`: Python FastAPI service deployed with memory/CPU reservations suited for Scikit-Learn/PyTorch inference.
  - `recovery-service`: Event-driven task handling auto-remediation calls.
  - `agent-service`: Daemon service running ECS tasks or sidecar containers alongside monitored workloads.
  - `frontend`: Static Vite/React distribution hosted on Amazon S3 + CloudFront CDN, or containerized behind ALB.
- **Task Definitions & Secrets**: Injected via AWS Systems Manager Parameter Store or AWS Secrets Manager (e.g. database credentials, API keys).

### Option B: Amazon EKS (Elastic Kubernetes Service)
- Direct mapping of `infra/k8s/` manifests using standard Helm charts or Kustomize.
- Ingress controller via AWS Load Balancer Controller managing ALBs and NLBs.

---

## 2. Managed Database: MongoDB Atlas on AWS

- **Deployment**: Fully managed multi-region MongoDB Atlas cluster hosted inside AWS VPC.
- **Connectivity**: AWS VPC Peering or AWS PrivateLink to ensure no public internet exposure between ECS tasks and MongoDB.
- **Collections & Indexing**:
  - `Metric`: Time-series collection with TTL indexes for metric data lifecycle management.
  - `Server`, `Alert`, `RecoveryAction`: Standard document collections with replica sets providing 99.995% SLA.
- **Security**: Encryption at rest (KMS), IAM-based database authentication, and automated continuous backups.

---

## 3. Real-World Telemetry: Amazon CloudWatch & EventBridge

In enterprise environments, the synthetic Simulator can be augmented or replaced by native AWS monitoring:
- **CloudWatch Metrics**: Collect real EC2, ECS, RDS, and API Gateway metrics (CPUUtilization, MemoryUtilization, DiskSpaceUtilization, NetworkIn/Out, 5XXErrorRate).
- **CloudWatch Metric Streams**: Stream sub-minute telemetry directly via Amazon Kinesis Firehose / EventBridge to the CloudGuardian Agent or Backend ingestion webhook.
- **CloudWatch Alarms & EventBridge**: Route immediate threshold breaches and anomaly alarms directly into the CloudGuardian recovery pipeline.

---

## 4. Model Storage & Versioning: Amazon S3 & SageMaker

- **Artifact Repository**: S3 Bucket (`s3://cloudguardian-model-registry/`) storing trained machine learning models (`.joblib`, `.pkl`, ONNX artifacts).
- **Lifecycle & Versioning**: S3 Bucket Versioning enabled to support model rollback and auditability.
- **Training Pipeline**: Batch model retraining triggered periodically via AWS Lambda or SageMaker Training Jobs, outputting versioned model weights to S3.
- **Inference Loading**: At startup, `ml-service` pulls the active model version from S3 using IAM Task Roles with read-only bucket policies.
