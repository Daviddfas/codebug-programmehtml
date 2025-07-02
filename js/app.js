// ========== 全局变量和配置 ==========
let conversations = JSON.parse(localStorage.getItem('deepseek_multi_bubble_conversations') || '[]');
let currentConversationId = null;
let messageIdCounter = 0;
let isStreaming = false;
let userProfile = JSON.parse(localStorage.getItem('user_profile') || '{"name": "用户", "email": "", "bio": "", "location": "", "avatar": "", "status": "在线"}');

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-a8bdaf6587624ff4a0ceb4d16c6ead80';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 系统提示词
const SYSTEM_PROMPT = `你是DeepSeek AI，一个智能、有用、无害的AI助手。请遵循以下要求：

1. 保持友好、专业的对话风格
2. 提供准确、有用的信息和建议
3. 如果不确定答案，请诚实说明
4. 支持中文对话，回答要自然流畅
5. 可以进行深度思考和分析
6. 尊重用户隐私，不记录敏感信息
7. 鼓励积极正面的对话
8. 回答时适当使用段落分隔，便于阅读
9. 对于较长的回复，请使用段落分隔，每个段落表达一个完整的观点
10.核心在于用明确有效的语言解决用户问题

请根据用户的问题提供最佳的回答。`;

// ========== 拖拽功能 ==========
let draggedContent = '';

function handleDragStart(e) {
    draggedContent = e.target.dataset.originalContent;
    e.target.style.cursor = 'grabbing';
    e.target.style.opacity = '0.7';
    
    // 设置拖拽数据
    e.dataTransfer.setData('text/plain', draggedContent);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 高亮目标区域
    const graphPanel = document.querySelector('.graph-panel');
    if (graphPanel) {
        graphPanel.classList.add('drag-target');
    }
}

function handleDragEnd(e) {
    e.target.style.cursor = 'grab';
    e.target.style.opacity = '1';
    
    // 移除目标区域高亮
    const graphPanel = document.querySelector('.graph-panel');
    if (graphPanel) {
        graphPanel.classList.remove('drag-target');
    }
}

// 为右侧图表区域添加拖放支持
function setupGraphDropZone() {
    const graphPanel = document.querySelector('.graph-panel');
    if (!graphPanel) return;
    
    graphPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    graphPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        const content = e.dataTransfer.getData('text/plain');
        
        if (content && content.trim()) {
            // 生成动态图
            generateGraphFromContent(content);
            
            // 显示提示
            showDropNotification('动态关系图已生成！');
        }
    });
}

function showDropNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'drop-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// ========== 应用初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('应用初始化...');
    loadConversations();
    loadCurrentConversation();
    
    // 绑定发送按钮事件
    const sendButton = document.getElementById('sendMessage');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // 绑定回车键发送
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // 初始化个人资料
    loadUserProfile();
    
    // 设置拖放区域
    setupGraphDropZone();
    
    console.log('应用初始化完成');
});

// ========== 用户资料管理 ==========
function loadUserProfile() {
    document.getElementById('profileName').textContent = userProfile.name;
    document.getElementById('profileStatus').textContent = userProfile.status;
    
    if (userProfile.avatar) {
        document.getElementById('profileAvatarImg').src = userProfile.avatar;
        document.getElementById('profileAvatarImg').style.display = 'block';
        document.getElementById('profileAvatarText').style.display = 'none';
        
        document.getElementById('modalAvatarImg').src = userProfile.avatar;
        document.getElementById('modalAvatarImg').style.display = 'block';
        document.getElementById('modalAvatarText').style.display = 'none';
    }
    
    // 填充表单
    document.getElementById('userName').value = userProfile.name;
    document.getElementById('userEmail').value = userProfile.email;
    document.getElementById('userBio').value = userProfile.bio;
    document.getElementById('userLocation').value = userProfile.location;
}

function saveUserProfile() {
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarUrl = e.target.result;
            userProfile.avatar = avatarUrl;
            
            document.getElementById('profileAvatarImg').src = avatarUrl;
            document.getElementById('profileAvatarImg').style.display = 'block';
            document.getElementById('profileAvatarText').style.display = 'none';
            
            document.getElementById('modalAvatarImg').src = avatarUrl;
            document.getElementById('modalAvatarImg').style.display = 'block';
            document.getElementById('modalAvatarText').style.display = 'none';
            
            saveUserProfile();
        };
        reader.readAsDataURL(file);
    }
}

function handleModalAvatarUpload(event) {
    handleAvatarUpload(event);
}

function openProfileModal() {
    document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
}

function saveProfile(event) {
    event.preventDefault();
    
    userProfile.name = document.getElementById('userName').value;
    userProfile.email = document.getElementById('userEmail').value;
    userProfile.bio = document.getElementById('userBio').value;
    userProfile.location = document.getElementById('userLocation').value;
    
    saveUserProfile();
    loadUserProfile();
    closeProfileModal();
    
    alert('个人资料已保存！');
}

