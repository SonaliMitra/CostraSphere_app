# CostraSphere AI - Deployment Guide

## Production Deployment

### Prerequisites
- Ubuntu 20.04 LTS or similar Linux distribution
- Python 3.8+
- Node.js 16+
- Docker and Docker Compose (optional)
- Nginx (for reverse proxy)
- SSL certificate

## Deployment Options

### Option 1: Manual Deployment (Linux Server)

#### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx git

# Create application directory
sudo mkdir -p /var/www/costrasphere
sudo chown $USER:$USER /var/www/costrasphere
cd /var/www/costrasphere

# Clone repository
git clone <repo-url> .
```

#### Step 2: Backend Setup
```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Initialize database
python init_db.py
```

#### Step 3: Frontend Setup
```bash
cd ../
npm install
npm run build
```

#### Step 4: Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/costrasphere
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/costrasphere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL Certificate (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Step 6: Systemd Services

**Backend Service (/etc/systemd/system/costrasphere-backend.service):**
```ini
[Unit]
Description=CostraSphere AI Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/costrasphere/backend
Environment="PATH=/var/www/costrasphere/venv/bin"
ExecStart=/var/www/costrasphere/venv/bin/gunicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable costrasphere-backend
sudo systemctl start costrasphere-backend
```

### Option 2: Docker Deployment

#### Step 1: Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Step 2: Deploy with Docker Compose
```bash
cd /var/www/costrasphere
docker-compose up -d
```

#### Step 3: Verify Services
```bash
docker-compose ps
docker-compose logs -f
```

### Option 3: Cloud Deployment

#### AWS Deployment
```bash
# Create EC2 instance (t3.medium or larger)
# Security group: Allow 80, 443, 22

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Run deployment commands as above
```

#### Google Cloud Deployment
```bash
# Create Compute Engine instance
gcloud compute instances create costrasphere-instance

# Deploy as above
```

#### Heroku Deployment
```bash
# Add Procfile
echo "web: gunicorn backend.main:app" > Procfile

# Deploy
git push heroku main
```

## Database Configuration for Production

### PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres createdb costrasphere_db
sudo -u postgres createuser costrasphere_user

# Set password
sudo -u postgres psql
ALTER USER costrasphere_user WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE costrasphere_db TO costrasphere_user;

# Update backend .env
DATABASE_URL=postgresql://costrasphere_user:strong-password@localhost:5432/costrasphere_db
```

## Environment Configuration

### Production .env
```
DATABASE_URL=postgresql://user:password@host:5432/costrasphere_db
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
SECRET_KEY=generate-strong-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=false
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check backend
curl http://your-domain.com/api/

# Check frontend
curl http://your-domain.com/

# Check database
psql -U costrasphere_user -d costrasphere_db -c "SELECT 1;"
```

### Log Management
```bash
# Backend logs
sudo tail -f /var/log/costrasphere/backend.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f backend
```

### Backup Strategy
```bash
# Database backup
pg_dump costrasphere_db > backup-$(date +%Y%m%d).sql

# Upload to cloud storage
aws s3 cp backup-*.sql s3://your-bucket/backups/
```

### Performance Tuning

**Nginx:**
```nginx
# Increase worker connections
events {
    worker_connections 2048;
}

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json;
gzip_comp_level 6;
```

**FastAPI:**
```bash
# Use more workers
gunicorn main:app --workers 8 --worker-class uvicorn.workers.UvicornWorker
```

## SSL/TLS Configuration

### Auto-renewal
```bash
# Certbot renewal
sudo certbot renew --dry-run

# Add cron job
0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Scaling

### Horizontal Scaling
```bash
# Use load balancer (nginx upstream)
upstream backend {
    server server1:8000;
    server server2:8000;
    server server3:8000;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

### Database Scaling
- Set up PostgreSQL replication
- Implement read replicas
- Use connection pooling (PgBouncer)

## CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run tests
        run: |
          npm test
          python -m pytest backend/
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: |
          # Deploy commands
```

## Security Checklist

- [ ] Generate strong SECRET_KEY
- [ ] Disable debug mode
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS
- [ ] Use environment variables for secrets
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database backups enabled
- [ ] Rate limiting configured
- [ ] DDOS protection enabled
- [ ] WAF (Web Application Firewall) configured
- [ ] Regular security audits

## Rollback Procedure

```bash
# If deployment fails, revert
git revert HEAD
npm run build
docker-compose restart

# Or rollback database
pg_restore backup-previous.sql -d costrasphere_db
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
journalctl -u costrasphere-backend -n 100

# Test connections
psql -U costrasphere_user -d costrasphere_db -c "SELECT 1;"
```

### High Memory Usage
```bash
# Check processes
top
ps aux | grep python

# Restart service
sudo systemctl restart costrasphere-backend
```

### Database Connection Issues
```bash
# Check database status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connections
psql -l
```

## Monitoring Tools

### Recommended
- Prometheus (metrics)
- Grafana (visualization)
- ELK Stack (logs)
- Sentry (error tracking)
- New Relic (APM)

### Installation Example (Prometheus)
```yaml
# docker-compose.yml addition
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
```

## Performance Benchmarks

- Target response time: < 200ms
- Target uptime: > 99.9%
- Concurrent users: 10,000+
- Requests per second: 1,000+

## Support

For deployment issues:
- Check logs
- Verify environment variables
- Test API connectivity
- Review security groups/firewall

---

**CostraSphere AI - Production Ready**
