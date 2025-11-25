#!/bin/bash
# Quick Fix Script for Python 3.11 Virtual Environment

echo "=== Fixing Python Virtual Environment ==="

# Step 1: Deactivate current venv if active
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "Deactivating current virtual environment..."
    deactivate
fi

# Step 2: Remove old venv
echo "Removing old virtual environment..."
rm -rf venv

# Step 3: Create new venv with Python 3.11 using py launcher
echo "Creating new virtual environment with Python 3.11..."
py -3.11 -m venv venv

# Step 4: Activate new venv
echo "Activating virtual environment..."
source venv/Scripts/activate

# Step 5: Verify Python version
echo "Verifying Python version..."
python --version

# Step 6: Upgrade pip
echo "Upgrading pip..."
python -m pip install --upgrade pip

# Step 7: Install requirements
echo "Installing project requirements..."
pip install -r requirements.txt

echo "=== Setup Complete! ==="
echo "Your environment is now using Python 3.11"
echo "Run: uvicorn app.main:app --reload --port 8000"
