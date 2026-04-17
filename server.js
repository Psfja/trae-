require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const feishuService = require('./services/feishu');
const deepseekService = require('./services/deepseek');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ========== 路由 ==========

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    feishu: feishuService.isConfigured() ? 'configured' : 'not_configured',
    deepseek: deepseekService.isConfigured() ? 'configured' : 'not_configured'
  });
});

// ========== 飞书相关 ==========

// 获取飞书群组列表
app.get('/api/feishu/chats', async (req, res) => {
  try {
    const chats = await feishuService.getChats();
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取群组消息
app.get('/api/feishu/messages', async (req, res) => {
  try {
    const { chatId, count = 50 } = req.query;
    if (!chatId) {
      return res.status(400).json({ success: false, error: '缺少 chatId 参数' });
    }
    const messages = await feishuService.getMessages(chatId, parseInt(count));
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== AI 任务生成 ==========

// 从消息中提取任务
app.post('/api/ai/extract-tasks', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: '缺少 messages 参数' });
    }

    const tasks = await deepseekService.extractTasks(messages);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 模拟数据（演示用） ==========

// 获取模拟飞书群组
app.get('/api/demo/chats', (req, res) => {
  res.json({
    success: true,
    data: [
      { chat_id: 'demo_chat_1', name: '产品研发群', chat_type: 'group', member_count: 28 },
      { chat_id: 'demo_chat_2', name: '市场营销群', chat_type: 'group', member_count: 15 },
      { chat_id: 'demo_chat_3', name: '项目管理群', chat_type: 'group', member_count: 12 },
      { chat_id: 'demo_chat_4', name: '技术架构讨论', chat_type: 'group', member_count: 8 },
    ]
  });
});

// 获取模拟消息
app.get('/api/demo/messages', (req, res) => {
  const { chatId } = req.query;
  const now = Date.now();

  const messageSets = {
    demo_chat_1: [
      { id: 'm1', sender: '张经理', content: 'Q2的产品规划文档需要在周五前完成，大家抓紧时间', timestamp: new Date(now - 3600000 * 2).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm2', sender: '李开发', content: '登录模块的Bug已经修复了，需要QA帮忙验证一下，Issue #189', timestamp: new Date(now - 3600000 * 1.5).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm3', sender: '王设计', content: '新版首页的设计稿已经上传到Figma了，链接在群里，请大家看一下有没有问题', timestamp: new Date(now - 3600000).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm4', sender: '赵测试', content: '上周提的3个P1 Bug还没修复，影响线上用户了，优先级需要提高', timestamp: new Date(now - 1800000).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm5', sender: '张经理', content: '明天下午3点开周会，每个人准备一下本周工作总结和下周计划', timestamp: new Date(now - 900000).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm6', sender: '陈运维', content: '服务器监控发现内存使用率超过85%，需要排查一下是否有内存泄漏', timestamp: new Date(now - 600000).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm7', sender: '刘产品', content: '用户反馈搜索功能响应太慢，需要优化，最好这周内搞定', timestamp: new Date(now - 300000).toISOString(), chat_id: 'demo_chat_1' },
      { id: 'm8', sender: '李开发', content: 'API接口文档需要更新，新加的几个接口还没写文档，影响前端对接', timestamp: new Date(now - 120000).toISOString(), chat_id: 'demo_chat_1' },
    ],
    demo_chat_2: [
      { id: 'm10', sender: '孙市场', content: '下周的线上活动方案需要今天定稿，设计物料也要同步准备', timestamp: new Date(now - 7200000).toISOString(), chat_id: 'demo_chat_2' },
      { id: 'm11', sender: '周运营', content: '本月KPI还差30%，需要加大推广力度，预算申请已经提交了', timestamp: new Date(now - 5400000).toISOString(), chat_id: 'demo_chat_2' },
      { id: 'm12', sender: '吴内容', content: '公众号下周的推文选题还没确定，大家有什么好的建议吗？', timestamp: new Date(now - 3600000).toISOString(), chat_id: 'demo_chat_2' },
      { id: 'm13', sender: '孙市场', content: '竞品分析报告月底前要交，分配给小吴和小周负责', timestamp: new Date(now - 1800000).toISOString(), chat_id: 'demo_chat_2' },
    ],
    demo_chat_3: [
      { id: 'm20', sender: '郑PM', content: 'Sprint 12的回顾会议安排在周四上午10点，请所有人参加', timestamp: new Date(now - 10800000).toISOString(), chat_id: 'demo_chat_3' },
      { id: 'm21', sender: '郑PM', content: '客户A的定制需求已经确认，需要更新需求文档并通知开发团队', timestamp: new Date(now - 7200000).toISOString(), chat_id: 'demo_chat_3' },
      { id: 'm22', sender: '钱技术', content: '技术方案评审定在明天下午，微服务拆分方案需要提前看一遍', timestamp: new Date(now - 3600000).toISOString(), chat_id: 'demo_chat_3' },
      { id: 'm23', sender: '郑PM', content: '项目进度落后2天，需要重新评估排期，明天会议上讨论', timestamp: new Date(now - 900000).toISOString(), chat_id: 'demo_chat_3' },
    ],
    demo_chat_4: [
      { id: 'm30', sender: '钱技术', content: '数据库从MySQL迁移到PostgreSQL的方案需要评估，下周给出结论', timestamp: new Date(now - 14400000).toISOString(), chat_id: 'demo_chat_4' },
      { id: 'm31', sender: '李开发', content: 'Redis缓存策略需要优化，目前命中率只有60%，目标是提升到90%', timestamp: new Date(now - 10800000).toISOString(), chat_id: 'demo_chat_4' },
      { id: 'm32', sender: '陈运维', content: 'CI/CD流水线需要增加自动化测试环节，目前部署太频繁导致线上问题', timestamp: new Date(now - 7200000).toISOString(), chat_id: 'demo_chat_4' },
      { id: 'm33', sender: '钱技术', content: '新项目考虑用Go重写核心服务，性能对比报告周五前出', timestamp: new Date(now - 3600000).toISOString(), chat_id: 'demo_chat_4' },
    ]
  };

  res.json({
    success: true,
    data: messageSets[chatId] || messageSets.demo_chat_1
  });
});

// 模拟AI提取任务
app.post('/api/demo/extract-tasks', async (req, res) => {
  const { messages } = req.body;

  // 如果配置了DeepSeek，使用真实AI
  if (deepseekService.isConfigured()) {
    try {
      const tasks = await deepseekService.extractTasks(messages);
      return res.json({ success: true, data: tasks });
    } catch (error) {
      // fallback to mock
    }
  }

  // 模拟AI分析结果
  await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟AI处理延迟

  const mockTasks = [
    {
      title: '完成Q2产品规划文档',
      priority: 'high',
      estimatedPomodoros: 4,
      source: '张经理 @ 产品研发群',
      originalMessage: 'Q2的产品规划文档需要在周五前完成，大家抓紧时间',
      deadline: '本周五',
      category: '文档'
    },
    {
      title: '验证登录模块Bug修复 (Issue #189)',
      priority: 'high',
      estimatedPomodoros: 2,
      source: '李开发 @ 产品研发群',
      originalMessage: '登录模块的Bug已经修复了，需要QA帮忙验证一下',
      deadline: '明天',
      category: '测试'
    },
    {
      title: '评审新版首页设计稿',
      priority: 'medium',
      estimatedPomodoros: 1,
      source: '王设计 @ 产品研发群',
      originalMessage: '新版首页的设计稿已经上传到Figma了',
      deadline: '本周三',
      category: '设计'
    },
    {
      title: '修复3个P1线上Bug',
      priority: 'high',
      estimatedPomodoros: 3,
      source: '赵测试 @ 产品研发群',
      originalMessage: '上周提的3个P1 Bug还没修复，影响线上用户了',
      deadline: '今天',
      category: '开发'
    },
    {
      title: '准备周会工作总结和下周计划',
      priority: 'medium',
      estimatedPomodoros: 1,
      source: '张经理 @ 产品研发群',
      originalMessage: '明天下午3点开周会，每个人准备一下本周工作总结',
      deadline: '明天下午',
      category: '会议'
    },
    {
      title: '排查服务器内存泄漏问题',
      priority: 'high',
      estimatedPomodoros: 3,
      source: '陈运维 @ 产品研发群',
      originalMessage: '服务器监控发现内存使用率超过85%',
      deadline: '今天',
      category: '运维'
    },
    {
      title: '优化搜索功能响应速度',
      priority: 'medium',
      estimatedPomodoros: 4,
      source: '刘产品 @ 产品研发群',
      originalMessage: '用户反馈搜索功能响应太慢，需要优化',
      deadline: '本周内',
      category: '开发'
    },
    {
      title: '更新API接口文档',
      priority: 'low',
      estimatedPomodoros: 1,
      source: '李开发 @ 产品研发群',
      originalMessage: 'API接口文档需要更新，新加的几个接口还没写文档',
      deadline: '本周内',
      category: '文档'
    }
  ];

  // 根据实际消息数量返回对应任务
  const filteredTasks = mockTasks.slice(0, Math.min(messages?.length || 5, mockTasks.length));

  res.json({
    success: true,
    data: filteredTasks,
    aiModel: deepseekService.isConfigured() ? 'deepseek' : 'mock'
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     FocusFlow Server 已启动              ║
  ║     地址: http://localhost:${PORT}         ║
  ║     飞书API: ${feishuService.isConfigured() ? '✅ 已配置' : '❌ 未配置'}              ║
  ║     DeepSeek: ${deepseekService.isConfigured() ? '✅ 已配置' : '❌ 未配置 (使用模拟数据)'}    ║
  ╚══════════════════════════════════════════╝
  `);
});
