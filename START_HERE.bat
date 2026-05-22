@echo off
cls
echo.
echo ====================================================================
echo             CostraSphere AI - Setup Instructions
echo ====================================================================
echo.

echo Checking dependencies...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing backend dependencies...
    pip install -q -r requirements.txt
)

echo Database ready (auto-created on first backend run)
echo.

echo ====================================================================
echo.
echo NEXT STEPS:
echo.
echo 1. Open TWO command prompts/terminals
echo.
echo TERMINAL 1 - Start Backend:
echo   cd backend
echo   python main.py
echo.
echo TERMINAL 2 - Start Frontend:
echo   npm run dev
echo.
echo ====================================================================
echo.
echo ACCESS THE APP:
echo   Web: http://localhost:5173
echo   API: http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo.
echo LOGIN WITH:
echo   Email: developer@costrasphere.ai
echo   Password: CostraSphere@Dev2026
echo.
echo ====================================================================
echo.
pause
