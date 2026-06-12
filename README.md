# Yatri AI

This is the consolidated project repository containing both the frontend and backend of the Yatri AI application.

## Repository Structure

- `frontend/`: React + Vite + TS web application.
- `backend/`: FastAPI + PyTorch backend application.
- `backend/artifacts/`: Active PyTorch ML model, scaler, encoders, and route ranking CSV artifacts.
- `backend/datasets/`: Active dataset source CSVs for flights, railways, buses, and local cabs.

## Getting Started

### Backend
1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Run the FastAPI server: `uvicorn app.main:app --reload --port 8000`

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start local development: `npm run dev`
4. Build for production: `npm run build`
