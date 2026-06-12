# Plan2Go-Final Deployment Notes

## System Requirements
- Python 3.10+
- Node.js 18+

## Data Connections
The backend references active ML model assets from `backend/artifacts/`.
The routing engine references active raw transport logs from `backend/datasets/` (e.g. `finaldelhiroadways.csv` and `finalbangloreroadways.csv`).

## Verified Capabilities
- **Intercity Trip Planning**: ML candidate generator and pricing models are fully operational.
- **Intracity Local Trips**: Full lookup API endpoints for location names and local cab price estimations.
- **Group Trip Board**: Real-time collaborative voting via websockets.
- **Demo Mode**: Quick simulation preloads and disruption replanning capabilities.
