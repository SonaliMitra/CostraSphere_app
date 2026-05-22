#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            CostraSphere AI - Startup Script                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if backend dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "⚙️  Installing backend dependencies..."
    pip install --break-system-packages -q -r requirements.txt
fi

echo "✓ Dependencies ready"
echo ""

# Check database
if [ ! -f "backend/database/costrasphere.db" ]; then
    echo "🗄️  Initializing database..."
    cd backend
    python3 << 'EOF'
import sqlite3
from datetime import datetime
import bcrypt

db_path = 'database/costrasphere.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables
cursor.executescript('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'customer',
    company_name VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_name VARCHAR NOT NULL,
    country VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    distance_km FLOAT NOT NULL,
    terrain VARCHAR NOT NULL,
    tower_count INTEGER NOT NULL,
    fiber_length_km FLOAT NOT NULL,
    labor_type VARCHAR NOT NULL,
    estimated_days INTEGER,
    worker_count INTEGER,
    total_salary_cost FLOAT,
    total_material_cost FLOAT,
    total_project_cost FLOAT,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cost_breakdowns (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    material_cost FLOAT DEFAULT 0,
    labor_cost FLOAT DEFAULT 0,
    tower_cost FLOAT DEFAULT 0,
    fiber_cost FLOAT DEFAULT 0,
    maintenance_cost FLOAT DEFAULT 0,
    transport_cost FLOAT DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY,
    email VARCHAR NOT NULL,
    otp VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
''')

# Create developer account
password = "CostraSphere@Dev2026"
password_bytes = password[:72].encode('utf-8')
hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

cursor.execute('''
    INSERT OR REPLACE INTO users (full_name, email, password, role, company_name)
    VALUES (?, ?, ?, ?, ?)
''', ('CostraSphere Developer', 'developer@costrasphere.ai', hashed, 'developer', 'CostraSphere AI'))

conn.commit()
conn.close()
print("✓ Database initialized with developer account")
EOF
    cd ..
fi

echo ""
echo "✅ Everything is ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 START THE SERVERS:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && python main.py"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 ACCESS THE APP:"
echo "  • Frontend: http://localhost:5173"
echo "  • API: http://localhost:8000"
echo "  • API Docs: http://localhost:8000/docs"
echo ""
echo "🔐 LOGIN WITH:"
echo "  • Email: developer@costrasphere.ai"
echo "  • Password: CostraSphere@Dev2026"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
