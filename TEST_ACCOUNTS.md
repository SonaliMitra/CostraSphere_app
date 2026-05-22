# CostraSphere AI - Test Accounts

## Available Test Accounts

The database has been pre-populated with 3 test accounts for your convenience:

### 1. Developer Account (Full Access)
```
Email:    developer@costrasphere.ai
Password: CostraSphere@Dev2026
Role:     Developer
Access:   Full access to all features
```

### 2. Customer Account
```
Email:    john@example.com
Password: Test@123
Role:     Customer
Access:   Can create projects, view own dashboard
```

### 3. Admin Account
```
Email:    admin@example.com
Password: Admin@123
Role:     Admin
Access:   Can view all users and projects, analytics
```

---

## How to Login

1. Start the backend: `cd backend && python main.py`
2. Start the frontend: `npm run dev`
3. Go to: http://localhost:5173
4. Click "Login"
5. Enter one of the credentials above
6. Click "Login"

---

## Create Additional Accounts

You can also create new accounts by:
1. Going to the "Sign Up" page
2. Filling in your details
3. Submitting the form

New accounts are created as **Customer** role by default.

---

## Database Location

All test accounts are stored in:
```
backend/database/costrasphere.db
```

The database was automatically created with all tables when you first ran the backend.

---

## Features to Test

### With Developer Account
- ✅ All features available
- ✅ Create projects
- ✅ View all projects
- ✅ Access analytics
- ✅ Use chatbot
- ✅ Export PDF reports

### With Customer Account
- ✅ Create own projects
- ✅ View own projects
- ✅ View own analytics
- ✅ Use chatbot
- ✅ Export own PDF reports

### With Admin Account
- ✅ View all users
- ✅ View all projects
- ✅ Access company analytics
- ✅ Monitor workers and costs

---

## Resetting the Database

If you need to reset the database:

```bash
# Delete the database file
rm backend/database/costrasphere.db

# Restart the backend - it will recreate the database
cd backend && python main.py
```

This will recreate the database with the same 3 test accounts.

---

## Troubleshooting Login

### "Invalid credentials" error
- Double-check you're typing the password correctly
- Passwords are case-sensitive
- Make sure your backend is running on port 8000

### "Connection refused" error
- Backend is not running
- Start it: `cd backend && python main.py`

### "Cannot find user" error
- The account doesn't exist in the database
- Use one of the 3 test accounts above
- Or create a new account via Sign Up

---

**All test accounts are ready to use!** 🎉
