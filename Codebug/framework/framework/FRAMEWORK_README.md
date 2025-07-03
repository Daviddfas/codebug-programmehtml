# DeepSeek AI 框架使用指南

## 项目概述

这是一个基于 FastAPI + Vue.js 的 DeepSeek AI 聊天和知识图谱系统，支持：

- 🤖 智能对话聊天
- 🎯 拖拽生成个性化关系图
- 🔗 自动关系三元组抽取
- 📊 动态知识图谱可视化
- ⚙️ 灵活的系统配置

## 技术架构

### 后端 (FastAPI + LangChain)
- **框架**: FastAPI
- **AI模型**: DeepSeek API
- **关系抽取**: 自研RTE模块
- **API文档**: 自动生成Swagger文档

### 前端 (Vue.js + D3.js)
- **框架**: Vue 2.x
- **图表库**: D3.js
- **样式**: 原生CSS + 响应式设计
- **交互**: 拖拽、缩放、点击等

## 快速开始

### 1. 环境要求

**后端要求:**
- Python 3.8+
- pip 或 conda

**前端要求:**
- Node.js 14+
- npm 或 yarn

### 2. 安装依赖

#### 后端依赖
```bash
cd backend
pip install -r requirements.txt
```

#### 前端依赖
```bash
cd frontend
npm install
```

### 3. 启动服务

#### 方法一：使用启动脚本（推荐）

**Windows:**
```bash
# 双击运行或命令行执行
start_framework.bat
```

**Linux/Mac:**
```bash
chmod +x start_framework.sh
./start_framework.sh
```

#### 方法二：手动启动

**启动后端:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动前端:**
```bash
cd frontend
npm run serve
```

### 4. 访问应用

- **前端地址**: http://localhost:8080
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

## 功能使用指南

### 🤖 智能对话

1. 在左侧聊天区域输入问题
2. 按 Enter 发送消息（Shift+Enter 换行）
3. AI 会自动回复并提取关系三元组
4. 查看回复下方的关系三元组展示

### 🎯 拖拽生成图表

1. 等待 AI 回复完成
2. 将鼠标悬停在 AI 回复上（出现拖拽提示）
3. 拖拽 AI 回复到右侧图表区域
4. 自动生成个性化关系图

### 📊 图表交互

- **缩放**: 鼠标滚轮
- **平移**: 拖拽空白区域
- **节点拖拽**: 拖拽节点重新布局
- **节点点击**: 查看节点详情
- **工具栏**: 重置、居中、导出、清空

### ⚙️ 系统设置

1. 点击右上角设置按钮 (⚙️)
2. 配置系统提示词
3. 设置后端API地址
4. 调整图表显示选项

## API 接口说明

### 问答接口
```http
POST /api/qa
Content-Type: application/json

{
    "question": "用户问题",
    "system_prompt": "系统提示词"
}
```

**响应:**
```json
{
    "answer": "AI回答",
    "triplets": [
        {"h": "实体1", "t": "实体2", "r": "关系"}
    ],
    "status": "success"
}
```

### 关系抽取接口
```http
POST /api/kg/extract
Content-Type: application/json

{
    "text": "要分析的文本"
}
```

**响应:**
```json
{
    "triplets": [
        {"h": "实体1", "t": "实体2", "r": "关系"}
    ]
}
```

### 健康检查
```http
GET /api/health
```

## 配置说明

### 后端配置

**API密钥配置** (`backend/app/core/rte.py`):
```python
DEEPSEEK_API_KEY = 'your-api-key-here'
```

**服务器配置**:
- 端口: 8000 (可在启动命令中修改)
- 主机: 0.0.0.0 (允许外部访问)

### 前端配置

**API地址配置** (`frontend/src/App.vue`):
```javascript
getBackendUrl() {
    // 自动检测或手动设置
    return 'http://localhost:8000'
}
```

**Vue配置** (`frontend/vue.config.js`):
```javascript
module.exports = {
    devServer: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:8000'
            }
        }
    }
}
```

## 测试验证

### 运行测试脚本
```bash
python test_framework.py
```

**测试内容:**
- 后端健康检查
- 问答API功能
- 关系抽取API
- 直接模块测试

### 预期结果
```
==================================================
  DeepSeek AI 框架功能测试
==================================================
✅ 后端健康检查通过
✅ 问答API测试成功
✅ 知识图谱抽取成功
✅ 关系抽取模块正常
==================================================
  测试完成: 4/4 通过
🎉 所有测试通过！框架迁移成功！
==================================================
```

## 故障排除

### 常见问题

**1. 后端启动失败**
- 检查 Python 版本 (需要 3.8+)
- 安装依赖: `pip install -r requirements.txt`
- 检查端口占用: `netstat -an | grep 8000`

**2. 前端启动失败**
- 检查 Node.js 版本 (需要 14+)
- 清理缓存: `npm cache clean --force`
- 重新安装: `rm -rf node_modules && npm install`

**3. API 调用失败**
- 检查 CORS 配置
- 验证 API 密钥
- 查看网络连接

**4. 图表不显示**
- 检查 D3.js 是否正确加载
- 查看浏览器控制台错误
- 验证数据格式

### 日志查看

**后端日志:**
```bash
# 查看 FastAPI 日志
tail -f uvicorn.log
```

**前端日志:**
```bash
# 浏览器开发者工具 -> Console
```

## 部署指南

### 开发环境
- 使用提供的启动脚本
- 支持热重载和实时调试

### 生产环境

**后端部署:**
```bash
# 使用 Gunicorn
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**前端部署:**
```bash
# 构建生产版本
npm run build

# 使用 Nginx 或其他 Web 服务器托管 dist/ 目录
```

## 扩展开发

### 添加新的 API 端点
1. 在 `backend/app/api/endpoints/` 创建新文件
2. 在 `backend/app/main.py` 注册路由
3. 更新前端调用逻辑

### 自定义图表样式
1. 修改 `frontend/src/components/KnowledgeGraph.vue`
2. 调整 D3.js 配置和样式
3. 添加新的交互功能

### 集成其他 AI 模型
1. 修改 `backend/app/core/rte.py`
2. 更新 API 调用逻辑
3. 适配响应格式

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目！

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建 GitHub Issue
- 发送邮件至项目维护者

---

**享受使用 DeepSeek AI 框架！** 🚀 