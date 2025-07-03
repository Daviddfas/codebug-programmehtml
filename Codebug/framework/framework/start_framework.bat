@echo off
echo ========================================
echo   启动 DeepSeek AI 框架项目
echo ========================================

echo.
echo 1. 启动后端服务...
cd backend
start "Backend Server" cmd /k "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo 2. 等待后端服务启动...
timeout /t 5 /nobreak >nul

echo.
echo 3. 启动前端服务...
cd ..\frontend
start "Frontend Server" cmd /k "npm run serve"

echo.
echo ========================================
echo   服务启动完成！
echo   后端地址: http://localhost:8000
echo   前端地址: http://localhost:8080
echo ========================================
echo.
echo 按任意键退出...
pause >nul 