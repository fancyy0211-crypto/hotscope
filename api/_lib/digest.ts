import { Source, TopicLite } from './types';

export const getTopicCompositeScore = (topic: TopicLite) =>
  topic.hotnessScore * 0.5 + topic.opportunityScore * 0.5;

export const getEmailReason = (topic: TopicLite, selectedIndustries: string[]): string => {
  if (topic.hotnessScore > 80) return '热度高，处于爆发阶段';
  if (topic.trend === 'up') return '趋势上升，建议尽早介入';
  if (selectedIndustries.includes(topic.industry)) return '与你关注的行业高度相关';
  return '具备稳定讨论基础，适合作为简报观察对象';
};

export const buildDigestConclusion = (
  topics: TopicLite[],
  selectedPlatforms: Source[],
  selectedIndustries: string[]
): string => {
  if (topics.length === 0) {
    return '今日暂无满足筛选条件的热点，建议适当放宽平台或行业筛选后再观察。';
  }
  const top1 = [...topics].sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a))[0];
  const trendText = top1.trend === 'up' ? '仍处于上升窗口' : top1.trend === 'down' ? '热度回落，建议谨慎跟进' : '处于稳定讨论期';
  return `今日建议优先跟进「${top1.title}」，该话题在你关注的平台（${selectedPlatforms.join(' / ')}）与行业（${selectedIndustries.join(' / ')}）中机会值最高，${trendText}。`;
};

export const buildDigestParams = (
  topics: TopicLite[],
  selectedPlatforms: Source[],
  selectedIndustries: string[]
): Record<string, string> => {
  const topTopics = [...topics].sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a)).slice(0, 3);
  const payload: Record<string, string> = {
    platforms: selectedPlatforms.join(' / '),
    industries: selectedIndustries.join(' / '),
    conclusion: buildDigestConclusion(topTopics, selectedPlatforms, selectedIndustries)
  };

  for (let i = 0; i < 3; i += 1) {
    const topic = topTopics[i];
    const idx = i + 1;
    payload[`title${idx}`] = topic?.title || '';
    payload[`score${idx}`] = topic ? String(Math.round(getTopicCompositeScore(topic))) : '';
    payload[`platform${idx}`] = topic?.source || '';
    payload[`link${idx}`] = topic?.link || '';
    payload[`reason${idx}`] = topic ? getEmailReason(topic, selectedIndustries) : '';
  }
  return payload;
};

