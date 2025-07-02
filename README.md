# AI 对话 + 动态关系图 Web 应用

这是一个集成了AI对话和动态关系图可视化的现代化Web应用，采用模块化架构设计，实现了左右分栏布局，提供流畅的用户交互体验。

## 🌟 功能特性

### 核心功能
- **AI智能对话**: 基于DeepSeek API的流式对话
- **动态关系图**: 实时生成概念关系可视化图表
- **拖拽交互**: 拖拽AI回复消息生成关系图
- **多格式支持**: 完整的Markdown和LaTeX数学公式渲染
- **对话管理**: 多对话历史保存和管理
- **个人资料**: 自定义用户信息和头像

### 交互特性
- **无延迟拖拽**: 优化的力导向布局，节点拖拽零延迟响应
- **消息拖拽生图**: 拖拽AI回复消息到右侧图表区域生成动态关系图
- **智能节点交互**: 点击节点弹出浮动输入框，支持深入提问
- **概念层级提取**: 自动识别文本中的核心概念和层级关系
- **实时流式显示**: AI回复实时显示，延迟渲染优化性能

## 📁 项目结构

```
Codebug/
├── index.html          # 主入口文件 - 完整的HTML结构
├── css/                # 样式文件夹
│   ├── main.css       # 主要布局和UI样式
│   ├── graph.css      # 图表专用样式  
│   └── modal.css      # 模态框样式
├── js/                 # JavaScript文件夹
│   ├── app.js         # 应用核心逻辑
│   └── graph.js       # 图表渲染和交互
├── assets/             # 资源文件夹
└── README.md          # 项目说明文档
```

## 🏗️ 架构设计

### 1. 模块化设计
项目采用清晰的模块化架构，职责分离：

- **index.html**: 结构层，定义完整的DOM结构
- **css/main.css**: 表现层，负责布局、UI组件和交互样式
- **css/graph.css**: 图表专用样式，包含D3.js可视化元素样式
- **css/modal.css**: 模态框组件样式
- **js/app.js**: 逻辑层，处理应用核心功能
- **js/graph.js**: 可视化层，专门处理D3.js图表逻辑

### 2. 组件化布局
```
┌─────────────────────────────────────────────────────────────┐
│                    主容器 (.main-container)                  │
├─────────────────┬───────────────────────────────────────────┤
│   左侧边栏       │              主内容区                      │
│ (.sidebar)      │         (.content-area)                   │
│                 ├───────────────┬───────────────────────────┤
│ - 用户信息       │   聊天界面     │      动态图表面板          │
│ - 对话历史       │ (.chat-panel) │   (.graph-panel)          │
│ - 新建对话       │               │                           │
│                 │ - 聊天头部     │ - D3.js力导向图           │
│                 │ - 消息区域     │ - 节点拖拽交互            │
│                 │ - 输入框      │ - 浮动输入框              │
└─────────────────┴───────────────┴───────────────────────────┘
```

## 💻 核心代码逻辑详解

