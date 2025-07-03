# 后端使用说明

## 启动API服务
```bash
cd backend
uvicorn app.main:app --reload
```

## 关系三元组抽取函数

- 位置：`app/core/rte.py`
- 函数：`rte_from_text(document, output_path)`
- 用法示例：
```python
from app.core.rte import rte_from_text
rte_from_text("你的文本内容", "app/knowledge/triples.json")
``` 