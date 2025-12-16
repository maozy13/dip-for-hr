from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from typing import Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@dataclass
class MetricDetail:
    rule: str
    baseline: float
    attainment: float
    history: List[dict]


@dataclass
class MetricSummary:
    id: str
    name: str
    value: float
    unit: str
    yoy: float
    trend: str
    detail: MetricDetail


summary_metrics: List[MetricSummary] = [
    MetricSummary(
        id="revenue_per_cost",
        name="万元人力成本销售收入",
        value=12.8,
        unit="万元",
        yoy=0.078,
        trend="up",
        detail=MetricDetail(
            rule="（销售收入 ÷ 人力成本） / 10000",
            baseline=12.0,
            attainment=1.07,
            history=[
                {"label": "1月", "value": 11.9},
                {"label": "2月", "value": 12.0},
                {"label": "3月", "value": 12.1},
                {"label": "4月", "value": 12.0},
                {"label": "5月", "value": 12.2},
                {"label": "6月", "value": 12.3},
                {"label": "7月", "value": 12.4},
                {"label": "8月", "value": 12.5},
                {"label": "9月", "value": 12.6},
                {"label": "10月", "value": 12.6},
                {"label": "11月", "value": 12.7},
                {"label": "12月", "value": 12.8},
            ],
        ),
    ),
    MetricSummary(
        id="per_capita_sales",
        name="人均销售额",
        value=576,
        unit="万元",
        yoy=0.056,
        trend="up",
        detail=MetricDetail(
            rule="销售总收入 ÷ 在岗销售人数",
            baseline=550,
            attainment=1.05,
            history=[
                {"label": "1月", "value": 546},
                {"label": "2月", "value": 548},
                {"label": "3月", "value": 550},
                {"label": "4月", "value": 552},
                {"label": "5月", "value": 554},
                {"label": "6月", "value": 556},
                {"label": "7月", "value": 558},
                {"label": "8月", "value": 560},
                {"label": "9月", "value": 564},
                {"label": "10月", "value": 568},
                {"label": "11月", "value": 572},
                {"label": "12月", "value": 576},
            ],
        ),
    ),
    MetricSummary(
        id="per_capita_cost",
        name="人均人力成本",
        value=45,
        unit="万元",
        yoy=-0.022,
        trend="down",
        detail=MetricDetail(
            rule="人力成本总额 ÷ 在岗销售人数",
            baseline=46,
            attainment=0.98,
            history=[
                {"label": "1月", "value": 46.0},
                {"label": "2月", "value": 45.9},
                {"label": "3月", "value": 45.8},
                {"label": "4月", "value": 45.6},
                {"label": "5月", "value": 45.5},
                {"label": "6月", "value": 45.3},
                {"label": "7月", "value": 45.2},
                {"label": "8月", "value": 45.2},
                {"label": "9月", "value": 45.1},
                {"label": "10月", "value": 45.0},
                {"label": "11月", "value": 45.0},
                {"label": "12月", "value": 45.0},
            ],
        ),
    ),
]

