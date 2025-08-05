#!/bin/bash

# AWS Deployment Script for Algoqube Backend
# This script deploys the backend to AWS ECS/Fargate

set -e

# Configuration
ECR_REPOSITORY_NAME="algoqube-backend"
ECS_CLUSTER_NAME="algoqube-cluster"
ECS_SERVICE_NAME="algoqube-backend-service"
ECS_TASK_DEFINITION_NAME="algoqube-backend-task"
AWS_REGION="us-east-1"

echo "🚀 Starting AWS deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and push Docker image to ECR
echo "📦 Building and pushing Docker image..."

# Get ECR login token
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION 2>/dev/null || \
aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION

# Get ECR repository URI
ECR_REPOSITORY_URI=$(aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)

# Build Docker image
docker build -t $ECR_REPOSITORY_NAME .

# Tag image
docker tag $ECR_REPOSITORY_NAME:latest $ECR_REPOSITORY_URI:latest

# Push image to ECR
docker push $ECR_REPOSITORY_URI:latest

echo "✅ Docker image pushed successfully"

# Create ECS cluster if it doesn't exist
echo "🏗️ Setting up ECS cluster..."
aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME --region $AWS_REGION 2>/dev/null || echo "Cluster already exists"

# Create task definition
echo "📋 Creating ECS task definition..."
cat > task-definition.json << EOF
{
  "family": "$ECS_TASK_DEFINITION_NAME",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "algoqube-backend",
      "image": "$ECR_REPOSITORY_URI:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "4000"}
      ],
      "secrets": [
        {"name": "MONGO_URI", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/mongo-uri"},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/jwt-secret"},
        {"name": "AWS_REGION", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/aws-region"},
        {"name": "AWS_ACCESS_KEY_ID", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/aws-access-key-id"},
        {"name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/aws-secret-access-key"},
        {"name": "S3_BUCKET_NAME", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/s3-bucket-name"},
        {"name": "APIFY_API_TOKEN", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/apify-api-token"},
        {"name": "FRONTEND_URL", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/frontend-url"},
        {"name": "BACKEND_URL", "valueFrom": "arn:aws:ssm:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):parameter/algoqube/backend-url"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$ECS_TASK_DEFINITION_NAME",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })\""],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION

echo "✅ Task definition created successfully"

# Create CloudWatch log group
aws logs create-log-group --log-group-name "/ecs/$ECS_TASK_DEFINITION_NAME" --region $AWS_REGION 2>/dev/null || echo "Log group already exists"

echo "🎉 Deployment completed successfully!"
echo "📝 Next steps:"
echo "1. Create an Application Load Balancer"
echo "2. Create an ECS service with the task definition"
echo "3. Set up environment variables in AWS Systems Manager Parameter Store"
echo "4. Configure your domain with the ALB endpoint"

# Clean up
rm -f task-definition.json 