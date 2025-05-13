from src.routes.yolo.main import router as yolo_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add this before you include any routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # your Svelte dev server
        "http://127.0.0.1:5173",    # maybe this one too
        # or ["*"] in dev, but lock down in prod
    ],
    allow_credentials=True,
    allow_methods=["*"],          # allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],          # allow Authorization, Content-Type, etc.
)

app.include_router(yolo_router, prefix="/yolo", tags=["yolo"])
