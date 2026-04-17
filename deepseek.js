const fetch = require('node-fetch');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
  }

  isConfigured() {
    return !!(this.apiKey && this.apiKey !== 'your_deepseek_api_key_here');
  }

  // 从消息中提取任务
  async extractTasks(messages) {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API 未配置');
    }

    // 格式化消息供AI分析
    const messageContext = messages.map((msg, i) =>
      `[${i + 1}] ${msg.sender} (${new Date(msg.timestamp).toLocaleString('zh-CN')}): ${msg.content}`
    ).join('\n');

    const systemPrompt = `你是一个职场任务提取助手。你的职责是从工作群聊消息中识别出需要执行的任务、待办事项和行动项。

请分析以下群聊消息，提取出所有需要某人执行的任务。

返回JSON数组格式，每个任务包含以下字段：
- title: 任务标题（简洁明确，不超过20字）
- priority: 优先级（high/medium/low）
- estimatedPomodoros: 预计需要的番茄数（1-5）
- source: 消息来源（格式："发送人 @ 群名"）
- originalMessage: 原始消息内容
- deadline: 截止时间（从消息中推断，如"周五前"→"本周五"，无法推断则填"待定"）
- category: 任务分类（开发/设计/测试/文档/会议/运维/运营/其他）

注意：
1. 只提取明确的任务和行动项，忽略闲聊
2. 优先级判断：涉及线上问题=high，有明确截止日期=high，常规工作=medium，参考性质=low
3. 只返回JSON数组，不要其他文字
4. 如果没有可提取的任务，返回空数组 []`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `以下是工作群聊记录：\n\n${messageContext}` }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API 错误: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // 提取JSON
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      console.error('AI返回内容解析失败:', content);
      return [];
    }
  }
}

module.exports = new DeepSeekService();
