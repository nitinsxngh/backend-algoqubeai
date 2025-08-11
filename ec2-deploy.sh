#!/bin/bash

# AWS EC2 Deployment Script for Algoqube Backend with PM2
# This script deploys the backend to AWS EC2 using PM2

set -e

# Configuration
EC2_INSTANCE_ID="your-ec2-instance-id"
EC2_REGION="us-east-1"
EC2_USER="ubuntu"  # or "ec2-user" for Amazon Linux
APP_NAME="algoqube-backend"
DEPLOY_PATH="/home/$EC2_USER/algoqube-backend"

echo "🚀 Starting EC2 deployment with PM2..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SSH key is configured
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ SSH key not found. Please ensure you have an SSH key configured."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd server

# Clean previous build
rm -rf dist
rm -f deploy.tar.gz

# Build the application
npm run build

# Create deployment archive
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='dist' \
    .

echo "✅ Deployment package created"

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i ~/.ssh/id_rsa deploy.tar.gz $EC2_USER@$(aws ec2 describe-instances --instance-ids $EC2_INSTANCE_ID --region $EC2_REGION --query 'Reservations[0].Instances[0].PublicIpAddress' --output text):$DEPLOY_PATH/

# Deploy on EC2
echo "🔧 Deploying on EC2..."
ssh -i ~/.ssh/id_rsa $EC2_USER@$(aws ec2 describe-instances --instance-ids $EC2_INSTANCE_ID --region $EC2_REGION --query 'Reservations[0].Instances[0].PublicIpAddress' --output text) << 'EOF'
    cd /home/ubuntu/algoqube-backend
    
    # Stop the current PM2 process
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Extract new deployment
    tar -xzf deploy.tar.gz
    
    # Install dependencies
    npm ci --only=production
    
    # Create ecosystem file for PM2
    cat > ecosystem.config.js << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'algoqube-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
ECOSYSTEM
    
    # Create logs directory
    mkdir -p logs
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup 2>/dev/null || true
    
    # Clean up
    rm -f deploy.tar.gz
    
    echo "✅ Deployment completed successfully!"
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
    echo "📝 Logs:"
    pm2 logs --lines 10
EOF

# Clean up local files
rm -f deploy.tar.gz

echo "🎉 EC2 deployment completed successfully!"
echo "📝 Next steps:"
echo "1. Configure your domain to point to the EC2 instance"
echo "2. Set up SSL certificate (Let's Encrypt recommended)"
echo "3. Configure environment variables on the EC2 instance"
echo "4. Set up monitoring and logging" 