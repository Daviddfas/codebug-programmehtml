// ========== 后端适配的聊天应用 ==========

// 全局变量
let conversations = JSON.parse(localStorage.getItem('deepseek_multi_bubble_conversations') || '[]');
let currentConversationId = null;
let isStreaming = false;

// API配置
const BACKEND_API_URL = '/api';
const QA_STREAM_URL = `${BACKEND_API_URL}/qa/stream`;
const KG_EXTRACT_URL = `${BACKEND_API_URL}/kg/extract`;

// 应用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 应用初始化开始...');
    
    // 初始化各个模块
    initializeChat();
    initializeDragAndDrop();
    initializeUI();
    
    console.log('✅ 应用初始化完成');
});

// 初始化聊天功能
function initializeChat() {
    // 绑定发送按钮
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }
    
    // 加载对话历史
    loadConversations();
}

// 处理发送消息
async function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isStreaming) return;
    
    isStreaming = true;
    chatInput.value = '';
    
    // 显示用户消息
    displayMessage(message, 'user');
    
    // 显示加载状态
    showLoading();
    
    try {
        // 调用新的后端API
        const response = await fetch(QA_STREAM_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                system_prompt: localStorage.getItem('system_prompt') || ''
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        let assistantMessage = '';
        let messageElement = null;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            assistantMessage += data.content;
                            
                            // 更新或创建助手消息元素
                            if (!messageElement) {
                                messageElement = displayMessage(assistantMessage, 'assistant');
                            } else {
                                updateMessageContent(messageElement, assistantMessage);
                            }
                        }
                    } catch (e) {
                        console.error('解析流数据错误:', e);
                    }
                }
            }
        }
        
        // 保存对话到历史
        saveToConversation(message, assistantMessage);
        
    } catch (error) {
        console.error('API调用错误:', error);
        displayMessage('抱歉，遇到了一些问题。请稍后重试。', 'assistant');
    } finally {
        hideLoading();
        isStreaming = false;
    }
}

// 显示消息
function displayMessage(content, role) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (role === 'assistant') {
        // 处理Markdown渲染
        if (window.marked) {
            messageContent.innerHTML = window.marked.parse(content);
        } else {
            messageContent.textContent = content;
        }
        
        // 添加拖拽功能
        messageContent.draggable = true;
        messageContent.dataset.originalContent = content;
        messageContent.addEventListener('dragstart', handleDragStart);
        messageContent.addEventListener('dragend', handleDragEnd);
        
        // 数学公式渲染
        if (window.MathJax) {
            window.MathJax.typesetPromise([messageContent]).catch((err) => {
                console.log('MathJax渲染错误:', err);
            });
        }
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// 更新消息内容
function updateMessageContent(messageElement, content) {
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        if (window.marked) {
            messageContent.innerHTML = window.marked.parse(content);
        } else {
            messageContent.textContent = content;
        }
        messageContent.dataset.originalContent = content;
    }
}

// 初始化拖拽功能
function initializeDragAndDrop() {
    const graphSection = document.querySelector('.graph-section');
    if (!graphSection) return;
    
    // 添加拖拽提示
    const hintDiv = document.createElement('div');
    hintDiv.id = 'graph-hint';
    hintDiv.innerHTML = `
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #9CA3AF;
            font-size: 14px;
            text-align: center;
            pointer-events: none;
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 10px;
            border: 2px dashed #D1D5DB;
        ">
            💡 拖拽AI回复消息到此处<br/>生成动态关系图
        </div>
    `;
    graphSection.appendChild(hintDiv);
    
    // 拖拽事件
    graphSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    graphSection.addEventListener('drop', (e) => {
        e.preventDefault();
        const content = e.dataTransfer.getData('text/plain');
        
        if (content && content.trim()) {
            generateKnowledgeGraph(content);
        }
    });
}

// 拖拽开始
function handleDragStart(e) {
    const content = e.target.dataset.originalContent;
    e.dataTransfer.setData('text/plain', content);
    e.target.style.opacity = '0.7';
}

// 拖拽结束
function handleDragEnd(e) {
    e.target.style.opacity = '1';
}

// 生成知识图谱
async function generateKnowledgeGraph(content) {
    try {
        const response = await fetch(KG_EXTRACT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: content })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.triplets && data.triplets.length > 0) {
            renderGraph(data.triplets);
            showNotification('✅ 知识图谱生成成功！');
        } else {
            showNotification('⚠️ 未能从文本中提取到关系');
        }
        
    } catch (error) {
        console.error('知识图谱生成错误:', error);
        showNotification('❌ 知识图谱生成失败');
    }
}

// 渲染图表
function renderGraph(triplets) {
    const container = document.getElementById('graph-container');
    if (!container || !window.d3) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建图数据
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    
    triplets.forEach((triplet) => {
        const { h, t, r } = triplet;
        
        // 添加节点
        if (!nodeMap.has(h)) {
            nodes.push({
                id: h,
                group: Math.floor(Math.random() * 8) + 1,
                size: 20
            });
            nodeMap.set(h, true);
        }
        
        if (!nodeMap.has(t)) {
            nodes.push({
                id: t,
                group: Math.floor(Math.random() * 8) + 1,
                size: 20
            });
            nodeMap.set(t, true);
        }
        
        // 添加边
        links.push({
            source: h,
            target: t,
            value: 2,
            label: r
        });
    });
    
    // 创建SVG
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // 创建力导向布局
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    // 绘制边
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2);
    
    // 绘制节点
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', d => d.size)
        .attr('fill', d => d3.schemeCategory10[d.group % 10])
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // 添加标签
    const label = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .text(d => d.id)
        .attr('font-size', 12)
        .attr('text-anchor', 'middle');
    
    // 更新位置
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
    
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// 初始化UI
function initializeUI() {
    // 新对话按钮
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewConversation);
    }
    
    // 清空对话按钮
    const clearBtn = document.querySelector('.action-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCurrentChat);
    }
}

// 工具函数
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

function loadConversations() {
    // 简化的对话加载
    console.log('对话历史加载完成');
}

function saveToConversation(userMessage, assistantMessage) {
    // 简化的对话保存
    console.log('对话已保存:', userMessage, assistantMessage);
}

function startNewConversation() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    const title = document.getElementById('currentTitle');
    if (title) {
        title.textContent = '新对话';
    }
}

function clearCurrentChat() {
    startNewConversation();
}

// 全局函数，供其他脚本调用
window.sendMessage = handleSendMessage;
window.generateGraphFromContent = generateKnowledgeGraph; 