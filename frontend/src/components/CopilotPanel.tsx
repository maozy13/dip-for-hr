import React from 'react';
import { Card, Divider, Empty, Tag, Typography } from 'antd';
import { CopilotContent } from '../types';

const { Title, Text } = Typography;

interface Props {
  content?: CopilotContent;
}

export const CopilotPanel: React.FC<Props> = ({ content }) => {
  return (
    <Card
      className="glass h-full"
      bordered={false}
      title={<span className="text-cyan-300">Copilot</span>}
      extra={<Tag color="cyan">AI 助手</Tag>}
    >
      {!content ? (
        <Empty description="选择指标或关联项，查看计算规则与趋势" />
      ) : (
        <div className="space-y-3">
          <div>
            <Title level={4} className="!m-0 text-slate-50">
              {content.title}
            </Title>
            <Text className="text-slate-300">{content.summary}</Text>
          </div>
          {content.rule && (
            <>
              <Divider className="my-2" />
              <div>
                <Text className="text-slate-400">计算规则</Text>
                <div className="text-slate-100 mt-1">{content.rule}</div>
              </div>
            </>
          )}
          {content.baseline !== undefined && (
            <div className="flex items-center gap-2">
              <Tag color="blue">基准值 {content.baseline}</Tag>
              {content.attainment !== undefined && (
                <Tag color={content.attainment >= 1 ? 'green' : 'red'}>
                  达成率 {(content.attainment * 100).toFixed(1)}%
                </Tag>
              )}
            </div>
          )}
          {content.history && (
            <div>
              <Text className="text-slate-400">趋势</Text>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {content.history.map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-800 px-2 py-2 text-center">
                    <div className="text-xs text-slate-400">{item.label}</div>
                    <div className="text-slate-100 font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
