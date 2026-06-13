from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import router, ws_router
from app.core.config import API_PREFIX, BASE_DIR
from app.services.ai_service import AIService
from app.websocket.agent_stream import ConnectionManager

app = FastAPI(
    title='Yatri AI Backend',
    description='AI-first travel route planning and disruption recovery backend.',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(router, prefix=API_PREFIX)
app.include_router(ws_router)


@app.on_event('startup')
async def startup_event():
    app.state.ai_service = AIService(BASE_DIR)
    app.state.ws_manager = ConnectionManager()


@app.on_event('shutdown')
async def shutdown_event():
    app.state.ws_manager = None
