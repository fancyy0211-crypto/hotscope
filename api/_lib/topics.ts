import { Source, TopicLite } from './types';

type RemoteTopic = {
  title: string;
  hot_value?: number;
  link?: string;
};

const API_MAP: Record<Source, string> = {
  微博: 'https://60s.viki.moe/v2/weibo',
  抖音: 'https://60s.viki.moe/v2/douyin',
  知乎: 'https://60s.viki.moe/v2/zhihu',
  小红书: 'https://60s.viki.moe/v2/rednote'
};

async function fetchPlatformTopics(source: Source): Promise<TopicLite[]> {
  const url = API_MAP[source];
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${source} fetch failed: ${resp.status}`);
  const payload = await resp.json();
  const rows: RemoteTopic[] = Array.isArray(payload?.data) ? payload.data : [];
  if (rows.length === 0) return [];

  const maxHot = Math.max(...rows.map((item) => item.hot_value || 0), 1);

  return rows.map((item, index) => {
    const rawHot = item.hot_value || 0;
    const hotness = Math.max(1, Math.round((rawHot / maxHot) * 100));
    const opportunity = Math.max(1, Math.min(100, 100 - index));
    return {
      title: item.title,
      source,
      link: item.link,
      trend: 'up',
      hotnessScore: hotness,
      opportunityScore: opportunity
    };
  });
}

export async function fetchAllTopicsLite(): Promise<TopicLite[]> {
  const settled = await Promise.allSettled(
    (Object.keys(API_MAP) as Source[]).map((source) => fetchPlatformTopics(source))
  );
  return settled.flatMap((item) => (item.status === 'fulfilled' ? item.value : []));
}