function toggleStatus() {
    const statuses = ['在线', '忙碌', '离开', '隐身'];
    const currentIndex = statuses.indexOf(userProfile.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    userProfile.status = statuses[nextIndex];
    
    document.getElementById('profileStatus').textContent = userProfile.status;
    saveUserProfile();
}

// ========== 事件监听器设置 ==========
function setupEventListeners() {
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

// ========== 对话管理 ==========
function loadConversations() {
    const conversationsList = document.getElementById('conversationsList');
    conversationsList.innerHTML = '';
    
    conversations.forEach(conversation => {
        const conversationElement = createConversationElement(conversation);
        conversationsList.appendChild(conversationElement);
    });
}

function createConversationElement(conversation) {
    const div = document.createElement('div');
    div.className = 'conversation-item';
    div.dataset.conversationId = conversation.id;
    
    if (conversation.id === currentConversationId) {
        div.classList.add('active');
    }
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage ? 
        (lastMessage.role === 'user' ? lastMessage.content : 'AI: ' + lastMessage.content) : 
        '新对话';
    
    div.innerHTML = `
        <div class="conversation-title">${conversation.title}</div>
        <div class="conversation-preview">${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}</div>
        <div class="conversation-time">${formatTime(conversation.updatedAt)}</div>
    `;
    
    div.addEventListener('click', () => {
        loadConversation(conversation.id);
    });
    
    return div;
}

function startNewConversation() {
    const newConversation = {
        id: Date.now().toString(),
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    conversations.unshift(newConversation);
    saveConversations();
    loadConversations();
    loadConversation(newConversation.id);
}

function loadConversation(conversationId) {
    currentConversationId = conversationId;
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) return;
    
    // 更新UI中的活跃状态
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.conversationId === conversationId) {
            item.classList.add('active');
        }
    });
    
    // 清空并重新加载消息
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    conversation.messages.forEach(message => {
        displayMessage(message.content, message.role, new Date(message.timestamp));
    });
    
    scrollToBottom();
}

function saveConversations() {
    localStorage.setItem('deepseek_multi_bubble_conversations', JSON.stringify(conversations));
}

