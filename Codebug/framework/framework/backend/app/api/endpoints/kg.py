from fastapi import APIRouter, Body
import json
from pathlib import Path
from pydantic import BaseModel
from ...core.rte import rte_from_text
router = APIRouter()

class KGRequest(BaseModel):
    text: str

@router.get("/")
async def get_knowledge_graph():
    triples_path = Path(__file__).parent.parent / "knowledge" / "triples.json"
    with open(triples_path, "r", encoding="utf-8") as f:
        triples = json.load(f)
    return {"triples": triples}

@router.post("/extract")
async def extract_kg(req: KGRequest):
    triples = rte_from_text(req.text)
    return {"triples": triples} 