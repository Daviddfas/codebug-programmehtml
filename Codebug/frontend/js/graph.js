// ========== 动态图表渲染模块 ==========

let currentSimulation = null;
let currentFloatingInput = null;
let isNodeHovered = false; // 跟踪节点悬停状态

// 生成智能图表数据
function generateExampleGraph(aiResponse) {
    const conceptMap = extractConceptsHierarchy(aiResponse);
    updateGraph(conceptMap);
}

// 智能概念层级提取
function extractConceptsHierarchy(text) {
    console.log('开始提取概念层级...', text.substring(0, 100));
    
    // 清理文本
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
    
    if (!cleanText || cleanText.length < 10) {
        console.warn('文本太短，无法提取概念');
        return generateDefaultGraph();
    }
    
    // 智能概念提取
    const concepts = extractKeyConceptsFromText(cleanText);
    
    // 生成有向图数据 - 按照JSON格式
    return buildDirectedGraphData(concepts);
}

// 从文本中提取关键概念
function extractKeyConceptsFromText(text) {
    const concepts = [];
    
    // 中文分词的简单实现
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
    // 英文单词提取
    const englishWords = text.match(/[a-zA-Z]{3,15}/gi) || [];
    // 混合词汇（包含数字）
    const mixedWords = text.match(/[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*(?:[a-zA-Z0-9]+)?/gi) || [];
    
    // 合并所有词汇
    const allWords = [...chineseWords, ...englishWords, ...mixedWords];
    
    // 统计词频
    const wordFreq = {};
    allWords.forEach(word => {
        const normalizedWord = word.toLowerCase();
        if (isValidConcept(normalizedWord)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });
    
    // 技术术语权重加成
    const techTerms = ['vue', 'react', 'javascript', 'python', 'css', 'html', 'node', 'api', 'http', 'json', 'xml', 'sql', 'database'];
    Object.keys(wordFreq).forEach(word => {
        if (techTerms.some(term => word.toLowerCase().includes(term))) {
            wordFreq[word] *= 2;
        }
    });
    
    // 按频率和长度排序，优先选择有意义的概念
    const sortedWords = Object.entries(wordFreq)
        .filter(([word, freq]) => freq > 0)
        .sort((a, b) => {
            // 综合考虑频率和词汇长度
            const scoreA = a[1] + (a[0].length > 2 ? 1 : 0) + (a[0].length > 4 ? 1 : 0);
            const scoreB = b[1] + (b[0].length > 2 ? 1 : 0) + (b[0].length > 4 ? 1 : 0);
            return scoreB - scoreA;
        })
        .slice(0, 15)
        .map(([word]) => word);
    
    // 转换为节点格式
    sortedWords.forEach((word, index) => {
        concepts.push({
            id: word,
            group: (index % 8) + 1, // 1-8的组号
            index: index,
            size: Math.max(12, 28 - index * 1.2), // 根据重要性设置大小
            level: index < 3 ? 1 : (index < 8 ? 2 : 3) // 层级
        });
    });
    
    return concepts;
}

// 构建有向图数据结构
function buildDirectedGraphData(concepts) {
    if (concepts.length === 0) {
        return generateDefaultGraph();
    }
    
    const nodes = concepts.map(concept => ({
        id: concept.id,
        group: concept.group || Math.floor(Math.random() * 8) + 1,
        index: concept.index || 0,
        size: concept.size || 15,
        level: concept.level || 1
    }));
    
    // 生成有向边 - 创建层级结构
    const links = [];
    
    // 核心节点之间的连接
    const coreNodes = nodes.filter(n => n.level === 1);
    if (coreNodes.length > 1) {
        for (let i = 0; i < coreNodes.length - 1; i++) {
            links.push({
                source: coreNodes[i].id,
                target: coreNodes[i + 1].id,
                value: 5,
                type: 'core'
            });
        }
    }
    
    // 从核心节点指向二级节点
    const secondaryNodes = nodes.filter(n => n.level === 2);
    coreNodes.forEach((core, coreIndex) => {
        const targetSecondary = secondaryNodes.slice(coreIndex * 2, (coreIndex + 1) * 2);
        targetSecondary.forEach(secondary => {
            links.push({
                source: core.id,
                target: secondary.id,
                value: 3,
                type: 'hierarchy'
            });
        });
    });
    
    // 从二级节点指向三级节点
    const tertiaryNodes = nodes.filter(n => n.level === 3);
    secondaryNodes.forEach((secondary, index) => {
        const targetTertiary = tertiaryNodes[index];
        if (targetTertiary) {
            links.push({
                source: secondary.id,
                target: targetTertiary.id,
                value: 2,
                type: 'application'
            });
        }
    });
    
    // 添加一些交叉连接
    if (nodes.length > 3) {
        const crossConnections = Math.min(3, Math.floor(nodes.length / 3));
        for (let i = 0; i < crossConnections; i++) {
            const sourceIndex = Math.floor(Math.random() * nodes.length);
            const targetIndex = Math.floor(Math.random() * nodes.length);
            if (sourceIndex !== targetIndex) {
                links.push({
                    source: nodes[sourceIndex].id,
                    target: nodes[targetIndex].id,
                    value: 1,
                    type: 'related'
                });
            }
        }
    }
    
    console.log('生成图数据:', { nodes: nodes.length, links: links.length });
    
    return { nodes, links };
}

// 验证概念是否有效
function isValidConcept(word) {
    if (!word || typeof word !== 'string') return false;
    if (word.length < 2 || word.length > 20) return false;
    
    // 过滤无意义的词汇 - 中英文停用词
    const stopWords = [
        // 中文停用词
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
        '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
        '来', '对', '那', '这', '它', '但', '而', '或', '因为', '所以', '如果', '虽然',
        '可以', '应该', '能够', '需要', '通过', '使用', '进行', '实现', '提供', '包含',
        '主要', '重要', '基本', '简单', '复杂', '特别', '一般', '通常', '经常', '可能',
        '比如', '例如', '包括', '特别是', '尤其是', '另外', '此外', '而且', '同时',
        // 英文停用词
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
        'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
        'this', 'that', 'these', 'those', 'can', 'could', 'will', 'would', 'should',
        'do', 'does', 'did', 'get', 'got', 'make', 'made', 'take', 'took', 'come', 'came',
        'go', 'went', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'say', 'said',
        'work', 'worked', 'way', 'ways', 'time', 'times', 'year', 'years', 'day', 'days',
        'new', 'old', 'good', 'bad', 'big', 'small', 'long', 'short', 'high', 'low',
        'first', 'last', 'next', 'some', 'any', 'all', 'each', 'every', 'other', 'another',
        'much', 'many', 'more', 'most', 'less', 'few', 'several', 'both', 'either', 'neither'
    ];
    
    // 检查是否为停用词（大小写不敏感）
    if (stopWords.includes(word.toLowerCase())) return false;
    
    // 检查是否为纯数字或特殊字符
    if (/^\d+$/.test(word)) return false;
    if (/^[^\u4e00-\u9fa5a-zA-Z]+$/.test(word)) return false;
    
    // 过滤过于常见的编程词汇
    const commonCodeWords = ['function', 'return', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'class', 'public', 'private', 'static'];
    if (commonCodeWords.includes(word.toLowerCase())) return false;
    
    // 过滤单个字符的中文（除非是有意义的单字）
    const meaningfulSingleChars = ['和', '或', '与', '及', '、'];
    if (word.length === 1 && /[\u4e00-\u9fa5]/.test(word) && !meaningfulSingleChars.includes(word)) return false;
    
    return true;
}

// 生成默认图表
function generateDefaultGraph() {
    return {
        nodes: [
            { id: "测试节点", group: 1, index: 0, size: 20, level: 1 },
            { id: "子节点1", group: 2, index: 1, size: 15, level: 2 },
            { id: "子节点2", group: 3, index: 2, size: 15, level: 2 }
        ],
        links: [
            { source: "测试节点", target: "子节点1", value: 3, type: "core" },
            { source: "测试节点", target: "子节点2", value: 2, type: "core" }
        ]
    };
}

// 智能初始布局函数
function setInitialPositions(nodes, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 按层级分组
    const levelGroups = {};
    nodes.forEach(node => {
        const level = node.level || 1;
        if (!levelGroups[level]) levelGroups[level] = [];
        levelGroups[level].push(node);
    });
    
    // 为每个层级设置初始位置
    Object.keys(levelGroups).forEach(level => {
        const levelNodes = levelGroups[level];
        const nodeCount = levelNodes.length;
        const levelNum = parseInt(level);
        
        if (levelNum === 1) {
            // 核心节点放在中心附近
            levelNodes.forEach((node, index) => {
                const angle = (index / nodeCount) * 2 * Math.PI;
                const radius = nodeCount > 1 ? 40 : 0;
                node.x = centerX + Math.cos(angle) * radius;
                node.y = centerY + Math.sin(angle) * radius;
            });
        } else {
            // 其他层级按圆形分布
            const radius = 80 + (levelNum - 1) * 60;
            levelNodes.forEach((node, index) => {
                const angle = (index / nodeCount) * 2 * Math.PI + (levelNum * 0.5);
                node.x = centerX + Math.cos(angle) * radius;
                node.y = centerY + Math.sin(angle) * radius;
            });
        }
    });
}

// ========== 主图渲染与交互核心 ========== 
function updateGraph(graphData) {
    window.lastGraphData = graphData;
    if (currentSimulation) {
        currentSimulation.stop();
    }
    const container = document.getElementById('graph-container');
    if (!container) {
        console.error('Graph container not found');
        return;
    }
    
    // 隐藏提示文字
    const hint = document.getElementById('graph-hint');
    if (hint) {
        hint.style.opacity = '0';
        setTimeout(() => {
            hint.style.display = 'none';
        }, 300);
    }
    const rect = container.getBoundingClientRect();
    const width = rect.width || 500;
    const height = rect.height || 500;
    d3.select('#graph-container').html('');
    const svg = d3.select('#graph-container').append('svg')
        .attr('width', width)
        .attr('height', height);
    // 箭头定义
    svg.append('defs').selectAll('marker')
        .data(['core', 'hierarchy', 'application', 'related'])
        .join('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d => {
            const colorMap = {
                'core': '#7C3AED',
                'hierarchy': '#3B82F6',
                'application': '#10B981',
                'related': '#F59E0B'
            };
            return colorMap[d] || '#999';
        });
    // 主绘图组
    const g = svg.append('g');
    // 缩放
    svg.call(d3.zoom().scaleExtent([0.1, 8]).on('zoom', (event) => {
        g.attr('transform', event.transform);
    }));
    // 力导向布局
    setInitialPositions(graphData.nodes, width, height);
    const simulation = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(120).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-400).distanceMax(400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => (d.size || 10) + 18).strength(0.8))
        .alpha(0.2).alphaDecay(0.02);
    currentSimulation = simulation;
    // 有向边
    const link = g.append('g').attr('class', 'links')
        .selectAll('line')
        .data(graphData.links)
        .join('line')
        .attr('stroke', d => {
            const colorMap = {
                'core': '#7C3AED',
                'hierarchy': '#3B82F6',
                'application': '#10B981',
                'related': '#F59E0B'
            };
            return colorMap[d.type] || '#999';
        })
        .attr('stroke-width', d => Math.sqrt(d.value || 1) * 1.5)
        .attr('stroke-opacity', d => {
            const opacityMap = {
                'core': 0.8,
                'hierarchy': 0.6,
                'application': 0.4,
                'related': 0.3
            };
            return opacityMap[d.type] || 0.4;
        })
        .attr('marker-end', d => `url(#arrow-${d.type})`);
    // 节点组
    const node = g.append('g').attr('class', 'nodes')
        .selectAll('g')
        .data(graphData.nodes)
        .join('g')
        .attr('class', d => `graph-node level-${d.level || 1}`)
        .style('cursor', 'pointer')
        .call(d3.drag()
            .on('start', function(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', function(event, d) {
                d.fx = event.x;
                d.fy = event.y;
                // 立即更新节点和边
                d3.select(this).attr('transform', `translate(${d.fx},${d.fy})`);
            })
            .on('end', function(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            })
        )
        .on('click', handleNodeClick)
        .on('mouseover', handleNodeHover)
        .on('mouseout', handleNodeLeave);
    // 节点圆圈
    const circles = node.append('circle')
        .attr('r', 0)
        .attr('fill', d => {
            const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
            return colors[(d.group - 1) % colors.length];
        })
        .attr('stroke', d => {
            const level = d.level || 1;
            return level === 1 ? '#DC2626' : (level === 2 ? '#2563EB' : '#059669');
        })
        .attr('stroke-width', d => {
            const level = d.level || 1;
            return level === 1 ? 3 : (level === 2 ? 2 : 1.5);
        });
    // 节点文本
    const labels = node.append('text')
        .attr('dx', d => (d.size || 10) + 8)
        .attr('dy', '.35em')
        .attr('text-anchor', 'start')
        .style('font-size', d => `${Math.max(10, (d.size || 10) * 0.5)}px`)
        .style('font-weight', d => (d.level || 1) <= 2 ? '600' : '400')
        .style('fill', '#1F2937')
        .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('opacity', 0)
        .text(d => d.id);
    // 动画
    circles.transition().duration(800).attr('r', d => d.size || 10).ease(d3.easeElastic);
    labels.transition().delay(400).duration(600).style('opacity', 1);
    // 力导向 tick
    simulation.on('tick', () => {
        // 边界约束
        graphData.nodes.forEach(d => {
            const margin = 60;
            d.x = Math.max(margin, Math.min(width - margin, d.x));
            d.y = Math.max(margin, Math.min(height - margin, d.y));
        });
        link.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    // 停止自动模拟
    setTimeout(() => {
        if (simulation.alpha() > 0.01) simulation.stop();
    }, 3000);
}

// ========== 浮动输入框功能 ==========
function showFloatingInput(event, nodeData) {
    hideFloatingInput();
    
    const container = document.getElementById('graph-container');
    const containerRect = container.getBoundingClientRect();
    
    // 计算节点在屏幕上的实际位置（考虑缩放和平移）
    const svg = container.querySelector('svg');
    let transform = { k: 1, x: 0, y: 0 };
    
    if (svg) {
        const g = svg.querySelector('g');
        if (g) {
            const transformAttr = g.getAttribute('transform');
            if (transformAttr) {
                // 解析transform属性
                const translateMatch = transformAttr.match(/translate\(([^,]+),([^)]+)\)/);
                const scaleMatch = transformAttr.match(/scale\(([^)]+)\)/);
                
                if (translateMatch) {
                    transform.x = parseFloat(translateMatch[1]);
                    transform.y = parseFloat(translateMatch[2]);
                }
                if (scaleMatch) {
                    transform.k = parseFloat(scaleMatch[1]);
                }
            }
        }
    }
    
    // 根据节点数据计算位置
    const nodeX = (nodeData.x || 0) * transform.k + transform.x;
    const nodeY = (nodeData.y || 0) * transform.k + transform.y;
    
    const floatingDiv = document.createElement('div');
    floatingDiv.className = 'floating-input';
    
    // 确保浮动框在容器内
    const inputWidth = 350;
    const inputHeight = 120;
    let left = Math.min(nodeX + 20, containerRect.width - inputWidth - 10);
    let top = Math.max(nodeY - 60, 10);
    
    // 如果位置太靠右，显示在节点左侧
    if (left < 10) {
        left = Math.max(nodeX - inputWidth - 20, 10);
    }
    
    // 如果位置太靠下，显示在节点上方
    if (top + inputHeight > containerRect.height - 10) {
        top = Math.max(nodeY - inputHeight - 20, 10);
    }
    
    floatingDiv.style.left = `${left}px`;
    floatingDiv.style.top = `${top}px`;
    
    floatingDiv.innerHTML = `
        <div class="floating-input-header">关于 "${nodeData.id}" 的提问</div>
        <textarea placeholder="请输入您的问题..." rows="2"></textarea>
        <div class="floating-input-actions">
            <button class="floating-btn secondary" onclick="hideFloatingInput()">取消</button>
            <button class="floating-btn primary" onclick="submitFloatingInput('${nodeData.id}')">发送</button>
        </div>
    `;
    
    document.getElementById('graph-container').appendChild(floatingDiv);
    currentFloatingInput = floatingDiv;
    
    setTimeout(() => {
        floatingDiv.style.display = 'block';
        floatingDiv.querySelector('textarea').focus();
    }, 10);
    
    const textarea = floatingDiv.querySelector('textarea');
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitFloatingInput(nodeData.id);
        }
        if (e.key === 'Escape') {
            hideFloatingInput();
        }
    });
    
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100);
}

