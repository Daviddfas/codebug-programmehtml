from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import qa, kg, prompt

app = FastAPI(
    title="DeepSeek AI Backend",
    description="DeepSeek AI聊天和知识图谱后端API",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(qa.router, prefix="/api/qa", tags=["qa"])
app.include_router(kg.router, prefix="/api/kg", tags=["kg"])
app.include_router(prompt.router, prefix="/api/prompt", tags=["prompt"])

@app.get("/")
async def root():
    return {"message": "DeepSeek AI Backend API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API服务正常运行"}