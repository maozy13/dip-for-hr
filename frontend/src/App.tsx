import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Layout, List, message, Space, Spin, Typography, Collapse, Modal } from 'antd';
import { SendOutlined, SearchOutlined } from '@ant-design/icons';
import { MetricCards } from './components/MetricCards';
import { OrgTree } from './components/OrgTree';
import { CorrelationList } from './components/CorrelationList';
import {
  CorrelationMetric,
  CopilotContent,
  CopilotMessage,
  MetricSummary,
  OrgNode,
} from './types';
import {
  fetchCorrelations,
  fetchOrg,
  fetchSummary,
  searchDepartments,
} from './api/client';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const buildMetricHistory = (metric: MetricSummary) => {
  const raw = metric.detail?.history || [];
  let history = [...raw];

  // 若后端提供>=12个月，直接用，并确保末值与卡片一致
  if (history.length >= 12) {
    history = history.slice(-12).map((h) => ({
      ...h,
      value: h.ratio ?? h.value,
      ratio: h.ratio ?? h.value,
    }));
    const lastIdx = history.length - 1;
    if (metric.value && history[lastIdx].value !== metric.value) {
      history[lastIdx] = { ...history[lastIdx], value: metric.value, ratio: metric.value };
    }
  } else {
    // 不足12个月则补齐，但保持末值与卡片一致
    const now = new Date();
    const months = Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      return `${d.getMonth() + 1}月`;
    });
    const base = metric.value || raw[raw.length - 1]?.value || 10;
    const isDown = metric.trend === 'down';
    history = months.map((label, idx) => {
      const progress = idx / 11;
      const drift = isDown ? -0.08 * progress : 0.05 * progress;
      const noise = Math.sin((idx + 1) / 3) * 0.02;
      const value = Number((base * (1 + drift + noise)).toFixed(1));
      return { label, value, ratio: value };
    });
    const lastIdx = history.length - 1;
    const factor = history[lastIdx].value ? metric.value / history[lastIdx].value : 1;
    history = history.map((h, idx) =>
      idx === lastIdx
        ? { ...h, value: metric.value, ratio: metric.value }
        : { ...h, value: Number((h.value * factor).toFixed(1)), ratio: Number((h.value * factor).toFixed(1)) },
    );
  }

  const tail = history.slice(-3).map((h) => h.value);
  const isTailDown = tail[0] > tail[1] && tail[1] > tail[2];
  const isTailUp = tail[0] < tail[1] && tail[1] < tail[2];
  let trendNote = '';
  if (isTailDown) trendNote = '连续三个月下降，需要关注转化链路表现。';
  if (isTailUp) trendNote = '连续三个月上升，可总结经验巩固优势。';
  return { history, trendNote };
};

const buildDeptHistory = (node: OrgNode) => {
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
    return `${d.getMonth() + 1}月`;
  });
  const base =
    node.value ||
    node.detail?.history?.[node.detail.history.length - 1]?.value ||
    node.baseline ||
    10;
  const trendDown = node.status !== 'good';
  const history = months.map((label, idx) => {
    const progress = idx / 11;
    const drift = trendDown ? -0.1 * progress : 0.06 * progress;
    const noise = Math.sin((idx + 1) / 2.5) * 0.02;
    const value = Number((base * (1 + drift + noise)).toFixed(1));
    return { label, value };
  });
  if (trendDown) {
    history[9].value = Number((history[8].value * 0.97).toFixed(1));
    history[10].value = Number((history[9].value * 0.97).toFixed(1));
    history[11].value = Number((history[10].value * 0.97).toFixed(1));
  } else {
    history[9].value = Number((history[8].value * 1.01).toFixed(1));
    history[10].value = Number((history[9].value * 1.01).toFixed(1));
    history[11].value = Number((history[10].value * 1.01).toFixed(1));
  }
  const tail = history.slice(-3).map((h) => h.value);
  const isTailDown = tail[0] > tail[1] && tail[1] > tail[2];
  const isTailUp = tail[0] < tail[1] && tail[1] < tail[2];
  let trendNote = '';
  if (isTailDown) trendNote = '连续两月下降，需关注转化链路表现。';
  if (isTailUp) trendNote = '连续两月上升，可总结经验巩固优势。';
  return { history, trendNote };
};

