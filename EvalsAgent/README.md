# EvalsAgent — Agent 自动化评估框架

> Agents Commander 的自动化质量评估工具，用于定期检测 Agent 运行表现、系统资源健康度和守护进程稳定性。

---

## 🎯 设计理念

EvalsAgent 将 Agent 的运行质量拆分为三个评估维度（Suite），每个维度包含多个独立的评估用例（Eval Case）。每个用例会在运行后输出一个 0-100 的评分和 pass/warn/fail 的判定，最终汇总为一份结构化 JSON 报告。

```
┌────────────────────────────────────────────┐
│              EvalsAgent Runner              │
├──────────────┬──────────────┬──────────────┤
│   Resource   │   Response   │  Stability   │
│   资源评估    │   响应评估    │  稳定性评估   │
├──────────────┼──────────────┼──────────────┤
│ 内存占用      │ API 延迟     │ 守护进程健康   │
│ CPU 利用率    │ 数据完整性   │ WebSocket 连通 │
│ 系统余量      │ 系统信息有效性 │ 数据一致性    │
│              │ Agent API 延迟│              │
└──────────────┴──────────────┴──────────────┘
                      ↓
              results/eval-*.json
```

---

## 📋 评估用例清单

### 🔋 Resource（资源评估）

| ID | 名称 | 评估内容 | 及格/告警/不及格 |
|----|------|---------|----------------|
| EVAL-R01 | Agent Memory Footprint | 每个 Agent 内存是否 < 2GB | 全部 < 2GB / ≤2个超标 / >2个超标 |
| EVAL-R02 | Total CPU Utilization | Agent 总 CPU 占系统容量的百分比 | < 50% / 50-80% / > 80% |
| EVAL-R03 | System Memory Headroom | 系统剩余可用内存 | > 20% / 10-20% / < 10% |

### ⚡ Response（响应评估）

| ID | 名称 | 评估内容 | 及格/告警/不及格 |
|----|------|---------|----------------|
| EVAL-P01 | Health Endpoint Latency | `/api/health` 响应延迟 | < 50ms / 50-200ms / > 200ms |
| EVAL-P02 | Agents Data Completeness | Agent 数据字段是否完整 | 100% / ≤3字段缺失 / >3字段缺失 |
| EVAL-P03 | System Info Validity | `/api/system` 返回数据格式有效性 | 全部有效 / ≤1项无效 / >1项无效 |
| EVAL-P04 | Agents API Latency | `/api/agents` 响应延迟（含进程扫描） | < 500ms / 500-1000ms / > 1000ms |

### 🛡️ Stability（稳定性评估）

| ID | 名称 | 评估内容 | 及格/告警/不及格 |
|----|------|---------|----------------|
| EVAL-S01 | Daemon Health Check | 连续 5 次健康检查的成功率 | 5/5 / ≥3/5 / <3/5 |
| EVAL-S02 | WebSocket Connectivity | WS 连接并在 5s 内收到数据 | < 3s / 3-5s / >5s 或失败 |
| EVAL-S03 | REST vs WS Consistency | REST API 与 WebSocket 上报 Agent 数一致 | 差异 ≤2 / ≤5 / >5 |

---

## 🚀 使用方法

### 前置条件

确保 Commander 守护进程正在运行：

```bash
# 在项目根目录
npm run daemon
```

### 安装依赖

```bash
cd EvalsAgent
npm install
```

### 运行全部评估

```bash
npm run eval
```

### 运行单个 Suite

```bash
npm run eval:resource     # 仅资源评估
npm run eval:response     # 仅响应评估
npm run eval:stability    # 仅稳定性评估
```

### 查看最近一次报告

```bash
npm run eval:report
```

---

## 📊 输出示例

### 终端输出

```
🐝 Agents Commander — Eval Runner
══════════════════════════════════════════════════

✅ Daemon reachable at http://localhost:3001

📋 Running 10 eval(s) [suite: all]

  ✅ [100/100] Agent Memory Footprint — 41 agents checked. Peak: 1477 MB.
  ⚠️ [60/100]  Total CPU Utilization — Total CPU: 223% across 8 cores (34.8%)
  ✅ [90/100]  System Memory Headroom — 45.2% memory free
  ✅ [100/100] Health Endpoint Latency — Responded in 3ms
  ✅ [100/100] Agents Data Completeness — 41 agents, 287/287 fields populated
  ✅ [100/100] System Info Validity — All 5 fields valid
  ✅ [100/100] Agents API Latency — Process scan + response in 180ms
  ✅ [100/100] Daemon Health Check — 5/5 health checks passed
  ✅ [100/100] WebSocket Connectivity — Connected in 45ms
  ✅ [100/100] REST vs WS Consistency — REST: 41, WS: 41 (diff: 0)

══════════════════════════════════════════════════
📊 Eval Summary
   Total: 10  |  ✅ 9  |  ⚠️ 1  |  ❌ 0
   Overall Score: 95/100
   • resource: 83/100 (2/3 passed)
   • response: 100/100 (4/4 passed)
   • stability: 100/100 (3/3 passed)

💾 Report saved to: results/eval-1709701234567.json
```

### JSON 报告结构

报告保存在 `EvalsAgent/results/` 目录，每次运行生成一个 JSON 文件：

```json
{
  "runId": "eval-1709701234567",
  "timestamp": "2026-03-06T11:00:00.000Z",
  "totalCases": 10,
  "passed": 9,
  "warned": 1,
  "failed": 0,
  "overallScore": 95,
  "suites": {
    "resource": { "total": 3, "passed": 2, "warned": 1, "failed": 0, "avgScore": 83 },
    "response": { "total": 4, "passed": 4, "warned": 0, "failed": 0, "avgScore": 100 },
    "stability": { "total": 3, "passed": 3, "warned": 0, "failed": 0, "avgScore": 100 }
  },
  "results": [ ... ]
}
```

---

## 🔧 扩展评估用例

在 `evals/` 目录创建新的 `*.eval.ts` 文件：

```typescript
import type { EvalCase, EvalResult } from '../src/types.js';

const myCustomEval: EvalCase = {
  id: 'EVAL-X01',
  name: 'My Custom Eval',
  suite: 'resource', // or 'response' | 'stability'
  description: 'What this eval checks',
  async run(): Promise<EvalResult> {
    // Your evaluation logic here
    return {
      caseId: this.id,
      caseName: this.name,
      suite: this.suite,
      severity: 'pass',
      score: 100,
      message: 'Everything looks good',
      timestamp: new Date().toISOString(),
      durationMs: 0,
    };
  },
};

export const myEvals: EvalCase[] = [myCustomEval];
```

然后在 `src/runner.ts` 中导入并注册到 `collectCases` 函数即可。

---

## 📁 目录结构

```
EvalsAgent/
├── evals/
│   ├── resource.eval.ts     # 资源评估 (内存/CPU/系统余量)
│   ├── response.eval.ts     # 响应评估 (API 延迟/数据质量)
│   └── stability.eval.ts    # 稳定性评估 (健康检查/WS/一致性)
├── src/
│   ├── types.ts             # 类型定义
│   ├── runner.ts            # 评估运行器
│   └── report.ts            # 报告查看器
├── results/                 # 评估报告 JSON 输出目录
├── package.json
└── README.md                # 本文档
```
