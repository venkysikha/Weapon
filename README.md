# Weapon Detection System

This project implements a weapon detection system using a fine-tuned model with a React.js frontend and Flask backend.

## Project Structure
```
weapon-detection/
├── backend/           # Flask backend
│   ├── app.py        # Main Flask application
│   ├── requirements.txt
│   └── model/        # Your fine-tuned model files
├── frontend/         # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Usage
1. The backend server will run on `http://localhost:5000`
2. The frontend application will run on `http://localhost:3000`
3. Upload images through the web interface to detect weapons 