from langchain.llms import OpenAI

def ask_question(question, system_prompt):
    # 这里只是示例，实际需根据你的LangChain配置调整
    llm = OpenAI(temperature=0.7, system_prompt=system_prompt)
    return llm(question) 