function hideFloatingInput() {
    if (currentFloatingInput) {
        currentFloatingInput.style.display = 'none';
        currentFloatingInput.remove();
        currentFloatingInput = null;
        document.removeEventListener('click', handleOutsideClick);
    }
}

function submitFloatingInput(concept) {
    if (!currentFloatingInput) return;
    
    const textarea = currentFloatingInput.querySelector('textarea');
    const userInput = textarea.value.trim();
    
    if (userInput) {
        const enhancedQuery = `关于"${concept}"：${userInput}`;
        hideFloatingInput();
        sendMessage(enhancedQuery);
    } else {
        textarea.style.borderColor = '#EF4444';
        textarea.focus();
        setTimeout(() => {
            textarea.style.borderColor = '#D1D5DB';
        }, 2000);
    }
}

function handleOutsideClick(event) {
    if (currentFloatingInput && !currentFloatingInput.contains(event.target)) {
        hideFloatingInput();
    }
}

// ========== 拖拽内容生成图表 ==========
function generateGraphFromContent(content) {
    if (!content || !content.trim()) {
        console.warn('内容为空，无法生成图表');
        return;
    }
    
    console.log('根据拖拽内容生成动态图表:', content.substring(0, 100) + '...');
    
    try {
        // 使用概念提取算法
        const graphData = extractConceptsHierarchy(content);
        
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            console.warn('无法从内容中提取概念，使用默认图表');
            const defaultData = generateDefaultGraph();
            updateGraph(defaultData);
            return;
        }
        
        console.log(`提取到 ${graphData.nodes.length} 个概念节点, ${graphData.links.length} 个连接`);
        
        // 更新图表
        updateGraph(graphData);
        
        // 显示生成成功提示
        console.log('动态图表生成成功');
        
    } catch (error) {
        console.error('生成图表时出错:', error);
        // 使用默认图表作为备选
        const defaultData = generateDefaultGraph();
        updateGraph(defaultData);
    }
}

