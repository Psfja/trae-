const fetch = require('node-fetch');

class FeishuService {
  constructor() {
    this.appId = process.env.FEISHU_APP_ID;
    this.appSecret = process.env.FEISHU_APP_SECRET;
    this.baseUrl = 'https://open.feishu.cn/open-apis';
    this.token = null;
    this.tokenExpireAt = 0;
  }

  isConfigured() {
    return !!(this.appId && this.appSecret && this.appId !== 'your_feishu_app_id_here');
  }

  // 获取 tenant_access_token
  async getAccessToken() {
    if (this.token && Date.now() < this.tokenExpireAt) {
      return this.token;
    }

    const res = await fetch(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret
      })
    });

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`飞书认证失败: ${data.msg}`);
    }

    this.token = data.tenant_access_token;
    this.tokenExpireAt = Date.now() + (data.expire - 60) * 1000;
    return this.token;
  }

  // 获取群组列表
  async getChats() {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/im/v1/chats?page_size=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`获取群组失败: ${data.msg}`);
    }

    return (data.items || []).map(chat => ({
      chat_id: chat.chat_id,
      name: chat.name,
      chat_type: chat.chat_type,
      member_count: chat.member_count,
      avatar: chat.avatar
    }));
  }

  // 获取群组消息
  async getMessages(chatId, count = 50) {
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.baseUrl}/im/v1/messages?container_id_type=chat&container_id=${chatId}&page_size=${count}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`获取消息失败: ${data.msg}`);
    }

    return (data.items || []).map(msg => ({
      id: msg.message_id,
      sender: msg.sender?.sender_id?.name || '未知',
      content: this.parseMessageContent(msg.body?.content),
      timestamp: new Date(parseInt(msg.create_time) * 1000).toISOString(),
      chat_id: chatId,
      msg_type: msg.msg_type
    }));
  }

  // 解析消息内容（飞书消息是JSON格式）
  parseMessageContent(content) {
    if (!content) return '';
    try {
      const parsed = JSON.parse(content);
      // 文本消息
      if (parsed.text) return parsed.text;
      // 富文本消息，提取纯文本
      if (parsed.content) {
        return parsed.content
          .map(block => {
            if (block.tag === 'text') return block.text;
            if (block.tag === 'a') return block.text;
            return '';
          })
          .join('');
      }
      return JSON.stringify(parsed);
    } catch {
      return content;
    }
  }
}

module.exports = new FeishuService();