### 1. 应用初始化 (app.js)

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // 1. 数据层初始化
    loadConversations();        // 加载本地存储的对话历史
    loadCurrentConversation();  // 恢复当前对话状态
    loadUserProfile();         // 加载用户个人资料
    
    // 2. 事件绑定
    setupEventListeners();     // 绑定发送按钮和回车键事件
    setupGraphDropZone();      // 设置拖拽目标区域
    
    // 3. UI组件初始化
    initializeGraph();         // 初始化D3.js图表容器
});
```

### 2. 消息处理流程

#### 发送消息 (`sendMessage` 函数)
```javascript
async function sendMessage(messageText = null) {
    // 1. 输入验证和预处理
    const message = messageText || document.getElementById('userInput').value.trim();
    if (!message) return;
    
    // 2. UI状态更新
    displayMessage(message, 'user');          // 显示用户消息
    showLoading();                           // 显示加载状态
    clearInput();                           // 清空输入框
    
    // 3. 调用AI API (流式响应)
    const response = await callDeepSeekAPI(message);
    
    // 4. 流式数据处理
    const reader = response.body.getReader();
    let fullResponse = '';
    
    while (!done) {
        const chunk = await reader.read();
        // 实时更新显示，延迟渲染优化性能
        updateStreamingDisplay(chunk);
        fullResponse += parseChunk(chunk);
    }
    
    // 5. 后处理
    renderFinalContent(fullResponse);        // 最终内容渲染
    saveToConversation(fullResponse);        // 保存到对话历史
    generateExampleGraph(fullResponse);      // 生成动态关系图
}
```

#### 消息创建 (`createMessageElement` 函数)
```javascript
function createMessageElement(content, role, timestamp) {
    // 1. 基础DOM结构创建
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // 2. AI消息特殊处理 - 添加拖拽功能
    if (role === 'assistant') {
        const messageContent = messageDiv.querySelector('.message-content');
        
        // 存储原始内容用于图表生成
        messageContent.dataset.originalContent = content;
        messageContent.draggable = true;
        
        // 绑定拖拽事件
        messageContent.addEventListener('dragstart', handleDragStart);
        messageContent.addEventListener('dragend', handleDragEnd);
        
        // 视觉提示
        messageContent.style.cursor = 'grab';
        messageContent.title = '拖拽到右侧生成动态关系图';
    }
    
    // 3. 内容渲染
    const renderedContent = role === 'assistant' ? 
        renderMarkdown(content) : escapeHtml(content);
    
    // 4. 延迟渲染数学公式和代码高亮
    setTimeout(() => {
        renderMathJax(messageDiv);
        highlightCode(messageDiv);
    }, 100);
    
    return messageDiv;
}
```

### 3. 拖拽交互系统

#### 拖拽开始 (`handleDragStart`)
```javascript
function handleDragStart(e) {
    // 1. 数据准备
    draggedContent = e.target.dataset.originalContent;
    e.dataTransfer.setData('text/plain', draggedContent);
    
    // 2. 视觉反馈
    e.target.style.opacity = '0.7';
    e.target.style.cursor = 'grabbing';
    
    // 3. 目标区域高亮
    const graphPanel = document.querySelector('.graph-panel');
    graphPanel.classList.add('drag-target');  // 触发CSS动画和提示
}
```

#### 拖拽目标处理 (`setupGraphDropZone`)
```javascript
function setupGraphDropZone() {
    const graphPanel = document.querySelector('.graph-panel');
    
    // 拖拽悬停处理
    graphPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    // 拖拽释放处理
    graphPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        const content = e.dataTransfer.getData('text/plain');
        
        if (content && content.trim()) {
            generateGraphFromContent(content);  // 核心：生成图表
            showDropNotification('动态关系图已生成！');
        }
    });
}
```

### 4. 动态图表系统 (graph.js)

#### 概念提取算法 (`extractConceptsHierarchy`)
```javascript
function extractConceptsHierarchy(text) {
    // 1. 文本预处理
    const cleanText = text.replace(/```[\s\S]*?```/g, '')  // 移除代码块
                         .replace(/\$\$[\s\S]*?\$\$/g, '') // 移除数学公式
                         .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 2. 核心概念识别 (一级节点)
    const corePatterns = [
        /(?:什么是|介绍一下|解释一下|概念|定义)([^。！？\n]{2,20})/g,
        /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,  // 英文术语
        /([一二三四五六七八九十]+[、.][\s]*([^。！？\n]{2,15}))/g
    ];
    
    const coreNodes = new Set();
    corePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(cleanText)) !== null) {
            const concept = match[1] || match[2];
            if (concept && isValidConcept(concept)) {
                coreNodes.add(concept.trim());
            }
        }
    });
    
    // 3. 层级关系建立
    const secondaryNodes = extractSecondaryNodes(cleanText, coreNodes);
    const applicationNodes = extractApplicationNodes(cleanText, coreNodes);
    
    // 4. 数据结构构建
    return buildGraphData(coreNodes, secondaryNodes, applicationNodes);
}
```

#### 力导向图渲染 (`updateGraph`)
```javascript
function updateGraph(graphData) {
    // 1. SVG容器准备
    const container = d3.select("#graph-container");
    container.selectAll("*").remove();  // 清空旧图表
    
    const svg = container.append("svg")
                        .attr("width", width)
                        .attr("height", height);
    
    // 2. 力导向模拟器设置
    const simulation = d3.forceSimulation(graphData.nodes)
        .force("link", d3.forceLink(graphData.links)
                        .id(d => d.id)
                        .distance(d => getLinkDistance(d)))
        .force("charge", d3.forceManyBody()
                          .strength(d => getNodeCharge(d)))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
                             .radius(d => (d.size || 10) + 5));
    
    // 3. 连接线渲染
    const link = svg.append("g")
                   .selectAll("line")
                   .data(graphData.links)
                   .join("line")
                   .attr("class", "link")
                   .style("stroke-width", d => Math.sqrt(d.value || 1) * 1.5)
                   .style("opacity", d => getLinkOpacity(d.type));
    
    // 4. 节点组创建
    const node = svg.append("g")
                   .selectAll("g")
                   .data(graphData.nodes)
                   .join("g")
                   .attr("class", "node")
                   .call(d3.drag()  // 拖拽行为绑定
                         .on("start", dragstarted)
                         .on("drag", dragged)
                         .on("end", dragended));
    
    // 5. 节点圆圈
    const circles = node.append("circle")
                       .attr("r", 0)  // 初始大小为0，用于动画
                       .attr("fill", d => getNodeColor(d))
                       .attr("stroke", d => getNodeStroke(d))
                       .on("click", handleNodeClick)
                       .on("mouseenter", handleNodeHover)
                       .on("mouseleave", handleNodeLeave);
    
    // 6. 节点标签
    const labels = node.append("text")
                      .attr("dx", d => (d.size || 10) + 8)
                      .attr("dy", ".35em")
                      .text(d => d.id)
                      .style("font-size", d => `${Math.max(10, (d.size || 10) * 0.5)}px`);
    
    // 7. 动画效果
    circles.transition()
           .duration(800)
           .attr("r", d => d.size || 10)
           .ease(d3.easeElastic);
    
    // 8. 模拟更新回调
    simulation.on("tick", () => {
        // 边界约束
        graphData.nodes.forEach(d => {
            d.x = Math.max(margin, Math.min(width - margin, d.x));
            d.y = Math.max(margin, Math.min(height - margin, d.y));
        });
        
        // 位置更新
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}
```

#### 无延迟拖拽系统
```javascript
function dragstarted(event, d) {
    // 关键：立即停止模拟，消除延迟
    simulation.stop();
    d.fx = d.x;
    d.fy = d.y;
    
    // 视觉反馈
    d3.select(this).classed("dragging", true)
                   .select("circle")
                   .attr("r", (d.size || 10) * 1.1)
                   .style("filter", "drop-shadow(4px 4px 8px rgba(124, 58, 237, 0.4))");
}

function dragged(event, d) {
    // 关键：立即更新位置，无缓冲
    d.fx = event.x;
    d.fy = event.y;
    d.x = d.fx;  // 同步更新实际位置
    d.y = d.fy;
    
    // 立即更新所有相关连接线
    link.filter(l => l.source === d || l.target === d)
        .attr("x1", l => l.source.x)
        .attr("y1", l => l.source.y)
        .attr("x2", l => l.target.x)
        .attr("y2", l => l.target.y);
    
    // 立即更新节点组位置
    d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
}

function dragended(event, d) {
    // 短暂延迟后重新启动模拟
    setTimeout(() => {
        d.fx = null;
        d.fy = null;
        simulation.alpha(0.1).restart();
    }, 300);
}
```

### 5. Markdown和LaTeX渲染系统

#### Markdown渲染 (`renderMarkdown`)
```javascript
function renderMarkdown(content) {
    // 1. 预处理LaTeX公式，防止被Markdown破坏
    const processedContent = content
        .replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            return `<div class="math-display">$$${formula}$$</div>`;
        })
        .replace(/\$([^$\n]+?)\$/g, (match, formula) => {
            return `<span class="math-inline">$${formula}$</span>`;
        });
    
    // 2. 配置Marked选项
    marked.setOptions({
        gfm: true,           // GitHub风格Markdown
        breaks: true,        // 支持换行
        highlight: function(code, lang) {
            // 代码高亮集成
            if (lang && window.Prism && window.Prism.languages[lang]) {
                return window.Prism.highlight(code, window.Prism.languages[lang], lang);
            }
            return code;
        }
    });
    
    // 3. 渲染并优化表格
    let html = marked.parse(processedContent);
    html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
    html = html.replace(/<\/table>/g, '</table></div>');
    
    return html;
}
```

#### 流式渲染优化
```javascript
// 在sendMessage中的流式处理
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const content = parseStreamChunk(value);
    fullResponse += content;
    
    // 实时显示原始文本，避免频繁Markdown渲染
    streamingDiv.innerHTML = `<pre class="streaming-text">${escapeHtml(fullResponse)}</pre>`;
    
    // 延迟渲染Markdown，减少性能开销
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        streamingDiv.innerHTML = renderMarkdown(fullResponse);
        renderMathJax(streamingDiv);
        highlightCode(streamingDiv);
    }, 300);
}
```

### 6. 数据持久化系统

#### 对话数据结构
```javascript
const conversationSchema = {
    id: "唯一标识符",
    title: "对话标题",
    messages: [
        {
            role: "user|assistant",
            content: "消息内容",
            timestamp: "ISO时间戳"
        }
    ],
    createdAt: "创建时间",
    updatedAt: "更新时间"
};
```

#### 本地存储管理
```javascript
function saveConversations() {
    try {
        localStorage.setItem('conversations', JSON.stringify(conversations));
        localStorage.setItem('currentConversationId', currentConversationId);
    } catch (error) {
        console.error('保存对话失败:', error);
    }
}

