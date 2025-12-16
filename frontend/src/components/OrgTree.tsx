import React, { useMemo, useState } from 'react';
import { Button, Tag, Tooltip, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { MetricSummary, OrgNode } from '../types';

const { Text } = Typography;

const statusColors: Record<string, string> = {
  good: '#3CB371',
  warn: '#F59E0B',
  bad: '#F87171',
};

interface Props {
  data?: OrgNode;
  activeId?: string;
  onSelect: (id: string) => void;
  onOpenCopilot: (node: OrgNode) => void;
  overviewMetrics?: MetricSummary[];
}

interface LevelNode {
  node: OrgNode;
  depth: number;
}

export const OrgTree: React.FC<Props> = ({ data, activeId, onSelect, onOpenCopilot, overviewMetrics }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => (data ? new Set([data.id]) : new Set()));
  const rootId = data?.id;
  const overviewMap = useMemo(() => {
    const map: Record<string, MetricSummary> = {};
    (overviewMetrics || []).forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [overviewMetrics]);

  const levels = useMemo(() => {
    if (!data) return [];
    const result: LevelNode[][] = [];
    const dfs = (node: OrgNode, depth: number) => {
      if (!result[depth]) result[depth] = [];
      result[depth].push({ node, depth });
      if (expanded.has(node.id) && node.children) {
        node.children.forEach((child) => dfs(child, depth + 1));
      }
    };
    dfs(data, 0);
    return result;
  }, [data, expanded]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="glass p-4 rounded-xl h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <Text className="text-slate-800 font-medium">组织结构图</Text>
        <div className="text-xs text-slate-500 space-x-2">
          <span>🟥 低于基准值超过20%</span>
          <span>🟧 低于基准值20%以内</span>
          <span>🟩 大于等于基准值</span>
        </div>
      </div>
      {levels.length === 0 ? (
        <Text className="text-slate-500">暂无数据</Text>
      ) : (
        <div className="overflow-auto">
          <div className="min-w-full flex justify-center">
            <div className="flex gap-4">
              {levels.map((level, idx) => (
                <div key={idx} className="flex flex-col gap-3 min-w-[260px]">
                  <div className="text-xs text-slate-500 text-center">Level {idx + 1}</div>
                  {level.map(({ node }) => {
                    const hasChildren = (node.children?.length || 0) > 0;
                    const isExpanded = expanded.has(node.id);
                    const isActive = node.id === activeId;
                    const metricList =
                      node.metrics && node.metrics.length > 0
                        ? node.metrics.map((m) => {
                            if (rootId && node.id === rootId) {
                              const override = overviewMap[m.id];
                              return override
                                ? { ...m, value: override.value, unit: override.unit }
                                : m;
                            }
                            return m;
                          })
                        : [{ id: 'value', name: '当前人效', value: node.value, unit: '' }];
                    const tooltipContent = (
                      <div className="text-white text-xs space-y-1">
                        <div>人员规模：{node.headcount ?? 30}</div>
                        {metricList.map((m) => (
                          <div key={m.id}>
                            {m.name}：{m.value}
                            {m.unit}
                          </div>
                        ))}
                      </div>
                    );
                    return (
                      <Tooltip
                        key={node.id}
                        title={tooltipContent}
                        placement="right"
                        color="#0f172a"
                        overlayInnerStyle={{ background: '#0f172a', borderRadius: 8, color: '#fff' }}
                      >
                        <div
                          className={`glass border border-white/10 rounded-lg px-4 py-3 transition-transform duration-150 ${
                            isActive ? 'ring-2 ring-cyan-400/60' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                onSelect(node.id);
                                onOpenCopilot(node);
                              }}
                            >
                              <div className="text-slate-800 font-medium">{node.name}</div>
                              <div className="text-xs text-slate-600 mt-0.5">负责人：{node.leader}</div>
                              <div className="text-xs text-slate-600 mt-1">
                                当前 {node.value} / 基准 {node.baseline}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Tag color={statusColors[node.status]} className="rounded-full px-2 py-1 text-xs">
                                ●
                              </Tag>
                              {hasChildren && (
                                <Button
                                  size="small"
                                  type="text"
                                  icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                                  onClick={() => toggleExpand(node.id)}
                                >
                                  {isExpanded ? '收起' : '展开'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
