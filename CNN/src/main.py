from src.routes.yolo.main import router as yolo_router
from fastapi import FastAPI



app = FastAPI()



app.include_router(yolo_router, prefix="/yolo", tags=["yolo"])
