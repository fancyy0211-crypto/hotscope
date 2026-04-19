import { HotTopic, Source, TrendDataPoint } from '../types';
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

const API_URL = 'https://60s.viki.moe/v2/rednote';
const PLATFORM: Source = '小红书';

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

const mapToTopic = (item: ApiTopicItem, index: number, total: number, maxHot: number): HotTopic => {
  const hotValue = toHotValue(item);
  const rankPercentile = total <= 1 ? 0 : index / (total - 1);
  const hotnessScore = computeHotnessScore(hotValue, maxHot);
  const growth = computeGrowthScore(rankPercentile, index, hotnessScore);
  const competition = computeCompetitionScore(rankPercentile, hotnessScore, index);
  const opportunityScore = computeOpportunityScore(rankPercentile, growth, competition);
  const opportunityType = getOpportunityTypeByScores({ hotnessScore, opportunityScore });
  const entryOpportunity = clampScore((100 - competition) * 0.45 + growth * 0.35 + rankPercentile * 100 * 0.2);
  const contentCategory = mapToContentCategory(item.title, {
    source: PLATFORM,
    summary: `小红书热点「${item.title}」当前热度值约 ${hotValue}`
  });

  return {
    id: `rednote-${index + 1}-${hashTitle(item.title)}`,
    title: item.title,
    source: PLATFORM,
    link: item.link,
    popularity: hotValue,
    contentCategory,
    tags: [contentCategory],
    summary: `小红书热点「${item.title}」当前热度值约 ${hotValue}，建议结合种草场景和用户经验贴切入。`,
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
      platforms: [PLATFORM],
      format: '图文',
      angle: '优先用场景化案例和清单体结构承接搜索流量'
    },
    isNew: index < 5,
    suggestedDirections: ['观点类', '案例拆解']
  };
};

export const createRealRednoteTopicSource = (fallbackSource: PlatformTopicSourceLike): PlatformTopicSourceLike => ({
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
        throw new Error('No valid rednote rows from API');
      }

      const maxHot = Math.max(...sanitized.map(toHotValue), 1);
      const mapped = sanitized.map((item, index) => mapToTopic(item, index, sanitized.length, maxHot));
      return applyTopicPercentiles(mapped);
    } catch (error) {
      console.error('[RealRednoteTopicSource] fetchCurrentTopics failed, fallback to mock source:', error);
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
