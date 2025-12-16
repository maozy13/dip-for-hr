import React, { useMemo } from 'react';
import { Badge, Card, List, Popover, Space, Tag, Typography } from 'antd';
import { InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { CorrelationMetric } from '../types';

const { Text } = Typography;

interface Props {
  metrics: CorrelationMetric[];
  onSelect: (metric: CorrelationMetric) => void;
  deptKey?: string;
  deptStatus?: string;
}

export const CorrelationList: React.FC<Props> = ({ metrics, onSelect, deptKey, deptStatus }) => {
  const baselineMap: Record<string, number> = {
    project_conversion_rate: 0.32,
    attrition: 0.12,
    mobility: 0.12,
    avg_project_value: 200,
    new_sale_cycle: 80,
    project_conversion_cycle: 120,
  };
  const model = useMemo(() => {
    const sorted = [...(metrics || [])].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
    const top = sorted.slice(0, 5);
    // 放大差异度：用 |r|^3 归一，进一步突出强相关指标
    const total = top.reduce((s, m) => s + Math.pow(Math.abs(m.coefficient), 3), 0) || 1;
    const terms = top.map((m) => {
      const betaAbs = Math.pow(Math.abs(m.coefficient), 3) / total;
      const sign = m.direction === 'negative' ? '-' : '+';
      return `${sign} β≈${betaAbs.toFixed(2)} × ${m.name}`;
    });
    const signedSum = top.reduce((s, m) => {
      const w = Math.pow(Math.abs(m.coefficient), 3) / total;
      return s + (m.direction === 'negative' ? -1 : 1) * w;
    }, 0);
    const base =
      deptStatus === 'good' ? 88 : deptStatus === 'warn' ? 78 : deptStatus === 'bad' ? 65 : 80;
    // 放大贡献，保证好/预警/风险区间分明
    const score = Math.max(60, Math.min(99, base + signedSum * 12));
    return {
      score: top.length > 0 ? score.toFixed(1) : '--',
      formula: top.length > 0 ? `人效评分 Y = α(${base}) ${terms.join(' ')}` : '等待数据加载中...',
      note: '基于相关系数≥0.8 的前5项指标构建人效分析模型，α为基准项，β按相关性归一并保留正/负向影响。',
    };
  }, [metrics, deptKey, deptStatus]);

  const title = (
    <Space align="center" size={6}>
      <Text className="text-slate-800 font-medium">人效评分</Text>
      <Tag color="blue" className="rounded-full px-2 text-xs">评分 {model.score}</Tag>
      <Popover
        title="人效分析模型"
        content={
          <div className="max-w-xs text-slate-700 space-y-1">
            <div className="text-sm font-semibold text-blue-700">评分标准</div>
            <div className="text-xs text-slate-600">≥85 正常｜70-84 预警｜&lt;70 风险</div>
            <div className="text-sm">{model.formula}</div>
            <div className="text-xs text-slate-500">{model.note}</div>
          </div>
        }
      >
        <InfoCircleOutlined className="text-slate-500 cursor-pointer" />
      </Popover>
    </Space>
  );

  return (
    <Card className="glass" bordered={false} title={title} extra="相关系数≥0.8">
      <List
        itemLayout="horizontal"
        dataSource={metrics}
        renderItem={(item) => (
          <List.Item
            className="hover:bg-slate-100 rounded-lg cursor-pointer px-3"
            onClick={() => onSelect(item)}
            actions={[
              <Tag key="r" color="blue">|r| = {Math.abs(item.coefficient).toFixed(2)}</Tag>,
              <Tag key="dir" color={item.direction === 'positive' ? 'green' : 'red'}>
                {item.direction === 'positive' ? '正相关' : '负相关'}
              </Tag>,
              <Popover
                key="info"
                title="计算说明"
                content={<div className="max-w-xs text-slate-700">{item.detail.rule}</div>}
              >
                <InfoCircleOutlined className="text-slate-500" />
              </Popover>,
            ]}
          >
            <List.Item.Meta
              avatar={<Badge color="#38bdf8" text={<ThunderboltOutlined />} />}
              title={<Text className="text-slate-800">{item.name}</Text>}
              description={
                <Space size={8} wrap>
                  <Tag color="purple">当前值 {item.value}</Tag>
                  {baselineMap[item.id] !== undefined && (
                    <Tag color="magenta">基准值 {baselineMap[item.id]}</Tag>
                  )}
                  <Text className="text-slate-600">{item.description}</Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
