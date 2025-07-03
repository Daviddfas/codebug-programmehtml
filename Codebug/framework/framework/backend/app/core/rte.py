import os
import re
import json
import hashlib
import requests
from tenacity import retry, wait_random_exponential, stop_after_attempt

# DeepSeek API配置 - 直接配置API密钥
DEEPSEEK_API_KEY = "sk-4d4f54a720ae4915868e76a74e289eec"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 现在有了真实的API密钥，不使用模拟模式
USE_MOCK_API = False

# 缓存和配置
extraction_cache = {}
MAX_CACHE_SIZE = 100

def get_completion_from_messages(messages, model="deepseek-chat", temperature=0.7):
    """使用requests库调用DeepSeek API，带有重试机制"""
    
    # 如果没有配置API密钥，使用模拟响应
    if USE_MOCK_API:
        print("⚠️ 使用模拟AI回答（未配置API密钥）")
        user_message = messages[-1]['content'] if messages else "您好"
        
        # 根据问题类型生成不同的模拟回答
        if any(keyword in user_message.lower() for keyword in ['vue', 'javascript', '前端', '组件']):
            return """Vue.js是一个渐进式JavaScript框架，用于构建用户界面。

**核心特性：**
- 响应式数据绑定
- 组件化开发
- 虚拟DOM
- 双向数据绑定
- 生命周期钩子

**主要优势：**
1. 学习曲线平缓，容易上手
2. 灵活的架构设计
3. 丰富的生态系统
4. 优秀的开发者体验

Vue.js采用自底向上增量开发的设计，核心库只关注视图层，方便与第三方库或既有项目整合。"""
        
        elif any(keyword in user_message.lower() for keyword in ['机器学习', 'ai', '人工智能', '算法']):
            return """机器学习是人工智能的一个重要分支，通过算法解析数据、从中学习，然后对真实世界中的事件做出决策和预测。

**主要类型：**
- 监督学习：使用标记数据训练模型
- 无监督学习：从未标记数据中发现模式
- 强化学习：通过奖励机制学习最优策略

**应用领域：**
1. 自然语言处理
2. 计算机视觉  
3. 推荐系统
4. 语音识别
5. 预测分析

机器学习已经成为现代技术发展的核心驱动力，在各个行业都有广泛应用。"""
        
        else:
            return f"""感谢您的问题："{user_message}"

这是一个模拟的AI回答。为了获得真实的AI回复，请：

1. 获取DeepSeek API密钥：https://platform.deepseek.com/api_keys
2. 在后端代码中设置API密钥
3. 重启后端服务

当前系统支持以下功能：
- 智能问答对话
- 知识图谱可视化
- 关系抽取
- 流式响应

请配置API密钥以获得完整体验。"""

    @retry(wait=wait_random_exponential(min=1, max=2), stop=stop_after_attempt(2))
    def completion_with_backoff(messages, model, temperature):
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 800
        }
        
        response = requests.post(
            DEEPSEEK_API_URL,
            headers=headers,
            json=payload,
            timeout=25
        )
        
        if response.status_code != 200:
            raise Exception(f"API请求失败: {response.status_code} - {response.text}")
        
        return response.json()

    try:
        completion = completion_with_backoff(messages=messages, model=model, temperature=temperature)
        response = completion['choices'][0]['message']['content']
        print(f"✅ AI关系抽取完成: {len(response)} 字符")
        return response
    except Exception as e:
        print(f"❌ API调用失败: {e}")
        # 降级到模拟模式
        return get_completion_from_messages(messages, model, temperature)

