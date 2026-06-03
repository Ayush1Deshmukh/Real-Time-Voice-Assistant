#!/bin/bash
# Real-Time Voice Assistant - Local Setup Script

echo "🎙️ Starting setup for Real-Time Voice Assistant..."

# 1. Check for .env files
echo -e "\n🔍 Checking environment variables..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found! Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example backend/.env
        echo "✅ Created backend/.env. Please update it with your actual API keys."
    else
        echo "❌ .env.example not found in root. Cannot create backend/.env."
    fi
else
    echo "✅ backend/.env exists."
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  frontend/.env not found! Creating..."
    echo "VITE_API_URL=http://localhost:8000" > frontend/.env
    echo "✅ Created frontend/.env."
else
    echo "✅ frontend/.env exists."
fi

# 2. Setup Backend
echo -e "\n🐍 Setting up Python Backend..."
cd backend || exit

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install
echo "Activating venv and installing requirements..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cd .. || exit

# 3. Setup Frontend
echo -e "\n⚛️  Setting up React Frontend..."
cd frontend || exit

echo "Installing npm dependencies..."
npm install

cd .. || exit

echo -e "\n🎉 Setup Complete!"
echo "To run the app:"
echo "1. Start backend: cd backend && source venv/bin/activate && python3 -m uvicorn main:app --reload"
echo "2. Start frontend: cd frontend && npm run dev"
