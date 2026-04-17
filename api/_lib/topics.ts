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

const pickIndustry = (title: string): string => {
  if (/经济|股市|黄金|投资|融资|基金/.test(title)) return '金融 / 投资';
  if (/明星|演唱会|综艺|影视|娱乐|CP/.test(title)) return '广告 / 传媒 / 内容';
  if (/AI|科技|芯片|算法|大模型|互联网/.test(title)) return '互联网 / 科技';
  if (/教育|学校|考研|教培/.test(title)) return '教育 / 教培';
  if (/医疗|健康|医院|药/.test(title)) return '医疗 / 健康';
  if (/电商|消费|品牌|产品/.test(title)) return '消费品 / 电商';
  return '服务业';
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
      industry: pickIndustry(item.title),
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