org_tree = {
    "id": "hq",
    "name": "全国销售中心",
    "leader": "陈一舟",
    "headcount": 0,  # 将在下方自动汇总
    "status": "good",
    "baseline": 12.0,
    "value": 13.1,
    "metrics": [
        {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": 12.8, "unit": "万元"},
        {"id": "per_capita_sales", "name": "人均销售额", "value": 576, "unit": "万元"},
        {"id": "per_capita_cost", "name": "人均人力成本", "value": 45, "unit": "万元"},
    ],
    "detail": {
        "rule": "整体销售中心人效 = 销售收入 / 人力成本",
        "baseline": 12.0,
        "attainment": 1.09,
        "history": [
            {"label": "7月", "value": 11.8},
            {"label": "8月", "value": 12.6},
            {"label": "9月", "value": 13.1},
        ],
        "statusSummary": "整体人效高于基准 9%，北区拉动明显，南区拖累。南区下滑导致波动，但总部和北区的正向表现仍维持整体达成率 >100%。",
        "rootCause": "华南大区销售收入下滑且人力成本刚性，缺勤率与流失率抬升；苏杭事业部大单延迟导致华东承压。",
        "actions": [
            "对华南和苏杭成立攻坚小组，逐单推进 TOP 客户，周度复盘进度",
            "暂停南区非关键岗位补员，优化费用结构，联动 HRBP 管控缺勤率",
            "将北区/上海成熟打法训练复制到南区与苏杭，加速新人 ramp 与转正",
        ],
    },
    "children": [
        {
            "id": "east",
            "name": "华东大区",
            "leader": "王悦",
            "headcount": 0,
            "status": "warn",
            "baseline": 12.0,
            "value": 0,
            "metrics": [],
            "detail": {
                "rule": "大区人效 = 销售收入 / 人力成本（华东口径）",
                "baseline": 12.0,
                "attainment": 0.91,
                "history": [
                    {"label": "7月", "value": 10.8},
                    {"label": "8月", "value": 10.5},
                    {"label": "9月", "value": 10.2},
                ],
                "statusSummary": "略低于基准，连续三个月下行。苏杭事业部拖累，上海贡献正向但未能抵消。",
                "rootCause": "苏杭事业部大单延迟签约，收入未达预期；新人转正慢导致人力成本产出偏低。",
                "actions": [
                    "为苏杭设立 TOP 客户冲刺清单，日跟进签约节奏，区总亲自跟进",
                    "对新人设置 30/60/90 天节点辅导，加速转正；对低绩效人员实施 PIP",
                    "提升区域销售激励，叠加阶段性奖金以拉动短期签约",
                ],
            },
            "children": [
                {
                    "id": "east-a",
                    "name": "上海事业部",
                    "leader": "刘畅",
                    "headcount": 40,
                    "status": "good",
                    "baseline": 12.2,
                    "value": 12.5,
                    "metrics": [
                        {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": 12.5, "unit": "万元"},
                        {"id": "per_capita_sales", "name": "人均销售额", "value": 590, "unit": "万元"},
                        {"id": "per_capita_cost", "name": "人均人力成本", "value": 44, "unit": "万元"},
                    ],
                    "detail": {
                        "rule": "事业部人效 = 销售收入 / 人力成本（上海）",
                        "baseline": 12.2,
                        "attainment": 1.02,
                        "history": [
                            {"label": "7月", "value": 11.9},
                            {"label": "8月", "value": 12.2},
                            {"label": "9月", "value": 12.5},
                        ],
                        "statusSummary": "稳定高于基准，贡献正向，趋势向上。",
                        "rootCause": "成熟团队，续签稳定，流失率低；新人跟单周期短。",
                        "actions": [
                            "复制上海续签打法与客户分层管理 SOP 至苏杭和南区",
                            "保持核心销售保留激励，确保低流失率",
                        ],
                    },
                },
                {
                    "id": "east-b",
                    "name": "苏杭事业部",
                    "leader": "宋怡",
                    "headcount": 30,
                    "status": "bad",
                    "baseline": 11.8,
                    "value": 8.6,
                    "metrics": [
                        {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": 8.6, "unit": "万元"},
                        {"id": "per_capita_sales", "name": "人均销售额", "value": 460, "unit": "万元"},
                        {"id": "per_capita_cost", "name": "人均人力成本", "value": 50, "unit": "万元"},
                    ],
                    "detail": {
                        "rule": "事业部人效 = 销售收入 / 人力成本（苏杭）",
                        "baseline": 11.8,
                        "attainment": 0.73,
                        "history": [
                            {"label": "7月", "value": 9.4},
                            {"label": "8月", "value": 8.9},
                            {"label": "9月", "value": 8.6},
                        ],
                        "statusSummary": "低于基准 22%，下行明显，连续三月低于基准。",
                        "rootCause": "TOP 客户延迟签单，新人转正慢；销售流失后补员导致人力成本刚性。",
                        "actions": [
                            "成立攻坚小组推进 TOP 客户签约，设置逐单负责人与时间表",
                            "加速新人转正，设置 60/90 天必达指标；低绩效快速退出",
                            "临时冻结非关键补员，控制人力成本，聚焦高潜客户",
                        ],
                    },
                },
            ],
        },
        {
            "id": "north",
            "name": "华北大区",
            "leader": "李强",
            "headcount": 60,
            "status": "good",
            "baseline": 12.2,
            "value": 0,
            "metrics": [],
            "detail": {
                "rule": "大区人效 = 销售收入 / 人力成本（华北）",
                "baseline": 12.2,
                "attainment": 1.06,
                "history": [
                    {"label": "7月", "value": 11.4},
                    {"label": "8月", "value": 11.9},
                    {"label": "9月", "value": 12.4},
                ],
                "statusSummary": "高于基准 13%，持续向上，对整体贡献最大。",
                "rootCause": "京津事业部大单兑现，续签能力强，流失率低，新人 ramp 快。",
                "actions": [
                    "继续深耕大客户，保持续签与扩单节奏",
                    "将京津大客户打法和新人培养 SOP 复制到南区与苏杭",
                ],
            },
            "children": [
                {
                    "id": "north-a",
                    "name": "京津事业部",
                    "leader": "赵晨",
                    "headcount": 60,
                    "status": "good",
                    "baseline": 12.3,
                    "value": 12.9,
                    "metrics": [
                        {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": 12.9, "unit": "万元"},
                        {"id": "per_capita_sales", "name": "人均销售额", "value": 600, "unit": "万元"},
                        {"id": "per_capita_cost", "name": "人均人力成本", "value": 42, "unit": "万元"},
                    ],
                    "detail": {
                        "rule": "事业部人效 = 销售收入 / 人力成本（京津）",
                        "baseline": 12.3,
                        "attainment": 1.05,
                        "history": [
                            {"label": "7月", "value": 12.1},
                            {"label": "8月", "value": 12.5},
                            {"label": "9月", "value": 12.9},
                        ],
                        "statusSummary": "高于基准 17%，表现最优，趋势稳步上升。",
                        "rootCause": "老销售续签贡献大，新人 ramp 快，团队稳定。",
                        "actions": [
                            "输出新人培养与跟单 SOP 给低绩效事业部",
                            "对 TOP 团队给予留才奖励，保持团队稳定",
                        ],
                    },
                }
            ],
        },
        {
            "id": "south",
            "name": "华南大区",
            "leader": "张蕾",
            "headcount": 50,
            "status": "bad",
            "baseline": 11.2,
            "value": 0,
            "metrics": [],
            "detail": {
                "rule": "大区人效 = 销售收入 / 人力成本（华南）",
                "baseline": 11.2,
                "attainment": 0.79,
                "history": [
                    {"label": "7月", "value": 9.8},
                    {"label": "8月", "value": 9.2},
                    {"label": "9月", "value": 8.9},
                ],
                "statusSummary": "低于基准 21%，呈下降趋势，对整体拖累最大。",
                "rootCause": "大客户流失，新签不足，缺勤率高；新人转正慢导致产出不足。",
                "actions": [
                    "抢救流失大客户，制定挽回方案并设定 2 周节点检查",
                    "降低缺勤率，强化考勤与绩效联动，必要时调整人员",
                    "暂停非核心岗位补员，控制成本，集中资源在高潜机会",
                ],
            },
            "children": [
                {
                    "id": "south-a",
                    "name": "深圳事业部",
                    "leader": "陈鹏",
                    "headcount": 50,
                    "status": "warn",
                    "baseline": 11.0,
                    "value": 10.0,
                    "metrics": [
                        {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": 10.0, "unit": "万元"},
                        {"id": "per_capita_sales", "name": "人均销售额", "value": 500, "unit": "万元"},
                        {"id": "per_capita_cost", "name": "人均人力成本", "value": 48, "unit": "万元"},
                    ],
                    "detail": {
                        "rule": "事业部人效 = 销售收入 / 人力成本（深圳）",
                        "baseline": 11.0,
                        "attainment": 0.91,
                        "history": [
                            {"label": "7月", "value": 10.4},
                            {"label": "8月", "value": 10.1},
                            {"label": "9月", "value": 10.0},
                        ],
                        "statusSummary": "当前 10，基准 11，状态略低于基准，趋势平缓。",
                        "rootCause": "新人 ramp 慢，签约周期长，部分机会停滞。",
                        "actions": [
                            "缩短签约周期：为 TOP 机会设定逐周里程碑，区总督办",
                            "新人配对导师制，周复盘，明确 30/60/90 天转正指标",
                            "阶段性激励叠加，鼓励快速拿单，改善人效",
                        ],
                    },
                }
            ],
        },
    ],
}

def aggregate_org(node: dict) -> dict:
    """
    汇总子节点的人数与人效指标（加权平均），并回填到当前节点。
    """
    children = node.get("children", []) or []
    if not children:
        # 叶子节点已有 headcount 和 metrics
        if node.get("metrics"):
            # 确保 value 与指标一致
            for m in node["metrics"]:
                if m["id"] == "revenue_per_cost":
                    node["value"] = m["value"]
        return {
            "headcount": node.get("headcount", 0),
            "metrics": {m["id"]: (m["value"], m.get("unit", "")) for m in node.get("metrics", [])},
        }

    total_headcount = 0
    metric_sums: dict[str, float] = {}
    metric_units: dict[str, str] = {}
    for child in children:
        agg = aggregate_org(child)
        total_headcount += agg["headcount"]
        for mid, (val, unit) in agg["metrics"].items():
            metric_units[mid] = unit
            metric_sums[mid] = metric_sums.get(mid, 0.0) + val * agg["headcount"]

    if total_headcount == 0:
        total_headcount = node.get("headcount", 0)

    metrics_list = []
    for mid, total in metric_sums.items():
        metrics_list.append(
            {"id": mid, "name": next((m["name"] for m in children[0].get("metrics", []) if m["id"] == mid), mid),
             "value": round(total / total_headcount, 2) if total_headcount else 0, "unit": metric_units.get(mid, "")}
        )

    node["headcount"] = total_headcount
    node["metrics"] = metrics_list
    for m in metrics_list:
        if m["id"] == "revenue_per_cost":
            node["value"] = m["value"]

    return {
        "headcount": total_headcount,
        "metrics": {m["id"]: (m["value"], m.get("unit", "")) for m in metrics_list},
    }


def build_parent_map(node: dict, parent: str | None = None, mp: dict | None = None) -> dict:
    if mp is None:
        mp = {}
    mp[node["id"]] = parent
    for child in node.get("children", []) or []:
        build_parent_map(child, node["id"], mp)
    return mp

# 汇总人数和指标
aggregate_org(org_tree)

# 确保总部（root）的人效值与总览卡片一致
root_top_metric = next((m for m in summary_metrics if m.id == "revenue_per_cost"), None)
if root_top_metric:
    org_tree["value"] = root_top_metric.value
    if "metrics" in org_tree:
        updated = False
        for m in org_tree["metrics"]:
            if m.get("id") == "revenue_per_cost":
                m["value"] = root_top_metric.value
                m["unit"] = root_top_metric.unit
                updated = True
        if not updated:
            org_tree["metrics"].append(
                {"id": "revenue_per_cost", "name": "万元人力成本销售收入", "value": root_top_metric.value, "unit": root_top_metric.unit}
            )

parent_map = build_parent_map(org_tree)

CorrelationData = Dict[str, List[dict]]

correlation_data: CorrelationData = {
    "hq": [
        {
            "id": "attrition",
            "name": "离职率",
            "coefficient": -0.86,
            "direction": "negative",
            "description": "离职率上升显著拖累人效",
            "value": 0.11,
            "detail": {
                "rule": "离职人数 ÷ 平均在职人数",
                "breakdown": [
                    {"label": "离职人数", "value": 16},
                    {"label": "在职人数", "value": 150},
                    {"label": "缺编率", "value": 0.1},
                ],
            },
        },
        {
            "id": "avg_project_value",
            "name": "平均项目价值",
            "coefficient": 0.88,
            "direction": "positive",
            "description": "高客单价项目提升人均产出",
            "value": 210,
            "detail": {
                "rule": "项目总金额 ÷ 项目数量",
                "breakdown": [
                    {"label": "项目数量", "value": 40},
                    {"label": "总金额(万)", "value": 8400},
                    {"label": "平均价值(万)", "value": 210},
                ],
            },
        },
        {
            "id": "new_sale_cycle",
            "name": "新销售产单周期",
            "coefficient": -0.83,
            "direction": "negative",
            "description": "新人首单越慢，整体人效越低",
            "value": 75,
            "detail": {
                "rule": "新人首单平均天数",
                "breakdown": [
                    {"label": "新人数量", "value": 25},
                    {"label": "首单平均天数", "value": 75},
                ],
            },
        },
        {
            "id": "project_conversion_rate",
            "name": "项目转化率",
            "coefficient": 0.9,
            "direction": "positive",
            "description": "转化率提升直接带动产出",
            "value": 0.34,
            "detail": {
                "rule": "成交项目数 ÷ 立项项目数",
                "breakdown": [
                    {"label": "立项数", "value": 50},
                    {"label": "成交数", "value": 17},
                    {"label": "转化率", "value": 0.34},
                ],
            },
        },
        {
            "id": "project_conversion_cycle",
            "name": "项目转化周期",
            "coefficient": -0.85,
            "direction": "negative",
            "description": "转化周期拉长会压低人效",
            "value": 120,
            "detail": {
                "rule": "成交平均周期（天）",
                "breakdown": [
                    {"label": "平均周期", "value": 120},
                    {"label": "P90 周期", "value": 180},
                ],
            },
        },
    ],
    "east": [
        # 华东：根因聚焦流失、客单价、转化节奏
        {
            "id": "attrition",
            "name": "离职率",
            "coefficient": -0.84,
            "direction": "negative",
            "description": "流失直接稀释人效",
            "value": 0.12,
            "detail": {
                "rule": "离职人数 ÷ 平均在职人数（华东）",
                "breakdown": [
                    {"label": "离职人数", "value": 6},
                    {"label": "在职人数", "value": 50},
                    {"label": "流失率", "value": 0.12},
                ],
            },
        },
        {
            "id": "new_sale_cycle",
            "name": "新销售产单周期",
            "coefficient": -0.82,
            "direction": "negative",
            "description": "新人首单周期过长影响整体效率",
            "value": 85,
            "detail": {
                "rule": "新人首单平均天数（华东）",
                "breakdown": [
                    {"label": "新人数量", "value": 8},
                    {"label": "首单平均天数", "value": 85},
                ],
            },
        },
        {
            "id": "avg_project_value",
            "name": "平均项目价值",
            "coefficient": 0.87,
            "direction": "positive",
            "description": "提升客单价可拉动人均产出",
            "value": 180,
            "detail": {
                "rule": "项目总金额 ÷ 项目数量（华东）",
                "breakdown": [
                    {"label": "项目数量", "value": 18},
                    {"label": "总金额(万)", "value": 3240},
                    {"label": "平均价值(万)", "value": 180},
                ],
            },
        },
        {
            "id": "project_conversion_cycle",
            "name": "项目转化周期",
            "coefficient": -0.84,
            "direction": "negative",
            "description": "周期拉长会压低人效",
            "value": 140,
            "detail": {
                "rule": "成交平均周期（天）（华东）",
                "breakdown": [
                    {"label": "平均周期", "value": 140},
                    {"label": "P90 周期", "value": 190},
                ],
            },
        },
        {
            "id": "project_conversion_rate",
            "name": "项目转化率",
            "coefficient": 0.88,
            "direction": "positive",
            "description": "转化率提升带动人效改善",
            "value": 0.30,
            "detail": {
                "rule": "成交项目数 ÷ 立项项目数（华东）",
                "breakdown": [
                    {"label": "立项数", "value": 30},
                    {"label": "成交数", "value": 9},
                    {"label": "转化率", "value": 0.30},
                ],
            },
        },
    ],
    "south": [
        # 华南：突出流失、流动、新销售周期与转化周期（源自根因分析）
        {
            "id": "attrition",
            "name": "离职率",
            "coefficient": -0.87,
            "direction": "negative",
            "description": "流失率高使人效下行",
            "value": 0.16,
            "detail": {
                "rule": "离职人数 ÷ 平均在职人数（华南）",
                "breakdown": [
                    {"label": "离职人数", "value": 9},
                    {"label": "在职人数", "value": 56},
                    {"label": "流失率", "value": 0.16},
                ],
            },
        },
        {
            "id": "mobility",
            "name": "人员流动性",
            "coefficient": -0.83,
            "direction": "negative",
            "description": "内部频繁流动影响交付与客户关系",
            "value": 0.16,
            "detail": {
                "rule": "内部调岗人数 ÷ 在职人数（华南）",
                "breakdown": [
                    {"label": "调岗人数", "value": 9},
                    {"label": "在职人数", "value": 58},
                    {"label": "流动率", "value": 0.16},
                ],
            },
        },
        {
            "id": "project_conversion_cycle",
            "name": "项目转化周期",
            "coefficient": -0.9,
            "direction": "negative",
            "description": "周期拉长严重拖累人效",
            "value": 160,
            "detail": {
                "rule": "成交平均周期（天）（华南）",
                "breakdown": [
                    {"label": "平均周期", "value": 160},
                    {"label": "P90 周期", "value": 220},
                ],
            },
        },
        {
            "id": "project_conversion_rate",
            "name": "项目转化率",
            "coefficient": 0.92,
            "direction": "positive",
            "description": "转化率提升可直接改善人效",
            "value": 0.26,
            "detail": {
                "rule": "成交项目数 ÷ 立项项目数（华南）",
                "breakdown": [
                    {"label": "立项数", "value": 50},
                    {"label": "成交数", "value": 13},
                    {"label": "转化率", "value": 0.26},
                ],
            },
        },
        {
            "id": "new_sale_cycle",
            "name": "新销售产单周期",
            "coefficient": -0.85,
            "direction": "negative",
            "description": "新人首单周期长拖累人效",
            "value": 95,
            "detail": {
                "rule": "新人首单平均天数（华南）",
                "breakdown": [
                    {"label": "新人数量", "value": 12},
                    {"label": "首单平均天数", "value": 95},
                ],
            },
        },
    ],
}


def flatten_departments(node: dict) -> List[dict]:
    nodes = [node]
    for child in node.get("children", []) or []:
        nodes.extend(flatten_departments(child))
    return nodes


def find_correlations(dept_id: str) -> List[dict]:
    if dept_id in correlation_data:
        return correlation_data[dept_id]
    current = parent_map.get(dept_id)
    while current:
        if current in correlation_data:
            return correlation_data[current]
        current = parent_map.get(current)
    return correlation_data.get("hq", [])


@app.get("/api/summary")
def get_summary():
    return jsonify(
        {
            "metrics": [asdict(m) for m in summary_metrics],
            "defaultDeptId": org_tree["id"],
        }
    )


@app.get("/api/org")
def get_org():
    return jsonify({"tree": org_tree})


@app.get("/api/correlations")
def get_correlations():
    dept_id = request.args.get("deptId", org_tree["id"])
    return jsonify({"deptId": dept_id, "metrics": find_correlations(dept_id)})


@app.get("/api/search")
def search_departments():
    query = request.args.get("query", "").strip().lower()
    if not query:
        return jsonify({"matchedDepartments": []})
    matched = [
        item["id"]
        for item in flatten_departments(org_tree)
        if query in item["name"].lower() or query in item["leader"].lower()
    ]
    return jsonify({"matchedDepartments": matched})


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_RUN_PORT", "5001")))
    app.run(host="0.0.0.0", port=port, debug=True)
