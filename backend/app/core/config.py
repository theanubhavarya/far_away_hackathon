import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = BASE_DIR
MODEL_DIR = BASE_DIR
API_PREFIX = '/api/v1'


def _env_flag(name: str) -> bool:
    return os.getenv(name, '').strip().lower() in {'1', 'true', 'yes', 'on'}


ENABLE_RAIL_API = _env_flag('ENABLE_RAIL_API')
ENABLE_FLIGHT_API = _env_flag('ENABLE_FLIGHT_API')
ENABLE_BUS_API = _env_flag('ENABLE_BUS_API')
