from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ...core.rte import get_completion_from_messages, rte_from_text
import json
import asyncio
import re

router = APIRouter()

class QARequest(BaseModel):
    message: str
    system_prompt: str = ""

@router.post("")
async def qa(request: QARequest):
    """
    QA API endpoint - 支持关系抽取
    """
    try:
        messages = []
        if request.system_prompt:
            messages.append({'role': 'system', 'content': request.system_prompt})
        messages.append({'role': 'user', 'content': request.message})
        
        # 获取AI回答
        answer = get_completion_from_messages(messages, model="deepseek-chat", temperature=0.7)
        
        # 进行关系抽取
        triplets = rte_from_text(answer)
        
        # 返回结果
        return {
            "answer": answer, 
            "triplets": triplets,
            "status": "success"
        }
        
    except Exception as e:
        print(f"❌ QA API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream")
async def qa_stream(request: QARequest):
    """
    流式QA API endpoint
    """
    async def generate():
        try:
            messages = []
            if request.system_prompt:
                messages.append({'role': 'system', 'content': request.system_prompt})
            messages.append({'role': 'user', 'content': request.message})
            
            print(f"🚀 收到流式请求: {request.message[:50]}...")
            
            # 获取AI回答
            answer = get_completion_from_messages(messages, model="deepseek-chat", temperature=0.7)
            
            print(f"✅ 获得AI回答: {len(answer)} 字符")
            
            # 改进的流式输出 - 按合理的块输出
            chunks = split_text_for_streaming(answer)
            
            for chunk_text in chunks:
                chunk = {
                    "content": chunk_text,
                    "type": "text"
                }
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.05)  # 适中的延迟
            
            # 发送完成信号
            yield f"data: [DONE]\n\n"
            
        except Exception as e:
            print(f"❌ 流式API错误: {e}")
            error_chunk = {
                "type": "error",
                "error": str(e),
                "content": "抱歉，AI服务暂时不可用，请稍后重试。"
            }
            yield f"data: {json.dumps(error_chunk, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/plain")

def split_text_for_streaming(text):
    """
    将文本分割成合适的流式输出块
    """
    if not text:
        return []
    
    chunks = []
    
    # 按行分割
    lines = text.split('\n')
    
    for line in lines:
        if not line.strip():
            chunks.append('\n')
            continue
            
        # 对于较长的行，按句子或短语分割
        if len(line) > 50:
            # 按句号、问号、感叹号分割
            sentences = re.split(r'([。！？.!?])', line)
            current_chunk = ""
            
            for i, part in enumerate(sentences):
                current_chunk += part
                
                # 如果是标点符号或积累了足够的字符，输出一个块
                if part in '。！？.!?' or len(current_chunk) >= 20:
                    if current_chunk.strip():
                        chunks.append(current_chunk)
                        current_chunk = ""
            
            # 处理剩余的内容
            if current_chunk.strip():
                chunks.append(current_chunk)
                
            chunks.append('\n')
        else:
            # 短行直接输出
            chunks.append(line + '\n')
    
    # 过滤空块并合并过短的块
    filtered_chunks = []
    for chunk in chunks:
        if chunk.strip() or chunk == '\n':
            filtered_chunks.append(chunk)
    
    return filtered_chunks 