# Agents Commander

> AI Agent 蜂群指挥官 — 跨系统、跨网络的统一 Agent 监控与调度中枢

## 🎯 项目简介

Agents Commander 是一个开源的 AI Agent 监控管理平台。它以"蜂群指挥官"为产品隐喻，帮助开发者和运维人员从一个统一控制台实时监控分布在本地终端、局域网设备、远程服务器上的所有 AI Agent（如 Claude CLI、Codex CLI、Ollama、Google CLI 等）。

### 核心特性

- 🔍 **实时进程监控** — 自动扫描系统进程，识别运行中的 AI Agent
- 🧠 **Ollama 集成** — 自动检测本地 Ollama 加载的大模型及其资源占用
- 📡 **WebSocket 实时推送** — 2 秒轮询，Agent 状态变化即时推送至前端
- 🎛️ **蜂群总览仪表板** — 全局统计、Agent 列表、搜索筛选、详情面板
- 🖥️ **多系统管理** — 支持接入本地系统、局域网设备、远程服务器
- 🛑 **指挥操作** — 在详情面板中直接停止指定 Agent 进程
- 🔐 **登录保护** — Dashboard 路由受认证守卫保护
- 🧪 **自动化 Evals** — 内置评估框架，自动检测 Agent 资源、响应、稳定性

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动服务

需要同时运行两个服务：

```bash
# 终端 1: 启动本地 Agent 监控守护进程 (端口 3001)
npm run daemon

# 终端 2: 启动前端开发服务器 (端口 5183)
npm run dev
```

### 访问

- **落地页**: [http://localhost:5183/](http://localhost:5183/)
- **登录页**: [http://localhost:5183/login](http://localhost:5183/login)
- **控制台**: [http://localhost:5183/dashboard](http://localhost:5183/dashboard)（需登录）

> 默认登录账号: `admin` / `admin123`

---

## 📁 项目结构

```
Commander/
├── src/
│   ├── server/
│   │   └── index.ts            # 本地 Agent 监控守护进程 (Express + WS)
│   ├── contexts/
│   │   └── AuthContext.tsx      # 认证上下文 (login/logout/RequireAuth)
│   ├── layouts/
│   │   └── DashboardLayout.tsx  # Dashboard 布局 (可折叠侧栏)
│   ├── pages/
│   │   ├── LandingPage.tsx      # 公开落地页
│   │   ├── LoginPage.tsx        # 登录页
│   │   └── dashboard/
│   │       ├── SwarmPage.tsx     # 蜂群总览 + Agent 列表 + 详情面板
│   │       ├── SystemsPage.tsx   # 系统接入管理
│   │       └── SettingsPage.tsx  # 设置 (白名单 / 轮询间隔)
│   ├── sections/                # 落地页各区块组件
│   ├── components/              # shadcn/ui 组件库
│   ├── App.tsx                  # 路由入口 (React Router v6)
│   └── main.tsx                 # 应用挂载点
├── FRD.md                       # 功能需求文档
├── PRD.md                       # 产品需求文档
├── package.json
└── vite.config.ts
```

---

## 🔌 API 文档

守护进程运行在 `http://localhost:3001`，提供以下端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/agents` | 获取所有检测到的 Agent 列表 |
| `GET` | `/api/system` | 获取主机系统信息 (CPU/内存/OS) |
| `POST` | `/api/agents/:pid/kill` | 终止指定 PID 的 Agent 进程 |
| `WS` | `ws://localhost:3001` | WebSocket 实时推送 Agent 状态 |

### WebSocket 消息格式

```json
{
  "type": "AGENTS_UPDATE",
  "data": [
    {
      "id": "proc-12345",
      "name": "Claude CLI",
      "type": "CLI",
      "status": "active",
      "cpu": 1.2,
      "memory": 256.5,
      "pid": 12345,
      "environment": "Terminal"
    }
  ]
}
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, Vite, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide Icons |
| 路由 | React Router v6 |
| 实时通信 | WebSocket (ws) |
| 后端 | Node.js, Express |
| 进程监控 | systeminformation |
| LLM 监控 | Ollama REST API |

---

## 📋 监控的 Agent 类型

| Agent | 进程名 | 类型 |
|-------|--------|------|
| Claude CLI | `claude` | CLI |
| Codex CLI | `codex` | CLI |
| Google Cloud CLI | `gcloud`, `google` | CLI |
| Ollama | `ollama` | Local-LLM |
| Ollama 模型 | 通过 `/api/ps` 获取 | Local-LLM |

---

## 🧪 EvalsAgent — 自动化评估

内置的评估框架，用于自动检测 Agent 运行质量。包含 10 个评估用例，分为三个维度：

| Suite | 评估内容 | 用例数 |
|-------|---------|-------|
| **Resource** | Agent 内存/CPU 占用、系统余量 | 3 |
| **Response** | API 延迟、数据完整性、系统信息有效性 | 4 |
| **Stability** | 守护进程健康、WebSocket 连通性、数据一致性 | 3 |

```bash
# 安装 & 运行
cd EvalsAgent && npm install && npm run eval

# 查看报告
npm run eval:report
```

详细文档请参阅 [EvalsAgent/README.md](./EvalsAgent/README.md)。

---

## 📄 文档

- [FRD.md](./FRD.md) — 功能需求文档（含实现状态）
- [PRD.md](./PRD.md) — 产品需求文档
- [EvalsAgent/README.md](./EvalsAgent/README.md) — 自动化评估框架文档

---

## 📜 License

MIT
