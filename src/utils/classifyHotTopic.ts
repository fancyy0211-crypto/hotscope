import { CATEGORY_KEYWORDS, CATEGORY_PRIORITY, PLATFORM_BONUS } from '../config/categoryConfig';
import { ContentCategory, Source } from '../types';

export type CategoryContext = {
  source?: Source;
  summary?: string;
  tags?: string[];
  debug?: boolean;
};

type CategoryScoreMap = Record<ContentCategory, number>;
type CategoryHitMap = Record<ContentCategory, string[]>;
type CategoryHitCount = Record<ContentCategory, number>;

type ScoreResult = {
  scores: CategoryScoreMap;
  hitWords: CategoryHitMap;
  hitCount: CategoryHitCount;
  bestCategory: Exclude<ContentCategory, '更多'>;
  bestScore: number;
  secondScore: number;
  confidence: number;
};

const CATEGORY_LIST: ContentCategory[] = [
  '社会',
  '文娱生活',
  '科技',
  '财经',
  '汽车',
  '教育',
  '体育',
  'ACG',
  '更多'
];

const createScoreMap = (): CategoryScoreMap => ({
  社会: 0,
  文娱生活: 0,
  科技: 0,
  财经: 0,
  汽车: 0,
  教育: 0,
  体育: 0,
  ACG: 0,
  更多: 0
});

const createHitMap = (): CategoryHitMap => ({
  社会: [],
  文娱生活: [],
  科技: [],
  财经: [],
  汽车: [],
  教育: [],
  体育: [],
  ACG: [],
  更多: []
});

const createHitCount = (): CategoryHitCount => ({
  社会: 0,
  文娱生活: 0,
  科技: 0,
  财经: 0,
  汽车: 0,
  教育: 0,
  体育: 0,
  ACG: 0,
  更多: 0
});

const addScore = (
  scores: CategoryScoreMap,
  hitWords: CategoryHitMap,
  hitCount: CategoryHitCount,
  category: ContentCategory,
  word: string,
  score: number
) => {
  scores[category] += score;
  hitCount[category] += 1;
  hitWords[category].push(word);
};

const unique = (arr: string[]) => Array.from(new Set(arr));

const STRONG_RULES = {
  social: /(市监局|警方|通报|整治|调查|处罚|案件|事故|公共安全|日本|美国|中国|俄罗斯|乌克兰|伊朗|以色列|美伊|霍尔木兹|海峡|国际|外交|国防|军事|协议|冲突|战争|制裁|通航|航运|船只|折返|外卖|食品安全|幽灵外卖)/i,
  auto: /(汽车|新能源|电车|油车|车牌|绿牌|车型|摩托|机车|豪爵|春风|雅马哈|比亚迪|特斯拉|蔚来|理想|小鹏|问界|小米汽车|雷军|续航|自动驾驶|智驾)/i,
  sports: /(比赛|比分|联赛|晋级|淘汰|决赛|乒乓球|足球|篮球|网球|中超|nba|cba|世界杯|苏超|wsbk|球员|球队|宿迁|南京|徐州|泰州|\b\d+\s*[:：]\s*\d+\b)/i,
  acg: /(游戏|原神|米哈游|steam|动漫|漫画|电竞|二次元|动画|手游|端游)/i,
  entertainment: /(明星|演员|歌手|恋情|综艺|电影|电视剧|演唱会|新歌|mv|专辑|版权|侵权|复刻|造型|单依纯|王菲|穿搭|妆容|美妆|拍照|拍照姿势|出片|ootd|吐槽|感情|日常|旅行|旅游|vlog|古诗词|生活方式)/i
};

export const classifyByStrongRules = (
  title: string,
  context: CategoryContext = {}
): ContentCategory | null => {
  const text = `${title} ${context.summary || ''}`.toLowerCase();

  if (STRONG_RULES.auto.test(text)) return '汽车';
  if (STRONG_RULES.social.test(text)) return '社会';
  if (STRONG_RULES.entertainment.test(text)) return '文娱生活';
  if (STRONG_RULES.sports.test(text)) return '体育';
  if (STRONG_RULES.acg.test(text)) return 'ACG';

  return null;
};

export const classifyByScore = (
  title: string,
  context: CategoryContext = {}
): ScoreResult => {
  const text = `${title} ${context.summary || ''} ${(context.tags || []).join(' ')}`.toLowerCase();
  const scores = createScoreMap();
  const hitWords = createHitMap();
  const hitCount = createHitCount();

  (Object.keys(CATEGORY_KEYWORDS) as Array<Exclude<ContentCategory, '更多'>>).forEach((category) => {
    CATEGORY_KEYWORDS[category].forEach((word) => {
      if (text.includes(word.toLowerCase())) {
        const weighted = word.length >= 3 ? 2 : 1;
        addScore(scores, hitWords, hitCount, category, word, weighted);
      }
    });
  });

  const sourceBonus = context.source ? PLATFORM_BONUS[context.source] : undefined;
  if (sourceBonus) {
    Object.entries(sourceBonus).forEach(([category, bonus]) => {
      scores[category as ContentCategory] += bonus || 0;
    });
  }

  const ranking = CATEGORY_LIST
    .filter((c) => c !== '更多')
    .sort((a, b) => {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      if (hitCount[b] !== hitCount[a]) return hitCount[b] - hitCount[a];
      return CATEGORY_PRIORITY.indexOf(a) - CATEGORY_PRIORITY.indexOf(b);
    });

  const bestCategory = ranking[0] as Exclude<ContentCategory, '更多'>;
  const secondCategory = ranking[1] as Exclude<ContentCategory, '更多'>;
  return {
    scores,
    hitWords: Object.fromEntries(
      Object.entries(hitWords).map(([k, v]) => [k, unique(v)])
    ) as CategoryHitMap,
    hitCount,
    bestCategory,
    bestScore: scores[bestCategory],
    secondScore: scores[secondCategory] || 0,
    confidence: scores[bestCategory] - (scores[secondCategory] || 0)
  };
};

export const finalDecision = (
  strongRuleCategory: ContentCategory | null,
  scoreResult: ScoreResult
): ContentCategory => {
  if (strongRuleCategory) return strongRuleCategory;

  const noHit = scoreResult.bestScore <= 0 || scoreResult.hitCount[scoreResult.bestCategory] === 0;
  if (noHit) return '更多';

  const highConfidence = scoreResult.hitCount[scoreResult.bestCategory] >= 2;
  if (highConfidence) return scoreResult.bestCategory;

  // 中低置信下依然优先给出最接近类别，避免明显热点被“更多”吞没。
  return scoreResult.bestCategory;
};

export const scoreTopicCategories = (title: string, context: CategoryContext = {}) => {
  const strongRuleCategory = classifyByStrongRules(title, context);
  const scoreResult = classifyByScore(title, context);
  const category = finalDecision(strongRuleCategory, scoreResult);

  return {
    category,
    strongRuleCategory,
    ...scoreResult
  };
};

export const classifyHotTopicCategory = (
  title: string,
  context: CategoryContext = {}
): ContentCategory => {
  const result = scoreTopicCategories(title, context);
  if (context.debug) {
    // eslint-disable-next-line no-console
    console.debug('[CategoryDebug]', result);
  }
  return result.category;
};