// 导出函数供外部使用
window.generateGraphFromContent = generateGraphFromContent;

// ========== 响应式处理 ==========
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        if (window.lastGraphData) {
            updateGraph(window.lastGraphData);
        }
    }, 300);
});

// 点击图表背景关闭浮动输入框
document.addEventListener('click', (event) => {
    if (event.target.closest('#graph-container') && !event.target.closest('.floating-input')) {
        hideFloatingInput();
    }
});

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Graph module loaded');
    
    // 显示一个简单的测试图
    const testData = {
        nodes: [
            { id: "测试节点", level: 1, size: 20, group: 1 },
            { id: "子节点1", level: 2, size: 15, group: 2 },
            { id: "子节点2", level: 2, size: 15, group: 3 }
        ],
        links: [
            { source: "测试节点", target: "子节点1", type: "core", value: 3 },
            { source: "测试节点", target: "子节点2", type: "core", value: 2 }
        ]
    };
    
    setTimeout(() => {
        updateGraph(testData);
    }, 500);
});

// ========== 节点交互处理 ==========
function handleNodeClick(event, nodeData) {
    console.log('节点点击:', nodeData.id);
    
    // 阻止事件冒泡
    event.stopPropagation();
    
    // 显示浮动输入框
    showFloatingInput(event, nodeData);
}

