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
    const graphPanel = document.querySelector('.graph-section');
    if (graphPanel) {
        graphPanel.classList.add('drag-target');
    }
}

function handleDragEnd(e) {
    e.target.style.cursor = 'grab';
    e.target.style.opacity = '1';
    
    // 移除目标区域高亮
    const graphPanel = document.querySelector('.graph-section');
    if (graphPanel) {
        graphPanel.classList.remove('drag-target');
    }
}

// 为右侧图表区域添加拖放支持
function setupGraphDropZone() {
    const graphPanel = document.querySelector('.graph-section');
    if (!graphPanel) {
        console.error('找不到图表区域 .graph-section');
        return;
    }
    
    console.log('✅ 图表拖拽区域初始化成功');
    
    // 添加提示文本
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
            z-index: 50;
            pointer-events: none;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 2px dashed #D1D5DB;
            text-align: center;
            max-width: 280px;
            transition: opacity 0.3s ease;
        ">
            💡 拖拽AI回复消息到此处<br/>生成动态关系图
        </div>
    `;
    graphPanel.appendChild(hintDiv);
    
    graphPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        console.log('🟡 拖拽悬停在图表区域');
    });
    
    graphPanel.addEventListener('dragenter', (e) => {
        e.preventDefault();
        console.log('🟢 进入图表拖拽区域');
    });
    
    graphPanel.addEventListener('dragleave', (e) => {
        console.log('🔴 离开图表拖拽区域');
    });
    
    graphPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        const content = e.dataTransfer.getData('text/plain');
        
        console.log('🎯 拖拽释放事件触发');
        console.log('📝 内容长度:', content ? content.length : 0);
        console.log('📄 内容预览:', content ? content.substring(0, 200) + '...' : '空内容');
        
        if (content && content.trim()) {
            console.log('🚀 开始生成动态图表...');
            
            // 检查函数是否存在
            if (typeof generateGraphFromContent === 'function') {
                try {
                    generateGraphFromContent(content);
                    showDropNotification('✅ 动态关系图生成成功！');
                    console.log('✅ 图表生成完成');
                } catch (error) {
                    console.error('❌ 图表生成出错:', error);
                    showDropNotification('❌ 图表生成失败: ' + error.message);
                }
            } else {
                console.error('❌ generateGraphFromContent 函数未找到');
                showDropNotification('❌ 生成图表失败：函数未加载');
            }
        } else {
            console.warn('⚠️ 拖拽内容为空');
            showDropNotification('⚠️ 拖拽内容为空，无法生成图表');
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
    
    // 等待DOM完全加载后再绑定事件
    setTimeout(() => {
        initializeEventHandlers();
    }, 100);
    
    loadConversations();
    loadCurrentConversation();
    loadUserProfile();
    setupGraphDropZone();
    setupEventListeners();
    
    console.log('应用初始化完成');
    
    // 测试Enter键功能
    setTimeout(() => {
        testEnterKeyFunction();
    }, 500);
});

// 专门的事件处理器初始化函数
function initializeEventHandlers() {
    console.log('🔧 开始初始化事件处理器...');
    
    // 调试：检查所有关键元素是否存在
    debugElementsStatus();
    
    // 绑定发送按钮事件
    const sendButton = document.getElementById('sendBtn');
    if (sendButton) {
        console.log('✅ 找到发送按钮，绑定点击事件');
        // 移除可能存在的旧事件监听器
        sendButton.removeEventListener('click', handleSendClick);
        sendButton.addEventListener('click', handleSendClick);
    } else {
        console.error('❌ 找不到sendBtn元素');
    }
    
    // 绑定输入框Enter键事件
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        console.log('✅ 找到输入框，绑定Enter键事件');
        // 移除可能存在的旧事件监听器
        chatInput.removeEventListener('keydown', handleEnterKey);
        chatInput.addEventListener('keydown', handleEnterKey);
        
        // 同时绑定keypress作为备选
        chatInput.removeEventListener('keypress', handleEnterKeyPress);
        chatInput.addEventListener('keypress', handleEnterKeyPress);
        
        // 为输入框添加焦点，确保可以接收键盘事件
        chatInput.focus();
    } else {
        console.error('❌ 找不到chatInput元素');
    }
    
    console.log('🎉 事件处理器初始化完成');
    
    // 添加全局键盘事件监听器作为备选方案
    document.addEventListener('keydown', function(e) {
        // 只在输入框获得焦点时处理Enter键
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'chatInput') {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🌐 全局Enter键监听器触发');
                sendMessage();
            }
        }
    });
}

// 调试函数：检查元素状态
function debugElementsStatus() {
    console.log('🔍 检查关键元素状态...');
    
    const elements = [
        { id: 'sendBtn', name: '发送按钮' },
        { id: 'chatInput', name: '输入框' },
        { id: 'chatMessages', name: '消息容器' },
        { id: 'graph-container', name: '图表容器' }
    ];
    
    elements.forEach(({ id, name }) => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${name} (${id}): 存在`, element);
        } else {
            console.error(`❌ ${name} (${id}): 不存在`);
        }
    });
}

