from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from pydantic import BaseModel
from src.utils.yolo import YOLO
from pydantic import BaseModel
from typing import Annotated
import os
from dotenv import load_dotenv
from src.utils.logger import logger

class DetectBody(BaseModel):
    image: UploadFile = File(...)

router = APIRouter(title="YOLOv8 Detection API", tags=["YOLOv8"])

@router.post("/detect")
async def detect(body:DetectBody,
                 authorization: Annotated[str, Header(alias="Authorization")],
                 ):
    logger.info("Endpoint hit!!")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")
    if authorization != os.getenv("CNN_API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
    
