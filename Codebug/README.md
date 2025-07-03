# Codebug - AI聊天与知识图谱应用

这是一个基于DeepSeek AI的智能聊天应用，支持对话和知识图谱可视化功能。项目已重新整理为现代化的架构。

## 📁 项目结构

```
Codebug/
├── framework/                 # 🎯 主要框架（推荐使用）
│   └── framework/            
│       ├── backend/          # FastAPI后端服务
│       ├── frontend/         # Vue.js前端应用
│       ├── quick_start.bat   # Windows快速启动
│       ├── start_framework.sh # Linux/Mac启动
│       └── FRAMEWORK_README.md # 详细使用指南
├── codebug-1/                # 📦 传统前端（备份版本）
│   ├── index.html           # HTML入口
│   ├── js/                  # JavaScript文件
│   └── css/                 # 样式文件
├── 项目结构说明.md            # 📖 详细结构说明
└── README.md                # 本文件
```

## 🚀 快速开始

### 方案1：Framework（推荐）
现代化架构，功能完整，支持前后端分离。

```bash
cd framework/framework
# Windows用户
quick_start.bat
# Linux/Mac用户  
./start_framework.sh
```

### 方案2：Codebug-1（简单版）
传统HTML版本，无需安装，直接使用。

```bash
# 直接在浏览器中打开
open codebug-1/index.html
```

## ✨ 主要功能

- 🤖 **AI智能对话** - 基于DeepSeek API的流式响应
- 📊 **知识图谱** - 自动抽取关系三元组并可视化
- 🎯 **拖拽生成** - 拖拽AI回复生成动态关系图
- ⚙️ **系统配置** - 自定义提示词和参数设置
- 📱 **响应式设计** - 支持桌面和移动设备

## 🛠️ 技术栈

### Framework版本
- **后端**: FastAPI + Python 3.8+
- **前端**: Vue.js 3 + D3.js
- **AI**: DeepSeek API

### Codebug-1版本  
- **前端**: HTML/CSS/JavaScript
- **可视化**: D3.js
- **AI**: DeepSeek API

## 📖 详细文档

- 📋 [项目结构说明](./项目结构说明.md) - 完整的目录结构介绍
- 🎯 [Framework使用指南](./framework/framework/FRAMEWORK_README.md) - 现代化版本详细说明
- 💡 建议优先使用Framework版本进行开发和部署

## 🔧 环境要求

- Python 3.8+ （Framework版本）
- Node.js 14+ （Framework版本）
- 现代浏览器
- DeepSeek API密钥

## 📞 支持

如有问题，请参考对应版本的README文件或提交Issue。 