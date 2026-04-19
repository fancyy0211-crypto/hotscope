import { HotTopic, GeneratedTopic, ContentDirection, StrategyKey } from './types';
import { mapToContentCategory } from './services/contentCategory';
import { getOpportunityTypeByScores } from './services/topicScoring';

const mockTopicSeeds = [
  '苏超宿迁2:0南京',
  '新能源绿牌褪色为白色',
  '警方通报城市道路突发事故',
  '明星综艺最新片段引热议',
  'AI 大模型发布会公布新能力',
  '股市午后拉升板块轮动明显',
  '高考志愿填报规则更新',
  '原神新版本角色技能曝光',
  '万能旅行拍照姿势美美出片',
  '泰国泼水节疑有人向人嘴里射毒水'
];

const generateTrendData = () => {
  const data = [];
  const startValue = 40 + Math.random() * 40;
  for (let i = 0; i < 7; i++) {
    data.push({
      time: `04-${10 + i}`,
      value: Math.floor(startValue + Math.sin(i) * 20 + Math.random() * 10)
    });
  }
  return data;
};

const generateMockTopics = (): HotTopic[] => {
  const topics: HotTopic[] = [];
  const trends: any[] = ['up', 'stable', 'down'];
  const recommendations: any[] = ['强推荐', '可跟进', '不建议'];
  const directions: ContentDirection[] = ['教程类', '观点类', '案例拆解', '实操类'];

  for (let i = 1; i <= 30; i++) {
    const seed = mockTopicSeeds[i % mockTopicSeeds.length];
    const trend = trends[i % 3];
    const rec = recommendations[i % 3];
    const contentCategory = mapToContentCategory(seed, { source: '微博', summary: seed });
    
    const hotnessScore = 60 + Math.floor(Math.random() * 40);
    const opportunityScore = 50 + Math.floor(Math.random() * 50);
    const opportunityType = getOpportunityTypeByScores({ hotnessScore, opportunityScore });

    topics.push({
      id: `${i}`,
      title: `微博热榜 #${i}: ${seed}`,
      source: '微博',
      popularity: Math.floor(Math.random() * 1000000),
      contentCategory,
      tags: [contentCategory],
      summary: `围绕「${seed}」的最新进展正在扩散，适合从事实拆解与内容切入角度跟进。`,
      trend,
      recommendation: rec,
      hotnessScore,
      opportunityScore,
      opportunityType,
      trendData: generateTrendData(),
      isNew: i > 25,
      isProcessed: i % 4 === 0,
      isFavorite: i % 7 === 0,
      isUsed: i % 10 === 0,
      suggestedDirections: [directions[i % 4], directions[(i + 1) % 4]],
      actionAdvice: {
        postTime: '未来 12 小时内',
        platforms: ['微博'],
        format: i % 2 === 0 ? '图文' : '短视频',
        angle: '建议结合微博话题标签做深度案例拆解'
      },
      breakdown: {
        hotness: { 
          platform: 70 + Math.floor(Math.random() * 30), 
          growth: 60 + Math.floor(Math.random() * 40), 
          sustained: 50 + Math.floor(Math.random() * 50) 
        },
        opportunity: { 
          fit: 80 + Math.floor(Math.random() * 20), 
          malleability: 70 + Math.floor(Math.random() * 30), 
          viral: 60 + Math.floor(Math.random() * 40), 
          competition: Math.floor(Math.random() * 60) 
        }
      }
    });
  }
  return topics;
};

export const mockHotTopics: HotTopic[] = generateMockTopics();

