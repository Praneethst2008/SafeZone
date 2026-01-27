from fastapi import FastAPI, UploadFile, File
from yamnet import classify_audio
import uuid
import os

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4()}.webm"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as f:
        f.write(await file.read())

    result = classify_audio(path)
    return result
