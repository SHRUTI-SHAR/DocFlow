#!/bin/bash
# Quick Start Script for Load Testing

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    LOAD TESTING QUICK START                                ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check if backend is running
echo "📝 Step 1: Checking if backend is running..."
curl -s http://localhost:8000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend is running on http://localhost:8000"
else
    echo "❌ Backend is NOT running!"
    echo "   Please start it in another terminal:"
    echo "   cd backend && python run.py"
    exit 1
fi

# Step 2: Check test PDFs
echo ""
echo "📝 Step 2: Checking test PDFs..."
if [ -d "test_pdfs" ] && [ "$(ls -A test_pdfs/*.pdf 2>/dev/null)" ]; then
    PDF_COUNT=$(ls test_pdfs/*.pdf 2>/dev/null | wc -l)
    echo "✅ Found $PDF_COUNT test PDF(s)"
else
    echo "⚠️  No test PDFs found. Generating..."
    python generate_test_pdfs.py
fi

# Step 3: Run load test
echo ""
echo "📝 Step 3: Starting load test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
python load_test.py

# Step 4: Open report
echo ""
echo "📝 Step 4: Opening HTML report..."
LATEST_REPORT=$(ls -t test_results/load_test_*.html 2>/dev/null | head -1)
if [ -n "$LATEST_REPORT" ]; then
    echo "📊 Report: $LATEST_REPORT"
    # Try to open in browser (works on most systems)
    if command -v xdg-open > /dev/null; then
        xdg-open "$LATEST_REPORT"
    elif command -v open > /dev/null; then
        open "$LATEST_REPORT"
    elif command -v start > /dev/null; then
        start "$LATEST_REPORT"
    else
        echo "   Please open manually: $LATEST_REPORT"
    fi
else
    echo "⚠️  No report found"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                         LOAD TEST COMPLETE! ✅                             ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
