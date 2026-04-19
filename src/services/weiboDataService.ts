import {
  mockGeneratedTopicsMap,
  mockHotTopics,
  refreshPool,
  strategyStructureTemplates,
} from '../mockData';
import { GeneratedTopic, HotTopic, Source, StrategyKey, TrendDataPoint } from '../types';
import { createRealDouyinTopicSource } from './realDouyinTopicSource';
import { createRealRednoteTopicSource } from './realRednoteTopicSource';
import { createRealWeiboTopicSource } from './realWeiboTopicSource';
import { createRealZhihuTopicSource } from './realZhihuTopicSource';

interface WeiboTopicSource {
  fetchCurrentWeiboTopics(): Promise<HotTopic[]>;
  fetchWeiboTopicById(topicId: string): Promise<HotTopic | null>;
  fetchWeiboTopicHistory(topicId: string): Promise<TrendDataPoint[]>;
  fetchRefreshedWeiboTopics(currentTopics: HotTopic[]): Promise<{ topics: HotTopic[]; newCount: number }>;
  fetchGeneratedTopicTemplates(topicId: string): Promise<GeneratedTopic[]>;
  getStrategyStructureTemplates(): Record<StrategyKey, string[]>;
}

interface PlatformTopicSource {
  fetchCurrentTopics(): Promise<HotTopic[]>;
  fetchTopicById(topicId: string): Promise<HotTopic | null>;
  fetchTopicHistory(topicId: string): Promise<TrendDataPoint[]>;
}

const normalizeTopic = (topic: HotTopic): HotTopic => ({
  ...topic,
  trendData: topic.trendData.map((point) => ({ ...point })),
  actionAdvice: {
    ...topic.actionAdvice,
    platforms: [topic.source],
  },
});

const normalizeGeneratedTopic = (item: GeneratedTopic): GeneratedTopic => ({
  ...item,
  structure: [...item.structure],
  platforms: ['微博'],
});

const retagTopicForSource = (topic: HotTopic, source: Source): HotTopic => ({
  ...normalizeTopic(topic),
  id: `${source}-${topic.id}`,
  source,
  actionAdvice: {
    ...topic.actionAdvice,
    platforms: [source],
  },
});

class MockWeiboTopicSource implements WeiboTopicSource {
  async fetchCurrentWeiboTopics(): Promise<HotTopic[]> {
    return mockHotTopics.map(normalizeTopic);
  }

  async fetchWeiboTopicById(topicId: string): Promise<HotTopic | null> {
    const allTopics = await this.fetchCurrentWeiboTopics();
    return allTopics.find((topic) => topic.id === topicId) || null;
  }

  async fetchWeiboTopicHistory(topicId: string): Promise<TrendDataPoint[]> {
    const topic = await this.fetchWeiboTopicById(topicId);
    return topic ? topic.trendData.map((point) => ({ ...point })) : [];
  }

  async fetchRefreshedWeiboTopics(currentTopics: HotTopic[]): Promise<{ topics: HotTopic[]; newCount: number }> {
    const incoming = refreshPool.map(normalizeTopic);
    const merged = [...incoming, ...currentTopics.map(normalizeTopic)];
    const topics = Array.from(new Map(merged.map((item) => [item.id, item])).values());
    return { topics, newCount: incoming.length };
  }

  async fetchGeneratedTopicTemplates(topicId: string): Promise<GeneratedTopic[]> {
    const base = mockGeneratedTopicsMap[topicId] || mockGeneratedTopicsMap.default;
    return base.map(normalizeGeneratedTopic);
  }

  getStrategyStructureTemplates(): Record<StrategyKey, string[]> {
    return strategyStructureTemplates;
  }

}

const createMockPlatformFallback = (mockSource: MockWeiboTopicSource, source: Source): PlatformTopicSource => ({
  async fetchCurrentTopics(): Promise<HotTopic[]> {
    const weiboTopics = await mockSource.fetchCurrentWeiboTopics();
    return weiboTopics.map((topic) => retagTopicForSource(topic, source));
  },

  async fetchTopicById(topicId: string): Promise<HotTopic | null> {
    const topics = await this.fetchCurrentTopics();
    return topics.find((topic) => topic.id === topicId) || null;
  },

  async fetchTopicHistory(topicId: string): Promise<TrendDataPoint[]> {
    const topic = await this.fetchTopicById(topicId);
    return topic ? topic.trendData.map((point) => ({ ...point })) : [];
  }
});

const ACTIVE_SOURCE: 'mock' | 'real' = import.meta.env.VITE_TOPIC_SOURCE === 'mock' ? 'mock' : 'real';

const mockSource = new MockWeiboTopicSource();
const realWeiboSource = createRealWeiboTopicSource(mockSource);

const weiboPlatformSource: PlatformTopicSource = {
  fetchCurrentTopics: () => realWeiboSource.fetchCurrentWeiboTopics(),
  fetchTopicById: (topicId: string) => realWeiboSource.fetchWeiboTopicById(topicId),
  fetchTopicHistory: (topicId: string) => realWeiboSource.fetchWeiboTopicHistory(topicId),
};

const douyinPlatformSource = createRealDouyinTopicSource(createMockPlatformFallback(mockSource, '抖音'));
const zhihuPlatformSource = createRealZhihuTopicSource(createMockPlatformFallback(mockSource, '知乎'));
const rednotePlatformSource = createRealRednoteTopicSource(createMockPlatformFallback(mockSource, '小红书'));

const source: WeiboTopicSource = ACTIVE_SOURCE === 'mock' ? mockSource : realWeiboSource;

const platformSources: Record<Source, PlatformTopicSource> = ACTIVE_SOURCE === 'mock'
  ? {
      微博: createMockPlatformFallback(mockSource, '微博'),
      抖音: createMockPlatformFallback(mockSource, '抖音'),
      知乎: createMockPlatformFallback(mockSource, '知乎'),
      小红书: createMockPlatformFallback(mockSource, '小红书'),
    }
  : {
      微博: weiboPlatformSource,
      抖音: douyinPlatformSource,
      知乎: zhihuPlatformSource,
      小红书: rednotePlatformSource,
    };

export const weiboDataService = {
  fetchCurrentWeiboTopics: () => source.fetchCurrentWeiboTopics(),
  fetchWeiboTopicById: (topicId: string) => source.fetchWeiboTopicById(topicId),
  fetchWeiboTopicHistory: (topicId: string) => source.fetchWeiboTopicHistory(topicId),
  fetchRefreshedWeiboTopics: (currentTopics: HotTopic[]) => source.fetchRefreshedWeiboTopics(currentTopics),
  fetchGeneratedTopicTemplates: (topicId: string) => source.fetchGeneratedTopicTemplates(topicId),
  getStrategyStructureTemplates: () => source.getStrategyStructureTemplates(),
  fetchAllTopics: async (): Promise<HotTopic[]> => {
    const [weiboTopics, douyinTopics, zhihuTopics, rednoteTopics] = await Promise.all([
      platformSources['微博'].fetchCurrentTopics(),
      platformSources['抖音'].fetchCurrentTopics(),
      platformSources['知乎'].fetchCurrentTopics(),
      platformSources['小红书'].fetchCurrentTopics(),
    ]);

    return [...weiboTopics, ...douyinTopics, ...zhihuTopics, ...rednoteTopics];
  }
};