const buildCopilotFromMetric = (metric: MetricSummary): CopilotContent => {
  const { history, trendNote } = buildMetricHistory(metric);
  const yoyText = `${metric.yoy >= 0 ? '+' : ''}${(metric.yoy * 100).toFixed(1)}%`;
  const baseSummary = `${metric.name} 当前值 ${metric.value}${metric.unit}，同比 ${yoyText}。近12个月趋势已更新。`;
  const summary = trendNote ? `${baseSummary} ${trendNote}` : baseSummary;

  return {
    title: metric.name,
    summary,
    rule: metric.detail.rule,
    baseline: metric.detail.baseline,
    attainment: metric.detail.attainment,
    history,
    statusSummary: trendNote || '趋势平稳，可继续观察。',
    rootCause: `当前变化受收入与人力成本双因素驱动，请关注收入侧大单兑现与成本侧编制/缺勤。`,
    actions: [
      '关注当月大单进展并锁定关键节点',
      '复盘人力成本结构，评估是否存在低产出人力',
    ],
  };
};

const buildCopilotFromCorrelation = (metric: CorrelationMetric): CopilotContent => ({
  title: metric.name,
  summary: (() => {
    const base = `${metric.name} 与人效指标呈 ${
      metric.direction === 'positive' ? '正相关' : '负相关'
    }，|r|=${Math.abs(metric.coefficient).toFixed(2)}。`;
    if (metric.name.includes('项目转化率')) {
      return `${base} 过去半年，项目转化率与人均产出的正相关系数达到 ${Math.abs(
        metric.coefficient,
      ).toFixed(2)}。华南大区转化率低于其他区域，可能是该部门产出下降的核心原因之一。`;
    }
    return base;
  })(),
  rule: metric.detail.rule,
  history: (() => {
    if (metric.name.includes('项目转化率')) {
      const months = Array.from({ length: 12 }).map((_, idx) => {
        const d = new Date();
        const m = new Date(d.getFullYear(), d.getMonth() - (11 - idx), 1);
        return `${m.getMonth() + 1}月`;
      });
      const base = metric.value || 0.72;
      return months.map((label, idx) => {
        const drift = -0.02 * (idx / 11);
        const value = Number((base * (1 + drift)).toFixed(3));
        return { label, value, ratio: value };
      });
    }
    return metric.detail.breakdown.map((item) => ({
      label: item.label,
      value: item.value,
      ratio: item.label.includes('率') ? item.value : undefined,
    }));
  })(),
  statusSummary:
    metric.direction === 'positive'
      ? '提升该指标有助于人效改善，请关注覆盖度与执行节奏。'
      : '该指标上升可能拖累人效，需要尽量压降或稳定。',
  rootCause:
    metric.direction === 'positive'
      ? '相关性显示该指标与人效同向变化，可能通过效率或产出提升驱动。'
      : '相关性显示该指标与人效反向变化，可能因成本、流失或缺勤等因素影响。',
  actions:
    metric.direction === 'positive'
      ? ['提高关键指标覆盖率或完成率', '设定阶段性目标并跟进执行']
      : ['识别主因并制定压降计划', '设置预警阈值，超阈值及时干预'],
});

