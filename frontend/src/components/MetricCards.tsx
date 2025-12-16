import React from 'react';
import { Card, Col, Row, Space, Tag, Typography } from 'antd';
import { CaretUpOutlined, CaretDownOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { MetricSummary } from '../types';

const { Text, Title } = Typography;

interface Props {
  metrics: MetricSummary[];
  onSelect: (metric: MetricSummary) => void;
}

const TrendIcon: React.FC<{ trend: MetricSummary['trend'] }> = ({ trend }) => {
  if (trend === 'up') return <CaretUpOutlined className="text-green-400" />;
  if (trend === 'down') return <CaretDownOutlined className="text-red-400" />;
  return <FieldTimeOutlined className="text-slate-400" />;
};

export const MetricCards: React.FC<Props> = ({ metrics, onSelect }) => {
  return (
    <Row gutter={16}>
      {metrics.map((metric) => (
        <Col span={8} key={metric.id}>
          <Card
            className="glass cursor-pointer transition-transform duration-200 hover:-translate-y-1"
            onClick={() => onSelect(metric)}
            bordered={false}
            style={{ height: '100%' }}
          >
            <Space direction="vertical" size={6} className="w-full">
              <Text className="text-slate-600">{metric.name}</Text>
              <Space align="baseline" size={8}>
                <Title level={2} className="!m-0 text-slate-800">
                  {metric.value}
                  <span className="text-base text-slate-500 ml-1">{metric.unit}</span>
                </Title>
                <Tag color={metric.yoy >= 0 ? 'green' : 'red'} className="rounded-full px-3">
                  <TrendIcon trend={metric.trend} />
                  <span className="ml-1">{metric.yoy >= 0 ? '+' : ''}
                  {(metric.yoy * 100).toFixed(1)}%</span>
                </Tag>
              </Space>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>基准 {metric.detail.baseline}</span>
                <span>达成率 {(metric.detail.attainment * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(100, Math.abs(metric.detail.attainment * 100))}%` }}
                />
              </div>
              <Text className="text-slate-500 text-sm">点击查看指标计算规则和趋势</Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};
