export type Source = '微博' | '抖音' | '知乎' | '小红书';

export type TopicLite = {
  title: string;
  source: Source;
  link?: string;
  trend: 'up' | 'down' | 'stable';
  hotnessScore: number;
  opportunityScore: number;
};
