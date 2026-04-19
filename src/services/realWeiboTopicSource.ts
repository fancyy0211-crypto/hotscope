import { GeneratedTopic, HotTopic, StrategyKey, TrendDataPoint } from '../types';
import { mapToContentCategory } from './contentCategory';
import {
  applyTopicPercentiles,
  clampScore,
  computeCompetitionScore,
  computeGrowthScore,
  computeHotnessScore,
  computeOpportunityScore,
  getOpportunityTypeByScores
} from './topicScoring';

interface WeiboTopicSourceLike {
  fetchCurrentWeiboTopics(): Promise<HotTopic[]>;
  fetchWeiboTopicById(topicId: string): Promise<HotTopic | null>;
  fetchWeiboTopicHistory(topicId: string): Promise<TrendDataPoint[]>;
  fetchRefreshedWeiboTopics(currentTopics: HotTopic[]): Promise<{ topics: HotTopic[]; newCount: number }>;
  fetchGeneratedTopicTemplates(topicId: string): Promise<GeneratedTopic[]>;
  getStrategyStructureTemplates(): Record<StrategyKey, string[]>;
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

const mapToHotTopic = (item: Weibo60sItem, index: number, total: number, maxHot: number): HotTopic => {
  const safeHot = Math.max(1, Number(item.hot_value) || 1);
  const rankPercentile = total <= 1 ? 0 : index / (total - 1);
  const hotnessScore = computeHotnessScore(safeHot, maxHot);
  const growth = computeGrowthScore(rankPercentile, index, hotnessScore);
  const competition = computeCompetitionScore(rankPercentile, hotnessScore, index);
  const opportunityScore = computeOpportunityScore(rankPercentile, growth, competition);
  const opportunityType = getOpportunityTypeByScores({ hotnessScore, opportunityScore });
  const entryOpportunity = clampScore((100 - competition) * 0.45 + growth * 0.35 + rankPercentile * 100 * 0.2);
  const contentCategory = mapToContentCategory(item.title, {
    source: '微博',
    summary: `微博热榜话题「${item.title}」当前热度值约 ${safeHot}`
  });

  return {
    id: `weibo-${index + 1}-${hashTitle(item.title)}`,
    title: item.title,
    source: '微博',
    link: item.link,
    popularity: safeHot,
    contentCategory,
    tags: [contentCategory],
    summary: `微博热榜话题「${item.title}」当前热度值约 ${safeHot}，建议结合实时讨论窗口快速切入。`,
    trend: 'up',
    recommendation: toRecommendation(hotnessScore, opportunityScore),
    hotnessScore,
    opportunityScore,
    opportunityType,
    breakdown: {
      hotness: {
        platform: hotnessScore,
        growth,
        sustained: clampScore((hotnessScore + growth) / 2 - 8 + (index % 5)),
      },
      opportunity: {
        fit: entryOpportunity,
        malleability: entryOpportunity,
        viral: clampScore((hotnessScore + growth) / 2 - 4 + (index % 5)),
        competition,
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
      const mapped = sanitized.map((item, index) => mapToHotTopic(item, index, sanitized.length, maxHot));
      return applyTopicPercentiles(mapped);
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
  }
});
