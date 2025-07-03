from fastapi import APIRouter, Body

router = APIRouter()

system_prompt = "你是一个智能问答助手。"

@router.get("/")
async def get_prompt():
    return {"system_prompt": system_prompt}

@router.post("/")
async def set_prompt(prompt: str = Body(...)):
    global system_prompt
    system_prompt = prompt
    return {"msg": "系统级prompt已更新", "system_prompt": system_prompt} 