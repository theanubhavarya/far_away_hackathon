# Yatri AI Deployment Guide 🚀

This document provides a comprehensive guide for deploying the **Yatri AI** platform. The architecture is split across two cloud providers: **Render** (for our high-performance Python ML Backend) and **Vercel** (for our lightning-fast React Frontend).

## Prerequisites
- A GitHub account with this repository pushed to the `main` branch.
- A Render account (https://render.com).
- A Vercel account (https://vercel.com).
- A Google Maps API Key.

---

## 1. Deploying the Backend & ML Engine (Render)

Our backend utilizes FastAPI to route multi-modal paths, while seamlessly passing data through our PyTorch Machine Learning models (`ml-engine/`) for dynamic pricing predictions.

We have included a `render.yaml` Infrastructure-as-Code Blueprint to completely automate this process!

### Steps:
1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub account and select this repository (`Yatri-AI-v2`).
4. Render will automatically detect the `render.yaml` file at the root.
5. Click **Apply**. Render will automatically:
   - Provision a Python 3.10 environment.
   - Install all dependencies from `backend/requirements.txt`.
   - Start the FastAPI routing engine.
6. Once deployment is successful, **Copy the backend URL** (e.g., `https://yatri-ai-backend.onrender.com`).

---

## 2. Deploying the Interactive Frontend (Vercel)

Our frontend is a React Single Page Application (SPA) built with Vite and animated with Framer Motion. 

*Note: We have configured a `vercel.json` file in the frontend directory to automatically handle React Router rewrites to prevent 404 errors on page refreshes.*

### Steps:
1. Go to the [Vercel Dashboard](https://vercel.com/new).
2. Import this GitHub repository.
3. Open the **Framework Preset** dropdown and select **Vite**.
4. Set the **Root Directory** to `frontend`.
5. Open the **Environment Variables** section and add the following keys:
   - `VITE_GOOGLE_MAPS_API_KEY`: Your active Google Maps API key (required for the interactive planner map).
   - `VITE_API_URL`: The URL of your live Render backend from Step 1 (e.g., `https://yatri-ai-backend.onrender.com`).
6. Click **Deploy**.

## 3. Verification

Once both platforms finish building:
1. Navigate to your new Vercel frontend URL.
2. The landing page micro-animations should load instantly.
3. Click "Plan a Trip", use the interactive map to select your origin and destination.
4. The system will hit your Render backend, run through the ML pricing inference engine, and return accurate, multi-modal travel routes dynamically!

Enjoy Yatri AI! 🌍
