# CostraSphere AI - Getting Started Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies (First time only)

**Windows:**
```bash
pip install -r requirements.txt
npm install
```

**Mac/Linux:**
```bash
pip3 install -r requirements.txt
npm install
```

### Step 2: Start Backend Server

**Windows:**
```bash
cd backend
python main.py
```

**Mac/Linux:**
```bash
cd backend
python3 main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Start Frontend Server (New Terminal/Tab)

**Windows/Mac/Linux:**
```bash
npm run dev
```

You should see:
```
VITE v5.4.8 ready in 234 ms
```

### Step 4: Open the App

Go to: **http://localhost:5173**

### Step 5: Login

Use the test account:
- **Email:** `developer@costrasphere.ai`
- **Password:** `CostraSphere@Dev2026`

---

## Database

The database (`backend/database/costrasphere.db`) is **auto-created** on first backend startup.

### What's in the Database?

- **users** - User accounts (developer account pre-created)
- **projects** - Infrastructure projects you create
- **cost_breakdowns** - Cost analysis for each project
- **otp_codes** - OTP verification codes
- **chat_history** - AI chatbot conversation history

---

## Testing the Platform

### 1. Register a New Account
Go to **Sign Up** → Fill in details → Register

### 2. Create a Project
- Dashboard → "New Project"
- Fill in project details
- Click "Get AI Cost Estimation"
- View cost breakdown
- Confirm & Create

### 3. View Dashboard
- See project statistics
- View cost charts
- Track worker requirements
- Monitor timelines

### 4. Chat with AI
- Go to **Chatbot**
- Ask about telecom infrastructure
- Get intelligent responses

### 5. View Project Details
- Click on any project
- See cost breakdown
- Export PDF report

---

## Troubleshooting

### "Port already in use" error

**Solution:**
```bash
# Windows - Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux - Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### "Module not found" error

**Solution:**
```bash
# Reinstall dependencies
pip install --break-system-packages -r requirements.txt
npm install --force
```

### Database connection error

**Solution:**
The database auto-creates. If you get an error:

```bash
# Delete old database
rm backend/database/costrasphere.db

# Restart backend - it will recreate the database
```

### Frontend shows "Cannot GET /"

**Solution:**
Make sure both servers are running:
1. Backend on `http://localhost:8000`
2. Frontend on `http://localhost:5173`

Check that you're accessing the frontend URL, not the backend URL.

### Login fails

**Solution:**
1. Check backend is running: `http://localhost:8000/docs`
2. Try the developer account:
   - Email: `developer@costrasphere.ai`
   - Password: `CostraSphere@Dev2026`

---

## Project Structure

```
costrasphere-ai/
├── backend/                    ← Python FastAPI server
│   ├── main.py                 ← Start here: python main.py
│   ├── requirements.txt        ← Python dependencies
│   └── database/
│       └── costrasphere.db     ← SQLite database (auto-created)
├── src/                        ← React frontend
├── package.json                ← npm dependencies
└── npm run dev                 ← Start frontend here
```

---

## File Locations

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI server (start here) |
| `backend/requirements.txt` | Python packages |
| `.env` | Configuration |
| `src/App.tsx` | React app |
| `package.json` | npm packages |

---

## Key Features

✅ **AI Cost Estimation** - Predict project costs accurately
✅ **User Authentication** - Secure login with JWT
✅ **Project Management** - Create and track projects
✅ **Analytics Dashboard** - Visualize project data
✅ **AI Chatbot** - Ask questions about infrastructure
✅ **PDF Reports** - Export project documentation
✅ **Multi-country** - Support for 5+ countries

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `python main.py` | Start backend server |
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build production frontend |
| `pip install -r requirements.txt` | Install backend deps |
| `npm install` | Install frontend deps |

---

## Accounts Available

### Developer Account (Full Access)
```
Email: developer@costrasphere.ai
Password: CostraSphere@Dev2026
Role: Developer (can do everything)
```

### Create New Account
- Go to "Sign Up" on the web app
- Fill in your details
- You'll have a customer account

---

## API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Project Size

- **Frontend:** 772 KB (gzipped)
- **Backend Code:** ~35 KB
- **Database:** Auto-created (~50 KB)
- **Build Time:** ~8 seconds

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Common Tasks

### Add a New City
Edit: `data/global_city_costs.csv`

### Change Configuration
Edit: `backend/.env` or `frontend/.env`

### Customize Email Settings
Edit: `backend/.env`
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Deploy to Production
See: `DEPLOYMENT.md`

---

## Need Help?

1. **Check logs** - Look at terminal output
2. **Read documentation** - See `README.md`
3. **Review code** - Code is well-commented
4. **Check API docs** - http://localhost:8000/docs

---

## Next Steps

1. **Test the app** - Create a project
2. **Explore features** - Use all the dashboards
3. **Read documentation** - Check `README.md`
4. **Deploy** - Follow `DEPLOYMENT.md` for production

---

**Everything is ready! Start the servers now! 🚀**

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
npm run dev
```

Then open: **http://localhost:5173**
