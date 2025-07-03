@echo off
chcp 65001 >nul
echo ========================================
echo   DeepSeek AI Framework 快速启动
echo ========================================

echo.
echo 1. 启动后端服务 (FastAPI)...
cd /d "%~dp0backend"
start "Backend FastAPI" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"

echo.
echo 2. 等待后端启动...
timeout /t 8 /nobreak >nul

echo.
echo 3. 启动前端服务 (静态HTTP服务器)...
cd /d "%~dp0..\..\frontend"
start "Frontend Static" cmd /k "python -m http.server 8080"

echo.
echo ========================================
echo   🎉 服务启动完成！
echo.
echo   💻 前端地址: http://localhost:8080
echo   🔧 后端API: http://localhost:8001
echo   📚 API文档: http://localhost:8001/docs
echo ========================================
echo.
echo 📋 使用说明:
echo   - 前端已配置后端适配器，会自动调用后端API
echo   - 可以直接在浏览器中使用聊天和知识图谱功能
echo   - 支持拖拽生成关系图和流式对话
echo.
echo 按任意键关闭此窗口...
pause >nul 