def extract_triplets(document):
    """智能关系三元组抽取"""
    if not document or len(document.strip()) < 10:
        print("⚠️ 文档内容太短，无法进行关系抽取")
        return ""
    
    # 生成文档哈希用于缓存
    doc_hash = hashlib.md5(document.encode('utf-8')).hexdigest()
    
    # 检查缓存
    if doc_hash in extraction_cache:
        print("🔄 使用缓存的抽取结果")
        return extraction_cache[doc_hash]
    
    # 清理缓存（防止内存溢出）
    if len(extraction_cache) >= MAX_CACHE_SIZE:
        oldest_key = next(iter(extraction_cache))
        del extraction_cache[oldest_key]
    
    # 智能文本预处理
    clean_doc = preprocess_document(document)
    
    # 如果使用模拟模式，返回增强的关系抽取
    if USE_MOCK_API:
        return extract_enhanced_relations(clean_doc)
    
    # 生成prompt
    prompt = f"""你是一个专业的信息抽取专家。请从以下文本中提取最重要的实体关系三元组。

文本内容：
{clean_doc}

抽取要求：
1. 识别文本中的核心实体（人物、概念、技术、组织、地点等）
2. 找出实体间的重要关系
3. 使用简洁明确的关系词，如：是、属于、包含、创立、发明、研究、应用、位于、包括、产生、影响、相关等
4. 提取3-8个最重要的三元组
5. 格式：(实体1, 实体2, 关系)

请直接输出三元组，格式如：
1.(人工智能, 计算机科学, 属于)
2.(机器学习, 人工智能, 包含)
3.(深度学习, 机器学习, 是)

开始抽取："""
    
    messages = [
        {'role': 'system', 'content': '你是一个专业的信息抽取助手，擅长从文本中准确提取实体关系。'},
        {'role': 'user', 'content': prompt}
    ]
    
    try:
        response = get_completion_from_messages(messages, temperature=0.1)
        extraction_cache[doc_hash] = response
        print(f"📊 关系抽取完成，响应长度: {len(response)}")
        return response
    except Exception as e:
        print(f"❌ 关系抽取失败: {e}")
        return extract_simple_relations(clean_doc)

def extract_enhanced_relations(document):
    """增强的关系抽取（模拟模式）"""
    print("🔄 使用增强关系抽取模式")
    
    # 先尝试基于规则的抽取
    relations = []
    
    # 技术相关模式
    tech_patterns = [
        (r'(Vue\.?js?)', r'(JavaScript|前端|框架)', 'Vue.js', '前端框架', '是'),
        (r'(机器学习)', r'(人工智能|AI)', '机器学习', '人工智能', '属于'),
        (r'(深度学习)', r'(机器学习)', '深度学习', '机器学习', '是'),
        (r'(算法)', r'(数据)', '算法', '数据', '处理'),
        (r'(组件)', r'(开发)', '组件', '开发', '用于'),
    ]
    
    # 检查技术相关内容
    doc_lower = document.lower()
    if 'vue' in doc_lower or 'javascript' in doc_lower or '前端' in doc_lower:
        relations.extend([
            '(Vue.js, JavaScript框架, 是)',
            '(组件化, Vue.js, 特性)',
            '(响应式, 数据绑定, 实现)',
            '(虚拟DOM, 性能优化, 用于)'
        ])
    elif '机器学习' in doc_lower or 'ai' in doc_lower or '人工智能' in doc_lower:
        relations.extend([
            '(机器学习, 人工智能, 属于)',
            '(算法, 数据分析, 用于)',
            '(模型训练, 机器学习, 包含)',
            '(预测分析, 机器学习应用, 是)'
        ])
    elif '学习' in doc_lower or '课程' in doc_lower or '教育' in doc_lower:
        relations.extend([
            '(课程, 学习内容, 包含)',
            '(学习, 知识获取, 是)',
            '(教育, 人才培养, 目标)',
            '(实践, 理论学习, 补充)'
        ])
    
    # 如果没有特定领域关系，使用通用模式
    if not relations:
        general_patterns = [
            (r'(\w+)是(\w+)', '是'),
            (r'(\w+)属于(\w+)', '属于'),
            (r'(\w+)包含(\w+)', '包含'),
            (r'(\w+)用于(\w+)', '用于'),
            (r'(\w+)实现(\w+)', '实现'),
        ]
        
        for pattern, relation in general_patterns:
            matches = re.findall(pattern, document)
            for match in matches[:2]:
                if len(match) == 2 and len(match[0]) > 1 and len(match[1]) > 1:
                    relations.append(f"({match[0]}, {match[1]}, {relation})")
    
    if relations:
        result = '\n'.join([f"{i+1}.{rel}" for i, rel in enumerate(relations[:6])])
        return result
    
    return "1.(主题, 内容, 包含)\n2.(概念, 理解, 需要)\n3.(实践, 理论, 验证)"

