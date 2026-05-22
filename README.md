# CostraSphere AI - Telecom Infrastructure Planning Platform

A complete full-stack AI-powered platform for telecom infrastructure planning, cost estimation, and project management.

## Features

### For Customers
- Create and manage telecom infrastructure projects
- AI-powered cost estimation using advanced algorithms
- Real-time cost breakdown analysis
- Project timeline predictions
- Worker requirement calculations
- Interactive dashboards with analytics
- AI chatbot for support
- PDF report generation
- Multi-country support (India, Japan, China, USA, UK)

### For Admins
- Comprehensive analytics dashboard
- User management and monitoring
- Project approval/rejection workflow
- Revenue and worker analytics
- Country-wise performance metrics
- Team management

### For Developers
- Full database access and management
- API logs and monitoring
- System health statistics
- Debug panel for advanced features
- Complete CRUD operations

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast build and dev server
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Router DOM** for navigation
- **Axios** for API calls
- **Recharts** for analytics
- **React Hook Form** for forms
- **React Hot Toast** for notifications
- **Leaflet** for maps

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - Lightweight database
- **Pydantic** - Data validation
- **JWT** - Secure authentication
- **Passlib + Bcrypt** - Password hashing
- **Pandas** - Data analysis for AI calculations
- **ReportLab** - PDF generation
- **SMTP** - Email/OTP delivery

## Project Structure

```
project/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth context
│   │   ├── api/           # API client
│   │   ├── types/         # TypeScript types
│   │   ├── App.tsx        # Main app
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── main.py            # FastAPI app
│   ├── models.py          # SQLAlchemy models
│   ├── database.py        # Database setup
│   ├── auth.py            # Authentication
│   ├── otp_service.py     # OTP handling
│   ├── ai_engine.py       # AI calculations
│   ├── pdf_generator.py   # PDF reports
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
│
├── database/
│   └── costrasphere.db    # SQLite database
│
├── data/
│   └── global_city_costs.csv  # City pricing data
│
└── assets/
    └── images/           # Logo and assets
```

## Installation

### Prerequisites
- Node.js 16+
- Python 3.8+
- Git

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd project
```

### Step 2: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies
```bash
npm install
```

### Step 4: Setup Environment Variables

#### Backend (.env)
```
DATABASE_URL=sqlite:///./database/costrasphere.db
EMAIL_USER=costrasphere@gmail.com
EMAIL_PASSWORD=uvjdbjoejboldtgr
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Running the Application

### Start Backend Server
```bash
cd backend
python main.py
```
Backend runs on `http://localhost:8000`

### Start Frontend Development Server
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `POST /send-otp` - Send OTP for password reset
- `POST /verify-otp` - Verify OTP
- `POST /forgot-password` - Initiate password reset
- `POST /reset-password` - Reset password

### Projects
- `POST /create-project` - Create new project with AI estimation
- `GET /projects` - Get user's projects
- `GET /project/{id}` - Get project details
- `DELETE /project/{id}` - Delete project

### Chat
- `POST /chat` - Send message to AI chatbot

### Profile
- `GET /profile` - Get user profile

### Analytics
- `GET /analytics` - Get project analytics (admin only)

### Admin
- `GET /admin/users` - Get all users (admin only)

## User Credentials

### Developer Account (Super Admin)
- **Email:** developer@costrasphere.ai
- **Password:** CostraSphere@Dev2026

## Database Schema

### Users Table
- id, full_name, email, password, role, company_name, created_at

### Projects Table
- id, user_id, project_name, country, city, distance_km, terrain, tower_count, fiber_length_km, labor_type, estimated_days, worker_count, total_salary_cost, total_material_cost, total_project_cost, status, created_at

### OTP Codes Table
- id, email, otp, created_at

### Cost Breakdowns Table
- id, project_id, material_cost, labor_cost, tower_cost, fiber_cost, maintenance_cost, transport_cost

### Chat History Table
- id, user_id, message, response, created_at

## AI Cost Estimation Algorithm

The platform uses a sophisticated AI calculation engine that considers:

1. **Location-based pricing** from global_city_costs.csv dataset
2. **Terrain multipliers:**
   - Urban: 1.0x
   - Rural: 1.2x
   - Mountain: 1.6x
   - Forest: 1.4x

3. **Cost components:**
   - Fiber deployment cost (per km)
   - Labor cost based on skill level
   - Tower installation cost
   - Maintenance cost
   - Transport cost

4. **Timeline calculation** based on:
   - Fiber distance
   - Tower count
   - Terrain complexity

5. **Worker requirement** calculation based on:
   - Project scope
   - Fiber distance
   - Tower count
   - Skill level

## Building for Production

### Frontend Build
```bash
npm run build
```
Outputs to `dist/` folder

### Backend Deployment
```bash
pip install gunicorn
gunicorn main:app --host 0.0.0.0 --port 8000
```

## Features Implemented

- ✅ Complete authentication system with OTP via Gmail
- ✅ AI-powered cost estimation engine
- ✅ Role-based access control (Customer, Admin, Developer)
- ✅ Multi-country support with pricing data
- ✅ Project management dashboard
- ✅ Real-time analytics and charts
- ✅ AI chatbot for support
- ✅ PDF report generation
- ✅ Responsive design
- ✅ Beautiful UI with animations
- ✅ Database-backed project storage
- ✅ OTP-based password reset
- ✅ SQLite database with SQLAlchemy ORM
- ✅ JWT token-based authentication
- ✅ Complete CRUD operations

## Development

### Frontend Structure
- Components are modular and reusable
- Context API for state management
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations

### Backend Structure
- FastAPI with async support
- SQLAlchemy ORM for database
- Pydantic for request/response validation
- JWT for security
- Comprehensive error handling

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- OTP verification for sensitive operations
- CORS enabled for development
- SQL injection prevention via ORM
- XSS protection via React
- Role-based access control

## Performance Optimizations

- Lazy loading of components
- Memoization in React
- Database indexing on frequently queried columns
- Efficient API endpoints
- Optimized bundle size

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Database issues
- Delete `database/costrasphere.db` and restart the backend
- Check `.env` file DATABASE_URL

### OTP not sending
- Check EMAIL_USER and EMAIL_PASSWORD in `.env`
- Verify Gmail less secure app password is enabled
- Check email client spam folder

### API connection issues
- Ensure backend is running on `localhost:8000`
- Check CORS settings
- Verify token is valid

## Future Enhancements

- Real-time project tracking with WebSockets
- Integration with third-party mapping services
- Mobile app for iOS and Android
- Advanced machine learning models for prediction
- Multi-language support
- Payment gateway integration
- Project collaboration features

## License

Proprietary - CostraSphere AI 2026

## Support

For issues and support, contact: support@costrasphere.ai

---

**CostraSphere AI** - Transform Your Telecom Infrastructure Planning
