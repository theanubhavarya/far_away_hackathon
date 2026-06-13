# Yatri AI Architecture & Project Structure 🗺️

Welcome to the **Yatri AI** codebase! This repository is engineered for maximum modularity and scalability. We have split the architecture into three core microservices: the interactive **Frontend**, the real-time **Backend** routing engine, and our predictive **ML Engine**.

Below is a comprehensive map of the repository to help hackathon judges navigate the application.

```text
Yatri-AI-v2/
├── frontend/                     # Interactive UI Built with React + Vite + TypeScript
│   ├── public/                   # Static assets
│   │   ├── frontend-images/      # Optimized assets for the beautiful animated landing page
│   │   └── YatriAI.mov           # Background hero video
│   ├── src/                      
│   │   ├── components/           # Reusable UI components (Google Maps, Timeline, Navbar, Footer)
│   │   ├── pages/                # Main application views (LandingPage, PlannerPage, BookingPage)
│   │   ├── stores/               # Zustand state management (global trip state)
│   │   ├── lib/                  # API integrations (Axios fetch logic communicating with Backend)
│   │   ├── index.css             # Global fully responsive mobile-first stylesheet
│   │   └── App.tsx               # Core React Router setup and Framer Motion orchestrator
│   ├── package.json              # Frontend Node dependencies (Tailwind removed in favor of pure CSS)
│   └── .env.example              # Environment variable template for Google Maps API and Backend URL
│
├── backend/                      # High-Performance API built with FastAPI (Python)
│   ├── app/                      
│   │   ├── main.py               # FastAPI application entry point and CORS configuration
│   │   ├── routing_engine.py     # Core business logic for multi-modal route generation
│   │   ├── external_apis.py      # Integrations (Google Places, mapping services)
│   │   ├── models.py             # Pydantic schemas for data validation
│   │   └── cache.py              # In-memory LRU caching for high-speed repeated queries
│   ├── tests/                    # Unit tests and API verification scripts
│   │   └── test_api.py           # Integration test script for the /routes/plan endpoint
│   └── requirements.txt          # Python dependencies
│
├── ml-engine/                    # Machine Learning Pricing & Prediction Models
│   ├── research/                 # 🔬 Raw datasets and exploratory analysis
│   │   ├── test.ipynb            # Jupyter notebooks containing model training experiments
│   │   └── *.csv                 # Raw aggregated data (airways, roadways, railways, etc.)
│   ├── artifacts/                # Serialized production models
│   │   ├── model.pth             # PyTorch Neural Network weights
│   │   ├── encoders.pkl          # Pickled label encoders for categorical data
│   │   └── scaler.pkl            # Pickled MinMaxScaler for feature normalization
│   ├── model.py                  # PyTorch Neural Network architecture definition
│   ├── recommend.py              # ML inference script to predict real-time dynamic pricing
│   ├── train.py                  # Automated training pipeline script
│   ├── preprocess.py             # Data cleaning and feature engineering logic
│   └── requirements.txt          # Python ML dependencies (PyTorch, Pandas, Scikit-Learn)
│
├── deployment_notes.md           # Instructions for Cloud deployment (Render/Vercel)
└── render.yaml                   # Infrastructure as Code configuration for Render deployment
```

## 🏗️ How the System Works Together

1. **User Request (Frontend):** 
   A user interacts with `frontend/src/pages/PlannerPage.tsx`, entering their journey details or tapping locations on the integrated `GoogleMap` component. This request is sent via `lib/api.ts` to our backend.
2. **Route Generation (Backend):** 
   The FastAPI server (`backend/app/main.py`) receives the request. The `routing_engine.py` generates optimal multi-modal travel segments (mixing flights, trains, and cabs).
3. **Price Prediction (ML Engine):**
   Before the backend returns the routes, it queries the `ml-engine`. The inference script (`ml-engine/recommend.py`) loads the PyTorch model (`model.pth`) and predicts hyper-accurate, real-time dynamic pricing for every single segment.
4. **UI Rendering (Frontend):**
   The frontend receives the fully priced and carbon-scored routes and renders them beautifully on the Timeline and Booking pages, providing deep links (`bookingUrl`) to book the physical tickets.

---
> [!TIP]
> **For Judges:** We highly recommend starting your evaluation at `backend/app/routing_engine.py` to see how we intelligently combine transport modes, and `frontend/src/pages/LandingPage.tsx` to experience our custom micro-animations!