const renderCopilotText = (c: CopilotContent, sourceLabel?: string): string => {
  const lines: string[] = [];
  // 对默认 Copilot 提示做精简展示
  if (c.title === 'Copilot' && !sourceLabel) {
    lines.push(c.summary || '我可以解释指标/计算规则，解读趋势，做根因分析并给出行动建议。');
    return lines.join('\n');
  }
  if (sourceLabel) lines.push(`【${sourceLabel}】${c.title}`);
  lines.push(`一、概览：`);
  if (!sourceLabel) lines.push(`- ${c.title}`);
  if (c.summary) lines.push(`- ${c.summary}`);
  if (c.rule) lines.push(`- 计算规则：${c.rule}`);
  if (c.baseline !== undefined) {
    const attainment =
      c.attainment !== undefined ? `，达成率 ${(c.attainment * 100).toFixed(1)}%` : '';
    lines.push(`- 基准值 ${c.baseline}${attainment}`);
  }
  if (c.statusSummary || c.rootCause) {
    lines.push('\n二、现状与根因：');
    if (c.statusSummary) lines.push(`1）${c.statusSummary}`);
    if (c.rootCause) lines.push(`2）${c.rootCause}`);
  }
  if (c.actions && c.actions.length > 0) {
    lines.push('\n三、行动建议：');
    c.actions.forEach((a, idx) => lines.push(`${idx + 1}）${a}`));
  }
  return lines.join('\n');
};

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'analysis'>('landing');
  const [summary, setSummary] = useState<MetricSummary[]>([]);
  const [orgTree, setOrgTree] = useState<OrgNode | undefined>();
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [correlations, setCorrelations] = useState<CorrelationMetric[]>([]);
  const [copilotContent, setCopilotContent] = useState<CopilotContent | undefined>();
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([]);
  const [chatEndRef] = useState(() => React.createRef<HTMLDivElement>());
  const [historySessions, setHistorySessions] = useState<
    Record<string, { id: string; timestamp: number; messages: CopilotMessage[]; title: string }[]>
  >({});
  const [historyDetail, setHistoryDetail] = useState<
    { id: string; timestamp: number; messages: CopilotMessage[]; title: string } | null
  >(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string>('manual');
  const [currentOrgName, setCurrentOrgName] = useState<string>('');
  const [input, setInput] = useState('');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const selectedNode = useMemo(() => {
    if (!orgTree || !selectedDept) return undefined;
    const stack: OrgNode[] = [orgTree];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.id === selectedDept) return cur;
      (cur.children || []).forEach((c) => stack.push(c));
    }
    return undefined;
  }, [orgTree, selectedDept]);
  const streamAssistant = (text: string) => {
    const id = `${Date.now()}-assistant`;
    const ts = Date.now();
    const step = Math.max(3, Math.floor(text.length / 120));
    setCopilotMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: ts }]);
    let idx = 0;
    const timer = setInterval(() => {
      idx = Math.min(text.length, idx + step);
      setCopilotMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: text.slice(0, idx) } : m)),
      );
      if (idx >= text.length) clearInterval(timer);
    }, 80);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages, chatEndRef]);

  useEffect(() => {
    (async () => {
      try {
        const [summaryRes, orgRes] = await Promise.all([fetchSummary(), fetchOrg()]);
        setSummary(summaryRes.metrics);
        setOrgTree(orgRes.tree);
        setSelectedDept(summaryRes.defaultDeptId || orgRes.tree?.id || '');
      } catch (err) {
        message.error('加载数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDept) return;
    (async () => {
      try {
        const res = await fetchCorrelations(selectedDept);
        setCorrelations(res.metrics);
      } catch (err) {
        message.error('加载关联指标失败');
      }
    })();
  }, [selectedDept]);

  const handleMetricSelect = (metric: MetricSummary) => {
    setCurrentContext('kpi');
    setCurrentSessionId(`${Date.now()}-session`);
    const content = buildCopilotFromMetric(metric);
    setCopilotContent(content);
    setCopilotMessages([]);
    streamAssistant(renderCopilotText(content, 'KPI'));
    setCopilotOpen(true);
  };

  const handleCorrelationSelect = (metric: CorrelationMetric) => {
    setCurrentContext('correlation');
    setCurrentSessionId(`${Date.now()}-session`);
    const content = buildCopilotFromCorrelation(metric);
    setCopilotContent(content);
    setCopilotMessages([]);
    streamAssistant(renderCopilotText(content, '关联指标'));
    setCopilotOpen(true);
  };

  const handleNodeCopilot = (node: OrgNode) => {
    if (!node.detail) return;
    setCurrentContext('org');
    setCurrentSessionId(`${Date.now()}-session`);
    setCurrentOrgName(node.name);
    const { history, trendNote } = buildDeptHistory(node);
    const attainment =
      node.detail?.attainment || (node.baseline ? Number((node.value / node.baseline).toFixed(2)) : 1);
    const statusText =
      node.status === 'good' ? '高于基准' : node.status === 'warn' ? '略低于基准' : '低于基准20%以上';
    const current = `当前人效值 ${node.value}，基准 ${node.baseline}，达成率 ${(attainment * 100).toFixed(0)}%。`;
    const statusSummary = `${node.name}人均产出${trendNote ? trendNote.replace('，', '，') : '平稳'}状态 ${statusText}。`;
    let rootCause =
      node.detail.rootCause ||
      [
        `效率链路：${node.name} 转化率/客单价需提升。`,
        `稳定性链路：新人占比或流失率影响产出。`,
        `投入链路：成本稳定，激励需优化以拉动高绩效。`,
      ].join('\n');
    let actions =
      node.detail.actions && node.detail.actions.length > 0
        ? node.detail.actions
        : [
            '强化项目筛选机制与重点客户池。',
            '对新人提升培训频次，完善辅导周期。',
            '调整激励策略，提高高绩效者奖金占比。',
          ];

    if (node.id === 'south') {
      rootCause = [
        '效率→产出：项目转化率约下滑12%，高价值项目占比不足，直接压缩人均产出。',
        '稳定→效率：新人占比35%，离职率高于全公司，项目推进慢、转化周期长，团队稳定性弱。',
        '投入→产出：成本结构未调整，激励吸引力不足，单价/人力成本滞压，使整体投入产出比下滑。',
      ].join('\n');
      actions = [
        '提升效率：建立统一项目推进路径（需求确认→方案→商务→成交），周度攻坚TOP机会，提升转化率与客单价。',
        '稳住团队：优化人员结构，降低新人占比冲击；新人加速培养（90天快速成长计划），控制内部流动性。',
        '优化投入：重塑激励结构，单价/人力成本双挂钩；按投入产出比分层管控预算，向高效团队倾斜资源。',
      ];
    }
    const content: CopilotContent = {
      title: `${node.name} — ${node.leader}`,
      summary: `${current}${trendNote ? ` ${trendNote}` : ''}`,
      rule: node.detail.rule,
      baseline: node.detail.baseline,
      attainment,
      history,
      statusSummary: node.detail.statusSummary || statusSummary,
      rootCause,
      actions,
    };
    setCopilotContent(content);
    setCopilotMessages([]);
    streamAssistant(renderCopilotText(content, '部门'));
    setCopilotOpen(true);
  };

  const handleDeptSearch = async () => {
    const q = searchValue.trim();
    if (!q) return;
    try {
      const res = await searchDepartments(q);
      if (res.matchedDepartments.length === 0) {
        message.info('未找到匹配的部门');
        return;
      }
      setSelectedDept(res.matchedDepartments[0]);
    } catch {
      message.error('搜索失败，请稍后再试');
    }
  };

  const handleOpenCopilot = () => {
    const fallback: CopilotContent = {
      title: 'Copilot',
      summary: '我可以解释指标/计算规则，解读趋势，做根因分析并给出行动建议，也能回答与你的人力资本ROI相关的提问。',
    };
    const sessionId = `${Date.now()}-session`;
    setCurrentSessionId(sessionId);
    setCurrentContext('manual');
    setCopilotContent(fallback);
    setCopilotMessages([]);
    streamAssistant(renderCopilotText(fallback));
    setCopilotOpen(true);
  };

  const handleCloseCopilot = () => {
    const hasUserMsg = copilotMessages.some((m) => m.role === 'user');
    if (currentSessionId && hasUserMsg) {
      const firstUser = copilotMessages.find((m) => m.role === 'user');
      const first = firstUser || copilotMessages[0];
      const title = first ? first.content.slice(0, 30) : '会话';
      setHistorySessions((prev) => {
        const list = prev[currentContext] || [];
        return {
          ...prev,
          [currentContext]: [...list, { id: currentSessionId, timestamp: Date.now(), messages: copilotMessages, title }],
        };
      });
    }
    setCopilotOpen(false);
    setCopilotMessages([]);
    setCopilotContent(undefined);
    setCurrentSessionId(null);
  };

  const handleResumeHistory = (session: { id: string; timestamp: number; messages: CopilotMessage[]; title: string }) => {
    setCurrentSessionId(`${session.id}-resume-${Date.now()}`);
    setCopilotMessages(session.messages);
    setCopilotContent({
      title: 'Copilot',
      summary: '已载入历史会话，可继续对话。',
    });
    setCopilotOpen(true);
    setHistoryDetail(null);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (!copilotContent) {
        setCopilotContent({
          title: 'Copilot',
          summary: '我可以解释指标/计算规则，解读趋势，做根因分析并给出行动建议，也能回答与你的人力资本ROI相关的提问。',
        });
    }
    const userMsg: CopilotMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    let assistantText = `基于${copilotContent.title}，建议：${copilotContent.summary} 如需更多细节，请查看计算规则或历史趋势。`;
    if (currentContext === 'org' && currentOrgName.includes('华南')) {
      const isCompPlan = /薪酬|激励|方案/.test(text);
      if (isCompPlan) {
        assistantText = [
          `结合当前数据分析（华南大区转化率 0.72、相关系数 0.92，人均产出低于基准、连续下行），给出薪酬激励调整方案：`,
          '1. 短期（1-2 个月）：',
          '• 关键客户签单奖：对 TOP20 客户签单按成交额阶梯奖金（例：<200 万 1%，200-500 万 2%，>500 万 3%），当月兑现，聚焦提升转化率。',
          '• 新人冲刺包：入职 3 个月内新人首单奖励固定 3K-5K，叠加导师带教奖励，缩短首单周期。',
          '• 团队战役奖：周度小目标（立项→成交率环比提升 5% 即触发），以团队现金包或购物卡即时发放。',
          '2. 中期（1 季度）：',
          '• 客单价提升激励：高价值项目（>300 万）加成系数 1.5x，鼓励做大单；捆绑交叉销售套餐另行奖励。',
          '• 转化率联动提成：提成公式引入“签单额 × 转化率系数”（例：≥0.75 系数 1.05，0.65-0.75 系数 1.0，<0.65 系数 0.9），引导稳定提升转化率。',
          '• 关键角色保留：对 TOP 表现者设置留任奖励（按季度兑现 0.5-1 个月薪），锁定核心销售以稳住产出。',
          '3. 长期（半年+）：',
          '• 分级激励体系：按能力/业绩分层（A/B/C），A 层提成上限与年度奖金池占比更高，明确晋升与奖金挂钩。',
          '• 数据化考核：在提成结算中引入过程指标（有效商机数、推进时长），对拖期项目设置扣减，促成高质商机。',
          '• 股权/长期激励：连续 2 个季度达成率 ≥110% 的骨干给予年度期权或限制性股票，增强留存与动力。',
          '4. 管理与风控配套：',
          '• 每周复盘转化链路，透明披露转化率与奖金分布，避免“只看签约额、不看效率”。',
          '• 设立负向条款：恶意低价/无效立项不计入提成，确保激励与健康盈利挂钩。',
        ].join('\n');
      } else {
        assistantText = [
          `针对${currentOrgName}的行动方案：`,
          '**短期举措：**重点客户清单复盘、强化新人辅导、优化项目甄别流程。',
          '**中期举措：**针对价值型客户定制销售打法、提升项目平均价值（提高转化率和客单价）。',
          '**长期举措：**优化激励结构、建立数据化销售管理机制，持续跟踪转化率与人均产出。',
        ].join('\n');
      }
    }
    setCopilotMessages((prev) => [...prev, userMsg]);
    setTimeout(() => streamAssistant(assistantText), 2000);
    setInput('');
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (view === 'landing') {
    const appCards = [
      { id: 'talent', title: '人才洞察工作台', desc: '一站式数据可视平台', owner: 'admin' },
      { id: 'roi', title: '人力资本ROI分析', desc: '衡量人力投入与业务产出的关系，全面评估组织在人力资本上的回报。', owner: 'admin', action: () => setView('analysis') },
      { id: 'org_health', title: '组织健康度分析', desc: '基于组织结构、沟通效率、员工活力评估健康度', owner: 'admin' },
      { id: 'match', title: '人岗动态匹配分析', desc: '人岗画像匹配评估员工与岗位适配度', owner: 'admin' },
      { id: 'engage', title: '核心人才激励有效性', desc: '评估激励对人才产出与留存的作用', owner: 'admin' },
      { id: 'risk', title: '人员流失风险分析', desc: '多维模型识别流失风险，提前预警', owner: 'admin' },
    ];

    return (
      <div className="min-h-screen flex bg-gradient-to-br from-sky-50 via-white to-orange-50">
        <aside
          className="w-64 bg-white/90 border-r border-slate-200 flex flex-col px-6"
          style={{ paddingTop: '0px', paddingBottom: '12px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <img src="/icons/dip_logo.svg" alt="logo" className="w-40 h-32 object-contain" />
              <div className="text-slate-500 text-lg">☰</div>
            </div>
            <div className="flex flex-col space-y-3">
              <div className="text-slate-800 font-medium flex items-center gap-2 cursor-pointer">
                <img src="/icons/应用商店.svg" alt="应用商店" className="w-5 h-5" />
                <span>AI应用商店</span>
              </div>
              <div className="border-t border-slate-200" />
              <div className="text-slate-700 flex items-center gap-2 cursor-pointer">
                <img src="/icons/应用开发.svg" alt="应用开发" className="w-5 h-5" />
                <span>应用开发</span>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-4 space-y-6">
            <div className="text-slate-700 flex items-center gap-2 cursor-pointer">
              <img src="/icons/AI Data Platform.svg" alt="AI Data Platform" className="w-5 h-5" />
              <span>AI Data Platform</span>
            </div>
            <div className="text-slate-700 flex items-center gap-2 cursor-pointer">
              <img src="/icons/系统工作台.svg" alt="系统工作台" className="w-5 h-5" />
              <span>系统工作台</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center gap-2 text-slate-700">
              <img src="/icons/账号.svg" alt="账号" className="w-8 h-8 rounded-full" />
              <span className="text-sm">Maggie@aishu.cn</span>
            </div>
          </div>
        </aside>
        <div className="flex-1">
          <div
            className="sticky top-0 z-10 bg-gradient-to-br from-sky-50 via-white to-orange-50"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-end">
              <Button type="primary" size="large">
                新建应用
              </Button>
            </div>
            <div className="max-w-6xl mx-auto px-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Title level={1} className="!m-0 text-slate-900">
                    AI应用商店
                  </Title>
                  <Text className="text-slate-600">
                    查找具备专业能力的应用，帮你解决业务上的复杂问题
                  </Text>
                </div>
              </div>
              <div className="mt-4">
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="搜索应用"
                  size="large"
                  allowClear
                  className="max-w-3xl"
                />
              </div>
              <div className="flex items-center gap-4 text-slate-600 mt-4">
                {['全部', '人力资源', 'IT运维', '产品研发', '市场营销', '法律', '财务'].map((tab) => (
                  <button
                    key={tab}
                    className={`text-sm pb-1 border-b-2 ${
                      tab === '人力资源'
                        ? 'border-blue-600 text-blue-600 font-semibold'
                        : 'border-transparent hover:text-blue-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-8 pb-10">
            <div className="grid grid-cols-3 gap-4">
              {appCards.map((card) => (
                <div
                  key={card.id}
                  className="glass p-4 rounded-xl cursor-pointer hover:-translate-y-1 transition"
                  onClick={card.action}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg">
                      {card.title.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-slate-900 font-semibold">{card.title}</div>
                      <div className="text-slate-600 text-sm mt-1 line-clamp-2">{card.desc}</div>
                      <div className="text-slate-500 text-xs mt-2">创建者：{card.owner}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6fb', paddingTop: 0 }}>
      <Header
        className="bg-white/90 px-6 flex items-center justify-between shadow-sm sticky top-0 z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <Title level={4} className="!m-0 text-slate-800">
          人力资本ROI分析
        </Title>
        <Space>
          <Button onClick={() => setView('landing')}>返回应用商店</Button>
          <Button type="primary" onClick={handleOpenCopilot}>
            Copilot
          </Button>
        </Space>
      </Header>
      <Content className="p-6">
        <Space direction="vertical" size={16} className="w-full">
          <MetricCards metrics={summary} onSelect={handleMetricSelect} />
          <OrgTree
            data={orgTree}
            activeId={selectedDept}
            onSelect={(id) => setSelectedDept(id)}
            onOpenCopilot={handleNodeCopilot}
            overviewMetrics={summary}
          />
          <div className="flex items-center justify-between">
            <div className="text-slate-700 font-medium">人效关联指标</div>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索部门名称"
              style={{ width: 260 }}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={handleDeptSearch}
              allowClear
            />
          </div>
          <CorrelationList
            metrics={correlations}
            onSelect={handleCorrelationSelect}
            deptKey={selectedDept}
            deptStatus={selectedNode?.status}
          />
        </Space>
      </Content>
      <Drawer
        open={copilotOpen}
        onClose={handleCloseCopilot}
        title={<span className="text-blue-600">AI Copilot</span>}
        width={420}
        bodyStyle={{ background: '#f8fafc' }}
      >
        <div className="space-y-3 text-slate-800 h-full flex flex-col">
          <Title level={4} className="!m-0 text-slate-800">
            {copilotContent?.title || 'Copilot'}
          </Title>
          {copilotContent?.history && (
            <div className="space-y-2">
              <Text className="text-slate-600">趋势（折线）</Text>
              {(() => {
                const history = copilotContent.history || [];
                const values = history.map((h) => (h.ratio !== undefined ? h.ratio : h.value));
                const labels = history.map((h) => h.label);
                const width = 320;
                const height = 120;
                const min = Math.min(...values);
                const max = Math.max(...values);
                const gap = values.length > 1 ? width / (values.length - 1) : width;
                const scaleY = (v: number) =>
                  max === min ? height / 2 : height - ((v - min) / (max - min)) * height;
                const points = values.map((v, idx) => `${idx * gap},${scaleY(v)}`).join(' ');
                const last = values[values.length - 1] || 0;
                const prev = values[values.length - 2] || last;
                const first = values[0] || last;
                const mom = prev === 0 ? 0 : ((last - prev) / prev) * 100;
                const yoy = first === 0 ? 0 : ((last - first) / first) * 100;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-sm text-slate-600">
                        同比 {yoy >= 0 ? '+' : ''}
                        {yoy.toFixed(1)}%
                      </div>
                      <div className="text-sm text-slate-600">
                        环比 {mom >= 0 ? '+' : ''}
                        {mom.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-full overflow-hidden">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          points={points}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {values.map((v, idx) => (
                          <circle
                            key={idx}
                            cx={idx * gap}
                            cy={scaleY(v)}
                            r="3.5"
                            fill="#2563eb"
                            stroke="#fff"
                            strokeWidth="1"
                          />
                        ))}
                      </svg>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        {labels.map((l, idx) => (
                          <span key={l} className="w-full text-center">
                            {idx % 2 === 0 ? l : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex-1 overflow-auto rounded-lg bg-white border border-slate-200 px-3 py-2 shadow-sm">
            <List
              dataSource={copilotMessages}
              split={false}
              renderItem={(msg) => (
                <List.Item className="!px-0 !py-1">
                  <div
                    className={`w-full flex ${msg.role === 'user' ? 'justify-end text-right' : 'justify-start text-left'}`}
                  >
                  <div
                    className={`max-w-[320px] px-3 py-2 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 text-left'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    } shadow-sm`}
                  >
                    <div className="text-xs text-slate-500">{msg.role === 'user' ? '我' : 'Copilot'}</div>
                    <div className="whitespace-pre-wrap leading-relaxed mt-1 text-left">{msg.content}</div>
                  </div>
                </div>
                </List.Item>
              )}
            />
            {copilotMessages.length === 0 && (
              <div className="text-slate-500 text-sm mt-2">点击 KPI 卡片、组织节点或关联指标以查看分析。</div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="提问：指标定义、趋势解读、根因、行动建议"
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend}>
              发送
            </Button>
          </div>
          {(historySessions[currentContext] || []).length > 0 && (
            <Collapse ghost>
              <Collapse.Panel header="查看历史记录" key="history">
                <List
                  dataSource={historySessions[currentContext] || []}
                  split
                  renderItem={(session) => (
                    <List.Item className="!px-0" onClick={() => setHistoryDetail(session)}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-slate-700 truncate max-w-[200px]">{session.title}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(session.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
              </Collapse.Panel>
            </Collapse>
          )}
        </div>
      </Drawer>
      <Modal
        open={!!historyDetail}
        title="历史对话内容"
        onCancel={() => setHistoryDetail(null)}
        bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
        footer={
          <Space>
            <Button onClick={() => setHistoryDetail(null)}>关闭</Button>
            {historyDetail && (
              <Button type="primary" onClick={() => handleResumeHistory(historyDetail)}>
                继续对话
              </Button>
            )}
          </Space>
        }
      >
        {historyDetail && (
          <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
            <div className="text-xs text-slate-500 mb-2">
              {historyDetail.title} · {new Date(historyDetail.timestamp).toLocaleString()}
            </div>
            <List
              dataSource={historyDetail.messages}
              split
              renderItem={(msg) => (
                <List.Item>
                  <div className="w-full">
                    <div className="text-xs text-slate-500 mb-1">
                      {msg.role === 'user' ? '我' : 'Copilot'} · {new Date(msg.timestamp).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{msg.content}</div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default App;
