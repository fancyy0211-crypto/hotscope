import { GeneratedTopic, HotTopic, Industry, StrategyKey, TrendDataPoint } from '../types';

type TrafficWindow = '24h' | '7d' | '30d';

interface IndustryStat {
  name: string;
  heat: number;
  growth: number;
  opportunity: number;
  status: string;
}

type IndustryTrafficPoint = Record<string, string | number>;

interface WeiboTopicSourceLike {
  fetchCurrentWeiboTopics(): Promise<HotTopic[]>;
  fetchWeiboTopicById(topicId: string): Promise<HotTopic | null>;
  fetchWeiboTopicHistory(topicId: string): Promise<TrendDataPoint[]>;
  fetchRefreshedWeiboTopics(currentTopics: HotTopic[]): Promise<{ topics: HotTopic[]; newCount: number }>;
  fetchGeneratedTopicTemplates(topicId: string): Promise<GeneratedTopic[]>;
  getStrategyStructureTemplates(): Record<StrategyKey, string[]>;
  getIndustryStats(): IndustryStat[];
  getIndustryTrafficByWindow(window: TrafficWindow): IndustryTrafficPoint[];
}

interface Weibo60sItem {
  title: string;
  hot_value: number;
  link: string;
}

interface Weibo60sResponse {
  code: number;
  message: string;
  data: Weibo60sItem[];
}

const WEIBO_API_URL = 'https://60s.viki.moe/v2/weibo';

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

const mapToHotTopic = (item: Weibo60sItem, index: number, maxHot: number): HotTopic => {
  const safeHot = Math.max(1, Number(item.hot_value) || 1);
  const hotnessScore = clampScore((safeHot / maxHot) * 100);
  const opportunityScore = clampScore(100 - index);
  const industry = pickIndustry(item.title);

  return {
    id: `weibo-${index + 1}-${hashTitle(item.title)}`,
    title: item.title,
    source: '微博',
    link: item.link,
    popularity: safeHot,
    industry: industry,
    tags: [industry],
    summary: `微博热榜话题「${item.title}」当前热度值约 ${safeHot}，建议结合实时讨论窗口快速切入。`,
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
      platforms: ['微博'],
      format: hotnessScore > 75 ? '短视频' : '图文',
      angle: '优先借势微博话题标签与高讨论评论区切入'
    },
    isNew: index < 5,
    suggestedDirections: ['观点类', '案例拆解']
  };
};

export const createRealWeiboTopicSource = (fallbackSource: WeiboTopicSourceLike): WeiboTopicSourceLike => ({
  async fetchCurrentWeiboTopics(): Promise<HotTopic[]> {
    try {
      const response = await fetch(WEIBO_API_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as Weibo60sResponse;
      if (payload.code !== 200 || !Array.isArray(payload.data) || payload.data.length === 0) {
        throw new Error(`Unexpected payload: code=${payload.code}, message=${payload.message}`);
      }

      const sanitized = payload.data.filter((item) => item?.title && Number(item?.hot_value) > 0);
      if (sanitized.length === 0) {
        throw new Error('No valid weibo topic rows from API');
      }

      const maxHot = Math.max(...sanitized.map((item) => Number(item.hot_value) || 1), 1);
      return sanitized.map((item, index) => mapToHotTopic(item, index, maxHot));
    } catch (error) {
      console.error('[RealWeiboTopicSource] fetchCurrentWeiboTopics failed, fallback to mock source:', error);
      return fallbackSource.fetchCurrentWeiboTopics();
    }
  },

  async fetchWeiboTopicById(topicId: string): Promise<HotTopic | null> {
    const topics = await this.fetchCurrentWeiboTopics();
    return topics.find((topic) => topic.id === topicId) || fallbackSource.fetchWeiboTopicById(topicId);
  },

  async fetchWeiboTopicHistory(topicId: string): Promise<TrendDataPoint[]> {
    const topic = await this.fetchWeiboTopicById(topicId);
    if (topic?.trendData?.length) {
      return topic.trendData.map((point) => ({ ...point }));
    }
    return fallbackSource.fetchWeiboTopicHistory(topicId);
  },

  async fetchRefreshedWeiboTopics(currentTopics: HotTopic[]): Promise<{ topics: HotTopic[]; newCount: number }> {
    const latest = await this.fetchCurrentWeiboTopics();
    const merged = [...latest, ...currentTopics];
    const topics = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    const currentIds = new Set(currentTopics.map((item) => item.id));
    const newCount = latest.filter((item) => !currentIds.has(item.id)).length;
    return { topics, newCount };
  },

  fetchGeneratedTopicTemplates(topicId: string): Promise<GeneratedTopic[]> {
    return fallbackSource.fetchGeneratedTopicTemplates(topicId);
  },

  getStrategyStructureTemplates(): Record<StrategyKey, string[]> {
    return fallbackSource.getStrategyStructureTemplates();
  },

  getIndustryStats(): IndustryStat[] {
    return fallbackSource.getIndustryStats();
  },

  getIndustryTrafficByWindow(window: TrafficWindow): IndustryTrafficPoint[] {
    return fallbackSource.getIndustryTrafficByWindow(window);
  }
});