function loadConversations() {
    try {
        const saved = localStorage.getItem('conversations');
        conversations = saved ? JSON.parse(saved) : [];
        currentConversationId = localStorage.getItem('currentConversationId');
    } catch (error) {
        console.error('加载对话失败:', error);
        conversations = [];
    }
}
```

## 🎨 样式设计系统

### 1. CSS变量系统
```css
:root {
    /* 主题色彩 */
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --secondary-gradient: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    
    /* 布局参数 */
    --sidebar-width: 280px;
    --header-height: 60px;
    --border-radius: 12px;
    
    /* 过渡效果 */
    --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 2. 响应式设计
```css
/* 移动设备适配 */
@media (max-width: 768px) {
    .main-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
        position: static;
    }
    
    .content-area {
        flex-direction: column;
    }
    
    .chat-panel, .graph-panel {
        width: 100%;
        min-height: 400px;
    }
}
```

### 3. 动画系统
```css
/* 节点动画 */
@keyframes nodeEntry {
    from {
        transform: scale(0);
        opacity: 0;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}

/* 消息气泡动画 */
.message {
    animation: messageSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: left center;
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateX(-20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateX(0) scale(1);
    }
}
```

## 🔧 使用方法

### 1. 快速开始
```bash
# 1. 克隆项目
git clone <repository-url>

# 2. 进入项目目录
cd Codebug

# 3. 启动本地服务器 (推荐)
python -m http.server 8000
# 或者使用Node.js
npx serve .

# 4. 打开浏览器访问
http://localhost:8000
```

### 2. 配置API密钥
在`js/app.js`中找到API配置部分：
```javascript
const API_CONFIG = {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: 'YOUR_API_KEY_HERE',  // 替换为你的DeepSeek API密钥
    model: 'deepseek-chat'
};
```

### 3. 基础使用
1. **发送消息**: 在输入框输入问题，按回车或点击发送
2. **查看动态图**: AI回复后右侧自动生成关系图
3. **拖拽交互**: 拖拽AI消息到右侧生成新的关系图
4. **节点交互**: 点击图表节点弹出输入框进行深入提问
5. **对话管理**: 左侧边栏管理多个对话历史

### 4. 高级功能

#### 4.1 拖拽生成动态图
- **拖拽提示**: AI消息内容可拖拽，鼠标悬停显示抓手图标
- **目标区域**: 拖拽到右侧图表区域时显示高亮提示
- **实时生成**: 释放鼠标后立即根据消息内容生成专属关系图
- **成功反馈**: 生成完成后显示通知提示

#### 4.2 无延迟节点拖拽
- **即时响应**: 节点拖拽时立即停止力导向模拟
- **同步更新**: 拖拽过程中连接线实时跟随节点移动
- **边界约束**: 节点不会被拖出画布边界
- **自然回弹**: 释放后短暂延迟重新启动物理模拟

#### 4.3 多格式内容支持
- **Markdown渲染**: 完整支持GitHub风格Markdown
- **LaTeX数学公式**: 支持行内`$公式$`和块级`$$公式$$`
- **代码高亮**: 自动识别语言并进行语法高亮
- **表格优化**: 美观的表格样式和响应式布局

## 🚀 技术栈

### 前端框架
- **原生JavaScript ES6+**: 核心逻辑实现
- **D3.js v7**: 数据可视化和力导向图
- **Marked.js**: Markdown渲染
- **MathJax 3**: LaTeX数学公式渲染
- **Prism.js**: 代码语法高亮

### 样式技术
- **CSS3 现代特性**: Grid, Flexbox, CSS变量
- **渐变和动画**: 丰富的视觉效果
- **响应式设计**: 移动设备友好

### API集成
- **DeepSeek API**: 流式AI对话
- **Fetch API**: 现代HTTP请求
- **Stream处理**: 实时数据流解析

## 📈 性能优化

### 1. 渲染优化
- **延迟渲染**: Markdown和LaTeX延迟300ms渲染
- **虚拟滚动**: 大量消息时的滚动优化
- **节流和防抖**: 事件处理优化

### 2. 内存管理
- **DOM回收**: 及时清理不需要的DOM元素
- **事件清理**: 组件销毁时清理事件监听器
- **图表重用**: D3.js图表容器重用机制

### 3. 交互优化
- **无延迟拖拽**: 暂停力导向模拟实现即时响应
- **平滑动画**: 使用easing函数创造自然的动画效果
- **视觉反馈**: 及时的用户操作反馈

## 🐛 调试指南

### 1. 常见问题
- **API调用失败**: 检查网络连接和API密钥
- **图表不显示**: 确认D3.js库正确加载
- **数学公式不渲染**: 检查MathJax配置和网络访问

### 2. 开发者工具
- **控制台日志**: 详细的调试信息输出
- **性能监控**: Network和Performance面板监控
- **本地存储**: Application面板查看localStorage数据

### 3. 错误处理
```javascript
// 完善的错误处理机制
try {
    await callDeepSeekAPI(message);
} catch (error) {
    console.error('API调用错误:', error);
    displayErrorMessage('网络连接失败，请检查网络设置');
    hideLoading();
}
```

## 📋 更新日志

### v2.1.0 (最新)
- ✅ **无延迟拖拽优化**: 重写拖拽系统，实现零延迟节点拖拽
- ✅ **消息拖拽生图**: 新增拖拽AI消息到图表区域生成动态关系图功能  
- ✅ **界面简化**: 移除右上角功能按钮，简化界面布局
- ✅ **性能优化**: 优化力导向模拟，提升交互流畅度
- ✅ **视觉反馈**: 增强拖拽过程中的视觉提示和动画效果

### v2.0.0
- ✅ **模块化重构**: 完全重构代码架构，分离CSS和JS文件
- ✅ **Markdown支持**: 完整的Markdown和LaTeX数学公式渲染
- ✅ **类Visuwords效果**: 实现类似Visuwords的动态图表交互
- ✅ **浮动输入框**: 点击节点显示就近浮动输入框
- ✅ **节点层级**: 智能概念提取和层级关系建立

### v1.0.0
- ✅ **基础框架**: 左右分栏布局，AI对话+动态图表
- ✅ **DeepSeek集成**: 流式API调用和实时消息显示
- ✅ **对话管理**: 多对话历史保存和切换
- ✅ **个人资料**: 用户信息和头像自定义

## 🔮 未来扩展

### 计划功能
- [ ] 多语言支持 (i18n)
- [ ] 主题切换 (明暗模式)
- [ ] 图表导出 (PNG/SVG)
- [ ] 对话分享功能
- [ ] 插件系统架构
- [ ] 离线模式支持

### 技术升级
- [ ] TypeScript重构
- [ ] Web Workers优化
- [ ] PWA渐进式应用
- [ ] WebAssembly集成

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎提交Issue和Pull Request！请遵循以下规范：
1. Fork项目到你的GitHub
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

---

**联系方式**: [GitHub Issues](https://github.com/your-repo/issues)
**文档更新**: 2024年最新版本 