// ========== 消息处理 ==========
function displayMessage(content, role, timestamp = new Date()) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = createMessageElement(content, role, timestamp);
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(content, role, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'user' ? 
        (userProfile.avatar ? `<img src="${userProfile.avatar}" />` : userProfile.name.charAt(0)) :
        'AI';
    
    // 渲染Markdown内容
    const renderedContent = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content" ${role === 'assistant' ? 'draggable="true"' : ''}>
            ${renderedContent}
            <div class="message-time">${timestamp.toLocaleTimeString()}</div>
        </div>
    `;
    
    // 如果是AI消息，添加拖拽功能
    if (role === 'assistant') {
        const messageContent = messageDiv.querySelector('.message-content');
        
        // 存储原始内容用于动态图生成
        messageContent.dataset.originalContent = content;
        
        // 添加拖拽事件监听器
        messageContent.addEventListener('dragstart', handleDragStart);
        messageContent.addEventListener('dragend', handleDragEnd);
        
        // 添加拖拽提示
        messageContent.style.cursor = 'grab';
        messageContent.title = '拖拽到右侧生成动态关系图';
    }
    
    // 如果是AI消息且包含LaTeX，重新渲染数学公式
    if (role === 'assistant' && (content.includes('$') || content.includes('\\('))) {
        setTimeout(() => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([messageDiv]).catch(err => console.error('MathJax error:', err));
            }
        }, 100);
    }
    
    // 代码高亮
    if (role === 'assistant') {
        setTimeout(() => {
            const codeBlocks = messageDiv.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                if (window.Prism) {
                    window.Prism.highlightElement(block);
                }
            });
        }, 50);
    }
    
    return messageDiv;
}

function updateConversationTitle(conversationId, newTitle) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
        conversation.title = newTitle;
        conversation.updatedAt = new Date().toISOString();
        saveConversations();
        loadConversations();
    }
}

// ========== DeepSeek API调用 ==========
async function sendMessage(messageText = null) {
    const chatInput = document.getElementById('chatInput');
    const message = messageText || chatInput.value.trim();
    
    if (!message || isStreaming) return;
    
    isStreaming = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // 显示用户消息
    const timestamp = new Date();
    displayMessage(message, 'user', timestamp);
    
    // 保存用户消息到当前对话
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: timestamp.toISOString()
        });
        
        // 如果是新对话的第一条消息，更新标题
        if (conversation.messages.length === 1) {
            const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
            updateConversationTitle(currentConversationId, title);
        }
    }
    
    showLoading();
    
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...conversation.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 2048
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 创建AI消息元素
        const aiTimestamp = new Date();
        const aiMessageElement = createMessageElement('', 'assistant', aiTimestamp);
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.appendChild(aiMessageElement);
        
        // 创建内容容器
        const contentContainer = aiMessageElement.querySelector('.message-content');
        const timeElement = contentContainer.querySelector('.message-time');
        
        // 创建一个用于显示流式内容的元素
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'streaming-content';
        contentContainer.insertBefore(streamingDiv, timeElement);
        
        let fullResponse = '';
        let renderTimeout = null;
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            
                            // 实时显示原始文本，避免频繁Markdown渲染
                            streamingDiv.innerHTML = `<pre class="streaming-text">${escapeHtml(fullResponse).replace('<p>', '').replace('</p>', '')}</pre>`;
                            
                            // 延迟渲染Markdown，减少性能开销
                            clearTimeout(renderTimeout);
                            renderTimeout = setTimeout(() => {
                                streamingDiv.innerHTML = renderMarkdown(fullResponse);
                                // 重新渲染数学公式
                                if (fullResponse.includes('$') || fullResponse.includes('\\(')) {
                                    if (window.MathJax && window.MathJax.typesetPromise) {
                                        window.MathJax.typesetPromise([streamingDiv]).catch(err => console.error('MathJax error:', err));
                                    }
                                }
                                // 代码高亮
                                const codeBlocks = streamingDiv.querySelectorAll('pre code');
                                codeBlocks.forEach(block => {
                                    if (window.Prism) {
                                        window.Prism.highlightElement(block);
                                    }
                                });
                            }, 300);
                            
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error('JSON parse error:', e);
                    }
                }
            }
        }
        
        // 最终渲染完整内容
        streamingDiv.innerHTML = renderMarkdown(fullResponse);
        
        // 最终数学公式渲染
        if (fullResponse.includes('$') || fullResponse.includes('\\(')) {
            setTimeout(() => {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise([streamingDiv]).catch(err => console.error('MathJax error:', err));
                }
            }, 100);
        }
        
        // 最终代码高亮
        setTimeout(() => {
            const codeBlocks = streamingDiv.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                if (window.Prism) {
                    window.Prism.highlightElement(block);
                }
            });
        }, 50);
        
        // 保存AI回复到对话历史
        if (conversation) {
            conversation.messages.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: aiTimestamp.toISOString()
            });
            conversation.updatedAt = new Date().toISOString();
            saveConversations();
            loadConversations();
        }
        
        // 基于AI回复生成动态图表
        generateExampleGraph(fullResponse);
        
    } catch (error) {
        console.error('Error:', error);
        displayMessage('抱歉，发生了错误。请稍后重试。', 'assistant');
    } finally {
        hideLoading();
        isStreaming = false;
    }
}

// ========== 工具函数 ==========
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
}

function deleteConversation(conversationId) {
    if (confirm('确定要删除这个对话吗？')) {
        conversations = conversations.filter(c => c.id !== conversationId);
        saveConversations();
        loadConversations();
        
        if (currentConversationId === conversationId) {
            if (conversations.length > 0) {
                loadConversation(conversations[0].id);
            } else {
                startNewConversation();
            }
        }
    }
}

function clearCurrentChat() {
    if (confirm('确定要清空当前对话吗？')) {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation) {
            conversation.messages = [];
            saveConversations();
            loadConversation(currentConversationId);
        }
    }
}

function exportChat() {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation || conversation.messages.length === 0) {
        alert('当前对话为空，无法导出！');
        return;
    }

    let exportText = `对话标题: ${conversation.title}\n`;
    exportText += `导出时间: ${new Date().toLocaleString()}\n`;
    exportText += `消息数量: ${conversation.messages.length}\n\n`;
    exportText += '=' .repeat(50) + '\n\n';

    conversation.messages.forEach((message, index) => {
        const sender = message.role === 'user' ? userProfile.name : 'DeepSeek AI';
        
        const date = new Date(message.timestamp);
        const formattedTime = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        exportText += `${index + 1}. ${sender} (${formattedTime}):\n`;
        exportText += `${message.content}\n\n`;
    });

    // 创建下载链接
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ========== Markdown渲染函数 ==========
function renderMarkdown(content) {
    if (!content) return '';
    
    try {
        // 配置marked选项
        marked.setOptions({
            gfm: true,
            breaks: true,
            sanitize: false,
            highlight: function(code, lang) {
                if (lang && window.Prism && window.Prism.languages[lang]) {
                    return window.Prism.highlight(code, window.Prism.languages[lang], lang);
                }
                return code;
            }
        });
        
        // 预处理LaTeX公式，避免被Markdown解析破坏
        const processedContent = content
            // 保护显示公式 $$...$$
            .replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
                return `<div class="math-display">$$${formula}$$</div>`;
            })
            // 保护行内公式 $...$
            .replace(/\$([^$\n]+?)\$/g, (match, formula) => {
                return `<span class="math-inline">$${formula}$</span>`;
            })
            // 保护LaTeX命令格式
            .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
                return `<div class="math-display">${match}</div>`;
            });
        
        // 渲染Markdown
        let html = marked.parse(processedContent);
        
        // 优化表格样式
        html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
        html = html.replace(/<\/table>/g, '</table></div>');
        
        return html;
        
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        return `<p>${escapeHtml(content)}</p>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return `<p>${div.innerHTML}</p>`;
} 