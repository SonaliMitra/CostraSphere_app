# CostraSphere AI - Startup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies (from project root)
cd ..
npm install
```

### 2. Setup Database

The SQLite database will be auto-created on first backend run.

```bash
cd backend
python main.py
```

This creates `database/costrasphere.db` automatically.

### 3. Create Test Data (Optional)

You can seed the database with test data by running:

```python
from database import SessionLocal, engine, Base
from models import User, Project
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Create test user
test_user = User(
    full_name="Test User",
    email="test@costrasphere.ai",
    password=hash_password("Test@123"),
    role="customer"
)
db.add(test_user)
db.commit()
```

### 4. Start Services

#### Terminal 1 - Backend (Port 8000)
```bash
cd backend
python main.py
```

#### Terminal 2 - Frontend (Port 5173)
```bash
npm run dev
```

### 5. Access the Application

- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs
- **Backend:** http://localhost:8000

## Default Test Accounts

### Customer Account
- Email: customer@costrasphere.ai
- Password: Customer@123

### Admin Account
- Email: admin@costrasphere.ai
- Password: Admin@123

### Developer Account
- Email: developer@costrasphere.ai
- Password: CostraSphere@Dev2026

## Key Features to Test

### 1. Authentication
- Register new account
- Login/Logout
- OTP-based password reset (requires Gmail setup)

### 2. Project Creation
- Create a new project
- Fill in project details
- View AI cost estimation
- Confirm project creation

### 3. Dashboard
- View all projects
- Check analytics
- Monitor costs

### 4. AI Chatbot
- Ask questions about telecom infrastructure
- Get instant responses

### 5. Project Details
- View complete project information
- Check cost breakdown
- Export PDF report

## Environment Setup

### Backend .env file
```
DATABASE_URL=sqlite:///./database/costrasphere.db
EMAIL_USER=costrasphere@gmail.com
EMAIL_PASSWORD=uvjdbjoejboldtgr
SECRET_KEY=your-secret-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Gmail Setup for OTP
1. Use the provided Gmail credentials
2. OTP emails are sent automatically
3. OTP valid for 10 minutes
4. Check spam folder if not received

## Building for Production

### Frontend Build
```bash
npm run build
```
Creates optimized build in `dist/` folder.

### Backend Production
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000 (Linux/Mac)
lsof -ti:8000 | xargs kill -9

# Or use different port in FastAPI
python main.py --port 8001
```

### Database Connection Error
```bash
# Remove old database
rm database/costrasphere.db

# Backend will auto-create it
python main.py
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt --upgrade
npm install --force
```

### Frontend Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install
npm run build
```

## API Testing with cURL

### Register
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "Pass@123",
    "role": "customer"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Pass@123"
  }'
```

### Create Project
```bash
curl -X POST http://localhost:8000/create-project \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "5G Network",
    "country": "INDIA",
    "city": "Bangalore",
    "tower_count": 10,
    "fiber_length_km": 50,
    "terrain": "urban",
    "labor_type": "skilled"
  }' \
  -G --data-urlencode "token=YOUR_TOKEN"
```

## Development Tips

### Enable Debug Mode
```python
# In backend/main.py
app = FastAPI(debug=True)
```

### Check Database
```bash
# Open SQLite
sqlite3 database/costrasphere.db

# List tables
.tables

# View data
SELECT * FROM users;
SELECT * FROM projects;
```

### Frontend Hot Reload
Frontend automatically reloads on file changes in development mode.

### API Documentation
Access Swagger UI at: http://localhost:8000/docs
Access ReDoc at: http://localhost:8000/redoc

## Performance Monitoring

### Backend
```bash
# Monitor API calls
tail -f backend.log

# Check response times
curl -w "Time: %{time_total}s\n" http://localhost:8000/
```

### Frontend
- Use React DevTools browser extension
- Check Network tab in DevTools
- Monitor console for errors

## Deployment Checklist

- [ ] Update SECRET_KEY in production
- [ ] Change database connection string
- [ ] Configure CORS for production domain
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure email service for OTP
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Test all features
- [ ] Performance optimization

## Support & Issues

Check backend console for:
- Database errors
- Authentication issues
- API response problems

Check browser console for:
- Frontend errors
- Network issues
- State management issues

## Next Steps

1. **Customize Pricing** - Edit `data/global_city_costs.csv` to add more locations
2. **Add More Features** - Extend models and API endpoints
3. **Integrate Maps** - Add Leaflet maps for visualization
4. **Setup CI/CD** - Configure GitHub Actions or similar
5. **Add Tests** - Write unit and integration tests
6. **Scale Database** - Migrate to PostgreSQL for production

---

**Happy coding with CostraSphere AI!**