def preprocess_document(document):
    """智能文档预处理"""
    clean_doc = re.sub(r'\s+', ' ', document.strip())
    
    if len(clean_doc) > 2000:
        paragraphs = clean_doc.split('\n\n')
        if len(paragraphs) > 1:
            clean_doc = '\n\n'.join(paragraphs[:3])
        else:
            clean_doc = clean_doc[:2000] + "..."
    
    return clean_doc

def extract_simple_relations(document):
    """简单关系抽取降级方案"""
    print("🔄 使用简单关系抽取模式")
    
    relations = []
    patterns = [
        (r'(\w+)是(\w+)', '是'),
        (r'(\w+)属于(\w+)', '属于'),
        (r'(\w+)包含(\w+)', '包含'),
    ]
    
    for pattern, relation in patterns:
        matches = re.findall(pattern, document)
        for match in matches[:2]:
            if len(match) == 2:
                relations.append(f"({match[0]}, {match[1]}, {relation})")
    
    if relations:
        result = '\n'.join([f"{i+1}.{rel}" for i, rel in enumerate(relations)])
        return result
    
    return "1.(主题, 内容, 包含)"

def parse_triplets(ai_response):
    """解析AI返回的文本，提取三元组列表"""
    triplets = []
    
    if not ai_response:
        return triplets
    
    print(f"🔍 解析AI响应: {ai_response[:200]}...")
    
    lines = ai_response.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # 去掉编号前缀
        line = re.sub(r'^\d+\.\s*', '', line)
        
        # 匹配三元组格式
        pattern = r"[\(\（]([^\(\),，\)\）]+)[,，]\s*([^\(\),，\)\）]+)[,，]\s*([^\(\),，\)\）]+)[\)\）]"
        match = re.search(pattern, line)
        
        if match:
            h, t, r = match.group(1).strip(), match.group(2).strip(), match.group(3).strip()
            
            # 过滤无效的三元组
            if len(h) > 0 and len(t) > 0 and len(r) > 0 and h != t and len(h) < 50 and len(t) < 50:
                triplets.append({"h": h, "t": t, "r": r})
                print(f"✅ 提取三元组: ({h}, {t}, {r})")
    
    print(f"📊 总共解析出 {len(triplets)} 个三元组")
    return triplets

def rte_from_text(document, output_path=None):
    """主要接口函数：从文本文档中提取关系三元组"""
    print(f"🚀 开始关系抽取，文档长度: {len(document)}")
    
    if not document or len(document.strip()) < 5:
        print("⚠️ 文档为空或太短")
        return []
    
    try:
        # 步骤1: 提取关系文本
        relation_text = extract_triplets(document)
        
        if not relation_text:
            print("⚠️ 未能提取到关系文本")
            return []
        
        # 步骤2: 解析三元组
        triplets = parse_triplets(relation_text)
        
        # 步骤3: 保存结果（可选）
        if output_path and triplets:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(triplets, f, ensure_ascii=False, indent=2)
            print(f"💾 结果已保存到: {output_path}")
        
        print(f"🎉 关系抽取完成！提取到 {len(triplets)} 个三元组")
        return triplets
        
    except Exception as e:
        print(f"❌ 关系抽取过程出错: {e}")
        return []

def clear_cache():
    """清空缓存"""
    global extraction_cache
    extraction_cache.clear()
    print("🧹 缓存已清空")

def set_api_key(api_key):
    """设置API密钥"""
    global DEEPSEEK_API_KEY, USE_MOCK_API
    DEEPSEEK_API_KEY = api_key
    USE_MOCK_API = api_key.startswith('sk-请在这里设置')
    print(f"🔑 API密钥已{'设置' if not USE_MOCK_API else '清除'}")

# 在启动时显示配置信息
print(f"🔧 DeepSeek API配置: {'已配置' if not USE_MOCK_API else '未配置（使用模拟模式）'}")
if USE_MOCK_API:
    print("⚠️ 提示：请设置DEEPSEEK_API_KEY环境变量或修改代码中的API密钥以获得真实AI回复")