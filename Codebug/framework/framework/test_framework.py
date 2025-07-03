#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
框架功能测试脚本
测试后端API和关系抽取功能
"""

import requests
import json
import sys
import time

# 测试配置
BACKEND_URL = "http://localhost:8000"
TEST_TEXTS = [
    "人工智能是计算机科学的一个分支，机器学习是人工智能的重要组成部分。深度学习作为机器学习的子领域，在图像识别和自然语言处理方面取得了重大突破。",
    "孔子是中国古代伟大的思想家和教育家，他创立了儒家学派。儒家思想强调仁爱、礼制和教育的重要性，对中国文化产生了深远影响。",
    "苹果公司发布了新款iPhone，搭载了最新的A17芯片。这款手机在性能和拍照功能方面都有显著提升，预计将在全球市场取得成功。"
]

def test_backend_health():
    """测试后端健康状态"""
    print("🔍 测试后端健康状态...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 后端健康检查通过: {data.get('message', '正常')}")
            return True
        else:
            print(f"❌ 后端健康检查失败: HTTP {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 无法连接到后端: {e}")
        return False

def test_qa_api():
    """测试问答API"""
    print("\n🔍 测试问答API...")
    
    test_question = "什么是人工智能？"
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/qa",
            json={
                "question": test_question,
                "system_prompt": "你是一个智能助手，请简洁回答用户问题。"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 问答API测试成功")
            print(f"📝 问题: {test_question}")
            print(f"💬 回答: {data.get('answer', '无回答')[:100]}...")
            
            # 检查是否包含关系三元组
            triplets = data.get('triplets', [])
            if triplets:
                print(f"🔗 自动提取的关系三元组: {len(triplets)} 个")
                for i, triplet in enumerate(triplets[:3]):  # 只显示前3个
                    print(f"   {i+1}. ({triplet.get('h', '')}, {triplet.get('t', '')}, {triplet.get('r', '')})")
            else:
                print("⚠️ 未提取到关系三元组")
            
            return True
        else:
            print(f"❌ 问答API测试失败: HTTP {response.status_code}")
            print(f"错误信息: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 问答API请求失败: {e}")
        return False

def test_kg_extraction():
    """测试知识图谱抽取API"""
    print("\n🔍 测试知识图谱抽取...")
    
    for i, text in enumerate(TEST_TEXTS, 1):
        print(f"\n--- 测试文本 {i} ---")
        print(f"📄 文本: {text[:50]}...")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/kg/extract",
                json={"text": text},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                triplets = data.get('triplets', [])
                
                print(f"✅ 提取成功: {len(triplets)} 个三元组")
                
                for j, triplet in enumerate(triplets):
                    h = triplet.get('h', '')
                    t = triplet.get('t', '')
                    r = triplet.get('r', '')
                    print(f"   {j+1}. ({h}, {t}, {r})")
                
                if not triplets:
                    print("⚠️ 未提取到三元组")
                    
            else:
                print(f"❌ 提取失败: HTTP {response.status_code}")
                print(f"错误信息: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求失败: {e}")
            return False
    
    return True

def test_individual_extraction():
    """测试单独的关系抽取功能"""
    print("\n🔍 测试关系抽取模块...")
    
    try:
        # 导入关系抽取模块
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
        
        from backend.app.core.rte import rte_from_text
        
        for i, text in enumerate(TEST_TEXTS, 1):
            print(f"\n--- 直接测试文本 {i} ---")
            print(f"📄 文本: {text[:50]}...")
            
            triplets = rte_from_text(text)
            
            if triplets:
                print(f"✅ 直接提取成功: {len(triplets)} 个三元组")
                for j, triplet in enumerate(triplets):
                    h = triplet.get('h', '')
                    t = triplet.get('t', '')
                    r = triplet.get('r', '')
                    print(f"   {j+1}. ({h}, {t}, {r})")
            else:
                print("⚠️ 直接提取未得到结果")
        
        return True
        
    except ImportError as e:
        print(f"⚠️ 无法导入关系抽取模块: {e}")
        return False
    except Exception as e:
        print(f"❌ 直接测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 50)
    print("  DeepSeek AI 框架功能测试")
    print("=" * 50)
    
    # 等待后端启动
    print("⏳ 等待后端服务启动...")
    time.sleep(2)
    
    # 测试计数
    total_tests = 0
    passed_tests = 0
    
    # 1. 测试后端健康状态
    total_tests += 1
    if test_backend_health():
        passed_tests += 1
    
    # 2. 测试问答API
    total_tests += 1
    if test_qa_api():
        passed_tests += 1
    
    # 3. 测试知识图谱抽取
    total_tests += 1
    if test_kg_extraction():
        passed_tests += 1
    
    # 4. 测试单独的关系抽取
    total_tests += 1
    if test_individual_extraction():
        passed_tests += 1
    
    # 输出测试结果
    print("\n" + "=" * 50)
    print(f"  测试完成: {passed_tests}/{total_tests} 通过")
    if passed_tests == total_tests:
        print("🎉 所有测试通过！框架迁移成功！")
    else:
        print("⚠️ 部分测试失败，请检查配置")
    print("=" * 50)
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 