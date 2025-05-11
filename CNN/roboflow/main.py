import os
import zipfile
from roboflow import Roboflow
from dotenv import load_dotenv
import os
# 1) Configuración
API_KEY      = os.getenv("ROBOFLOW_API_KEY")  # API Key de Roboflow
WORKSPACE    = os.getenv("WORKSPACE_ID")           # p.ej. "mi-equipo"
PROJECT_NAME = os.getenv("PROJECT_ID") # ID de tu proyecto en Roboflow
ZIP_PATH     = "roboflow/dataset.zip"         # Ruta a tu ZIP
EXTRACT_DIR  = "temp_dataset"           # Carpeta temporal

print(API_KEY)
print(WORKSPACE)
print(PROJECT_NAME)
print(ZIP_PATH)
print(EXTRACT_DIR)

# 2) Descomprimir el ZIP
with zipfile.ZipFile(ZIP_PATH, 'r') as z:
    z.extractall(EXTRACT_DIR)
print(f"[+] Descomprimido en {EXTRACT_DIR}/")

# 3) Renombrar JSON si es COCO
coco_json = os.path.join(EXTRACT_DIR, "annotations.json")
if os.path.exists(coco_json):
    os.rename(coco_json,
              os.path.join(EXTRACT_DIR, "_annotations.coco.json"))
    print("[+] Renombrado a _annotations.coco.json para COCO")

# 4) Subir a Roboflow
rf = Roboflow(api_key=API_KEY)
ws = rf.workspace(WORKSPACE)

# Si el proyecto no existe, lo crea; si existe, carga una nueva versión
response = ws.upload_dataset(
    EXTRACT_DIR,
    PROJECT_NAME,
    project_type="object-detection",  # o "image-segmentation"
    dataset_format="coco",            # si es YOLO omite este parámetro
    num_workers=8                     # ajusta según tu CPU/RAM
)

print("[+] Subida completada:", response)

