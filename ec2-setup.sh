#!/bin/bash

# EC2 Instance Setup Script for Algoqube Backend
# Run this script on a fresh EC2 instance to set up the environment

set -e

echo "🚀 Setting up EC2 instance for Algoqube Backend..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install nginx
echo "📦 Installing nginx..."
sudo apt-get install -y nginx

# Install certbot for SSL
echo "📦 Installing certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# Install git
echo "📦 Installing git..."
sudo apt-get install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /home/ubuntu/algoqube-backend
sudo chown ubuntu:ubuntu /home/ubuntu/algoqube-backend

# Configure nginx
echo "🔧 Configuring nginx..."
sudo tee /etc/nginx/sites-available/algoqube-backend << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (if any)
    location /static/ {
        alias /home/ubuntu/algoqube-backend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/algoqube-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create environment file
echo "📝 Creating environment file..."
sudo tee /home/ubuntu/algoqube-backend/.env << 'EOF'
# Backend Environment Variables
NODE_ENV=production
PORT=4000

# MongoDB Configuration
MONGO_URI=mongodb://your-mongodb-uri

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-s3-bucket-name

# External APIs
APIFY_API_TOKEN=your-apify-api-token

# Frontend and Backend URLs
FRONTEND_URL=https://your-frontend-domain.vercel.app
BACKEND_URL=https://your-domain.com
EOF

# Set proper permissions
sudo chown ubuntu:ubuntu /home/ubuntu/algoqube-backend/.env
sudo chmod 600 /home/ubuntu/algoqube-backend/.env

# Create logs directory
sudo mkdir -p /home/ubuntu/algoqube-backend/logs
sudo chown ubuntu:ubuntu /home/ubuntu/algoqube-backend/logs

# Setup PM2 startup
echo "🔧 Setting up PM2 startup..."
pm2 startup ubuntu

# Create deployment script
echo "📝 Creating deployment script..."
sudo tee /home/ubuntu/deploy.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/algoqube-backend

# Stop current process
pm2 stop algoqube-backend 2>/dev/null || true
pm2 delete algoqube-backend 2>/dev/null || true

# Extract new deployment
tar -xzf deploy.tar.gz

# Install dependencies
npm ci --only=production

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Clean up
rm -f deploy.tar.gz

echo "✅ Deployment completed!"
pm2 status
EOF

sudo chmod +x /home/ubuntu/deploy.sh
sudo chown ubuntu:ubuntu /home/ubuntu/deploy.sh

# Create monitoring script
echo "📝 Creating monitoring script..."
sudo tee /home/ubuntu/monitor.sh << 'EOF'
#!/bin/bash
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== System Resources ==="
free -h
df -h

echo ""
echo "=== Recent Logs ==="
pm2 logs --lines 20

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l
EOF

sudo chmod +x /home/ubuntu/monitor.sh
sudo chown ubuntu:ubuntu /home/ubuntu/monitor.sh

echo "✅ EC2 instance setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update the environment variables in /home/ubuntu/algoqube-backend/.env"
echo "2. Update nginx configuration with your domain"
echo "3. Deploy your application using the deployment script"
echo "4. Set up SSL certificate: sudo certbot --nginx -d your-domain.com"
echo ""
echo "🔧 Useful commands:"
echo "- Monitor: ./monitor.sh"
echo "- Deploy: ./deploy.sh"
echo "- PM2 logs: pm2 logs"
echo "- PM2 status: pm2 status"
echo "- Restart app: pm2 restart algoqube-backend" 