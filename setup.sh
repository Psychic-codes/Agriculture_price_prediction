#!/bin/bash

echo "🌾 Starting Agriculture Price Prediction Project Setup..."

# Step 1: Install Python Dependencies
echo ""
echo "==============================================="
echo "🐍 Setting up ML Pipeline (Python dependencies)"
echo "==============================================="
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies. Please check your Python/pip installation."
    exit 1
fi
echo "✅ Python dependencies installed successfully!"

# Step 2: Install Backend Dependencies
echo ""
echo "==============================================="
echo "⚙️ Setting up Express Backend (Node dependencies)"
echo "==============================================="
cd Price_Prediction/backend || exit
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies."
    exit 1
fi
echo "✅ Backend dependencies installed successfully!"

# Step 3: Install Frontend Dependencies
echo ""
echo "==============================================="
echo "💻 Setting up React Frontend (Node dependencies)"
echo "==============================================="
cd .. || exit
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies."
    exit 1
fi
echo "✅ Frontend dependencies installed successfully!"
cd .. || exit

echo ""
echo "==============================================="
echo "🎉 Setup Complete!"
echo "==============================================="
echo "To run the application, open two separate terminal tabs:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd Price_Prediction/backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd Price_Prediction"
echo "  npm run dev"
echo ""
