import { HotTopic, Industry, Source, TrendDataPoint } from '../types';

interface PlatformTopicSourceLike {
  fetchCurrentTopics(): Promise<HotTopic[]>;
  fetchTopicById(topicId: string): Promise<HotTopic | null>;
  fetchTopicHistory(topicId: string): Promise<TrendDataPoint[]>;
}

interface ApiTopicItem {
  title: string;
  hot_value?: number;
  hot?: number;
  link?: string;
}

interface ApiResponse {
  code: number;
  message: string;
  data: ApiTopicItem[];
}

const API_URL = 'https://60s.viki.moe/v2/douyin';
const PLATFORM: Source = '抖音';

const clampScore = (value: number) => Math.max(1, Math.min(100, Math.round(value)));

const pickIndustry = (title: string): Industry => {
  if (/经济|股市|黄金/.test(title)) return '金融 / 投资';
  if (/明星|演唱会/.test(title)) return '广告 / 传媒 / 内容';
  if (/AI|科技|芯片/i.test(title)) return '互联网 / 科技';
  return '服务业';
};

const hashTitle = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
};

const buildTrendData = (baseScore: number, seed: number): TrendDataPoint[] => {
  const normalized = Math.max(20, Math.min(100, baseScore));
  return Array.from({ length: 7 }, (_, idx) => {
    const drift = (idx - 3) * 1.8;
    const jitter = ((seed + idx) % 5) - 2;
    return {
      time: `04-${10 + idx}`,
      value: clampScore(normalized + drift + jitter)
    };
  });
};

const toRecommendation = (hotnessScore: number, opportunityScore: number): HotTopic['recommendation'] => {
  if (opportunityScore >= 80 || hotnessScore >= 85) return '强推荐';
  if (opportunityScore >= 55 || hotnessScore >= 60) return '可跟进';
  return '不建议';
};

const toHotValue = (item: ApiTopicItem) => Math.max(1, Number(item.hot_value ?? item.hot ?? 1) || 1);

const mapToTopic = (item: ApiTopicItem, index: number, maxHot: number): HotTopic => {
  const hotValue = toHotValue(item);
  const hotnessScore = clampScore((hotValue / maxHot) * 100);
  const opportunityScore = clampScore(100 - index);
  const industry = pickIndustry(item.title);

  return {
    id: `douyin-${index + 1}-${hashTitle(item.title)}`,
    title: item.title,
    source: PLATFORM,
    link: item.link,
    popularity: hotValue,
    industry: industry,
    tags: [industry],
    summary: `抖音热点「${item.title}」当前热度值约 ${hotValue}，建议结合实时评论与话题挑战快速切入。`,
    trend: 'up',
    recommendation: toRecommendation(hotnessScore, opportunityScore),
    hotnessScore,
    opportunityScore,
    breakdown: {
      hotness: {
        platform: hotnessScore,
        growth: clampScore(hotnessScore - 6 + (index % 7)),
        sustained: clampScore(hotnessScore - 10 + (index % 9)),
      },
      opportunity: {
        fit: clampScore(opportunityScore - 5 + (index % 8)),
        malleability: clampScore(opportunityScore - 8 + (index % 6)),
        viral: clampScore(hotnessScore - 3 + (index % 5)),
        competition: clampScore(100 - opportunityScore + 12),
      }
    },
    trendData: buildTrendData(hotnessScore, index),
    actionAdvice: {
      postTime: '未来 12 小时内',
      platforms: [PLATFORM],
      format: hotnessScore > 75 ? '短视频' : '图文',
      angle: '优先复用高互动评论区观点切入，缩短起量时间'
    },
    isNew: index < 5,
    suggestedDirections: ['观点类', '案例拆解']
  };
};

export const createRealDouyinTopicSource = (fallbackSource: PlatformTopicSourceLike): PlatformTopicSourceLike => ({
  async fetchCurrentTopics(): Promise<HotTopic[]> {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ApiResponse;
      if (payload.code !== 200 || !Array.isArray(payload.data) || payload.data.length === 0) {
        throw new Error(`Unexpected payload: code=${payload.code}, message=${payload.message}`);
      }

      const sanitized = payload.data.filter((item) => item?.title);
      if (sanitized.length === 0) {
        throw new Error('No valid douyin rows from API');
      }

      const maxHot = Math.max(...sanitized.map(toHotValue), 1);
      return sanitized.map((item, index) => mapToTopic(item, index, maxHot));
    } catch (error) {
      console.error('[RealDouyinTopicSource] fetchCurrentTopics failed, fallback to mock source:', error);
      return fallbackSource.fetchCurrentTopics();
    }
  },

  async fetchTopicById(topicId: string): Promise<HotTopic | null> {
    const topics = await this.fetchCurrentTopics();
    return topics.find((topic) => topic.id === topicId) || fallbackSource.fetchTopicById(topicId);
  },

  async fetchTopicHistory(topicId: string): Promise<TrendDataPoint[]> {
    const topic = await this.fetchTopicById(topicId);
    if (topic?.trendData?.length) {
      return topic.trendData.map((point) => ({ ...point }));
    }
    return fallbackSource.fetchTopicHistory(topicId);
  }
});
