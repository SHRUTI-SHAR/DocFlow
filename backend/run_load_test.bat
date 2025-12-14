@echo off
REM Quick Start Script for Load Testing (Windows)

echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║                    LOAD TESTING QUICK START                                ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check if backend is running
echo 📝 Step 1: Checking if backend is running...
curl -s http://localhost:8000/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is running on http://localhost:8000
) else (
    echo ❌ Backend is NOT running!
    echo    Please start it in another terminal:
    echo    cd backend ^&^& python run.py
    exit /b 1
)

REM Step 2: Check test PDFs
echo.
echo 📝 Step 2: Checking test PDFs...
if exist "test_pdfs\*.pdf" (
    echo ✅ Found test PDFs
) else (
    echo ⚠️  No test PDFs found. Generating...
    python generate_test_pdfs.py
)

REM Step 3: Run load test
echo.
echo 📝 Step 3: Starting load test...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
python load_test.py

REM Step 4: Open report
echo.
echo 📝 Step 4: Opening HTML report...
for /f "delims=" %%i in ('dir /b /o-d test_results\load_test_*.html 2^>nul') do (
    set LATEST_REPORT=test_results\%%i
    goto :found
)
:found
if defined LATEST_REPORT (
    echo 📊 Report: %LATEST_REPORT%
    start "" "%LATEST_REPORT%"
) else (
    echo ⚠️  No report found
)

echo.
echo ╔════════════════════════════════════════════════════════════════════════════╗
echo ║                         LOAD TEST COMPLETE! ✅                             ║
echo ╚════════════════════════════════════════════════════════════════════════════╝
pause
