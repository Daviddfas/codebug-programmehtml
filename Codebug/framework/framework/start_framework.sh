#!/bin/bash

echo "========================================"
echo "  启动 DeepSeek AI 框架项目"
echo "========================================"

# 检查依赖
echo "检查依赖..."

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm"
    exit 1
fi

echo "依赖检查完成 ✓"

# 启动后端
echo ""
echo "1. 启动后端服务..."
cd backend

# 安装Python依赖
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# 启动后端服务
echo "启动FastAPI服务器..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 等待后端启动
echo "等待后端服务启动..."
sleep 5

# 启动前端
echo ""
echo "2. 启动前端服务..."
cd ../frontend

# 安装npm依赖
if [ ! -d "node_modules" ]; then
    echo "安装npm依赖..."
    npm install
fi

# 启动前端服务
echo "启动Vue开发服务器..."
npm run serve &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  服务启动完成！"
echo "  后端地址: http://localhost:8000"
echo "  前端地址: http://localhost:8080"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait 