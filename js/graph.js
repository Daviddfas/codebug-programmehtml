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
    // 清理文本
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 提取不同层级的概念
    const concepts = {
        level1: [], // 核心概念
        level2: [], // 技术方法
        level3: [], // 应用领域
        level4: []  // 具体实现
    };

    // 分词并分类
    const words = cleanText.split(/\s+/).filter(word => word.length > 1 && word.length < 12);
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // 按频率排序的高频词
    const sortedWords = Object.entries(wordFreq)
        .filter(([word, freq]) => freq > 1 && word.length > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);

    // 智能分层
    sortedWords.forEach((word, index) => {
        if (index < 3) {
            concepts.level1.push({
                id: word,
                level: 1,
                group: 1,
                size: 25 + Math.random() * 10,
                importance: 'high'
            });
        } else if (index < 7) {
            concepts.level2.push({
                id: word,
                level: 2,
                group: 2,
                size: 18 + Math.random() * 8,
                importance: 'medium'
            });
        } else if (index < 11) {
            concepts.level3.push({
                id: word,
                level: 3,
                group: 3,
                size: 12 + Math.random() * 6,
                importance: 'low'
            });
        } else {
            concepts.level4.push({
                id: word,
                level: 4,
                group: 4,
                size: 8 + Math.random() * 4,
                importance: 'minimal'
            });
        }
    });

    // 合并所有节点
    const allNodes = [
        ...concepts.level1,
        ...concepts.level2,
        ...concepts.level3,
        ...concepts.level4
    ];

    // 生成智能连接
    const links = [];
    
    // 核心概念互相连接
    for (let i = 0; i < concepts.level1.length; i++) {
        for (let j = i + 1; j < concepts.level1.length; j++) {
            links.push({
                source: concepts.level1[i].id,
                target: concepts.level1[j].id,
                value: 8 + Math.random() * 4,
                type: 'core'
            });
        }
    }

    // 核心概念连接到技术方法
    concepts.level1.forEach(core => {
        concepts.level2.slice(0, 2).forEach(tech => {
            links.push({
                source: core.id,
                target: tech.id,
                value: 6 + Math.random() * 3,
                type: 'hierarchy'
            });
        });
    });

    // 技术方法连接到应用
    concepts.level2.forEach(tech => {
        concepts.level3.slice(0, 1).forEach(app => {
            if (Math.random() > 0.5) {
                links.push({
                    source: tech.id,
                    target: app.id,
                    value: 4 + Math.random() * 2,
                    type: 'application'
                });
            }
        });
    });

    // 添加一些随机连接增加复杂性
    for (let i = 0; i < Math.min(3, allNodes.length); i++) {
        const randomIndex1 = Math.floor(Math.random() * allNodes.length);
        const randomIndex2 = Math.floor(Math.random() * allNodes.length);
        if (randomIndex1 !== randomIndex2) {
            links.push({
                source: allNodes[randomIndex1].id,
                target: allNodes[randomIndex2].id,
                value: 2 + Math.random() * 2,
                type: 'related'
            });
        }
    }

    return {
        nodes: allNodes.length > 0 ? allNodes : [{
            id: '主要概念',
            level: 1,
            group: 1,
            size: 20,
            importance: 'high'
        }],
        links: links
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

// 主要的图表更新函数 - 修复节点文本错位问题
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
    
    const rect = container.getBoundingClientRect();
    const width = rect.width || 500;
    const height = rect.height || 500;
    
    console.log('Container dimensions:', width, height); // 调试信息
    
    // 清除现有内容
    d3.select('#graph-container').html('');
    
    // 创建SVG
    const svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('id', 'dynamic-graph')
        .style('background', '#fafbfc');
    
    // 添加渐变定义
    const defs = svg.append("defs");
    const gradients = [
        { id: "grad1", colors: ["#7C3AED", "#A855F7"] },
        { id: "grad2", colors: ["#3B82F6", "#60A5FA"] },
        { id: "grad3", colors: ["#10B981", "#34D399"] },
        { id: "grad4", colors: ["#F59E0B", "#FBBF24"] }
    ];

    gradients.forEach(grad => {
        const gradient = defs.append("linearGradient")
            .attr("id", grad.id)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "100%");
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", grad.colors[0]);
        
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", grad.colors[1]);
    });
    
    // 主绘图组
    const g = svg.append('g');
    
    // 缩放功能
    const zoom = d3.zoom()
        .scaleExtent([0.1, 8])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    svg.call(zoom);
    
    // 预设节点初始位置
    setInitialPositions(graphData.nodes, width, height);
    
    // 稳定的力导向布局 - 优化参数减少抖动
    const simulation = d3.forceSimulation(graphData.nodes)
        .force("link", d3.forceLink(graphData.links).id(d => d.id)
            .distance(d => {
                const sourceLevel = d.source.level || 1;
                const targetLevel = d.target.level || 1;
                return 80 + (sourceLevel + targetLevel) * 25;
            })
            .strength(0.4)
        )
        .force("charge", d3.forceManyBody()
            .strength(d => {
                const level = d.level || 1;
                return level === 1 ? -600 : (level === 2 ? -300 : -150);
            })
            .distanceMax(250)
        )
        .force("center", d3.forceCenter(width / 2, height / 2).strength(0.03))
        .force("collision", d3.forceCollide()
            .radius(d => (d.size || 10) + 20)
            .strength(0.7)
            .iterations(2)
        )
        .force("radial", d3.forceRadial(d => {
            const level = d.level || 1;
            return level === 1 ? 0 : (level - 1) * 90;
        }, width / 2, height / 2).strength(0.2))
        .force("x", d3.forceX(width / 2).strength(0.01))
        .force("y", d3.forceY(height / 2).strength(0.01))
        .alpha(0.2)
        .alphaDecay(0.015)
        .velocityDecay(0.8);
    
    currentSimulation = simulation;
    
    // 增强的连接线
    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graphData.links)
        .enter().append("line")
        .attr("stroke", d => {
            const colorMap = {
                'core': '#7C3AED',
                'hierarchy': '#3B82F6', 
                'application': '#10B981',
                'related': '#6B7280'
            };
            return colorMap[d.type] || '#999';
        })
        .attr("stroke-opacity", d => {
            const opacityMap = {
                'core': 0.8,
                'hierarchy': 0.6,
                'application': 0.4,
                'related': 0.3
            };
            return opacityMap[d.type] || 0.4;
        })
        .attr("stroke-width", d => Math.sqrt(d.value || 1) * 1.5)
        .attr("stroke-dasharray", d => d.type === 'related' ? "5,5" : null);
    
    // 节点组 - 修复文本定位
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graphData.nodes)
        .enter().append("g")
        .attr("class", d => `graph-node level-${d.level || 1}`)
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", handleNodeClick)
        .on("mouseover", handleNodeHover)
        .on("mouseout", handleNodeLeave);
    
    // 节点圆圈
    const circles = node.append("circle")
        .attr("r", 0)
        .attr("fill", d => `url(#grad${d.group || 1})`)
        .attr("stroke", d => {
            const strokeColors = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B"];
            return strokeColors[(d.group || 1) - 1] || "#6B7280";
        })
        .attr("stroke-width", d => {
            const level = d.level || 1;
            return level === 1 ? 3 : (level === 2 ? 2 : 1.5);
        });
    
    // 节点文本 - 简化定位方法
    const labels = node.append("text")
        .attr("dx", d => (d.size || 10) + 8)
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("font-size", d => `${Math.max(10, (d.size || 10) * 0.5)}px`)
        .style("font-weight", d => (d.level || 1) <= 2 ? "600" : "400")
        .style("fill", "#1F2937")
        .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
        .style("pointer-events", "none")
        .style("user-select", "none")
        .style("opacity", 0)
        .text(d => d.id);
    
    // 重要性指示器
    node.filter(d => (d.level || 1) === 1)
        .append("circle")
        .attr("r", 4)
        .attr("cx", d => -(d.size || 10) + 6)
        .attr("cy", d => -(d.size || 10) + 6)
        .attr("fill", "#EF4444")
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    
    // 动画效果
    circles.transition()
        .duration(800)
        .attr("r", d => d.size || 10)
        .ease(d3.easeElastic);
    
    labels.transition()
        .delay(400)
        .duration(600)
        .style("opacity", 1);
    
    // 力导向模拟更新 - 确保节点和文本同步移动
    simulation.on("tick", () => {
        // 边界约束，防止节点移出画布
        graphData.nodes.forEach(d => {
            const margin = 60;
            d.x = Math.max(margin, Math.min(width - margin, d.x));
            d.y = Math.max(margin, Math.min(height - margin, d.y));
        });

        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        // 关键修复：使用transform确保组内所有元素同步移动
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // 模拟结束时添加稳定类
    simulation.on("end", () => {
        svg.classed("graph-stable", true);
    });
    
    // 设置模拟自动停止
    setTimeout(() => {
        if (simulation.alpha() > 0.01) {
            simulation.stop();
            svg.classed("graph-stable", true);
        }
    }, 3000);
    
    // 精确拖动控制 - 无延迟响应
    function dragstarted(event, d) {
        // 暂停模拟，实现即时拖动
        simulation.stop();
        d.fx = d.x;
        d.fy = d.y;
        
        d3.select(this)
            .classed("dragging", true)
            .select("circle")
            .attr("r", (d.size || 10) * 1.1)
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(4px 4px 8px rgba(124, 58, 237, 0.4))");
        
        // 轻微淡化其他元素
        node.filter(n => n !== d).style("opacity", 0.7);
        link.filter(l => l.source !== d && l.target !== d).style("opacity", 0.4);
    }
    
    function dragged(event, d) {
        // 直接更新位置，无延迟
        d.fx = event.x;
        d.fy = event.y;
        
        // 限制在画布边界内
        const margin = 60;
        d.fx = Math.max(margin, Math.min(width - margin, d.fx));
        d.fy = Math.max(margin, Math.min(height - margin, d.fy));
        
        // 立即更新节点位置
        d.x = d.fx;
        d.y = d.fy;
        
        // 立即更新连接线
        link.filter(l => l.source === d || l.target === d)
            .attr("x1", l => l.source.x)
            .attr("y1", l => l.source.y)
            .attr("x2", l => l.target.x)
            .attr("y2", l => l.target.y);
        
        // 立即更新节点组位置
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
    }
    
    function dragended(event, d) {
        const level = d.level || 1;
        d3.select(this)
            .classed("dragging", false)
            .select("circle")
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("r", d.size || 10)
            .attr("stroke-width", level === 1 ? 3 : (level === 2 ? 2 : 1.5))
            .style("filter", null);
        
        // 快速恢复所有元素
        node.transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .style("opacity", 1);
        
        link.transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .style("opacity", d => {
                const opacityMap = {
                    'core': 0.8,
                    'hierarchy': 0.6,
                    'application': 0.4,
                    'related': 0.3
                };
                return opacityMap[d.type] || 0.4;
            });
        
        // 短暂延迟后释放固定位置并重新启动模拟
        setTimeout(() => {
            d.fx = null;
            d.fy = null;
            simulation.alpha(0.1).restart();
        }, 300);
    }
    
    // 节点点击处理
    function handleNodeClick(event, d) {
        event.stopPropagation();
        showFloatingInput(event, d);
    }
    
    // 节点悬停效果 - 修复位置移动问题
    function handleNodeHover(event, d) {
        if (d3.select(this).classed("dragging")) return;
        
        // 设置悬停状态，暂停模拟防止位置跳动
        isNodeHovered = true;
        if (simulation && simulation.alpha() > 0.01) {
            simulation.stop();
        }
        
        // 只改变圆圈大小，不使用transform，避免位置跳动
        d3.select(this).select("circle")
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("r", (d.size || 10) * 1.12)
            .attr("stroke-width", ((d.level || 1) === 1 ? 3 : (d.level === 2 ? 2 : 1.5)) + 1)
            .style("filter", "drop-shadow(2px 2px 4px rgba(124, 58, 237, 0.3))");
        
        // 文本高亮但不改变大小
        d3.select(this).select("text")
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .style("font-weight", "700")
            .style("fill", "#7C3AED");
        
        // 连接线和其他节点的淡化效果
        link.transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .style("opacity", l => (l.source === d || l.target === d) ? 0.9 : 0.2)
            .style("stroke-width", l => (l.source === d || l.target === d) ? 
                Math.sqrt(l.value || 1) * 2 : Math.sqrt(l.value || 1) * 1.5);
        
        // 其他节点淡化
        node.filter(n => n !== d)
            .transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .style("opacity", 0.4);
    }
    
    function handleNodeLeave(event, d) {
        if (d3.select(this).classed("dragging")) return;
        
        // 清除悬停状态
        isNodeHovered = false;
        
        // 恢复节点原始大小和样式
        d3.select(this).select("circle")
            .transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .attr("r", d.size || 10)
            .attr("stroke-width", (d.level || 1) === 1 ? 3 : (d.level === 2 ? 2 : 1.5))
            .style("filter", null);
        
        // 恢复文本样式
        d3.select(this).select("text")
            .transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .style("font-weight", (d.level || 1) <= 2 ? "600" : "400")
            .style("fill", "#1F2937");
        
        // 恢复所有连接线
        link.transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .style("opacity", d => {
                const opacityMap = {
                    'core': 0.8,
                    'hierarchy': 0.6,
                    'application': 0.4,
                    'related': 0.3
                };
                return opacityMap[d.type] || 0.4;
            })
            .style("stroke-width", d => Math.sqrt(d.value || 1) * 1.5);
        
        // 恢复所有节点
        node.transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .style("opacity", 1);
    }
}

// ========== 浮动输入框功能 ==========
function showFloatingInput(event, nodeData) {
    hideFloatingInput();
    
    const containerRect = document.getElementById('graph-container').getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;
    
    const floatingDiv = document.createElement('div');
    floatingDiv.className = 'floating-input';
    floatingDiv.style.left = `${Math.min(x + 10, containerRect.width - 350)}px`;
    floatingDiv.style.top = `${Math.max(y - 50, 10)}px`;
    
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
    if (!content || !content.trim()) return;
    
    console.log('根据拖拽内容生成动态图表:', content.substring(0, 100) + '...');
    
    // 使用相同的提取算法
    const concepts = extractConceptsHierarchy(content);
    if (concepts.nodes.length === 0) {
        console.warn('无法从内容中提取概念');
        return;
    }
    
    console.log(`提取到 ${concepts.nodes.length} 个概念节点`);
    
    // 更新图表
    updateGraph(concepts);
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