function handleNodeHover(event, nodeData) {
    isNodeHovered = true;
    
    // 高亮当前节点
    const currentNode = d3.select(event.currentTarget);
    currentNode.select('circle')
        .transition()
        .duration(200)
        .attr('r', (d) => (d.size || 10) * 1.3)
        .attr('stroke-width', 4);
    
    // 淡化其他节点
    d3.selectAll('.graph-node')
        .filter(d => d.id !== nodeData.id)
        .transition()
        .duration(200)
        .style('opacity', 0.3);
    
    // 高亮相关连线
    d3.selectAll('.links line')
        .transition()
        .duration(200)
        .style('opacity', d => {
            if (d.source.id === nodeData.id || d.target.id === nodeData.id) {
                return 0.8;
            }
            return 0.1;
        });
    
    console.log('节点悬停:', nodeData.id);
}

function handleNodeLeave(event, nodeData) {
    isNodeHovered = false;
    
    // 恢复所有节点状态
    d3.selectAll('.graph-node')
        .transition()
        .duration(300)
        .style('opacity', 1);
    
    // 恢复当前节点大小
    const currentNode = d3.select(event.currentTarget);
    currentNode.select('circle')
        .transition()
        .duration(300)
        .attr('r', nodeData.size || 10)
        .attr('stroke-width', d => {
            const level = d.level || 1;
            return level === 1 ? 3 : (level === 2 ? 2 : 1.5);
        });
    
    // 恢复所有连线
    d3.selectAll('.links line')
        .transition()
        .duration(300)
        .style('opacity', d => {
            const opacityMap = {
                'core': 0.8,
                'hierarchy': 0.6,
                'application': 0.4,
                'related': 0.3
            };
            return opacityMap[d.type] || 0.4;
        });
    
    console.log('节点离开:', nodeData.id);
}

// 导出函数供外部使用
window.generateGraphFromContent = generateGraphFromContent; 