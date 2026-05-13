from fastapi import FastAPI
from app.routes.health import router as health_router
from app.routes.previsions import router as previsions_router

app = FastAPI(title="Agroficient Backend", version="0.1.0")

app.include_router(health_router)
app.include_router(previsions_router)