export const refreshPool: HotTopic[] = [
  {
    id: 'refresh-v4',
    title: '微博热榜快讯：2026 互联网技术峰会公布首批大模型商用标准',
    source: '微博',
    popularity: 920000,
    contentCategory: mapToContentCategory('微博热榜快讯：2026 互联网技术峰会公布首批大模型商用标准', { source: '微博' }),
    tags: ['科技'],
    summary: '全球多家科技巨头联合发布了 AI 大模型准入及合规使用白皮书，这标志着产业进入规范化轨道。',
    trend: 'up',
    recommendation: '强推荐',
    hotnessScore: 94,
    opportunityScore: 98,
    opportunityType: getOpportunityTypeByScores({ hotnessScore: 94, opportunityScore: 98 }),
    isNew: true,
    trendData: generateTrendData(),
    suggestedDirections: ['观点类', '实操类'],
    actionAdvice: {
      postTime: '即刻发布',
      platforms: ['微博'],
      format: '图文',
      angle: '结合微博热搜讨论点进行合规性解读'
    },
    breakdown: {
      hotness: { platform: 96, growth: 98, sustained: 88 },
      opportunity: { fit: 99, malleability: 94, viral: 96, competition: 8 }
    }
  }
];

export const mockGeneratedTopicsMap: Record<string, GeneratedTopic[]> = {
  'refresh-v4': [
    {
      id: 'refresh-res-1',
      title: '新规落地后，企业内容合规怎么做才不踩线',
      explanation: '围绕大模型商用标准，给出可执行的内容合规路径，帮助团队快速从“知道”到“能做”。',
      structure: ['1. 新规变化速览', '2. 企业常见误区', '3. 合规执行清单'],
      platforms: ['微博'],
      hook: '“不是不能做 AI 内容，而是你要先知道边界在哪里。”'
    },
    {
      id: 'refresh-res-2',
      title: '新标准发布后，谁会先吃到第一波增量',
      explanation: '通过角色视角拆解标准发布后的机会分层，帮助不同岗位找到自己的切入位。',
      structure: ['1. 机会分层图', '2. 岗位切入点', '3. 30 天行动建议'],
      platforms: ['微博'],
      hook: '“同一条新闻，为什么有人看到风险，有人却看到增长入口？”'
    },
    {
      id: 'refresh-res-3',
      title: '从观望到落地：AI 内容团队的三阶段升级路线',
      explanation: '把抽象趋势变成团队推进路径，适合正在搭建或升级内容团队的管理者。',
      structure: ['1. 现状诊断', '2. 三阶段路线', '3. 指标与复盘'],
      platforms: ['微博'],
      hook: '“真正拉开差距的，不是工具，而是你的推进节奏。”'
    }
  ],
  'default': [
    { 
      id: 'res-1',
      title: '深度拆解：为什么你一定要关注这个热点', 
      explanation: '从宏观视角出发，结合热点事件分析其对普通用户与内容传播的深远影响。',
      structure: ['1. 现状回顾', '2. 热点冲击力分析', '3. 三个实操建议'],
      platforms: ['微博'],
      hook: '“如果你还在用旧逻辑经营，这个热点可能会让你在这个月颗粒无收。”' 
    },
    { 
      id: 'res-2',
      title: '避坑指南：关于这个热点的 5 个常见误区', 
      explanation: '通过反向思维，指出目前大多数人对该热点的理解偏差，建立专业人设。',
      structure: ['1. 常见的 5 个误解', '2. 真相拆解', '3. 正确的姿态是什么'],
      platforms: ['微博'],
      hook: '“看到大家都在转那个说法，我坐不住了，这里面的坑比你想象的深。”' 
    },
    { 
      id: 'res-3',
      title: '保姆级教程：从 0 到 1 抓住这个风口', 
      explanation: '侧重于工具和方法的传授，将复杂的背景转化为可执行的步骤。',
      structure: ['1. 准备工作', '2. 关键三步走', '3. 预期收益评估'],
      platforms: ['微博'],
      hook: '“别光看热闹，这份三步走实操清单，建议直接收藏吃灰。”' 
    },
  ]
};

export const strategyStructureTemplates: Record<StrategyKey, string[]> = {
  comparison: ['对比维度', '差异分析', '优劣总结'],
  analysis: ['问题提出', '原因分析', '传播影响', '解决方案'],
  emotion: ['情绪共鸣', '用户故事', '价值认同', '行动引导'],
  toolkit: ['工具介绍', '使用步骤', '案例演示', '注意事项']
};