// 发送按钮点击处理函数
function handleSendClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖱️ 发送按钮被点击');
    sendMessage();
}

// Enter键按下处理函数 (keydown)
function handleEnterKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔥 Enter键被按下 (keydown)');
        sendMessage();
    }
}

// Enter键按下处理函数 (keypress) - 备选方案
function handleEnterKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔥 Enter键被按下 (keypress)');
        sendMessage();
    }
}

// ========== 用户资料管理 ==========
function loadUserProfile() {
    // 从localStorage加载用户资料
    const saved = localStorage.getItem('userProfile');
    if (saved) {
        try {
            userProfile = JSON.parse(saved);
            console.log('加载用户资料:', userProfile);
        } catch (error) {
            console.error('解析用户资料失败:', error);
            userProfile = { name: '用户', avatar: '', status: '在线', email: '', bio: '', location: '' };
        }
    } else {
        // 使用默认值
        userProfile = { name: '用户', avatar: '', status: '在线', email: '', bio: '', location: '' };
        saveUserProfile(); // 保存默认配置
    }
    
    // 更新UI显示
    updateUserProfileUI();
}

function updateUserProfileUI() {
    // 安全地更新元素
    const profileName = document.getElementById('profileName');
    const profileStatus = document.getElementById('profileStatus');
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const profileAvatarText = document.getElementById('profileAvatarText');
    const modalAvatarImg = document.getElementById('modalAvatarImg');
    const modalAvatarText = document.getElementById('modalAvatarText');
    
    if (profileName) profileName.textContent = userProfile.name;
    if (profileStatus) profileStatus.textContent = userProfile.status;
    
    if (userProfile.avatar) {
        if (profileAvatarImg) {
            profileAvatarImg.src = userProfile.avatar;
            profileAvatarImg.style.display = 'block';
        }
        if (profileAvatarText) profileAvatarText.style.display = 'none';
        
        if (modalAvatarImg) {
            modalAvatarImg.src = userProfile.avatar;
            modalAvatarImg.style.display = 'block';
        }
        if (modalAvatarText) modalAvatarText.style.display = 'none';
    } else {
        if (profileAvatarImg) profileAvatarImg.style.display = 'none';
        if (profileAvatarText) {
            profileAvatarText.style.display = 'block';
            profileAvatarText.textContent = userProfile.name.charAt(0).toUpperCase();
        }
        
        if (modalAvatarImg) modalAvatarImg.style.display = 'none';
        if (modalAvatarText) {
            modalAvatarText.style.display = 'block';
            modalAvatarText.textContent = userProfile.name.charAt(0).toUpperCase();
        }
    }
    
    // 填充表单
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userBio = document.getElementById('userBio');
    const userLocation = document.getElementById('userLocation');
    
    if (userName) userName.value = userProfile.name || '';
    if (userEmail) userEmail.value = userProfile.email || '';
    if (userBio) userBio.value = userProfile.bio || '';
    if (userLocation) userLocation.value = userProfile.location || '';
}

function saveUserProfile() {
    try {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        console.log('保存用户资料:', userProfile);
    } catch (error) {
        console.error('保存用户资料失败:', error);
    }
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
    
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userBio = document.getElementById('userBio');
    const userLocation = document.getElementById('userLocation');
    
    if (userName) userProfile.name = userName.value;
    if (userEmail) userProfile.email = userEmail.value;
    if (userBio) userProfile.bio = userBio.value;
    if (userLocation) userProfile.location = userLocation.value;
    
    saveUserProfile();
    updateUserProfileUI();
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
    if (chatInput) {
        console.log('✅ 设置输入框高度自适应');
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 120);
            this.style.height = Math.max(newHeight, 50) + 'px';
        });
        
        // 确保初始高度正确
        chatInput.style.height = '50px';
    } else {
        console.error('❌ setupEventListeners: 找不到chatInput元素');
    }
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
    
    // 重置输入框高度
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.style.height = '50px';
        chatInput.value = '';
    }
    
    scrollToBottom();
}

