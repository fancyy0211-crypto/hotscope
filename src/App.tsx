/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { 
  TrendingUp, 
  Flame, 
  Settings, 
  LayoutGrid, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft,
  Wand2,
  Mail,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  RefreshCw,
  Info,
  TrendingDown,
  Activity,
  Zap,
  Target,
  CheckSquare,
  Users,
  Star,
  Bookmark,
  CheckCircle,
  Layers,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  Copy,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Share2,
  XCircle,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceDot,
  Label
} from 'recharts';
import { 
  HotTopic, 
  Source,
  ContentCategory,
  DigestPreference,
  DigestSubscription,
  GeneratedTopic, 
  ScoreBreakdown, 
  ContentGoal,
  ContentFormat,
  StrategyKey,
  GenerationPrefs,
  GeneratedRecord,
  OpportunityType
} from './types';
import { 
  weiboDataService
} from './services/weiboDataService';

// --- Components ---

const Sidebar = ({ activePage, setActivePage }: { activePage: string, setActivePage: (p: string) => void }) => {
  const navItems = [
    { id: 'home', icon: LayoutGrid, label: 'Explore 热点流' },
    { id: 'settings', icon: Settings, label: 'Settings 设置' },
  ];

  return (
    <aside className="w-[200px] border-r border-sleek-border h-screen flex flex-col bg-sleek-sidebar sticky top-0">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="bg-sleek-accent w-6 h-6 rounded-md flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-sleek-text-main">HotScope</h1>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                activePage === item.id 
                ? 'bg-sleek-hover text-sleek-text-main font-medium' 
                : 'text-sleek-text-secondary hover:bg-sleek-hover/50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};


interface TagProps {
  children: React.ReactNode;
  className?: string;
}

const Tag: React.FC<TagProps> = ({ children, className = "" }) => {
  const getTagColor = (text: string) => {
    const s = String(text);
    if (s.includes('AI')) return 'bg-tag-ai-bg text-tag-ai-text';
    if (s.includes('商业')) return 'bg-tag-biz-bg text-tag-biz-text';
    if (s.includes('职场')) return 'bg-[#F3E5F5] text-[#7B1FA2]';
    if (s.includes('教育')) return 'bg-[#E3F2FD] text-[#1976D2]';
    if (s.includes('娱乐')) return 'bg-[#FFF3E0] text-[#E65100]';
    return 'bg-[#F5F5F5] text-[#616161]';
  };

  return (
    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${getTagColor(children as string)} ${className}`}>
      {children}
    </span>
  );
};
const StandardIcon = ({ icon: Icon, className = "", onClick }: { icon: any, className?: string, onClick?: (e: React.MouseEvent) => void }) => (
  <Icon 
    onClick={onClick}
    className={`w-4 h-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer ${className}`} 
  />
);

const EmptyState = ({ message = "暂无匹配热点" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
    <div className="bg-sleek-sidebar p-6 rounded-full">
      <Search className="w-10 h-10 text-sleek-text-secondary opacity-20" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-black text-sleek-text-main">{message}</p>
      <p className="text-xs text-sleek-text-secondary">尝试调整筛选条件或切换热点类型后再看</p>
    </div>
  </div>
);

const SUMMARY_BANNED_PATTERNS = [
  /平台讨论/,
  /讨论集中在/,
  /成为关键主体/,
  /热点跟进/,
  /观点表达/,
  /舆论发酵/,
  /围绕该话题展开/,
  /引发热议/,
  /引发讨论/,
  /相关争议/,
  /事件相关方/,
  /出现新的披露/
];

const normalizeSummaryLength = (text: string): string | null => {
  const cleaned = text
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, '')
    .replace(/，+/g, '，')
    .replace(/。+/g, '。')
    .replace(/^[，。]+|[，。]+$/g, '');

  if (!cleaned) return null;
  if (cleaned.length < 40) return null;
  if (cleaned.length > 80) return `${cleaned.slice(0, 79).replace(/[，。；]$/, '')}。`;
  return `${cleaned.replace(/[。]$/, '')}。`;
};

const hasInformationGain = (title: string, summary: string) => {
  const t = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  const s = summary.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  if (!t || !s) return false;
  if (s === t) return false;
  if (s.length - t.length < 10) return false;
  if (s.includes(t) && s.length - t.length < 18) return false;
  return /表示|宣布|回应|通报|处罚|被罚|取消|冲突|发布|分享|发生|结果|行为|举动/.test(summary);
};

const hasConcreteAction = (text: string) =>
  /表示|宣布|回应|通报|处罚|被罚|取消|冲突|发布|发生|获胜|晋级|夺冠|下架|叫停/.test(text);

const buildEventSummary = (topic: HotTopic): string | null => {
  const title = (topic.title || '').trim();
  const summarySeed = (topic.summary || '')
    .replace(/建议[^。！!?]*[。！!?]?/g, '')
    .replace(/适合[^。！!?]*[。！!?]?/g, '')
    .trim();
  const seed = `${title} ${summarySeed}`;

  const buildByType = (): string | null => {
    const isZhihuQuestion = topic.source === '知乎' || /为什么|如何|是否|怎么看|怎样|为啥/.test(title);
    const isRednoteContent = topic.source === '小红书' || /教程|拍照|穿搭|分享|攻略|笔记|测评|经验|避坑/.test(title);
    const isAbstractOpinion = /撕掉伪装|真面目|不装了|彻底变了|态度变了|立场变化|背后/.test(title);

    const scoreMatch = seed.match(/\d+\s*[:：]\s*\d+/);
    const moneyMatch = seed.match(/\d+(?:\.\d+)?\s*(?:亿|万|千)?\s*(?:元|人民币)/);
    const actorVerbMatch = title.match(/^(.{1,12}?)(称|表示|宣布|回应|通报|辟谣|确认|否认|发布|指出|透露)(.+)$/);

    if (isZhihuQuestion) {
      const core = title
        .replace(/^(为什么|如何|是否|怎么看|怎样|为啥)/, '')
        .replace(/[？?]/g, '')
        .trim();
      return `围绕${core}这一现实问题，用户正在讨论其成因与影响，核心分歧在决策逻辑与结果判断。`;
    }

    if (isRednoteContent) {
      return null;
    }

    if (actorVerbMatch) {
      const actor = actorVerbMatch[1].trim();
      const verb = actorVerbMatch[2].trim();
      const action = actorVerbMatch[3].replace(/^[：:\s]+/, '').trim();
      return `${actor}${verb}${action}，该表态使其策略影响与执行可行性成为焦点。`;
    }

    if (scoreMatch) {
      return `${title}这场赛事出现${scoreMatch[0]}结果，相关队伍表现与后续走势成为焦点。`;
    }

    if (moneyMatch && /(被罚|处罚|罚款)/.test(seed)) {
      const actor = title.split(/被罚|处罚|罚款/)[0].trim() || '相关企业';
      return `${actor}因相关违规行为被处以约${moneyMatch[0]}处罚，处罚依据与企业责任边界成为焦点。`;
    }

    if (isAbstractOpinion) {
      const country = seed.match(/日本|美国|中国|欧盟/)?.[0] || '相关方';
      return `${country}近期的一项表态或举动被解读为立场变化，其真实意图与后续影响成为焦点。`;
    }

    if (/事件|事故|通报|冲突|发布|回应|取消|下架|停更|夺冠|获胜|晋级/.test(seed)) {
      return `${title}对应事件已出现明确进展，相关主体动作与责任归属成为焦点。`;
    }

    return null;
  };

  const generated = buildByType();
  if (!generated) return null;
  const candidate = normalizeSummaryLength(generated);
  if (!candidate) return null;
  if (!hasConcreteAction(candidate)) return null;
  if (SUMMARY_BANNED_PATTERNS.some((pattern) => pattern.test(candidate))) {
    return null;
  }
  if (!hasInformationGain(title, candidate)) {
    return null;
  }
  return candidate;
};

const HotTopicSummary = ({ topic }: { topic: HotTopic }) => {
  const keywordTags: Array<{ regex: RegExp; tag: string }> = [
    { regex: /回应|通报|声明|辟谣/, tag: '官方回应' },
    { regex: /争议|冲突|质疑|翻车/, tag: '争议发酵' },
    { regex: /反转|后续|再曝/, tag: '舆论反转' },
    { regex: /明星|演唱会|综艺|影视|娱乐/, tag: '文娱讨论' },
    { regex: /AI|芯片|科技|互联网|算法/, tag: '科技话题' },
    { regex: /股市|黄金|经济|金融|投资/, tag: '财经波动' },
    { regex: /警方|事故|事件|民生/, tag: '公共议题' },
    { regex: /比赛|球员|联赛|夺冠/, tag: '体育热点' }
  ];

  const buildFocusTags = () => {
    const seed = `${topic.title} ${topic.summary || ''}`;
    const picks = keywordTags
      .filter((item) => item.regex.test(seed))
      .map((item) => item.tag);

    const fallbackByCategory: Record<ContentCategory, string[]> = {
      社会: ['公共事件', '权责边界', '信息核验'],
      文娱生活: ['明星动态', '生活方式', '情绪共鸣'],
      科技: ['技术趋势', '产品观点', '应用影响'],
      财经: ['市场情绪', '资金流向', '风险判断'],
      汽车: ['新车动态', '用车体验', '品牌讨论'],
      教育: ['政策变化', '学习路径', '家长关注'],
      体育: ['赛事进展', '胜负争议', '实时观点'],
      ACG: ['圈层文化', '二创传播', '游戏讨论'],
      更多: ['热点跟进', '观点表达', '舆论互动']
    };

    const merged = Array.from(new Set([...picks, ...fallbackByCategory[topic.contentCategory]]));
    return merged.slice(0, 5);
  };

  const inferNature = () => {
    const seed = `${topic.title} ${topic.summary || ''}`;
    if (/争议|冲突|质疑|翻车|对立/.test(seed)) {
      return {
        label: '争议事件',
        explanation: '当前讨论围绕观点冲突展开，适合用对比立场和事实拆解切入。'
      };
    }
    if (/明星|演唱会|综艺|影视|偶像|CP/.test(seed)) {
      return {
        label: '娱乐话题',
        explanation: '当前关注点以娱乐讨论和情绪表达为主，适合轻观点和互动型内容。'
      };
    }
    if (/通报|发布|回应|消息|官方|政策/.test(seed)) {
      return {
        label: '资讯传播',
        explanation: '当前热点以信息扩散为核心，适合快速解读与观点跟进。'
      };
    }
    return {
      label: '情绪驱动',
      explanation: '当前以情绪表达和立场讨论为主，适合观点类内容切入。'
    };
  };

  const discussTags = buildFocusTags();
  const nature = inferNature();
  const sourceActionLabelMap: Record<Source, string> = {
    微博: '查看微博原帖',
    抖音: '查看抖音视频',
    知乎: '查看知乎讨论',
    小红书: '查看小红书笔记'
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 md:p-3.5">
      <div className="grid grid-cols-1 md:grid-cols-10 gap-3 md:gap-4 items-center">
        <div className={`${topic.link ? 'md:col-span-7' : 'md:col-span-10'} space-y-2.5`}>
          <div className="flex items-center gap-2 text-[16px] md:text-[17px] font-bold text-sky-700 tracking-tight">
            <Info className="w-3.5 h-3.5" />
            热点速览
          </div>
          <div className="space-y-1.5">
            <div className="text-[13px] font-black text-slate-700">讨论焦点</div>
            <div className="flex flex-wrap gap-1">
              {discussTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-md border border-sky-100 bg-white text-[11px] font-bold text-sky-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[13px] font-black text-slate-700">热点性质</div>
            <p className="text-[13px] md:text-[14px] text-slate-700 leading-[1.45]"><span className="font-black text-slate-800">{nature.label}：</span>{nature.explanation}</p>
          </div>
        </div>
        {topic.link && (
          <div className="md:col-span-3 flex items-center justify-start md:justify-center">
            <a
              href={topic.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sleek-accent/20 bg-white text-sleek-accent text-[12px] font-black hover:bg-sleek-accent hover:text-white transition-all"
              title={topic.link}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {sourceActionLabelMap[topic.source] || '查看原始内容'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const HotTopicLink = ({ topic }: { topic: HotTopic }) => {
  if (!topic.link) return null;

  const sourceActionLabelMap: Record<Source, string> = {
    微博: '查看微博原帖',
    抖音: '查看抖音视频',
    知乎: '查看知乎讨论',
    小红书: '查看小红书笔记'
  };

  return (
    <a
      href={topic.link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sleek-accent/20 bg-sleek-accent-soft text-sleek-accent text-[12px] font-black hover:bg-sleek-accent hover:text-white transition-all"
      title={topic.link}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      {sourceActionLabelMap[topic.source] || '查看原始内容'}
    </a>
  );
};

const RecommendationBadge = ({
  level,
  label,
  priorityText,
  score,
  breakdown
}: {
  level: 'high' | 'medium' | 'low';
  label: string;
  priorityText: string;
  score: number;
  breakdown?: ScoreBreakdown;
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  
  const levelConfig: Record<'high' | 'medium' | 'low', { color: string; icon: any }> = {
    high: { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: Zap },
    medium: { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Activity },
    low: { color: 'text-gray-500 bg-gray-50 border-gray-100', icon: XCircle }
  };
  const { color, icon: Icon } = levelConfig[level];
  
  return (
    <div className="relative">
      <div 
        onMouseEnter={() => setShowExplanation(true)}
        onMouseLeave={() => setShowExplanation(false)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all shadow-sm cursor-help ${color}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <div className="flex flex-col">
          <span className="text-[11px] font-black leading-tight tracking-tight">{label}</span>
          <span className="text-[9px] opacity-70 font-bold uppercase">{priorityText} · {score}%</span>
        </div>
      </div>
      
      <AnimatePresence>
        {showExplanation && breakdown && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 bottom-full mb-2 left-0 w-48 bg-white rounded-xl shadow-2xl border border-sleek-border p-4 space-y-3"
          >
            <h5 className="text-[10px] font-black text-sleek-text-main uppercase tracking-widest border-b border-sleek-border pb-2">机会值解释报告</h5>
            <div className="space-y-2">
               <ScoreBar label="流量增长趋势" value={breakdown.hotness.growth} colorClass="bg-rose-500" />
               <ScoreBar label="竞争压力程度" value={100 - breakdown.opportunity.competition} colorClass="bg-emerald-500" />
               <ScoreBar label="切入空间" value={breakdown.opportunity.fit} colorClass="bg-sleek-accent" />
            </div>
            <p className="text-[8px] text-sleek-text-secondary leading-tight italic">* 基于微博热榜实时数据及传播结构模型生成</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ScoreBar = ({ label, value, colorClass = "bg-sleek-accent" }: { label: string, value: number, colorClass?: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-sleek-text-secondary">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full ${colorClass}`}
      />
    </div>
  </div>
);

const HelpTooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <Info 
        className="w-3 h-3 text-sleek-text-secondary cursor-help hover:text-sleek-accent transition-colors" 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-sleek-text-main text-white text-[10px] leading-relaxed rounded-lg shadow-xl pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-sleek-text-main" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DEFAULT_GENERATION_PREFS: GenerationPrefs = {
  goal: '引流',
  strategies: ['analysis']
};

const STRATEGY_OPTIONS: { key: StrategyKey; label: string }[] = [
  { key: 'analysis', label: '深度分析' },
  { key: 'comparison', label: '对比拆解' },
  { key: 'emotion', label: '情绪共鸣' },
  { key: 'toolkit', label: '实操工具包' }
];

const ALL_PLATFORMS: Source[] = ['微博', '抖音', '知乎', '小红书'];

const CONTENT_CATEGORY_OPTIONS: ContentCategory[] = [
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

type AdviceTier = '高热' | '中热' | '低热' | '高机会' | '中机会' | '低机会';
type PublishAdvice = {
  level: '谨慎跟进' | '6~12小时内' | '立即发布（3小时内）' | '12~24小时内' | '观察为主';
  reason: string;
};

type ActionContentFormat = '短视频' | '图文' | '长文分析' | '清单/教程' | '观点快评';
type PlatformAdvice = {
  primary: Source;
  secondary: Source[];
  optional: Source[];
  reason: string;
};
type FormatAdvice = {
  primary: ActionContentFormat;
  secondary: ActionContentFormat;
  reason: string;
};
type UnifiedActionAdvice = {
  opportunityType: OpportunityType;
  timing: PublishAdvice;
  platform: PlatformAdvice;
  format: FormatAdvice;
};

const getPublishTimingAdviceByOpportunityType = (
  opportunityType: UnifiedActionAdvice['opportunityType']
): PublishAdvice => {
  switch (opportunityType) {
    case '强势窗口':
      return {
        level: '立即发布（3小时内）',
        reason: '热度与机会同步高位，建议尽快抢占核心曝光位。'
      };
    case '上升窗口':
      return {
        level: '6~12小时内',
        reason: '处于持续增长阶段，建议在窗口期内快速切入。'
      };
    case '黄金机会':
      return {
        level: '立即发布（3小时内）',
        reason: '机会值高且热度稳定，当前投入产出更优。'
      };
    case '潜力早期':
      return {
        level: '12~24小时内',
        reason: '热度仍在早期，适合提前布局并观察后续发酵。'
      };
    case '高热红海':
      return {
        level: '谨慎跟进',
        reason: '竞争饱和且机会偏低，建议控制投入并谨慎试投。'
      };
    default:
      return {
        level: '观察为主',
        reason: '先观察，不急着投入，待信号增强后再跟进。'
      };
  }
};

const normalizePlatformAdvice = (advice: PlatformAdvice): PlatformAdvice => {
  const used = new Set<Source>();
  used.add(advice.primary);

  const secondary: Source[] = [];
  for (const item of advice.secondary) {
    if (!used.has(item)) {
      secondary.push(item);
      used.add(item);
      if (secondary.length >= 1) break;
    }
  }

  const optional: Source[] = [];
  for (const item of advice.optional) {
    if (!used.has(item)) {
      optional.push(item);
      used.add(item);
      if (optional.length >= 1) break;
    }
  }

  return {
    ...advice,
    secondary,
    optional
  };
};

const dedupeSources = (sources: Source[]): Source[] => Array.from(new Set(sources));

const inferDiscussionPoints = (topic: HotTopic): string[] => {
  const seed = `${topic.title} ${topic.summary || ''} ${(topic.tags || []).join(' ')}`;
  const points: string[] = [];
  if (/争议|冲突|质疑|通报|回应|发酵|反转/.test(seed)) points.push('争议发酵');
  if (/快讯|突发|热点|上榜|热搜|舆论|跟进/.test(seed)) points.push('热点跟进');
  if (/观点|看法|如何看待|怎么看|分析|判断/.test(seed)) points.push('观点表达');
  if (/经验|分享|教程|步骤|清单|攻略|避坑|方法/.test(seed)) points.push('经验分享', '教程攻略');
  if (/测评|拆解|对比|参数|评测/.test(seed)) points.push('测评拆解');
  if (/情绪|共鸣|故事|感情|治愈|崩溃/.test(seed)) points.push('情绪共鸣');
  if (points.length === 0) points.push('热点跟进');
  return Array.from(new Set(points));
};

const getPlatformAdvice = ({
  sourcePlatform,
  category,
  discussionPoints,
  heat,
  opportunity
}: {
  sourcePlatform: Source;
  category: ContentCategory;
  discussionPoints: string[];
  heat: number;
  opportunity: number;
}): PlatformAdvice => {
  const pointsText = discussionPoints.join(' ');
  const has = (pattern: RegExp) => pattern.test(pointsText);
  const emotionSignal = has(/情绪共鸣|争议发酵/) || ['文娱生活', '体育', 'ACG'].includes(category);
  const analyticSignal = has(/观点表达|测评拆解/) || ['科技', '财经', '汽车', '教育'].includes(category);

  if (emotionSignal && (heat >= 65 || opportunity >= 55)) {
    return {
      primary: '微博',
      secondary: ['抖音'],
      optional: [],
      reason: '先发微博是为了抢实时讨论位，抖音只做一层情绪扩散补充。'
    };
  }

  if (analyticSignal) {
    return {
      primary: '知乎',
      secondary: sourcePlatform === '知乎' ? [] : [sourcePlatform],
      optional: [],
      reason: '先发知乎更利于完整表达观点，辅助仅保留原平台承接已有受众。'
    };
  }

  if (category === '文娱生活' && has(/经验分享|教程攻略/)) {
    return {
      primary: '小红书',
      secondary: ['抖音'],
      optional: [],
      reason: '先发小红书做经验沉淀，抖音只作为一次增量扩散补位。'
    };
  }

  if (heat >= 80 && opportunity >= 70) {
    const secondaryBySource: Record<Source, Source[]> = {
      微博: ['抖音'],
      抖音: ['微博'],
      知乎: ['微博'],
      小红书: ['微博']
    };
    const secondaries = secondaryBySource[sourcePlatform] || [];
    return {
      primary: sourcePlatform,
      secondary: secondaries,
      optional: sourcePlatform === '知乎' ? ['微博'] : [],
      reason: sourcePlatform === '知乎'
        ? '先发知乎做深度占位，微博仅在需要扩大触达时作为可选补充。'
        : '先发原始爆发平台抢时效，辅助平台仅做一层增量承接。'
    };
  }

  return {
    primary: sourcePlatform,
    secondary: [],
    optional: [],
    reason: '当前没有明显迁移优势，优先在原生爆发平台单点执行。'
  };
};

const getFormatAdvice = ({
  sourcePlatform,
  category,
  discussionPoints,
  heat
}: {
  sourcePlatform: Source;
  category: ContentCategory;
  discussionPoints: string[];
  heat: number;
}): FormatAdvice => {
  const pointsText = discussionPoints.join(' ');
  const has = (pattern: RegExp) => pattern.test(pointsText);
  const emotionSignal = has(/情绪共鸣/) || category === '体育' || category === '文娱生活' || category === 'ACG';
  const infoDenseSignal = ['科技', '财经', '汽车', '教育'].includes(category) || has(/观点表达|测评拆解/);
  const controversySignal = has(/争议发酵|热点跟进/);

  if (emotionSignal && heat >= 65) {
    return {
      primary: '短视频',
      secondary: '观点快评',
      reason: '情绪强、节奏快的议题更适合短视频快速放大讨论。'
    };
  }

  if (infoDenseSignal) {
    return {
      primary: '图文',
      secondary: '长文分析',
      reason: '该议题信息密度高，图文结构更利于完整表达关键信息。'
    };
  }

  if (has(/经验分享|教程攻略/)) {
    return {
      primary: '清单/教程',
      secondary: '短视频',
      reason: '步骤化表达更利于保存与复用，清单结构更容易形成转化。'
    };
  }

  if (controversySignal) {
    return {
      primary: '观点快评',
      secondary: '短视频',
      reason: '争议性议题更适合先做观点快评，快速占位核心讨论。'
    };
  }

  return {
    primary: '图文',
    secondary: '观点快评',
    reason: '图文是当前最稳妥的表达方式，便于快速发布与后续扩展。'
  };
};

const getActionAdvice = (topic: HotTopic): UnifiedActionAdvice => {
  const opportunityType = topic.opportunityType;
  const discussionPoints = inferDiscussionPoints(topic);
  const platform = normalizePlatformAdvice(getPlatformAdvice({
    sourcePlatform: topic.source,
    category: topic.contentCategory,
    discussionPoints,
    heat: topic.hotnessScore,
    opportunity: topic.opportunityScore
  }));
  const format = getFormatAdvice({
    sourcePlatform: topic.source,
    category: topic.contentCategory,
    discussionPoints,
    heat: topic.hotnessScore
  });
  return {
    opportunityType,
    timing: getPublishTimingAdviceByOpportunityType(opportunityType),
    platform,
    format
  };
};

type DecisionSummary = {
  level: 'high' | 'medium' | 'low';
  badgeLabel: string;
  priorityText: string;
  headline: string;
  hint: string;
  reasonList: string[];
  stageCopy: string;
  opportunityType: UnifiedActionAdvice['opportunityType'];
  actionAdvice: UnifiedActionAdvice;
};

const getDecisionSummary = (topic: HotTopic): DecisionSummary => {
  const actionAdvice = getActionAdvice(topic);
  const competition = topic.breakdown.opportunity.competition;
  const stageLabel = topic.trend === 'up' ? '上升阶段' : topic.trend === 'down' ? '回落阶段' : '平台阶段';

  const baseReasons = [
    `机会类型判定为「${actionAdvice.opportunityType}」，建议节奏为「${actionAdvice.timing.level}」。`,
    `当前热度值 ${topic.hotnessScore}% / 机会值 ${topic.opportunityScore}%。`
  ];

  switch (actionAdvice.opportunityType) {
    case '黄金机会':
      return {
        level: 'high',
        badgeLabel: '🔥 建议立即跟进',
        priorityText: '高优先级',
        headline: '建议立即跟进',
        hint: '建议 3 小时内完成首发，抢占首轮讨论位。',
        reasonList: [...baseReasons, '中热高机会组合，当前更适合快速验证并放大。'],
        stageCopy: `当前阶段：${stageLabel}。该话题处于黄金机会区，建议快速发布并持续跟进反馈。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
    case '强势窗口':
      return {
        level: 'high',
        badgeLabel: '🚀 强势窗口',
        priorityText: '高优先级',
        headline: '建议立即跟进',
        hint: '热度与机会同步高位，建议 3 小时内发布并连续跟进反馈。',
        reasonList: [...baseReasons, '高热高机会组合，具备强扩散势能与较好切入效率。'],
        stageCopy: `当前阶段：${stageLabel}。该话题处于强势窗口，建议立即发布并以主平台优先抢位。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
    case '上升窗口':
      return {
        level: 'medium',
        badgeLabel: '⚡ 建议快速跟进',
        priorityText: '中优先级',
        headline: '建议快速跟进',
        hint: '建议在 6~12 小时内切入，优先抢剩余流量窗口。',
        reasonList: [...baseReasons, '热度在上升窗口内，适合快速入场但需控制投入节奏。'],
        stageCopy: `当前阶段：${stageLabel}。该话题仍有扩散空间，建议快速切入并强调差异化视角。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
    case '潜力早期':
      return {
        level: 'medium',
        badgeLabel: '🌱 建议提前布局',
        priorityText: '中优先级',
        headline: '建议提前布局',
        hint: '建议在 12~24 小时内发布，先建立观点占位。',
        reasonList: [...baseReasons, '低热高机会，属于潜力早期，适合提前埋点布局。'],
        stageCopy: `当前阶段：${stageLabel}。该话题仍在早期发酵，建议以低成本试投验证方向。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
    case '高热红海':
      return {
        level: 'low',
        badgeLabel: '⛔ 高热红海',
        priorityText: '低优先级',
        headline: '建议谨慎跟进',
        hint: '当前更适合小流量测试，不建议高成本立刻投入。',
        reasonList: [
          ...baseReasons,
          competition >= 65
            ? '竞争强度偏高，头部位已被占据，边际收益有限。'
            : '虽非高竞争，但机会值偏低，当前转化空间有限。'
        ],
        stageCopy: `当前阶段：${stageLabel}。该话题处于高热红海区，建议谨慎投入并以测试为主。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
    default:
      return {
        level: 'low',
        badgeLabel: '👀 建议观察',
        priorityText: '低优先级',
        headline: '建议先观察',
        hint: '当前优先观察数据变化，再决定是否加大投入。',
        reasonList: [...baseReasons, '尚未形成明确优势组合，建议先做低成本验证。'],
        stageCopy: `当前阶段：${stageLabel}。该话题暂处观察区间，建议先追踪趋势后再决策。`,
        opportunityType: actionAdvice.opportunityType,
        actionAdvice
      };
  }
};

const getRecommendedOutputStrategy = (topic: HotTopic): { recommendedPlatforms: Source[]; recommendedFormats: ContentFormat[] } => {
  const title = topic.title;
  const platforms = new Set<Source>();
  const formats = new Set<ContentFormat>();

  if (/明星|演唱会|综艺|CP|情绪|爆料/.test(title)) {
    platforms.add('抖音');
    platforms.add('小红书');
    formats.add('短视频');
  }
  if (/娱乐|明星|冲突|情绪/.test(title)) {
    platforms.add('抖音');
    platforms.add('小红书');
    formats.add('短视频');
  }
  if (/生活|体验|共鸣|情绪/.test(title)) {
    platforms.add('小红书');
    formats.add('图文');
  }
  if (/新闻|热点|舆论/.test(title)) {
    platforms.add('微博');
    formats.add('图文');
  }
  if (/AI|科技|芯片|趋势|分析|经济|黄金|股市/i.test(title)) {
    platforms.add('知乎');
    platforms.add('微博');
    formats.add('图文');
  }

  if (platforms.size === 0) {
    platforms.add(topic.source);
    platforms.add('微博');
  }
  if (formats.size === 0) {
    formats.add(topic.hotnessScore > 78 ? '短视频' : '图文');
  }

  return {
    recommendedPlatforms: [...platforms],
    recommendedFormats: [...formats]
  };
};

const getEmailReason = (topic: HotTopic): string => {
  const reasons: string[] = [];
  if (topic.hotnessScore > 80) reasons.push('热度高，处于爆发阶段');
  if (topic.trend === 'up') reasons.push('趋势上升，建议尽早介入');
  if (topic.breakdown.opportunity.viral >= 75) reasons.push('传播扩散能力强，适合抢占先发窗口');
  if (getRecommendedOutputStrategy(topic).recommendedPlatforms.includes(topic.source)) reasons.push('适合在当前平台快速跟进');
  return reasons[0] || '具备稳定讨论基础，适合作为简报观察对象';
};

const buildDigestEmailParams = (
  topics: HotTopic[],
  selectedPlatforms: Source[]
): Record<string, string> => {
  const topTopics = [...topics]
    .sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a))
    .slice(0, 3);

  const payload: Record<string, string> = {
    platforms: selectedPlatforms.join(' / ')
  };

  for (let i = 0; i < 3; i += 1) {
    const topic = topTopics[i];
    const idx = i + 1;
    payload[`title${idx}`] = topic?.title || '';
    payload[`score${idx}`] = topic ? String(Math.round(getTopicCompositeScore(topic))) : '';
    payload[`platform${idx}`] = topic?.source || '';
    payload[`link${idx}`] = topic?.link || '';
    payload[`reason${idx}`] = topic ? getEmailReason(topic) : '';
  }

  // Backward compatibility: keep legacy keys so old template won't hard-crash.
  const top1 = topTopics[0];
  payload.topic_title = top1?.title || '';
  payload.hotness = top1 ? String(top1.hotnessScore) : '';
  payload.opportunity = top1 ? String(top1.opportunityScore) : '';
  payload.reason = top1 ? getEmailReason(top1) : '';
  payload.conclusion = buildDigestConclusion(topTopics, selectedPlatforms);

  return payload;
};

const buildDigestConclusion = (
  topics: HotTopic[],
  selectedPlatforms: Source[]
): string => {
  if (topics.length === 0) {
    return '今日暂无满足筛选条件的热点，建议适当放宽平台或热点类型后再发送。';
  }
  const top1 = [...topics].sort((a, b) => getTopicCompositeScore(b) - getTopicCompositeScore(a))[0];
  const trendText = top1.trend === 'up' ? '仍处于上升窗口' : top1.trend === 'down' ? '热度开始回落，需快进快出' : '处于稳定讨论期';
  return `今日建议优先跟进「${top1.title}」，该话题在你关注的平台（${selectedPlatforms.join(' / ')}）中机会值最高，${trendText}。建议未来 12 小时内优先发布。`;
};

const buildFullVideoScriptText = (idea: GeneratedTopic): string => {
  const platform = idea.platforms?.[0] || '未指定平台';
  const segments = idea.contentSegments || idea.structure.filter((line) => /^第.+段：/.test(line));
  return [
    `标题：`,
    idea.copyTitle || idea.title,
    ``,
    `适合平台：`,
    platform,
    ``,
    `内容形式：`,
    idea.format || '短视频',
    ``,
    `开头钩子：`,
    idea.hook || '',
    ``,
    `脚本结构：`,
    ...(segments.length > 0 ? segments : ['第一段：补充脚本内容']),
    ``,
    `节奏建议：`,
    idea.paceAdvice || '前半段快速抛结论，中段举例，结尾回到互动引导。',
    ``,
    `结尾 CTA：`,
    idea.cta || '你怎么看？评论区聊聊。',
    ``,
    `平台打法建议：`,
    idea.platformAdvice || '优先使用口语化表达与高密度情绪节点。'
  ].join('\n');
};

const buildFullArticlePlanText = (idea: GeneratedTopic): string => {
  const platform = idea.platforms?.[0] || '未指定平台';
  const segments = idea.contentSegments || idea.structure.filter((line) => /^第.+段：/.test(line));
  return [
    `标题：`,
    idea.copyTitle || idea.title,
    ``,
    `适合平台：`,
    platform,
    ``,
    `内容形式：`,
    idea.format || '图文',
    ``,
    `封面标题 / 首句：`,
    idea.hook || idea.coverTitle || '',
    ``,
    `图文结构：`,
    ...(segments.length > 0 ? segments : ['第一段：补充图文结构内容']),
    ``,
    `标签建议：`,
    idea.tagsSuggestion || '#热点解读 #运营策略 #内容增长',
    ``,
    `评论区引导：`,
    idea.commentGuide || '你会先从哪一步开始执行？评论区一起补充。',
    ``,
    `平台打法建议：`,
    idea.platformAdvice || '优先使用经验分享和步骤化表达。'
  ].join('\n');
};

const getTopicCompositeScore = (topic: HotTopic) =>
  topic.hotnessScore * 0.4 + topic.opportunityScore * 0.4 + topic.breakdown.hotness.growth * 0.2;

const HIGH_PRIORITY_OPPORTUNITY_TYPES: OpportunityType[] = ['强势窗口', '黄金机会'];
const RECOMMENDED_OPPORTUNITY_TYPES: OpportunityType[] = ['强势窗口', '黄金机会', '上升窗口'];

const isTopicRecommended = (topic: HotTopic) =>
  RECOMMENDED_OPPORTUNITY_TYPES.includes(topic.opportunityType);

const EMAILJS_SERVICE_ID = 'service_zeup1ns';
const EMAILJS_TEMPLATE_ID = 'template_9vjyydm';
const EMAILJS_PUBLIC_KEY = 'dz2gqhh3h1KEfpokf';
const DIGEST_SUBSCRIPTION_STORAGE_KEY = 'hotscope_digest_subscription_v1';
const DAILY_FIXED_SEND_TIME = '09:00';

const parseEmailList = (input: string): string[] => {
  const normalized = input.replace(/，/g, ',').replace(/\n/g, ',');
  return Array.from(
    new Set(
      normalized
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const validateEmailList = (emails: string[]): { valid: string[]; invalid: string[] } => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid: string[] = [];
  const invalid: string[] = [];
  emails.forEach((email) => {
    if (emailPattern.test(email)) valid.push(email);
    else invalid.push(email);
  });
  return { valid, invalid };
};

// --- Page: Home ---

const HomePage = ({ 
  onSelectTopic, 
  onOpenSettings,
  topics, 
  lastUpdated, 
  onRefresh, 
  isRefreshing,
  favorites,
  toggleFavorite,
  processed,
  generatedRecordsByTopic,
  usedTopics,
  setUsedTopics,
  onUsedToggle,
  onQuickGenerate,
  onRegenerateFromRecord,
  showToast
}: { 
  onSelectTopic: (t: HotTopic) => void, 
  onOpenSettings: () => void,
  topics: HotTopic[],
  lastUpdated: string,
  onRefresh: () => void,
  isRefreshing: boolean,
  favorites: Set<string>,
  toggleFavorite: (id: string, e: React.MouseEvent) => void,
  processed: Set<string>,
  generatedRecordsByTopic: Record<string, GeneratedRecord[]>,
  usedTopics: Set<string>,
  setUsedTopics: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
  onUsedToggle: (id: string, isUsed: boolean) => void,
  onQuickGenerate: (t: HotTopic, e: React.MouseEvent) => void,
  onRegenerateFromRecord: (topic: HotTopic, record: GeneratedRecord, e: React.MouseEvent) => void,
  showToast: (msg: string, type?: 'success' | 'info') => void
}) => {
  const navRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<Source | '所有平台'>('所有平台');
  const [contentCategoryFilter, setContentCategoryFilter] = useState<ContentCategory | '全部'>('全部');
  const [sortBy, setSortBy] = useState<'hotness' | 'growth' | 'opportunity'>('hotness');
  const [strategyView, setStrategyView] = useState<'all' | 'recommended' | 'fav' | 'generated'>('all');
  const [page, setPage] = useState(1);
  const [expandedGeneratedTopicId, setExpandedGeneratedTopicId] = useState<string | null>(null);
  const [copyingRecordId, setCopyingRecordId] = useState<string | null>(null);
  const [isExpandedHighPriority, setIsExpandedHighPriority] = useState(false);
  const PAGE_SIZE = 14;

  useEffect(() => {
    const updateTopNavVar = () => {
      const node = document.querySelector<HTMLElement>('[data-home-topnav]');
      const navHeight = Math.round(node?.getBoundingClientRect().height ?? 56);
      document.documentElement.style.setProperty('--home-topnav-h', `${navHeight}px`);
    };

    updateTopNavVar();
    const node = document.querySelector<HTMLElement>('[data-home-topnav]');
    const observer = typeof ResizeObserver !== 'undefined' && node
      ? new ResizeObserver(updateTopNavVar)
      : null;
    if (observer && node) observer.observe(node);
    window.addEventListener('resize', updateTopNavVar);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateTopNavVar);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const stickyEl = document.querySelector<HTMLElement>('[data-home-sticky]');

    // Debug actual scroll context and sticky ancestor chain in real browser runtime.
    // eslint-disable-next-line no-console
    console.log('[HotScope Sticky Debug] document.scrollingElement', document.scrollingElement);
    // eslint-disable-next-line no-console
    console.log('[HotScope Sticky Debug] window.scrollY', window.scrollY);

    if (stickyEl) {
      let p: HTMLElement | null = stickyEl.parentElement;
      while (p) {
        const style = window.getComputedStyle(p);
        // eslint-disable-next-line no-console
        console.log('[HotScope Sticky Debug] ancestor', p, {
          overflow: style.overflow,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          position: style.position,
          transform: style.transform,
          contain: style.contain,
          height: style.height,
          minHeight: style.minHeight,
          maxHeight: style.maxHeight,
        });
        p = p.parentElement;
      }
    }

    let raf = 0;
    let loggedCount = 0;
    const onScroll = () => {
      if (loggedCount >= 3) return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        // eslint-disable-next-line no-console
        console.log('[HotScope Sticky Debug] scroll tick', {
          windowScrollY: window.scrollY,
          scrollingElementScrollTop: document.scrollingElement?.scrollTop ?? 0,
        });
        loggedCount += 1;
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const baseFilteredTopics = useMemo(() => {
    return topics.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.summary.toLowerCase().includes(search.toLowerCase());
      const matchSource = sourceFilter === '所有平台' || t.source === sourceFilter;
      const matchContentCategory = contentCategoryFilter === '全部' || t.contentCategory === contentCategoryFilter;
      return matchSearch && matchSource && matchContentCategory;
    });
  }, [topics, search, sourceFilter, contentCategoryFilter]);

  const panelStats = useMemo(() => {
    const recommendedCount = baseFilteredTopics.filter((topic) => RECOMMENDED_OPPORTUNITY_TYPES.includes(topic.opportunityType)).length;
    return {
      total: baseFilteredTopics.length,
      recommended: recommendedCount,
      favorites: baseFilteredTopics.filter(t => favorites.has(t.id)).length,
      processed: baseFilteredTopics.filter(t => (generatedRecordsByTopic[t.id] || []).length > 0).length
    };
  }, [baseFilteredTopics, favorites, generatedRecordsByTopic]);

  const highPriorityTopics = useMemo(() => {
    const opportunityTypePriority: Record<OpportunityType, number> = {
      强势窗口: 0,
      黄金机会: 1,
      上升窗口: 2,
      潜力早期: 3,
      高热红海: 4,
      观察区间: 5,
    };

    return baseFilteredTopics
      .filter((topic) => HIGH_PRIORITY_OPPORTUNITY_TYPES.includes(topic.opportunityType))
      .sort((a, b) => {
        const typeDelta = opportunityTypePriority[a.opportunityType] - opportunityTypePriority[b.opportunityType];
        if (typeDelta !== 0) return typeDelta;
        if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
        return b.hotnessScore - a.hotnessScore;
      });
  }, [baseFilteredTopics]);

  const hasMoreHighPriorityTopics = highPriorityTopics.length > 5;
  const visibleHighPriorityTopics = isExpandedHighPriority ? highPriorityTopics : highPriorityTopics.slice(0, 5);

  useEffect(() => {
    if (!hasMoreHighPriorityTopics) {
      setIsExpandedHighPriority(false);
    }
  }, [hasMoreHighPriorityTopics]);

  const filteredAndSortedTopics = useMemo(() => {
    let result = baseFilteredTopics.filter(t => {
      if (strategyView === 'recommended') return isTopicRecommended(t);
      if (strategyView === 'fav') return favorites.has(t.id);
      if (strategyView === 'generated') return (generatedRecordsByTopic[t.id] || []).length > 0 || processed.has(t.id);
      return true;
    });

    result = result.sort((a, b) => {
      const aVal = (sortBy === 'hotness' ? a.hotnessScore : sortBy === 'growth' ? a.breakdown.hotness.growth : a.opportunityScore);
      const bVal = (sortBy === 'hotness' ? b.hotnessScore : sortBy === 'growth' ? b.breakdown.hotness.growth : b.opportunityScore);
      
      return bVal - aVal;
    });

    return result;
  }, [baseFilteredTopics, sortBy, strategyView, favorites, generatedRecordsByTopic, processed]);

  const visibleTopics = filteredAndSortedTopics.slice(0, page * PAGE_SIZE);

  const toggleUsed = (id: string, e: React.MouseEvent) => {
    e?.stopPropagation?.();
    let nowUsed = false;
    setUsedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        nowUsed = false;
      } else {
        next.add(id);
        nowUsed = true;
      }
      return next;
    });
    onUsedToggle(id, nowUsed);
  };

  const quickGenerateWithFeedback = (topic: HotTopic, e: React.MouseEvent) => {
    onQuickGenerate(topic, e);
    showToast(`已进入「${topic.title.substring(0, 12)}...」生成面板`, 'info');
  };

  const copyGeneratedRecord = (record: GeneratedRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopyingRecordId(record.id);
    navigator.clipboard.writeText(record.content)
      .then(() => showToast('方案已复制到剪贴板', 'success'))
      .catch(() => showToast('复制失败，请稍后重试', 'info'))
      .finally(() => setTimeout(() => setCopyingRecordId(null), 1500));
  };

  const hasContextFilter = search.trim() || sourceFilter !== '所有平台' || contentCategoryFilter !== '全部';

  const emptyStateConfig = useMemo(() => {
    if (strategyView === 'fav') {
      return {
        title: hasContextFilter ? '当前筛选下暂无收藏热点' : '你还没有收藏热点',
        description: hasContextFilter ? '可先切换平台，再放宽热点类型筛选' : '点击热点卡片右上角星标即可加入收藏库',
        actionText: hasContextFilter ? '清空筛选' : '查看今日热点',
        action: () => {
          if (hasContextFilter) {
            setSearch('');
            setSourceFilter('所有平台');
            setContentCategoryFilter('全部');
          }
          setStrategyView('all');
        }
      };
    }
    if (strategyView === 'generated') {
      return {
        title: hasContextFilter ? '当前筛选下暂无已生成方案' : '你还没有生成过选题方案',
        description: '可点击热点卡片右上角魔杖开始生成方案',
        actionText: '去生成选题',
        action: () => setStrategyView('all')
      };
    }
    if (strategyView === 'recommended') {
      return {
        title: '当前筛选下暂无推荐跟进热点',
        description: hasContextFilter ? '建议先切换平台，再放宽热点类型筛选' : '可切换平台或等待下一次热点同步',
        actionText: hasContextFilter ? '放宽筛选条件' : '查看全部热点',
        action: () => {
          if (hasContextFilter) {
            setSearch('');
            setSourceFilter('所有平台');
            setContentCategoryFilter('全部');
          }
          setStrategyView('all');
        }
      };
    }
    return {
      title: '未发现匹配的趋势',
      description: '建议按顺序调整：平台 → 热点类型',
      actionText: '重置筛选',
      action: () => {
        setSearch('');
        setSourceFilter('所有平台');
        setContentCategoryFilter('全部');
        setStrategyView('all');
      }
    };
  }, [strategyView, hasContextFilter, search]);

  const buildRecommendationReason = (topic: HotTopic): string => {
    if (topic.opportunityType === '强势窗口') {
      return '热度与机会同步高位，当前切入速度快，内容转化效率更高。';
    }
    if (topic.opportunityType === '黄金机会') {
      return '机会值高且竞争相对可控，适合优先投入并放大产出。';
    }
    return '当前优先级不足，建议继续观察后再投入。';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header
        ref={navRef}
        data-home-topnav
        className="h-14 border-b border-[rgba(255,255,255,0.08)] flex items-center px-6 justify-between bg-[#0F172A] sticky top-0 shrink-0 z-20"
      >
        <div className="flex items-center gap-6">
          <div className="font-bold text-[#FFFFFF] flex items-center gap-2 text-sm italic uppercase tracking-tighter">
            <Flame className="w-4 h-4 text-[#EF4444]" />
            HOT SCOPE
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)]">
            {(['所有平台', ...ALL_PLATFORMS] as (Source | '所有平台')[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setSourceFilter(platform)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  sourceFilter === platform
                    ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                    : 'bg-transparent border-transparent text-[rgba(255,255,255,0.7)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm ${
              isRefreshing
                ? 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.35)] cursor-not-allowed border-[rgba(255,255,255,0.12)]'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.9)] border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '正在同步云端...' : '同步最新热点'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] p-1 rounded-lg border border-[rgba(255,255,255,0.12)]">
            {[
              { id: 'hotness', label: '热度优先', icon: Flame },
              { id: 'growth', label: '急剧上升', icon: TrendingUp },
              { id: 'opportunity', label: '机会优先', icon: Zap }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  sortBy === s.id ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]' : 'text-[rgba(255,255,255,0.7)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#FFFFFF] transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            订阅设置
          </button>
          <div className="text-[11px] text-[rgba(255,255,255,0.7)] font-mono flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {lastUpdated}
          </div>
        </div>
      </header>

      <div>
        <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
          <section
            className="relative overflow-hidden rounded-3xl border border-[#D6E4FF] px-8 py-6 md:px-12 md:py-8"
            style={{
              background:
                'radial-gradient(circle at 50% -8%, rgba(30,58,138,0.18) 0%, rgba(30,58,138,0) 42%), radial-gradient(circle at 16% 16%, rgba(37,99,235,0.11) 0%, rgba(37,99,235,0) 40%), radial-gradient(circle at 84% 14%, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0) 38%), linear-gradient(135deg, #FCFEFF 0%, #EEF5FF 52%, #DDEAFF 100%)'
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.62)_0%,rgba(255,255,255,0)_52%)]" />
            <div className="relative max-w-4xl mx-auto text-center space-y-6">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#2563EB]">HOTSCOPE INSIGHT ENGINE</div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#111827] leading-[1.05]">
                HotScope
              </h1>
              <p className="text-base md:text-lg text-[#6B7280] leading-relaxed max-w-2xl mx-auto font-medium">
                聚合多平台热点数据，智能筛选高价值内容。
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 xl:items-stretch">
            <section className="flex-1 bg-white rounded-2xl border border-sleek-border overflow-hidden">
              <div className="p-5 border-b border-sleek-border bg-white space-y-4 shadow-sm relative">
                {strategyView !== 'all' && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-sleek-accent">
                      <Filter className="w-3 h-3" />
                      活跃筛选: {strategyView === 'recommended' ? '强推荐跟进' : strategyView === 'fav' ? '已收藏库' : '已生成方案'}
                    </div>
                    <button
                      onClick={() => setStrategyView('all')}
                      className="text-[10px] font-bold text-sleek-text-secondary hover:text-rose-500 flex items-center gap-1"
                    >
                      清除所有筛选 <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                )}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sleek-text-secondary group-focus-within:text-sleek-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="搜索标题、关键词或内容摘要..."
                    className="w-full pl-10 pr-4 py-2.5 bg-sleek-sidebar border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sleek-accent/10 transition-all placeholder:text-gray-300 font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-sleek-border bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-black text-sleek-accent">
                    <Filter className="w-3 h-3" />
                    热点类型（主筛选）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['全部', ...CONTENT_CATEGORY_OPTIONS] as (ContentCategory | '全部')[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setContentCategoryFilter(item)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          contentCategoryFilter === item
                            ? 'bg-sleek-text-main text-white shadow-sm'
                            : 'bg-sleek-sidebar text-sleek-text-secondary border border-sleek-border hover:text-sleek-text-main'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-sleek-sidebar/30">
                {visibleTopics.length > 0 ? (
                  <>
                    {visibleTopics.map((topic) => {
                      const generatedRecords = generatedRecordsByTopic[topic.id] || [];
                      const hasGeneratedRecord = generatedRecords.length > 0 || processed.has(topic.id);
                      return (
                        <motion.div
                          layoutId={topic.id}
                          key={topic.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => onSelectTopic(topic)}
                          className={`group relative bg-white border border-sleek-border rounded-2xl px-4 py-3 shadow-sleek transition-all cursor-pointer ${
                            hasGeneratedRecord ? 'ring-2 ring-emerald-500/20' : ''
                          } ${usedTopics.has(topic.id) ? 'opacity-60 grayscale-[0.5]' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-white bg-sleek-text-main px-2 py-0.5 rounded uppercase">{topic.source}</span>
                              {topic.isNew && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-black tracking-wide border border-rose-200">
                                  NEW
                                </span>
                              )}
                              {hasGeneratedRecord && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  方案已出
                                </span>
                              )}
                              {usedTopics.has(topic.id) && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  已发布
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 translate-x-1">
                              <button
                                onClick={(e) => toggleUsed(topic.id, e)}
                                title={usedTopics.has(topic.id) ? '取消标记' : '标记为已使用/已处理'}
                                className={`p-1.5 rounded-lg transition-all active:scale-95 ${usedTopics.has(topic.id) ? 'text-emerald-500 bg-emerald-50 border border-emerald-100 shadow-sm' : 'text-gray-300 hover:bg-gray-100 border border-transparent'}`}
                              >
                                <CheckSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => toggleFavorite(topic.id, e)}
                                title={favorites.has(topic.id) ? '移出库存档' : '收藏到库存档'}
                                className={`p-1.5 rounded-lg transition-all active:scale-95 ${favorites.has(topic.id) ? 'text-amber-500 bg-amber-50 border border-amber-100 shadow-sm scale-110' : 'text-gray-300 hover:bg-gray-100 border border-transparent'}`}
                              >
                                <Star className={`w-4 h-4 ${favorites.has(topic.id) ? 'fill-amber-500' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => quickGenerateWithFeedback(topic, e)}
                                title="一键生成选题方案"
                                className="p-1.5 rounded-lg text-sleek-accent hover:bg-sleek-accent-soft border border-transparent transition-all active:scale-95"
                              >
                                <Wand2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-[15px] font-bold text-sleek-text-main leading-snug mb-2 line-clamp-2">{topic.title}</h3>

                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <span className="text-[9px] font-black text-sleek-accent bg-sleek-accent-soft px-1.5 py-0.5 rounded border border-sleek-accent/10">
                              #{topic.contentCategory}
                            </span>
                            <span className="text-[9px] font-bold text-sleek-text-secondary bg-sleek-sidebar px-1.5 py-0.5 rounded border border-sleek-border">
                              平台：{topic.source}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-px bg-sleek-border rounded-lg overflow-hidden border border-sleek-border">
                            <div className="bg-gray-50/50 px-2 py-1.5 text-center">
                              <div className="text-[8px] font-bold text-sleek-text-secondary uppercase">热度指数</div>
                              <div className="text-[13px] leading-tight font-mono font-black text-rose-500">{topic.hotnessScore}%</div>
                            </div>
                            <div className="bg-gray-50/50 px-2 py-1.5 text-center border-l border-sleek-border">
                              <div className="text-[8px] font-bold text-sleek-text-secondary uppercase">机会价值</div>
                              <div className="text-[13px] leading-tight font-mono font-black text-sleek-accent">{topic.opportunityScore}%</div>
                            </div>
                          </div>

                          {strategyView === 'generated' && (
                            <div className="mt-4 border border-sleek-border rounded-xl bg-sleek-sidebar/40 overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedGeneratedTopicId((prev) => (prev === topic.id ? null : topic.id));
                                }}
                                className="w-full px-3 py-2 text-left flex items-center justify-between text-[11px] font-bold text-sleek-text-main hover:bg-white transition-colors"
                              >
                                <span>查看已生成内容（{generatedRecords.length}）</span>
                                {expandedGeneratedTopicId === topic.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              {expandedGeneratedTopicId === topic.id && (
                                <div className="px-3 pb-3 space-y-2 border-t border-sleek-border">
                                  {generatedRecords.length === 0 ? (
                                    <div className="py-3 text-[11px] text-sleek-text-secondary">
                                      当前热点已被标记为“已生成”，但暂无可查看的方案记录。
                                    </div>
                                  ) : (
                                    generatedRecords.map((record) => (
                                      <div key={record.id} className="bg-white rounded-lg border border-sleek-border p-3 space-y-2">
                                        <div className="text-[12px] font-bold text-sleek-text-main">{record.title}</div>
                                        <div className="text-[10px] text-sleek-text-secondary flex flex-wrap gap-2">
                                          <span>目标：{record.goal}</span>
                                          <span>时间：{record.createdAt}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {record.strategies.map((key) => (
                                            <span key={`${record.id}-${key}`} className="text-[9px] font-bold text-sleek-accent bg-sleek-accent-soft px-1.5 py-0.5 rounded border border-sleek-accent/10">
                                              {STRATEGY_OPTIONS.find((item) => item.key === key)?.label || key}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectTopic(topic);
                                              showToast('已打开热点详情', 'info');
                                            }}
                                            className="flex-1 text-[10px] font-black py-2 rounded-lg border border-sleek-border bg-white hover:bg-sleek-sidebar transition-colors"
                                          >
                                            查看详情
                                          </button>
                                          <button
                                            onClick={(e) => copyGeneratedRecord(record, e)}
                                            className={`flex-1 text-[10px] font-black py-2 rounded-lg border transition-colors ${
                                              copyingRecordId === record.id
                                                ? 'bg-emerald-500 text-white border-emerald-500'
                                                : 'bg-white border-sleek-border hover:bg-sleek-sidebar'
                                            }`}
                                          >
                                            {copyingRecordId === record.id ? '已复制' : '复制方案'}
                                          </button>
                                          <button
                                            onClick={(e) => onRegenerateFromRecord(topic, record, e)}
                                            className="flex-1 text-[10px] font-black py-2 rounded-lg bg-sleek-text-main text-white hover:bg-black transition-colors"
                                          >
                                            基于此再生成
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    {visibleTopics.length < filteredAndSortedTopics.length && (
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        className="w-full py-5 text-xs font-black text-sleek-accent flex items-center justify-center gap-2 bg-white border-2 border-dashed border-sleek-accent/20 rounded-2xl mt-6 hover:bg-sleek-accent-soft transition-all active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" /> 探索更多趋势信号
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-20 px-4 text-center space-y-4">
                    <div className="bg-sleek-sidebar w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-sleek-border">
                      <Search className="w-8 h-8 text-gray-200" />
                    </div>
                    <h4 className="text-sm font-bold text-sleek-text-main">{emptyStateConfig.title}</h4>
                    <p className="text-[11px] text-sleek-text-secondary max-w-[240px] mx-auto">{emptyStateConfig.description}</p>
                    <button
                      onClick={emptyStateConfig.action}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-sleek-border bg-white hover:border-sleek-accent hover:text-sleek-accent transition-all active:scale-95"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {emptyStateConfig.actionText}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="w-full xl:w-[320px] xl:shrink-0 xl:h-full">
              <div
                className="xl:sticky xl:top-[var(--home-topnav-h,56px)]"
                data-home-sticky
              >
                <div
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex flex-col gap-3 min-h-0 overflow-hidden"
                  style={{
                    height: 'calc(100dvh - var(--home-topnav-h, 56px) - 8px)'
                  }}
                >
                <div className="grid grid-cols-2 gap-2 shrink-0">
                {[
                  { label: '今日热点', value: panelStats.total, icon: Flame, color: 'text-[#EF4444]', bg: 'bg-rose-50', action: () => setStrategyView('all') },
                  { label: '推荐跟进', value: panelStats.recommended, icon: Zap, color: 'text-[#F59E0B]', bg: 'bg-amber-50', action: () => setStrategyView('recommended') },
                  { label: '已收藏', value: panelStats.favorites, icon: Star, color: 'text-[#10B981]', bg: 'bg-emerald-50', action: () => setStrategyView('fav') },
                  { label: '已生成', value: panelStats.processed, icon: Wand2, color: 'text-[#8B5CF6]', bg: 'bg-purple-50', action: () => setStrategyView('generated') }
                ].map((card) => (
                  <button
                    key={card.label}
                    onClick={() => {
                      card.action();
                      showToast(card.value === 0 ? `已切换到「${card.label}」，当前为空` : `已筛选：${card.label}`, 'info');
                    }}
                    className={`group relative border border-[#E5E7EB] rounded-xl p-3 text-left transition-all duration-200 hover:border-[#2563EB] hover:shadow-md active:scale-95 ${card.bg} ${strategyView === (card.label === '今日热点' ? 'all' : card.label === '推荐跟进' ? 'recommended' : card.label === '已收藏' ? 'fav' : 'generated') ? 'ring-2 ring-[#2563EB]/25 border-[#2563EB]/30 shadow-md' : ''}`}
                  >
                    <div className="mb-2">
                      <div className="p-2 w-fit rounded-lg bg-white/80 group-hover:bg-white transition-colors">
                        <card.icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                    </div>
                    <div className="text-lg font-black text-[#111827] mb-0.5 tracking-tight">{card.value}</div>
                    <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{card.label}</div>
                  </button>
                ))}
                </div>

                <section className="border border-[#E5E7EB] rounded-2xl p-3 bg-[#F8FAFC] flex flex-col gap-2 min-h-0 flex-1">
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2 shrink-0">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  高价值推荐
                </h3>
                <div className="space-y-1.5 flex-1 min-h-0 pr-1 overflow-y-auto">
                  {visibleHighPriorityTopics.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => onSelectTopic(t)}
                      className="w-full border border-[#E5E7EB] rounded-xl p-2.5 hover:bg-white text-left transition-all duration-200"
                    >
                      <div className="text-[10px] font-black text-[#2563EB] mb-0.5">0{i + 1}</div>
                      <div className="text-xs font-bold text-[#111827] line-clamp-2">{t.title}</div>
                      <div className="text-[9px] leading-snug text-[#6B7280] mt-1 font-semibold">
                        推荐理由：{buildRecommendationReason(t)}
                      </div>
                    </button>
                  ))}
                  {visibleHighPriorityTopics.length === 0 && (
                    <div className="text-[11px] text-[#6B7280] py-2">今日暂无高优机会，建议继续观察热点变化</div>
                  )}
                </div>
                {hasMoreHighPriorityTopics && (
                  <button
                    onClick={() => setIsExpandedHighPriority((prev) => !prev)}
                    className="w-full py-2 text-[11px] font-bold text-[#2563EB] border border-[#DBEAFE] rounded-lg bg-white hover:bg-[#EFF6FF] transition-colors shrink-0"
                  >
                    {isExpandedHighPriority ? '收起' : '展开全部高优机会'}
                  </button>
                )}
                </section>
              </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- Page: Detail ---

const DetailPage = ({
  topic,
  onBack,
  onGenerate,
  showToast,
  prefs,
  onPrefsChange,
  isFavorite,
  onToggleFavorite
}: {
  topic: HotTopic,
  onBack: () => void,
  onGenerate: () => void,
  showToast: (m: string, type?: 'success' | 'info') => void,
  prefs: GenerationPrefs,
  onPrefsChange: (next: Partial<GenerationPrefs>) => void,
  isFavorite: boolean,
  onToggleFavorite: () => void
}) => {
  const activeStrategyKeys = prefs.strategies.length > 0 ? prefs.strategies : ['analysis'];
  const activeStrategyLabels = activeStrategyKeys.map(
    (key) => STRATEGY_OPTIONS.find((item) => item.key === key)?.label || key
  );
  const decisionSummary = getDecisionSummary(topic);
  const unifiedActionAdvice = decisionSummary.actionAdvice;

  const trendPeakIdx = topic.trendData.length > 0
    ? topic.trendData.reduce((bestIdx, point, idx, arr) => point.value > arr[bestIdx].value ? idx : bestIdx, 0)
    : 0;
  const trendPeakTime = topic.trendData[trendPeakIdx]?.time;
  const trendStageLabel = topic.trend === 'up' ? '上升期' : topic.trend === 'down' ? '回落期' : '平台期';
  const hasSecondaryGrowth = topic.trendData.length >= 3 && trendPeakIdx < topic.trendData.length - 2 &&
    topic.trendData[topic.trendData.length - 1].value > topic.trendData[topic.trendData.length - 2].value;

  const toggleStrategy = (s: StrategyKey) => {
    const next = prefs.strategies.includes(s)
      ? prefs.strategies.filter(i => i !== s)
      : [...prefs.strategies, s];

    onPrefsChange({ strategies: next.length > 0 ? next : ['analysis'] });
  };

  const MiniMetricBar = ({
    label,
    value,
    colorClass,
    tooltip
  }: {
    label: string;
    value: number;
    colorClass: string;
    tooltip?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px] font-bold text-sleek-text-secondary">
        <span className="flex items-center gap-1">
          {label}
          {tooltip ? <HelpTooltip text={tooltip} /> : null}
        </span>
        <span className="font-mono text-[12px] text-sleek-text-main">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-sleek-sidebar overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="h-14 border-b border-sleek-border flex items-center px-6 justify-between shrink-0 bg-white shadow-sm z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-sleek-text-secondary hover:text-sleek-accent font-bold transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1" />
          返回观察室
        </button>
        <div className="flex items-center gap-4">
           <button 
            onClick={() => showToast('洞察报告已生成并在后台保存', 'info')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sleek-border text-[11px] font-bold text-sleek-text-secondary hover:bg-sleek-sidebar transition-all"
           >
             <Share2 className="w-3.5 h-3.5" /> 分享洞察
           </button>
           <button 
             onClick={onToggleFavorite}
             className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sleek-text-main text-white text-[11px] font-bold shadow-lg shadow-sleek-text-main/20 hover:scale-[1.02] transition-all active:scale-95"
           >
             <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} /> {isFavorite ? '已在库存档' : '加入库存档'}
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto py-8 md:py-10 px-6 md:px-8 lg:px-10">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm px-6 md:px-8 lg:px-10 py-7 md:py-8 space-y-8">
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3 flex-1 min-w-0">
                  <h1 className="text-[30px] md:text-[32px] font-black text-sleek-text-main leading-[1.35] tracking-tight max-w-5xl">
                    {topic.title}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-sleek-text-main text-white text-[11px] font-black rounded-lg uppercase tracking-tight">{topic.source}</span>
                    <span className="px-2.5 py-1 bg-sleek-sidebar text-sleek-text-secondary text-[11px] font-bold rounded-lg border border-sleek-border">{topic.contentCategory}</span>
                  </div>
                </div>
                <span className="shrink-0 mt-1 px-2.5 py-1 bg-rose-50 text-rose-600 text-[11px] font-black rounded-lg border border-rose-200">热度 {topic.hotnessScore}%</span>
              </div>
            </section>

            <section className="space-y-2">
              <HotTopicSummary topic={topic} />
            </section>

            <section className={`p-4 md:p-5 rounded-2xl border ${
              decisionSummary.level === 'high'
                ? 'bg-rose-50 border-rose-200'
                : decisionSummary.level === 'medium'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base md:text-lg font-black text-sleek-text-main">决策建议</h3>
                  <RecommendationBadge
                    level={decisionSummary.level}
                    label={decisionSummary.badgeLabel}
                    priorityText={decisionSummary.priorityText}
                    score={topic.opportunityScore}
                    breakdown={topic.breakdown}
                  />
                  <span className="text-[11px] font-black px-2 py-1 rounded-full bg-white border border-sleek-border">{decisionSummary.opportunityType}</span>
                </div>
                <button
                  onClick={onGenerate}
                  className="shrink-0 bg-sleek-accent px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm text-white hover:bg-white hover:text-sleek-accent border border-sleek-accent transition-all group"
                >
                  <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                  生成方案
                </button>
              </div>
              <div className="mt-3 text-[16px] md:text-[18px] font-black text-sleek-text-main">{decisionSummary.headline}</div>
              <div className="mt-1 text-[14px] text-sleek-text-secondary leading-relaxed">{decisionSummary.hint}</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white rounded-lg px-3 py-2.5 border border-sleek-border space-y-2">
                  <div className="flex items-center gap-1 text-[12px] font-bold text-sleek-text-secondary">热度值<HelpTooltip text="热度值综合平台热度、增长率与持续讨论度计算得出。" /></div>
                  <div className="font-mono font-black text-lg text-rose-500">{topic.hotnessScore}%</div>
                  <div className="space-y-1.5 pt-0.5">
                    <MiniMetricBar
                      label="讨论量"
                      value={topic.breakdown.hotness.platform}
                      colorClass="bg-rose-500"
                      tooltip="代表当下有多少人在聊这个话题。高值说明关注集中、容易起量；低值说明声量偏弱、需要更强切角。"
                    />
                    <MiniMetricBar
                      label="上升趋势"
                      value={topic.breakdown.hotness.growth}
                      colorClass="bg-rose-400"
                      tooltip="代表热度升温速度。高值说明话题正在起势，适合尽快跟进；低值说明热度在放缓，可先观察再投入。"
                    />
                    <MiniMetricBar
                      label="情绪浓度"
                      value={topic.breakdown.hotness.sustained}
                      colorClass="bg-rose-300"
                      tooltip="代表用户表达情绪的强弱。高值更容易带动评论与转发；低值更偏理性讨论，需靠观点和信息打动用户。"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-lg px-3 py-2.5 border border-sleek-border space-y-2">
                  <div className="flex items-center gap-1 text-[12px] font-bold text-sleek-text-secondary">机会值<HelpTooltip text="机会值综合传播潜力、内容可塑性与竞争压力计算得出。" /></div>
                  <div className="font-mono font-black text-lg text-sleek-accent">{topic.opportunityScore}%</div>
                  <div className="space-y-1.5 pt-0.5">
                    <MiniMetricBar
                      label="竞争强度"
                      value={topic.breakdown.opportunity.competition}
                      colorClass="bg-[#2563EB]"
                      tooltip="代表同类内容拥挤程度。高值表示赛道拥挤、抢位更难；低值表示对手较少，更容易拿到曝光。"
                    />
                    <MiniMetricBar
                      label="流量红利"
                      value={topic.breakdown.opportunity.viral}
                      colorClass="bg-[#3B82F6]"
                      tooltip="代表还能拿到多少增量流量。高值说明还有红利可吃；低值说明窗口收窄，需要更强内容才有回报。"
                    />
                    <MiniMetricBar
                      label="切入空间"
                      value={topic.breakdown.opportunity.malleability}
                      colorClass="bg-[#60A5FA]"
                      tooltip="代表这个话题还有多少可做的差异化切口。高值更容易做出新角度；低值说明可切点少，复用风险更高。"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white rounded-xl border border-sleek-border p-3">
                <div className="text-[13px] font-black text-sleek-text-main mb-1.5">推荐理由</div>
                <div className="space-y-1">
                  {decisionSummary.reasonList.map((reason) => (
                    <div key={reason} className="text-[13px] leading-relaxed text-sleek-text-secondary">• {reason}</div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black text-sleek-text-secondary">当前策略路径</span>
                {activeStrategyLabels.map((label) => (
                  <span key={label} className="px-2 py-0.5 rounded-md bg-white border border-sleek-border text-[11px] font-bold">{label}</span>
                ))}
              </div>
            </section>

            <section className="bg-white border border-sleek-border p-4 rounded-2xl space-y-3 -mt-4">
              <div className="flex items-center justify-between border-b border-sleek-border pb-2">
                <h4 className="text-[13px] font-black text-sleek-text-secondary uppercase tracking-widest">系统跟进策略 / 多选</h4>
                <span className="text-[12px] text-sleek-accent font-bold">已选 {prefs.strategies.length} 项</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STRATEGY_OPTIONS.map((adv) => (
                  <button
                    key={adv.key}
                    onClick={() => toggleStrategy(adv.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl group transition-all border-2 ${
                      prefs.strategies.includes(adv.key)
                        ? 'border-sleek-accent bg-sleek-accent-soft text-sleek-accent shadow-sm'
                        : 'border-transparent bg-sleek-sidebar text-sleek-text-main hover:bg-sleek-hover'
                    }`}
                  >
                    <span className="text-sm font-bold">{adv.label}</span>
                    {prefs.strategies.includes(adv.key) ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-sleek-text-secondary italic">建议选择 1-2 项最匹配策略以获得最佳 AI 模型输出方案。</p>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-black text-sleek-text-main flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-rose-500" />
                    趋势可视化分析
                  </h3>
                  <div className="text-[11px] font-black px-2 py-1 rounded-full bg-sleek-accent-soft text-sleek-accent">{trendStageLabel}</div>
                </div>
                <div className="h-[260px] w-full bg-sleek-sidebar/30 rounded-2xl p-4 border border-sleek-border">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={topic.trendData}>
                      <defs>
                        <linearGradient id="colorValueTop" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0066FF" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                      <YAxis hide />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="value" stroke="#0066FF" strokeWidth={3} fillOpacity={1} fill="url(#colorValueTop)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[13px] text-sleek-text-secondary bg-sleek-sidebar/60 border border-sleek-border rounded-xl px-3 py-2 leading-relaxed">
                  {decisionSummary.stageCopy}{trendPeakTime ? ` 峰值出现在 ${trendPeakTime}。` : ''}{hasSecondaryGrowth ? ' 最近存在二次抬升信号。' : ''}
                </div>
              </div>
              <div className="lg:col-span-2 bg-sleek-accent-soft p-4 rounded-2xl border border-sleek-accent/10 space-y-2.5">
                <div className="flex items-center gap-2 text-sleek-accent">
                  <Zap className="w-5 h-5" />
                  <h3 className="text-base md:text-lg font-black">Action Advice</h3>
                </div>
                <div className="flex items-center justify-start">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-sleek-accent/25 text-[11px] font-black text-sleek-accent">
                    机会类型：{unifiedActionAdvice.opportunityType}
                  </span>
                </div>
                <p className="text-[15px] font-black text-sleek-text-main leading-snug">
                  {topic.actionAdvice.angle}
                </p>
                <div className="space-y-2 rounded-xl border border-sleek-accent/15 bg-white px-3 py-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-sleek-text-secondary">时间建议</span>
                      <span className="font-black text-[#5B5CF0] text-right">{unifiedActionAdvice.timing.level}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-[12px] leading-relaxed">
                      <span className="font-bold text-sleek-text-secondary shrink-0">原因说明</span>
                      <span className="font-semibold text-sleek-text-main text-right">{unifiedActionAdvice.timing.reason}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-[#D1D5DB]" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-sleek-text-secondary">主平台</span>
                      <span className="font-black text-[#5B5CF0] text-right">{unifiedActionAdvice.platform.primary}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-sleek-text-secondary">辅助平台</span>
                      <span className="font-black text-[#5B5CF0] text-right">{unifiedActionAdvice.platform.secondary.length > 0 ? unifiedActionAdvice.platform.secondary.join(' / ') : '无'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-sleek-text-secondary">可选补充</span>
                      <span className="font-black text-[#5B5CF0] text-right">{unifiedActionAdvice.platform.optional.length > 0 ? unifiedActionAdvice.platform.optional.join(' / ') : '无'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-[12px] leading-relaxed">
                      <span className="font-bold text-sleek-text-secondary shrink-0">原因说明</span>
                      <span className="font-semibold text-sleek-text-main text-right">{unifiedActionAdvice.platform.reason}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-[#D1D5DB]" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-sleek-text-secondary">内容形式</span>
                      <span className="font-black text-[#5B5CF0] text-right">{unifiedActionAdvice.format.primary}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 text-[12px] leading-relaxed">
                      <span className="font-bold text-sleek-text-secondary shrink-0">原因说明</span>
                      <span className="font-semibold text-sleek-text-main text-right">{unifiedActionAdvice.format.reason}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] leading-relaxed text-sleek-text-secondary">
                  执行提示：按主平台先发抢时效，辅助平台只做补充分发，标题建议突出明确观点与动作词。
                </p>
                <div className="flex flex-wrap gap-1">
                  {dedupeSources([unifiedActionAdvice.platform.primary, ...unifiedActionAdvice.platform.secondary, ...unifiedActionAdvice.platform.optional]).map((p) => (
                    <span key={p} className="text-[10px] font-black px-2 py-0.5 bg-sleek-accent text-white rounded-md">{p}</span>
                  ))}
                  <span className="text-[10px] font-black px-2 py-0.5 bg-white border border-sleek-border rounded-md">{unifiedActionAdvice.format.primary}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-white border border-sleek-border rounded-md">{unifiedActionAdvice.format.secondary}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Modal: Generation Panel ---

const GenerationPanel = ({
  topic,
  onClose,
  onFinish,
  showToast,
  prefs,
  onPrefsChange
}: {
  topic: HotTopic,
  onClose: () => void,
  onFinish: (id: string, results: GeneratedTopic[], prefs: GenerationPrefs) => void,
  showToast: (m: string, type?: 'success' | 'info') => void,
  prefs: GenerationPrefs,
  onPrefsChange: (next: Partial<GenerationPrefs>) => void
}) => {
  const [stage, setStage] = useState<'form' | 'loading' | 'results'>('form');
  const [view, setView] = useState<'list' | 'compare'>('list');
  const [results, setResults] = useState<GeneratedTopic[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isCopying, setIsCopying] = useState<string | null>(null);
  const recommendedOutput = useMemo(() => getRecommendedOutputStrategy(topic), [topic.id, topic.title, topic.source]);
  const [selectedPlatform, setSelectedPlatform] = useState<Source>(recommendedOutput.recommendedPlatforms[0] || topic.source);
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>(recommendedOutput.recommendedFormats[0] || '图文');

  useEffect(() => {
    setSelectedPlatform(recommendedOutput.recommendedPlatforms[0] || topic.source);
    setSelectedFormat(recommendedOutput.recommendedFormats[0] || '图文');
  }, [recommendedOutput.recommendedPlatforms, recommendedOutput.recommendedFormats]);

  const handleGenerate = () => {
    setStage('loading');
    setTimeout(async () => {
      const baseData = await weiboDataService.fetchGeneratedTopicTemplates(topic.id);
      const strategyStructureMap = weiboDataService.getStrategyStructureTemplates();
      const activeStrategies: StrategyKey[] = prefs.strategies.length > 0 ? prefs.strategies : ['analysis'];
      const strategyStructure = activeStrategies.flatMap((key) => strategyStructureMap[key]);
      const strategySummary = activeStrategies
        .map((key) => STRATEGY_OPTIONS.find((item) => item.key === key)?.label)
        .filter(Boolean)
        .join(' / ');

      const platform = selectedPlatform;
      const format = selectedFormat;
      const strategyHint = strategySummary || '深度分析';
      const platformAdviceMap: Record<Source, string> = {
        抖音: '平台打法建议：抖音更适合强节奏口播，前 3 秒要直接抛冲突或反转，结尾用评论互动抬升完播与互动率。',
        小红书: '平台打法建议：小红书更适合图文收藏向表达，强调经验、步骤和避坑建议，结尾引导收藏与补充交流。',
        微博: '平台打法建议：微博更适合实时热点切入，观点要短平快，尽量绑定话题标签和互动提问。',
        知乎: '平台打法建议：知乎更适合结构化分析，采用背景-分析-结论框架，语气理性，重视论证完整性。'
      };

      const shortVideoAnglesByPlatform: Record<Source, Array<{
        name: string;
        hook: string;
        segments: string[];
        pace: string;
        ending: string;
        copyTitle: string;
      }>> = {
        抖音: [
          {
            name: '冲突反转口播型',
            hook: `3 秒钩子：全网都在夸「${topic.title}」，但真正能吃到红利的人不到 10%！`,
            segments: [
              '第一段：直接抛冲突结论，用一句狠话打断用户滑走。',
              `第二段：快速复盘热点事件，把“为什么现在突然火”讲透（20 秒内完成）。`,
              '第三段：给出反转观点和可执行动作，告诉用户“现在该怎么做”。',
              '第四段：用真实场景收尾，强化“马上就能试”的行动感。'
            ],
            pace: '节奏建议：每 8~12 秒一个情绪峰值，字幕短句化，口播停顿少。',
            ending: '结尾 CTA：你赞同这个判断吗？评论区聊聊你的看法。',
            copyTitle: `别再跟风了！${topic.title} 的真机会在这里`
          },
          {
            name: '情绪代入快节奏型',
            hook: `3 秒钩子：如果你还没跟进「${topic.title}」，可能已经错过第一波流量了。`,
            segments: [
              '第一段：用“你是不是也这样”的提问制造代入感。',
              `第二段：拆 2 个最容易踩坑的动作，强调“别再这样做”。`,
              '第三段：给出替代打法，口播演示具体说法与镜头转场。',
              '第四段：总结成一句执行口令，便于观众直接照做。'
            ],
            pace: '节奏建议：前快后稳，连续短句 + 强动词，镜头切换频率更高。',
            ending: '结尾 CTA：要模板的话扣“1”，我放评论区。',
            copyTitle: `还在观望？${topic.title} 的流量窗口正在关`
          },
          {
            name: '爆点清单实操型',
            hook: `3 秒钩子：围绕「${topic.title}」，我给你 3 个今天就能发的爆点脚本。`,
            segments: [
              '第一段：先报结果，告诉观众“这条视频给你现成脚本”。',
              '第二段：脚本 1（观点型）+ 适合人群。',
              '第三段：脚本 2（情绪型）+ 适合场景。',
              '第四段：脚本 3（教程型）+ 发布注意事项。'
            ],
            pace: '节奏建议：清单式表达，段与段之间用数字和手势强化记忆点。',
            ending: '结尾 CTA：你想先用哪一条？评论区选编号。',
            copyTitle: `3 个现成脚本，今天就能借势「${topic.title}」`
          }
        ],
        小红书: [
          {
            name: '经验分享口播型',
            hook: `3 秒钩子：我用「${topic.title}」这个话题，实测拿到了更高互动。`,
            segments: [
              '第一段：先讲个人经历，建立真实感和可信度。',
              '第二段：拆“我怎么做”的步骤，强调可复制细节。',
              '第三段：补充一个失败案例和避坑提醒。',
              '第四段：总结成可收藏的执行要点。'
            ],
            pace: '节奏建议：语速中等，重点句放慢，强调“可照做”。',
            ending: '结尾 CTA：觉得有用可以先收藏，后面我再补实测数据。',
            copyTitle: `我怎么用「${topic.title}」做出高互动内容（实测版）`
          },
          {
            name: '生活化场景代入型',
            hook: `3 秒钩子：如果你也在做内容，这条关于「${topic.title}」的方法真的能省时间。`,
            segments: [
              '第一段：用日常场景开场，降低理解门槛。',
              '第二段：给出“新手也能做”的简化流程。',
              '第三段：补 2 个常见误区和修正方式。',
              '第四段：收束成“建议收藏的步骤卡片”。'
            ],
            pace: '节奏建议：偏叙事节奏，强调共鸣，不追求强冲突。',
            ending: '结尾 CTA：你还有哪些实操经验？评论区一起补充。',
            copyTitle: `关于「${topic.title}」这件事，我的省时做法分享`
          },
          {
            name: '干货避坑清单型',
            hook: `3 秒钩子：做「${topic.title}」相关内容前，这 3 个坑一定先避开。`,
            segments: [
              '第一段：先抛“为什么会踩坑”，引发关注。',
              '第二段：避坑 1 + 替代建议。',
              '第三段：避坑 2 + 替代建议。',
              '第四段：避坑 3 + 推荐执行顺序。'
            ],
            pace: '节奏建议：清单化输出，语气温和但结论明确。',
            ending: '结尾 CTA：建议先收藏，实操时对照这份清单。',
            copyTitle: `避坑贴｜${topic.title} 相关内容最容易犯的 3 个错`
          }
        ],
        微博: [
          {
            name: '热点快评型',
            hook: `3 秒钩子：刚刚刷到「${topic.title}」，这件事现在必须说清楚。`,
            segments: [
              '第一段：快速还原事件，给出立场。',
              '第二段：补充关键信息与影响范围。',
              '第三段：给出你的判断和跟进建议。',
              '第四段：抛互动问题，承接评论讨论。'
            ],
            pace: '节奏建议：句子更短，避免长解释，突出实时性。',
            ending: '结尾 CTA：你支持哪种看法？带话题聊聊。',
            copyTitle: `刚刚，关于「${topic.title}」我有一个判断`
          },
          {
            name: '观点回应型',
            hook: `3 秒钩子：关于「${topic.title}」，我和主流观点不太一样。`,
            segments: [
              '第一段：先指出主流观点。',
              '第二段：解释你不同意的核心理由。',
              '第三段：给出替代判断路径。',
              '第四段：邀请不同观点对线讨论。'
            ],
            pace: '节奏建议：观点先行，证据紧跟，避免铺垫太久。',
            ending: '结尾 CTA：欢迎反驳，评论区理性讨论。',
            copyTitle: `关于「${topic.title}」，我不同意大多数人的看法`
          },
          {
            name: '实时跟进型',
            hook: `3 秒钩子：这条「${topic.title}」还有二次发酵空间。`,
            segments: [
              '第一段：指出二次发酵信号。',
              '第二段：给出下一波讨论触发点。',
              '第三段：说明内容跟进窗口。',
              '第四段：给出发布建议和标签。'
            ],
            pace: '节奏建议：信息密度高，偏“快讯 + 判断”组合。',
            ending: '结尾 CTA：你觉得这条还能涨多久？',
            copyTitle: `「${topic.title}」二次发酵判断：现在是跟进窗口吗？`
          }
        ],
        知乎: [
          {
            name: '问题拆解型',
            hook: `3 秒钩子：我们该如何理解「${topic.title}」背后的核心问题？`,
            segments: [
              '第一段：先定义问题边界和讨论对象。',
              '第二段：分析形成原因，给出关键变量。',
              '第三段：结合真实案例做论证。',
              '第四段：得出可执行结论与适用条件。'
            ],
            pace: '节奏建议：语速稳，逻辑递进清晰，避免情绪化表达。',
            ending: '结尾 CTA：你更认可哪种分析路径？欢迎补充观点。',
            copyTitle: `如何系统看待「${topic.title}」？一个结构化分析`
          },
          {
            name: '观点论证型',
            hook: `3 秒钩子：关于「${topic.title}」，我倾向于一个不那么主流的结论。`,
            segments: [
              '第一段：先抛结论，再给论证框架。',
              '第二段：分点论证（数据、机制、案例）。',
              '第三段：讨论反方观点并回应。',
              '第四段：总结适用边界与实践建议。'
            ],
            pace: '节奏建议：先总后分，段落层次分明，重论证完整性。',
            ending: '结尾 CTA：欢迎基于事实继续补充不同论证。',
            copyTitle: `关于「${topic.title}」的一个可被论证的观点`
          },
          {
            name: '方法模型型',
            hook: `3 秒钩子：用一个模型框架，快速判断「${topic.title}」值不值得跟进。`,
            segments: [
              '第一段：给出方法模型（输入-判断-输出）。',
              '第二段：把热点代入模型逐步分析。',
              '第三段：给出模型使用中的常见误差。',
              '第四段：总结如何在实际场景中落地。'
            ],
            pace: '节奏建议：概念先解释再应用，保持知识密度与可读性平衡。',
            ending: '结尾 CTA：如果你有更好的模型，欢迎评论区交流。',
            copyTitle: `用模型判断「${topic.title}」：一套可复用的方法`
          }
        ]
      };

      const articleAnglesByPlatform: Record<Source, Array<{
        name: string;
        hook: string;
        segments: string[];
        pace: string;
        ending: string;
        copyTitle: string;
      }>> = {
        小红书: [
          {
            name: '收藏向经验贴',
            hook: `封面标题：我用「${topic.title}」做内容的 4 步经验（建议收藏）`,
            segments: [
              '第一段：我为什么开始跟进这条热点（背景与目标）。',
              '第二段：步骤 1-2（选角度 + 起标题）的具体做法。',
              '第三段：步骤 3-4（写结构 + 做互动）的实操细节。',
              '第四段：复盘结果 + 下次可优化点。'
            ],
            pace: '评论区互动引导：你最常卡在哪一步？我可以继续补充模板。',
            ending: '标签建议：#经验分享 #内容运营 #热点跟进 #建议收藏',
            copyTitle: `收藏向｜围绕「${topic.title}」的内容实操经验`
          },
          {
            name: '避坑清单贴',
            hook: `封面标题：做「${topic.title}」内容前，先避开这 5 个坑`,
            segments: [
              '第一段：先讲为什么这条热点容易翻车。',
              '第二段：避坑 1-2（标题和切入错误）。',
              '第三段：避坑 3-4（结构和互动错误）。',
              '第四段：避坑 5 + 推荐执行顺序。'
            ],
            pace: '评论区互动引导：你踩过哪个坑？评论区一起补充。',
            ending: '标签建议：#避坑指南 #运营干货 #方法论',
            copyTitle: `避坑贴｜${topic.title} 内容最容易犯错的地方`
          },
          {
            name: '步骤模板贴',
            hook: `封面标题：一篇写完「${topic.title}」的模板给你（可直接套用）`,
            segments: [
              '第一段：模板使用说明（适合谁、什么时候用）。',
              '第二段：开头模板（热点切入 + 观点抛出）。',
              '第三段：中段模板（案例 + 方法 + 注意事项）。',
              '第四段：结尾模板（总结 + 收藏引导 + 互动提问）。'
            ],
            pace: '评论区互动引导：要不要我把可复制版模板放评论区？',
            ending: '标签建议：#模板分享 #干货笔记 #小红书运营',
            copyTitle: `模板贴｜${topic.title} 图文可直接套用版`
          }
        ],
        抖音: [
          {
            name: '热点快打图文型',
            hook: `首句：关于「${topic.title}」，这 4 点你必须先知道`,
            segments: [
              '第一段：一句话结论，先给立场。',
              '第二段：补关键证据，强化可信度。',
              '第三段：给观众可执行动作（今天就能做）。',
              '第四段：抛问题引发评论区对话。'
            ],
            pace: '评论区互动引导：你会先执行哪一步？',
            ending: '标签建议：#抖音运营 #热点话题 #内容策略',
            copyTitle: `快打版｜${topic.title} 的 4 条核心判断`
          },
          {
            name: '争议观点图文型',
            hook: `首句：关于「${topic.title}」，我不建议大家这样做`,
            segments: [
              '第一段：先抛争议结论。',
              '第二段：列主流做法并指出问题。',
              '第三段：给替代方案和执行步骤。',
              '第四段：总结并邀请观众表态。'
            ],
            pace: '评论区互动引导：支持主流还是反向打法？',
            ending: '标签建议：#观点争议 #内容创作 #实操建议',
            copyTitle: `反向观点｜${topic.title} 跟进别再踩这个坑`
          },
          {
            name: '清单执行图文型',
            hook: `首句：围绕「${topic.title}」，给你今天就能执行的清单`,
            segments: [
              '第一段：明确目标与适用场景。',
              '第二段：清单 1-2（开头和结构）。',
              '第三段：清单 3-4（互动和迭代）。',
              '第四段：清单 5（复盘标准）。'
            ],
            pace: '评论区互动引导：要完整版执行清单可以留言。',
            ending: '标签建议：#执行清单 #内容涨粉 #热点借势',
            copyTitle: `执行清单｜${topic.title} 的落地打法`
          }
        ],
        微博: [
          {
            name: '热点解读型',
            hook: `首句：关于「${topic.title}」，现在最值得关注的是这 3 点`,
            segments: [
              '第一段：快速交代事件动态。',
              '第二段：给观点判断和支撑信息。',
              '第三段：说明对用户与传播面的影响。',
              '第四段：给实时跟进建议与互动提问。'
            ],
            pace: '评论区互动引导：你怎么看这条热点后续走势？',
            ending: '标签建议：#微博热榜 #热点解读 #实时观察',
            copyTitle: `实时解读｜${topic.title} 的关键看点`
          },
          {
            name: '趋势分析型',
            hook: `首句：从「${topic.title}」看未来 12 小时讨论趋势`,
            segments: [
              '第一段：先给趋势结论。',
              '第二段：给出趋势依据（热度、互动、传播）。',
              '第三段：给出跟进窗口与动作。',
              '第四段：总结风险与机会。'
            ],
            pace: '评论区互动引导：你会现在发，还是再观察一轮？',
            ending: '标签建议：#趋势分析 #内容策略 #微博运营',
            copyTitle: `12 小时判断｜${topic.title} 还值不值得跟`
          },
          {
            name: '实操清单型',
            hook: `首句：跟进「${topic.title}」前，这份清单建议先过一遍`,
            segments: [
              '第一段：明确这条热点适合谁。',
              '第二段：清单 1-2（切入和标题）。',
              '第三段：清单 3-4（正文和互动）。',
              '第四段：清单 5（发布后复盘）。'
            ],
            pace: '评论区互动引导：你更想看标题模板还是正文模板？',
            ending: '标签建议：#实操清单 #微博内容 #热点借势',
            copyTitle: `实操版｜${topic.title} 跟进清单`
          }
        ],
        知乎: [
          {
            name: '问题导向分析型',
            hook: `首句：如何判断「${topic.title}」是否值得持续关注？`,
            segments: [
              '第一段：定义问题与分析边界。',
              '第二段：拆分关键变量并给出逻辑关系。',
              '第三段：结合案例验证观点。',
              '第四段：形成结论与建议。'
            ],
            pace: '评论区互动引导：你认同这个分析框架吗？',
            ending: '标签建议：#知乎回答 #深度分析 #方法论',
            copyTitle: `如何判断「${topic.title}」？一个结构化回答`
          },
          {
            name: '观点论证型',
            hook: `首句：关于「${topic.title}」，我更倾向这个结论`,
            segments: [
              '第一段：先给核心结论。',
              '第二段：列出论据链路（事实-机制-推论）。',
              '第三段：回应反方观点。',
              '第四段：总结适用边界。'
            ],
            pace: '评论区互动引导：欢迎补充反例一起校验结论。',
            ending: '标签建议：#观点讨论 #逻辑分析 #趋势观察',
            copyTitle: `关于「${topic.title}」的结论与论证`
          },
          {
            name: '方法模型型',
            hook: `首句：用一个模型拆解「${topic.title}」的机会与风险`,
            segments: [
              '第一段：介绍模型结构。',
              '第二段：代入热点逐项分析。',
              '第三段：指出模型局限与修正方法。',
              '第四段：输出可执行建议。'
            ],
            pace: '评论区互动引导：你还有哪些可复用模型？',
            ending: '标签建议：#分析模型 #内容策略 #知乎创作',
            copyTitle: `模型拆解｜${topic.title} 的机会判断`
          }
        ]
      };

      const angleTemplates = format === '短视频'
        ? shortVideoAnglesByPlatform[platform]
        : articleAnglesByPlatform[platform];

      const adaptedData = angleTemplates.map((angle, idx) => {
        const seed = baseData[idx % baseData.length];
        const goalPrefix = prefs.goal === '涨粉' ? '涨粉向' : prefs.goal === '转化' ? '转化向' : prefs.goal === '品牌' ? '品牌向' : '引流向';
        const strategyDrivenStructure = [...strategyStructure, ...seed.structure].filter((item, i, arr) => arr.indexOf(item) === i);
        const guideLabel = format === '短视频' ? '结尾 CTA' : '收藏/互动建议';
        const tagLine = angle.ending.replace('标签建议：', '');
        const commentLine = angle.pace.replace('评论区互动引导：', '');
        return {
          ...seed,
          id: `${topic.id}-${platform}-${format}-${idx}`,
          title: `[${platform} · ${format}] ${angle.name}`,
          explanation: `${goalPrefix} ${platform}${format}方案。当前策略重点：${strategyHint}。`,
          structure: [
            ...angle.segments,
            format === '短视频' ? angle.pace : `评论区互动引导：${commentLine}`,
            `${guideLabel}：${format === '短视频' ? angle.ending.replace('结尾 CTA：', '') : '建议先收藏再按步骤执行，做完欢迎评论区补充实测结果。'}`,
            format === '图文' ? `标签建议：${tagLine}` : `可直接复制标题：${angle.copyTitle}`,
            ...strategyDrivenStructure.map((item) => `策略补充：${item}`)
          ],
          platforms: [platform],
          format,
          angleName: angle.name,
          platformAdvice: platformAdviceMap[platform],
          contentSegments: angle.segments,
          paceAdvice: angle.pace,
          cta: angle.ending.replace('结尾 CTA：', ''),
          copyTitle: angle.copyTitle,
          coverTitle: angle.hook,
          tagsSuggestion: format === '图文' ? tagLine : undefined,
          commentGuide: format === '图文' ? commentLine : undefined,
          hook: angle.hook,
          appliedStrategies: activeStrategies
        };
      });
      setResults(adaptedData);
      setStage('results');
      onFinish(topic.id, adaptedData, {
        goal: prefs.goal,
        strategies: activeStrategies
      });
      showToast('AI 创意生成成功', 'success');
    }, 1500);
  };

  const copyToClipboard = (text: string, id: string, label: string) => {
    setIsCopying(id);
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast(`${label}已复制到剪贴板`, 'success');
      })
      .catch(() => {
        showToast('复制失败，请稍后重试', 'info');
      })
      .finally(() => {
        setTimeout(() => setIsCopying(null), 1600);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-sleek-border max-h-[90vh] flex flex-col"
      >
        <div className="p-8 border-b border-sleek-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-sleek-accent p-3 rounded-2xl shadow-lg shadow-sleek-accent/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-sleek-text-main">AI 灵感引擎</h3>
              <p className="text-[11px] font-bold text-sleek-text-secondary uppercase tracking-widest">基于“{topic.title.substring(0, 10)}...” 进行针对性创作</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {stage === 'results' && (
               <div className="flex bg-sleek-sidebar p-1 rounded-lg border border-sleek-border">
                  <button 
                    onClick={() => setView('list')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${view === 'list' ? 'bg-white text-sleek-accent shadow-sm' : 'text-sleek-text-secondary hover:text-sleek-text-main'}`}
                  >
                    列表视图
                  </button>
                  <button 
                    onClick={() => setView('compare')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${view === 'compare' ? 'bg-white text-sleek-accent shadow-sm' : 'text-sleek-text-secondary hover:text-sleek-text-main'}`}
                  >
                    方案对比
                  </button>
               </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-sleek-sidebar rounded-full transition-colors text-sleek-text-secondary">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>

        <div className="p-10 overflow-y-auto flex-1 custom-scrollbar min-h-[400px]">
          {stage === 'loading' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-8">
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-sleek-accent/10 border-t-sleek-accent rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Wand2 className="w-6 h-6 text-sleek-accent animate-pulse" />
                 </div>
               </div>
               <div className="text-center space-y-2">
                 <p className="text-sm font-black text-sleek-text-main">生成最佳内容路径...</p>
                 <p className="text-[11px] font-bold text-sleek-text-secondary uppercase">Applying goal: {prefs.goal}</p>
               </div>
            </div>
          )}

          {stage === 'form' && (
            <div className="space-y-10">
               <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-sleek-text-main">内容运营目标</h4>
                    <span className="text-[10px] font-bold text-sleek-text-secondary uppercase">Goal Selection</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {(['引流', '转化', '品牌', '涨粉'] as ContentGoal[]).map(g => (
                      <button 
                        key={g}
                        onClick={() => onPrefsChange({ goal: g })}
                        className={`py-4 rounded-2xl text-xs font-black border-2 transition-all ${
                          prefs.goal === g ? 'bg-sleek-text-main text-white border-sleek-text-main shadow-xl shadow-sleek-text-main/10' : 'bg-white text-sleek-text-secondary border-sleek-border hover:border-sleek-accent'
                        }`}
                      >
                        {g === '引流' && '🚀 '}
                        {g === '转化' && '💰 '}
                        {g === '品牌' && '💎 '}
                        {g === '涨粉' && '📈 '}
                        {g}
                      </button>
                    ))}
                  </div>
               </section>

               <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-sleek-text-main">策略选择（已同步详情页）</h4>
                    <span className="text-[10px] font-bold text-sleek-text-secondary uppercase">Strategies</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {STRATEGY_OPTIONS.map((item) => {
                      const active = prefs.strategies.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            const next = active
                              ? prefs.strategies.filter((s) => s !== item.key)
                              : [...prefs.strategies, item.key];
                            onPrefsChange({ strategies: next.length > 0 ? next : ['analysis'] });
                          }}
                          className={`py-3 rounded-xl text-xs font-black border transition-all ${
                            active
                              ? 'bg-sleek-accent-soft text-sleek-accent border-sleek-accent/30'
                              : 'bg-white text-sleek-text-secondary border-sleek-border hover:border-sleek-accent/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
               </section>

               <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-sleek-text-main">输出平台（单选）</h4>
                    <span className="text-[10px] font-bold text-sleek-text-secondary uppercase">Platform Output</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_PLATFORMS.map((platform) => {
                      const selected = selectedPlatform === platform;
                      const recommended = recommendedOutput.recommendedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`py-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                            selected
                              ? 'bg-sleek-accent-soft text-sleek-accent border-sleek-accent/30'
                              : 'bg-white text-sleek-text-secondary border-sleek-border hover:border-sleek-accent/40'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border ${selected ? 'border-sleek-accent bg-sleek-accent' : 'border-sleek-border'}`} />
                          <span>{platform}</span>
                          {recommended && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">推荐🔥</span>}
                        </button>
                      );
                    })}
                  </div>
               </section>

               <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-sleek-text-main">内容形式（单选）</h4>
                    <span className="text-[10px] font-bold text-sleek-text-secondary uppercase">Format Output</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['短视频', '图文'] as ContentFormat[]).map((format) => {
                      const selected = selectedFormat === format;
                      const recommended = recommendedOutput.recommendedFormats.includes(format);
                      return (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={`py-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                            selected
                              ? 'bg-sleek-accent-soft text-sleek-accent border-sleek-accent/30'
                              : 'bg-white text-sleek-text-secondary border-sleek-border hover:border-sleek-accent/40'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border ${selected ? 'border-sleek-accent bg-sleek-accent' : 'border-sleek-border'}`} />
                          <span>{format}</span>
                          {recommended && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">推荐</span>}
                        </button>
                      );
                    })}
                  </div>
               </section>

               <div className="bg-sleek-sidebar p-6 rounded-3xl border border-sleek-border">
                  <h4 className="text-[11px] font-black text-sleek-text-secondary uppercase mb-4">当前选题环境</h4>
                  <div className="space-y-3">
                     <div className="flex justify-between text-xs font-bold text-sleek-text-main">
                        <span>热点基调</span>
                        <span className="text-sleek-accent">高价值 / 快速增长</span>
                     </div>
                     <div className="flex justify-between text-xs font-bold text-sleek-text-main">
                        <span>建议深度</span>
                        <span className="text-sleek-accent">中等 - 侧重实操</span>
                     </div>
                  </div>
               </div>

               <button 
                onClick={handleGenerate}
                className="w-full bg-sleek-accent py-5 rounded-[24px] text-white font-black text-md hover:shadow-2xl hover:shadow-sleek-accent/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                 <Sparkles className="w-5 h-5" />
                 生成 3 个专业选题方案
               </button>
            </div>
          )}

          {stage === 'results' && view === 'list' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-sleek-text-main">已为您匹配 3 个最优增长路径</h4>
               </div>
               
               <div className="space-y-4 pb-4">
                 {results.map((res, idx) => (
                   <motion.div 
                    key={idx}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`border overflow-hidden rounded-3xl transition-all ${expandedId === idx ? 'border-sleek-accent bg-sleek-accent-soft/30 shadow-xl' : 'border-sleek-border hover:border-sleek-accent/50'}`}
                   >
                     <div 
                      onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                      className="p-6 cursor-pointer flex items-center justify-between"
                     >
                       <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-xl bg-sleek-text-main text-white flex items-center justify-center text-xs font-black">0{idx+1}</div>
                         <div className="space-y-1">
                           <h5 className="font-bold text-sleek-text-main text-md leading-tight pr-4">{res.title}</h5>
                           <div className="text-[10px] font-black text-sleek-accent bg-sleek-accent-soft inline-flex px-2 py-0.5 rounded-md border border-sleek-accent/20">
                             {res.platforms?.[0] || selectedPlatform} · {res.format || selectedFormat} · {res.angleName || `方案 0${idx + 1}`}
                           </div>
                           {idx === 0 && (
                             <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tight flex items-center gap-1">
                                 <Trophy className="w-2.5 h-2.5" /> 推荐：方案 01 (成功率最高)
                               </span>
                             </div>
                           )}
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(res.title, `title-${idx}`, '标题');
                           }}
                           disabled={isCopying === `title-${idx}`}
                           className={`p-2 rounded-xl border transition-all ${isCopying === `title-${idx}` ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-sleek-border text-sleek-text-secondary hover:border-sleek-accent/50 hover:bg-white'}`}
                          >
                            {isCopying === `title-${idx}` ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-sleek-text-secondary">
                            <span>{expandedId === idx ? '收起详情' : '展开详情'}</span>
                            {expandedId === idx ? <ChevronUp className="w-5 h-5 transition-transform" /> : <ChevronDown className="w-5 h-5 transition-transform" />}
                          </div>
                       </div>
                     </div>

                     <AnimatePresence>
                       {expandedId === idx && (
                         <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 pb-6 pt-2 space-y-6"
                         >
                            <div className="space-y-2">
                               <div className="text-[10px] font-black text-sleek-text-secondary uppercase flex items-center gap-2">
                                   <Target className="w-3 h-3" /> 方案定位
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="text-[9px] font-bold text-sleek-accent bg-sleek-accent-soft px-1.5 py-0.5 rounded border border-sleek-accent/10">
                                    适合平台：{res.platforms?.[0] || selectedPlatform}
                                  </span>
                                  <span className="text-[9px] font-bold text-sleek-accent bg-sleek-accent-soft px-1.5 py-0.5 rounded border border-sleek-accent/10">
                                    推荐内容形式：{res.format || selectedFormat}
                                  </span>
                                </div>
                               <p className="text-sm font-semibold text-sleek-text-main leading-relaxed bg-white/60 p-4 rounded-2xl border border-sleek-border">
                                 {res.explanation}
                               </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                               <div className="bg-white/60 p-4 rounded-2xl border border-sleek-border space-y-2">
                                  <div className="text-[10px] font-black text-sleek-text-secondary uppercase">
                                    {(res.format || selectedFormat) === '短视频' ? '开头 3 秒钩子' : '封面标题 / 首句建议'}
                                  </div>
                                  <p className="text-xs font-black text-sleek-accent italic">“{res.hook}”</p>
                               </div>
                               <div className="bg-white/60 p-4 rounded-2xl border border-sleek-border space-y-2">
                                  <div className="text-[10px] font-black text-sleek-text-secondary uppercase">平台打法建议</div>
                                  <p className="text-[11px] text-sleek-text-main leading-relaxed">{res.platformAdvice || '按当前平台惯用表达组织内容。'}</p>
                               </div>
                               <div className="bg-white/60 p-4 rounded-2xl border border-sleek-border space-y-2">
                                  <div className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest text-emerald-600">
                                    {(res.format || selectedFormat) === '短视频' ? '视频脚本思路（每段讲什么）' : '图文结构思路（每段讲什么）'}
                                  </div>
                                  {res.appliedStrategies && res.appliedStrategies.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {res.appliedStrategies.map((key) => (
                                        <span key={key} className="text-[9px] font-bold text-sleek-accent bg-sleek-accent-soft px-1.5 py-0.5 rounded border border-sleek-accent/10">
                                          {STRATEGY_OPTIONS.find((item) => item.key === key)?.label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    {res.structure.map((s, i) => (
                                      <div key={i} className="text-[11px] text-sleek-text-main leading-relaxed">- {s}</div>
                                    ))}
                                  </div>
                               </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                               <button 
                                onClick={() => copyToClipboard(res.title, `btn-title-${idx}`, '标题')}
                                className={`flex-1 py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all ${
                                   isCopying === `btn-title-${idx}` ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border border-sleek-border text-sleek-text-main hover:bg-sleek-sidebar'
                                }`}
                               >
                                 {isCopying === `btn-title-${idx}` ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-4 h-4" />}
                                 {isCopying === `btn-title-${idx}` ? '已复制' : '复制标题'}
                               </button>
                               <button 
                                onClick={() => copyToClipboard(
                                  (res.format || selectedFormat) === '短视频'
                                    ? buildFullVideoScriptText(res)
                                    : buildFullArticlePlanText(res),
                                  `full-${idx}`,
                                  (res.format || selectedFormat) === '短视频' ? '完整脚本' : '完整图文方案'
                                )}
                                className={`flex-1 py-3 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
                                   isCopying === `full-${idx}` ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-sleek-text-main text-white'
                                }`}
                               >
                                 {isCopying === `full-${idx}` ? <CheckCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                 {isCopying === `full-${idx}` ? '已复制' : (res.format || selectedFormat) === '短视频' ? '复制完整脚本' : '复制完整图文方案'}
                               </button>
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </motion.div>
                 ))}
               </div>

               <div className="pt-4 border-t border-sleek-border flex gap-4">
                  <button onClick={() => setStage('form')} className="flex-1 py-4 bg-sleek-sidebar text-sleek-text-secondary rounded-2xl text-xs font-black border border-sleek-border hover:bg-gray-200 transition-all">重新调整创作目标</button>
                  <button 
                    onClick={() => {
                        showToast('✔ 已同步至您的创作计划', 'success');
                        setTimeout(() => showToast('💡 建议发布时间：今晚 18:00', 'info'), 1000);
                        onClose();
                    }} 
                    className="flex-1 py-4 bg-sleek-accent text-white rounded-2xl text-xs font-black shadow-xl shadow-sleek-accent/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> 完成并开启创作
                  </button>
               </div>
            </div>
          )}

          {stage === 'results' && view === 'compare' && (
            <div className="space-y-8">
               <div className="grid grid-cols-3 gap-6">
                 {results.map((res, i) => (
                    <div key={i} className="bg-white border-2 border-sleek-border rounded-3xl p-6 flex flex-col hover:border-sleek-accent transition-all group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-sleek-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="text-[10px] font-black text-sleek-accent mb-3">方案 0{i+1}</div>
                       <h5 className="font-black text-xs mb-4 leading-snug line-clamp-3 group-hover:text-sleek-accent transition-colors">{res.title}</h5>
                       <div className="mb-3 text-[10px] font-black text-sleek-accent bg-sleek-accent-soft inline-flex px-2 py-0.5 rounded-md border border-sleek-accent/20">
                         {res.platforms?.[0] || selectedPlatform} · {res.format || selectedFormat} · {res.angleName || `方案 0${i + 1}`}
                       </div>
                       <div className="mt-auto space-y-4">
                          <div className="space-y-1">
                             <div className="text-[9px] font-bold text-sleek-text-secondary">AI 断语：</div>
                             <div className="text-[10px] font-medium line-clamp-2 italic text-sleek-text-secondary leading-normal">{res.explanation.substring(0, 40)}...</div>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(res.title, `comp-${i}`, '标题')}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-black transition-all ${
                               isCopying === `comp-${i}` ? 'bg-emerald-500 text-white' : 'bg-sleek-text-main text-white hover:bg-black'
                            }`}
                          >
                            {isCopying === `comp-${i}` ? '已复制' : '复制标题'}
                          </button>
                       </div>
                    </div>
                 ))}
               </div>
               <div className="bg-sleek-accent-soft p-8 rounded-[32px] border border-sleek-accent/10 relative">
                  <h4 className="text-sm font-black text-sleek-accent flex items-center gap-2 mb-3">
                     <Sparkles className="w-4 h-4" /> 深度策略建议 (Smart Insight)
                  </h4>
                  <p className="text-xs text-sleek-text-main font-bold leading-relaxed relative z-10 transition-all hover:translate-x-1">
                     针对“{prefs.goal}”目标，系统深度建议优先采用 **方案 01**。其钩子设计高度契合近期该类话题的爆发公式。建议结合“实操工具包”策略。
                  </p>
               </div>
               <button onClick={() => setView('list')} className="w-full py-4 text-xs font-black text-sleek-text-secondary bg-white rounded-2xl border-2 border-dashed border-sleek-border hover:text-sleek-accent hover:border-sleek-accent transition-all flex items-center justify-center gap-2">
                 <ArrowLeft className="w-3.5 h-3.5" /> 返回精细化列表模式
               </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Page: Settings ---

const SettingsPage = ({
  onBackHome,
  showToast,
  digestEmail,
  setDigestEmail,
  digestEnabled,
  setDigestEnabled,
  digestPreference,
  setDigestPreference
}: {
  onBackHome: () => void,
  showToast: (m: string, type?: 'success' | 'info') => void,
  digestEmail: string,
  setDigestEmail: (email: string) => void,
  digestEnabled: boolean,
  setDigestEnabled: (next: boolean) => void,
  digestPreference: DigestPreference,
  setDigestPreference: (next: DigestPreference) => void
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  const sendDigestForConfig = async (
    emailsInput: string[] | string,
    selectedPlatforms: Source[]
  ) => {
    setSendingNow(true);
    try {
      const parsedEmails = Array.isArray(emailsInput) ? Array.from(new Set(emailsInput)) : parseEmailList(emailsInput);
      const { valid, invalid } = validateEmailList(parsedEmails);

      if (invalid.length > 0) {
        showToast(`以下邮箱格式无效：${invalid.join('、')}`, 'info');
      }
      if (valid.length === 0) {
        showToast('发送失败：没有有效邮箱地址', 'info');
        return;
      }

      if (selectedPlatforms.length === 0) {
        showToast('请至少选择 1 个平台', 'info');
        return;
      }

      const allTopics = await weiboDataService.fetchAllTopics();
      const filteredTopics = allTopics.filter((topic) => selectedPlatforms.includes(topic.source));

      if (filteredTopics.length === 0) {
        showToast('当前筛选条件下暂无可推送热点', 'info');
        return;
      }

      const digestParams = buildDigestEmailParams(
        filteredTopics,
        selectedPlatforms
      );

      const sendTasks = valid.map((email) =>
        emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: email,
            email,
            ...digestParams
          },
          EMAILJS_PUBLIC_KEY
        )
      );
      const results = await Promise.allSettled(sendTasks);
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      if (failCount > 0) {
        const failedEmails = results
          .map((result, idx) => ({ result, email: valid[idx] }))
          .filter(({ result }) => result.status === 'rejected');
        console.error('[DigestMail] partial failed:', failedEmails);
      }

      if (successCount > 0 && failCount === 0) {
        showToast(`今日简报发送成功，已发送给 ${successCount} 个邮箱`, 'success');
      } else if (successCount > 0) {
        showToast(`简报部分发送成功：成功 ${successCount}，失败 ${failCount}`, 'info');
      } else {
        showToast('简报发送失败，请检查 EmailJS 模板变量与配置', 'info');
      }
    } catch (error) {
      console.error('[DigestMail] send failed:', error);
      showToast('简报发送失败，请检查 EmailJS 模板变量与配置', 'info');
    } finally {
      setSendingNow(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const parsedEmails = parseEmailList(digestEmail);
    const { valid, invalid } = validateEmailList(parsedEmails);

    if (invalid.length > 0) {
      showToast(`以下邮箱格式无效：${invalid.join('、')}`, 'info');
    }
    if (valid.length === 0) {
      setIsSaving(false);
      showToast('保存失败：请至少填写 1 个有效邮箱', 'info');
      return;
    }
    setDigestEmail(valid.join('\n'));

    const nextSubscription: DigestSubscription = {
      enabled: digestEnabled,
      emails: valid,
      selectedPlatforms: [...digestPreference.selectedPlatforms]
    };

    try {
      localStorage.setItem(DIGEST_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(nextSubscription));
    } catch (error) {
      console.error('[DigestSubscription] save failed:', error);
    }

    setIsSaving(false);
    showToast('订阅设置已保存', 'success');
  };

  const togglePlatform = (platform: Source) => {
    const exists = digestPreference.selectedPlatforms.includes(platform);
    const nextPlatforms = exists
      ? digestPreference.selectedPlatforms.filter((item) => item !== platform)
      : [...digestPreference.selectedPlatforms, platform];
    setDigestPreference({
      ...digestPreference,
      selectedPlatforms: nextPlatforms
    });
  };

  const handleSendDigestMail = () =>
    sendDigestForConfig(
      digestEmail,
      digestPreference.selectedPlatforms
    );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <header className="h-14 border-b border-sleek-border flex items-center px-6 justify-between shrink-0">
        <div className="font-semibold text-sleek-text-main">每日简报订阅设置</div>
        <button
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-sleek-border text-sleek-text-secondary hover:text-sleek-accent hover:border-sleek-accent transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回热点流
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-12">
        <div className="max-w-xl mx-auto space-y-12">
          <section className="space-y-4">
            <div className="rounded-xl border border-sleek-border bg-sleek-sidebar px-4 py-4 space-y-2">
              <div className="text-sm font-black text-sleek-text-main">每日固定时间：早上 {DAILY_FIXED_SEND_TIME} 自动发送</div>
              <div className="text-xs text-sleek-text-secondary">
                当前订阅状态：
                <span className={`ml-1 font-black ${digestEnabled ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {digestEnabled ? '已开启' : '已关闭'}
                </span>
              </div>
              <button
                onClick={() => setDigestEnabled(!digestEnabled)}
                className={`px-4 py-2 rounded-lg text-xs font-black border transition-all ${
                  digestEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-sleek-border text-sleek-text-secondary'
                }`}
              >
                {digestEnabled ? '关闭订阅' : '开启订阅'}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sleek-accent" />
              <h4 className="text-sm font-bold text-sleek-text-main uppercase tracking-wider">推送邮箱（支持多个）</h4>
            </div>
            <textarea
              placeholder={'a@test.com\nb@test.com\n或 a@test.com, b@test.com'}
              className="w-full px-4 py-3 bg-sleek-sidebar border border-sleek-border rounded-lg focus:outline-none focus:ring-1 focus:ring-sleek-accent/20 transition-all text-sm min-h-[96px]"
              value={digestEmail}
              onChange={(e) => setDigestEmail(e.target.value)}
            />
            <p className="text-xs text-sleek-text-secondary">支持逗号、中文逗号、换行分隔。保存时会自动去重并过滤无效邮箱。</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sleek-accent" />
              <h4 className="text-sm font-bold text-sleek-text-main uppercase tracking-wider">推送平台筛选</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PLATFORMS.map((platform) => {
                const checked = digestPreference.selectedPlatforms.includes(platform);
                return (
                  <label
                    key={platform}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? 'bg-sleek-accent-soft border-sleek-accent/30 text-sleek-accent'
                        : 'bg-white border-sleek-border text-sleek-text-secondary hover:bg-sleek-sidebar'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePlatform(platform)}
                    />
                    <span className="text-xs font-bold">{platform}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="pt-8 border-t border-sleek-border">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-8 py-2.5 rounded-lg font-bold transition-all text-sm ${
                  isSaving
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-sleek-accent text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? '保存中...' : '保存订阅设置'}
              </button>
              <button
                onClick={handleSendDigestMail}
                disabled={sendingNow}
                className={`px-5 py-2.5 rounded-lg font-bold transition-all text-sm border ${
                  sendingNow
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                }`}
              >
                {sendingNow ? '发送中...' : '立即发送今日简报'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [selectedTopic, setSelectedTopic] = useState<HotTopic | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  // Real-time dynamic states
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('2分钟前');
  const [notification, setNotification] = useState<{show: boolean, msg: string, type?: 'success' | 'info'}>({show: false, msg: '', type: 'info'});

  // Global Context States
  const [digestEmail, setDigestEmail] = useState('');
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestPreference, setDigestPreference] = useState<DigestPreference>({
    selectedPlatforms: [...ALL_PLATFORMS]
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [processed, setProcessed] = useState<Set<string>>(new Set());
  const [usedTopics, setUsedTopics] = useState<Set<string>>(new Set());
  const [generatedRecordsByTopic, setGeneratedRecordsByTopic] = useState<Record<string, GeneratedRecord[]>>({});
  const [generationPrefsByTopic, setGenerationPrefsByTopic] = useState<Record<string, GenerationPrefs>>({});

  const getGenerationPrefs = (topicId: string): GenerationPrefs =>
    generationPrefsByTopic[topicId] || DEFAULT_GENERATION_PREFS;

  const updateGenerationPrefs = (topicId: string, patch: Partial<GenerationPrefs>) => {
    setGenerationPrefsByTopic(prev => {
      const current = prev[topicId] || DEFAULT_GENERATION_PREFS;
      return {
        ...prev,
        [topicId]: {
          ...current,
          ...patch
        }
      };
    });
  };

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DIGEST_SUBSCRIPTION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DigestSubscription>;
      if (typeof parsed?.enabled === 'boolean') setDigestEnabled(parsed.enabled);
      if (Array.isArray(parsed?.emails)) setDigestEmail(parsed.emails.join('\n'));
      if (Array.isArray(parsed?.selectedPlatforms) && parsed.selectedPlatforms.length > 0) {
        setDigestPreference((prev) => ({ ...prev, selectedPlatforms: parsed.selectedPlatforms as Source[] }));
      }
    } catch (error) {
      console.error('[DigestSubscription] load failed:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrapTopics = async () => {
      const currentTopics = await weiboDataService.fetchAllTopics();
      if (!cancelled) {
        setTopics(currentTopics);
      }
    };

    bootstrapTopics();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTopic) return;
    const latest = topics.find((topic) => topic.id === selectedTopic.id);
    if (!latest) return;
    if (latest === selectedTopic) return;
    setSelectedTopic(latest);
  }, [selectedTopic, topics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(async () => {
      const refreshedTopics = await weiboDataService.fetchAllTopics();
      const previousIds = new Set(topics.map((item) => item.id));
      const newCount = refreshedTopics.filter((item) => !previousIds.has(item.id)).length;
      setTopics(refreshedTopics);
      setIsRefreshing(false);
      setLastUpdated('刚刚');
      showToast(`已更新 ${refreshedTopics.length} 条热点，发现 ${newCount} 个新热点`);
    }, 2000);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickGenerate = (topic: HotTopic, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setSelectedTopic(topic);
    setIsGeneratorOpen(true);
  };

  const markProcessed = (id: string, results: GeneratedTopic[], prefs: GenerationPrefs) => {
    setProcessed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
    setGeneratedRecordsByTopic(prev => {
      const strategyNames = prefs.strategies.map(
        (key) => STRATEGY_OPTIONS.find((item) => item.key === key)?.label || key
      );
      const nextRecords = results.map((item, idx) => ({
        id: `${id}-${Date.now()}-${idx}`,
        topicId: id,
        title: item.title,
        goal: prefs.goal,
        strategies: prefs.strategies,
        createdAt: timestamp,
        content: `${item.title}\n\n[内容目标] ${prefs.goal}\n[使用策略] ${strategyNames.join(' / ')}\n[切入角度] ${item.explanation}\n[结构建议] ${item.structure.join(' / ')}\n[开头钩子] ${item.hook || ''}`
      }));
      return {
        ...prev,
        [id]: [...nextRecords, ...(prev[id] || [])]
      };
    });
  };

  const handleRegenerateFromRecord = (topic: HotTopic, record: GeneratedRecord, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    updateGenerationPrefs(topic.id, {
      goal: record.goal,
      strategies: record.strategies
    });
    setSelectedTopic(topic);
    setIsGeneratorOpen(true);
    showToast('已载入历史方案参数，可继续优化生成', 'info');
  };

  const isHomeListView = activePage === 'home' && !selectedTopic;

  return (
    <div className="min-h-screen bg-sleek-bg font-sans text-sleek-text-main selection:bg-sleek-accent-soft selection:text-sleek-accent">
      <main className={`${isHomeListView ? 'min-h-screen overflow-visible' : 'h-screen overflow-hidden'} relative`}>
        <AnimatePresence>
          {notification.show && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 20, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className={`absolute top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${
                notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-900 text-white border-gray-700'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              {notification.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activePage === 'home' && (
            <motion.div 
              key={selectedTopic ? 'detail' : 'home'}
              className="h-full"
            >
              {!selectedTopic ? (
                <HomePage 
                    onSelectTopic={setSelectedTopic} 
                    onOpenSettings={() => {
                      setActivePage('settings');
                      setSelectedTopic(null);
                    }}
                    topics={topics}
                    lastUpdated={lastUpdated}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    favorites={favorites}
                    toggleFavorite={(id, e) => {
                      toggleFavorite(id, e);
                      showToast(favorites.has(id) ? '已取消收藏' : '已添加到库存档');
                    }}
                    processed={processed}
                    generatedRecordsByTopic={generatedRecordsByTopic}
                    usedTopics={usedTopics}
                    setUsedTopics={(val) => {
                      // We need to check the change to show toast
                      if (typeof val === 'function') {
                         setUsedTopics(prev => {
                           const next = val(prev);
                           // This is tricky for toast, we'll handle toast inside toggleUsed in HomePage
                           return next;
                         });
                      } else {
                        setUsedTopics(val);
                      }
                    }}
                    onUsedToggle={(id, isUsed) => {
                      showToast(isUsed ? '已标记为已发布' : '已取消发布状态');
                    }}
                    onQuickGenerate={handleQuickGenerate}
                    onRegenerateFromRecord={handleRegenerateFromRecord}
                    showToast={showToast}
                  />
              ) : (
                <DetailPage 
                  topic={selectedTopic} 
                  onBack={() => setSelectedTopic(null)}
                  onGenerate={() => setIsGeneratorOpen(true)}
                  showToast={showToast}
                  prefs={getGenerationPrefs(selectedTopic.id)}
                  onPrefsChange={(next) => updateGenerationPrefs(selectedTopic.id, next)}
                  isFavorite={favorites.has(selectedTopic.id)}
                  onToggleFavorite={() => {
                    toggleFavorite(selectedTopic.id);
                    showToast(favorites.has(selectedTopic.id) ? '已从库存档移除' : '已加入库存档');
                  }}
                />
              )}
            </motion.div>
          )}

          {activePage === 'settings' && (
            <motion.div key="settings" className="h-full">
              <SettingsPage
                onBackHome={() => setActivePage('home')}
                showToast={showToast}
                digestEmail={digestEmail}
                setDigestEmail={setDigestEmail}
                digestEnabled={digestEnabled}
                setDigestEnabled={setDigestEnabled}
                digestPreference={digestPreference}
                setDigestPreference={setDigestPreference}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {isGeneratorOpen && selectedTopic && (
          <GenerationPanel 
            topic={selectedTopic} 
            onClose={() => setIsGeneratorOpen(false)} 
            onFinish={markProcessed}
            showToast={showToast}
            prefs={getGenerationPrefs(selectedTopic.id)}
            onPrefsChange={(next) => updateGenerationPrefs(selectedTopic.id, next)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
