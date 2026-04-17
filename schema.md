# HotScope 数据结构定义（Schema）

本文件定义 HotScope 产品中的核心数据结构、状态管理与计算逻辑。

==================================================
一、核心数据模型
==================================================

【1】Topic（热点）

type Topic = {
  id: string
  title: string
  source: 'weibo'

  industries: string[]        // 适用行业（多选）
  tags: string[]              // 标签

  heatScore: number           // 热度值（0-100）
  opportunityScore: number    // 机会值（0-100）

  trend: number[]             // 趋势数据

  createdAt: string
}


【2】Strategy（跟进策略）

type Strategy = {
  id: string
  name: string
  type: 'analysis' | 'comparison' | 'emotion' | 'toolkit'
  description: string
}

策略示例：
- 深挖行业痛点 → analysis
- 对比同类产品 → comparison
- 情绪共鸣 → emotion
- 提供工具包 → toolkit


【3】GeneratedIdea（生成选题）

type GeneratedIdea = {
  id: string

  topicId: string
  strategyId: string

  title: string

  contentStructure: string[]   // 内容结构
  hook: string                 // 开头钩子

  targetAudience: string       // 目标人群

  createdAt: string
}


【4】Recommendation（推荐结果）

type Recommendation = {
  topicId: string

  score: number
  level: 'high' | 'medium' | 'low'

  reason: string

  breakdown: {
    traffic: number
    competition: number
    fit: number
  }
}


==================================================
二、用户状态（User State）
==================================================

type TabState =
  | 'hot'
  | 'recommended'
  | 'favorites'
  | 'generated'


type UserState = {
  selectedIndustries: string[]

  selectedStrategy: string | null

  favorites: string[]
  generatedIdeas: GeneratedIdea[]

  activeTab: TabState
}


==================================================
三、核心数据流（Data Flow）
==================================================

【1】行业筛选

function filterTopicsByIndustry(topics, industries) {
  return topics.filter(topic =>
    topic.industries.some(i => industries.includes(i))
  )
}


【2】推荐排序

function getRecommendations(topics, industries) {
  return topics
    .filter(topic =>
      topic.industries.some(i => industries.includes(i))
    )
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
}


【3】今日行动推荐

function getDailyMission(topics, industries) {
  const filtered = filterTopicsByIndustry(topics, industries)

  if (filtered.length === 0) {
    return {
      type: 'fallback',
      message: '当前行业暂无高价值热点，推荐跨行业机会'
    }
  }

  return filtered[0]
}


【4】Tab 数据切换

function getTabData(state, topics) {
  switch (state.activeTab) {
    case 'hot':
      return topics

    case 'recommended':
      return topics.filter(t => t.opportunityScore > 70)

    case 'favorites':
      return topics.filter(t => state.favorites.includes(t.id))

    case 'generated':
      return state.generatedIdeas

    default:
      return []
  }
}


【5】选题生成逻辑（核心）

function generateIdea(topic, strategy, target) {
  return {
    title: `${strategy.name}：${topic.title}`,
    contentStructure: getStructureByStrategy(strategy),
    hook: generateHook(topic, strategy),
    targetAudience: target
  }
}


【6】策略驱动结构（关键）

function getStructureByStrategy(strategy) {
  switch (strategy.type) {
    case 'comparison':
      return [
        '背景介绍',
        '对比对象',
        '差异分析',
        '优劣总结'
      ]

    case 'analysis':
      return [
        '问题提出',
        '原因分析',
        '行业影响',
        '解决方案'
      ]

    case 'emotion':
      return [
        '情绪共鸣',
        '用户故事',
        '价值认同',
        '行动引导'
      ]

    case 'toolkit':
      return [
        '工具介绍',
        '使用步骤',
        '案例演示',
        '注意事项'
      ]

    default:
      return []
  }
}


==================================================
四、评分系统
==================================================

热度计算：
热度 = 微博原始热度 + 增长率 + 讨论度

机会值：
机会值 = 行业匹配 + 流量潜力 - 竞争强度

推荐等级：

function getRecommendationLevel(score) {
  if (score > 80) return 'high'
  if (score > 60) return 'medium'
  return 'low'
}


==================================================
五、系统约束（必须遵守）
==================================================

1. 筛选必须真实生效（不能只改UI）
2. 推荐必须基于行业
3. 策略必须影响生成结果
4. 所有展示数据必须来自真实计算


==================================================
六、核心公式总结
==================================================

推荐 = 行业匹配 × 机会值 × 趋势
选题 = 热点 × 策略 × 用户目标
路径 = 筛选 → 判断 → 选择 → 生成 → 使用
