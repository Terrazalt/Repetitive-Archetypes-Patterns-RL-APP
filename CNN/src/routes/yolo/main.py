from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from pydantic import BaseModel
from src.utils.yolo.main import YoloBestModel
from typing import Annotated
import os
from dotenv import load_dotenv
from PIL import Image
import io
from fastapi.responses import StreamingResponse
import numpy as np
load_dotenv()

router = APIRouter()
yolo = YoloBestModel("best_models/best.pt")

@router.post("/detect")
async def detect(image: UploadFile = File(...),
                authorization: str = Header(alias="Authorization")
                 ):
    print("Endpoint hit!!")
    print(os.getenv('CNN_API_KEY'))
    print(authorization)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")
    if authorization != f"Bearer {os.getenv('CNN_API_KEY')}":
        raise HTTPException(status_code=403, detail="Invalid API key")
    contents = await image.read()

    try:
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # 2. Run inference & get annotated numpy array
    annotated_np: np.ndarray = yolo.predict_and_plot(pil_img)
    
    # 3. Convert numpy array back to PIL
    annotated_pil = Image.fromarray(annotated_np)

    # 4. Encode to PNG in-memory
    buf = io.BytesIO()
    annotated_pil.save(buf, format="PNG")
    buf.seek(0)

    # 5. Stream it back
    return StreamingResponse(buf, media_type="image/png")