function saveConversations() {
    localStorage.setItem('deepseek_multi_bubble_conversations', JSON.stringify(conversations));
}

// 加载当前对话
function loadCurrentConversation() {
    console.log('🔄 加载当前对话...');
    
    // 如果没有对话，创建一个新对话
    if (conversations.length === 0) {
        console.log('📝 没有对话历史，创建第一个对话');
        startNewConversation();
        return;
    }
    
    // 如果没有设置当前对话ID，选择第一个对话
    if (!currentConversationId) {
        currentConversationId = conversations[0].id;
        console.log('📌 设置当前对话ID:', currentConversationId);
    }
    
    // 加载选中的对话
    loadConversation(currentConversationId);
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
    console.log('📤 sendMessage函数被调用');
    const chatInput = document.getElementById('chatInput');
    const message = messageText || chatInput.value.trim();
    
    console.log('📝 消息内容:', message);
    console.log('🔄 当前streaming状态:', isStreaming);
    
    if (!message || isStreaming) {
        console.log('⚠️ 消息为空或正在streaming，退出');
        return;
    }
    
    isStreaming = true;
    
    // 重置输入框
    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
        // 确保按钮位置正确
        setTimeout(() => {
            chatInput.style.height = '50px';
        }, 10);
    }
    
    // 显示用户消息
    const timestamp = new Date();
    displayMessage(message, 'user', timestamp);
    
    // 保存用户消息到当前对话
    let conversation = conversations.find(c => c.id === currentConversationId);
    
    // 如果没有找到对话，创建一个新对话
    if (!conversation) {
        console.log('🆕 未找到当前对话，创建新对话');
        conversation = {
            id: Date.now().toString(),
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        conversations.unshift(conversation);
        currentConversationId = conversation.id;
        saveConversations();
        loadConversations();
    }
    
    conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: timestamp.toISOString()
    });
    
    // 如果是对话的第一条消息，更新标题
    if (conversation.messages.length === 1) {
        const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
        updateConversationTitle(currentConversationId, title);
    }
    
    console.log('💾 当前对话状态:', {
        id: conversation.id,
        title: conversation.title,
        messageCount: conversation.messages.length
    });
    
    showLoading();
    
    // 构建请求数据
    const requestData = {
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
    };
    
    console.log('🌐 API请求详情:');
    console.log('📍 URL:', DEEPSEEK_API_URL);
    console.log('🔑 API Key前6位:', DEEPSEEK_API_KEY.substring(0, 6) + '...');
    console.log('📦 请求数据:', requestData);
    console.log('💬 消息数量:', requestData.messages.length);
    
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('📡 API响应状态:', response.status);
        console.log('📡 API响应头:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('🚨 API错误响应:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
        console.error('🚨 API调用出错详情:', error);
        console.error('🚨 错误类型:', error.name);
        console.error('🚨 错误消息:', error.message);
        console.error('🚨 完整错误:', error);
        
        let errorMessage = '抱歉，发生了错误。';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = '网络连接失败，请检查网络连接后重试。';
        } else if (error.message.includes('401')) {
            errorMessage = 'API密钥无效，请检查配置。';
        } else if (error.message.includes('429')) {
            errorMessage = 'API调用次数超限，请稍后重试。';
        } else if (error.message.includes('500')) {
            errorMessage = '服务器内部错误，请稍后重试。';
        } else {
            errorMessage = `发生了错误：${error.message}`;
        }
        
        displayMessage(errorMessage, 'assistant');
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

// 测试Enter键功能的函数
function testEnterKeyFunction() {
    console.log('🧪 开始测试Enter键功能...');
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        console.log('📝 输入框状态:', {
            id: chatInput.id,
            tagName: chatInput.tagName,
            type: chatInput.type,
            placeholder: chatInput.placeholder,
            disabled: chatInput.disabled,
            readonly: chatInput.readOnly,
            focused: document.activeElement === chatInput
        });
        
        // 手动触发一个测试事件
        console.log('🔧 手动测试键盘事件...');
        const testEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        
        chatInput.dispatchEvent(testEvent);
        
    } else {
        console.error('❌ 测试失败：找不到输入框');
    }
} 