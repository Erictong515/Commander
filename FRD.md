# Agents Commander — Functional Requirements Document (FRD)

> **版本**: v1.1  
> **日期**: 2026-03-06  
> **产品定位**: AI Agent 蜂群指挥官 — 跨系统、跨网络的统一 Agent 监控与调度中枢

---

## 1. 产品概述 (Product Overview)

Agents Commander 是一个**蜂群式 Agent 指挥中枢**，其核心理念是让用户像蜂群指挥官一样，从一个统一控制台管理分布在本地终端、局域网设备、远程服务器上的所有 AI Agent。

与传统的 Agent 管理面板不同，Commander 的架构支持**多层级系统接入**：

```
┌─────────────────────────────────────────────────────┐
│              Agents Commander (指挥中枢)              │
├──────────┬──────────────┬──────────────┬─────────────┤
│  本地系统  │  局域网设备    │  远程服务器    │ 云端 API    │
│ Terminal  │ 办公室 Mac/PC │  AWS / GCP   │ OpenAI/...  │
│ Claude    │ 开发机        │  自建GPU集群  │ Anthropic   │
│ Codex     │ 测试服务器     │  Ollama节点   │ Google AI   │
│ Ollama    │              │              │             │
└──────────┴──────────────┴──────────────┴─────────────┘
```

---

## 2. 用户角色定义 (User Roles)

| 角色 | 权限 | 描述 |
|------|------|------|
| **超级管理员** (Super Admin) | 全部权限 | 管理系统配置、用户、所有接入系统 |
| **系统管理员** (System Admin) | 管理其负责的接入系统 | 授权网络节点、配置 Agent 策略 |
| **操作员** (Operator) | 查看面板 + 执行操作 | 查看 Agent 状态、手动启停、触发工作流 |
| **观察者** (Viewer) | 只读 | 仅查看仪表板和日志 |

---

## 3. 功能需求 (Functional Requirements)

### 3.1 认证与登录 (Authentication & Access Control)

> **核心原则**: 未登录用户只能看到落地页（Landing Page），登录后才能进入指挥中枢。

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| AUTH-01 | 登录页面 | 提供用户名+密码登录界面，支持错误提示与加载状态 | P0 | ✅ 已实现 |
| AUTH-02 | 路由守卫 | 未登录用户访问 `/dashboard` 等路由时重定向到 `/login` | P0 | ✅ 已实现 |
| AUTH-03 | 会话持久化 | 使用 localStorage 保持登录状态，刷新不丢失 | P0 | ✅ 已实现 |
| AUTH-04 | 登出功能 | Dashboard 侧栏提供退出登录按钮，清除会话 | P0 | ✅ 已实现 |
| AUTH-05 | OAuth 第三方登录 | 支持 GitHub / Google 账号快捷登录 | P2 | 🔲 未实现 |
| AUTH-06 | JWT Token 认证 | 后端签发 JWT，前端所有 API 请求携带 Token | P1 | 🔲 未实现 |
| AUTH-07 | RBAC 权限体系 | 根据用户角色控制可见菜单和可操作功能 | P2 | 🔲 未实现 |

**当前实现说明**: 使用硬编码账号 `admin / admin123` 进行简单认证。登录状态通过 React Context + localStorage 管理。`RequireAuth` 组件包裹 Dashboard 路由，未认证用户自动跳转至登录页。

**页面流程**:
```
Landing Page (/) → 登录 (/login) → Dashboard (/dashboard/*)
                                    ├── 蜂群总览 (/dashboard)
                                    ├── 系统管理 (/dashboard/systems)
                                    ├── Agent 列表 (/dashboard/agents)
                                    └── 设置 (/dashboard/settings)
```

---

### 3.2 系统接入管理 (System Source Management)

> **核心概念**: "系统" 是 Agent 的宿主环境。Commander 通过接入不同的系统来发现和管理 Agent。

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| SYS-01 | 本地系统自动检测 | 自动扫描当前机器上的 Agent 进程（Claude CLI, Codex, Ollama, Google CLI 等） | P0 | ✅ 已实现 |
| SYS-02 | 系统管理页面 | 展示已接入系统列表，显示系统类型（本地/局域网/远程/云端）和在线状态 | P0 | ✅ 已实现 |
| SYS-03 | 添加新系统 | 提供表单让管理员手动添加局域网设备、远程服务器或云端 API | P0 | ✅ 已实现 |
| SYS-04 | 移除系统 | 支持删除已添加的非本地系统（本地系统不可移除） | P0 | ✅ 已实现 |
| SYS-05 | 系统健康状态指示 | 每个系统卡片显示在线/离线状态标识 | P0 | ✅ 已实现 |
| SYS-06 | 授权网络系统 (LAN) | 通过 IP/主机名或 mDNS 发现同网络内已部署 Commander Agent 的机器 | P1 | 🔲 未实现 |
| SYS-07 | 远程服务器 (SSH) | 通过 SSH Key 或 Agent Token 连接远程 Linux/macOS 服务器 | P1 | 🔲 未实现 |
| SYS-08 | 云端 API 节点 | 接入云端 LLM API（OpenAI, Anthropic, Google AI）的用量与调用监控 | P2 | 🔲 未实现 |
| SYS-09 | 系统分组与标签 | 支持按业务线、环境（dev/staging/prod）分组管理系统 | P2 | 🔲 未实现 |
| SYS-10 | 定时健康探活 | 定时 Ping 各接入系统，自动标记在线/离线/异常状态 | P1 | 🔲 未实现 |

**当前实现说明**: 系统管理页面 (`/dashboard/systems`) 已实现基础功能。默认展示"当前机器"作为本地系统。用户可通过"接入新系统"按钮打开表单，选择类型（局域网/远程/云端）并填写名称和地址后添加。新增系统显示为卡片，鼠标悬停时出现删除按钮。目前新增系统尚未与实际远程通信对接，状态默认为离线。

**系统拓扑图视图**（目标效果）:
```
Commander 首页总览:
┌─────────────────────────────────────────┐
│  ● 本机 (MacBook Pro)        在线  12 Agents │
│  ● 开发服务器 (192.168.1.50)  在线   8 Agents │
│  ● GPU 集群 (gpu-node-01)    在线  24 Agents │
│  ○ 测试机 (192.168.1.55)     离线   0 Agents │
│  ◐ AWS EC2 (prod-01)        告警   3 Agents │
└─────────────────────────────────────────┘
```

---

### 3.3 Agent 蜂群监控 (Swarm Monitoring)

> **核心理念**: Commander 是蜂群的指挥官。每个 Agent 就像一只蜜蜂，Commander 提供蜂群的全局视野。

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| MON-01 | 蜂群总览仪表板 | 全局统计：总 Agent 数、活跃数、处理中数、总 CPU、总内存 | P0 | ✅ 已实现 |
| MON-02 | Agent 列表表格 | 表格形式展示所有 Agent，含名称、类型、状态、环境、CPU、内存、PID | P0 | ✅ 已实现 |
| MON-03 | Agent 类型筛选 | 按类型（全部 / CLI / Local-LLM）筛选 Agent 列表 | P0 | ✅ 已实现 |
| MON-04 | Agent 搜索 | 支持按名称或环境关键词搜索 Agent | P0 | ✅ 已实现 |
| MON-05 | 实时状态推送 | 通过 WebSocket 向前端实时推送 Agent 状态变化（2 秒轮询） | P0 | ✅ 已实现 |
| MON-06 | Agent 类型识别 | 自动识别 Agent 类型：Claude CLI / Codex CLI / Ollama Model / Google CLI | P0 | ✅ 已实现 |
| MON-07 | Agent 详情面板 | 点击表格行弹出右侧滑出面板，展示完整 Agent 信息和 CPU/内存进度条 | P0 | ✅ 已实现 |
| MON-08 | 守护进程连接状态 | 前端顶部显示守护进程的 WebSocket 连接状态绿灯/黄灯 | P0 | ✅ 已实现 |
| MON-09 | 告警规则引擎 | 用户自定义告警规则（如 CPU > 90%、Agent 异常退出），触发通知 | P1 | 🔲 未实现 |
| MON-10 | 历史记录与趋势 | 记录 Agent 的历史运行数据，支持按时间段查看趋势图表 | P1 | 🔲 未实现 |
| MON-11 | Agent 拓扑地图 | 可视化展示 Agent 之间的依赖关系和通信链路 | P2 | 🔲 未实现 |

**当前实现说明**: 蜂群总览页 (`/dashboard`) 是登录后的首页。顶部有 5 张统计卡片（在线 Agents、活跃、处理中、总 CPU、总内存），下方是可搜索/可筛选的 Agent 列表表格。点击某一行 Agent 会从右侧滑出详情面板，展示该 Agent 的属性（类型、状态、环境、PID）以及 CPU/内存使用率的可视化进度条。详情面板底部提供"停止此 Agent"按钮。

**Agent 状态定义**:
| 状态 | 图标 | 含义 |
|------|------|------|
| 🟢 active | 绿色 | 正在运行且健康（CPU < 5%） |
| 🔴 processing | 红色脉冲 | 正在执行高负载任务（CPU > 5%） |
| ⚪ idle | 灰色 | 已加载但无活动 |

---

### 3.4 Agent 指挥操作 (Command & Control)

> **蜂群指挥官的核心能力**: 不只是看，还要能指挥。

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| CMD-01 | 停止 Agent | 在详情面板中点击按钮，通过 API 发送 SIGTERM 终止目标进程 | P0 | ✅ 已实现 |
| CMD-02 | 启动 Agent | 在目标系统上远程启动指定类型的 Agent | P1 | 🔲 未实现 |
| CMD-03 | 重启 Agent | 优雅重启（先 graceful stop，再 start） | P1 | 🔲 未实现 |
| CMD-04 | 批量操作 | 对多个选中的 Agent 执行批量启停/重启 | P2 | 🔲 未实现 |
| CMD-05 | 任务派发 | 向指定 Agent 或 Agent 组派发任务指令 | P2 | 🔲 未实现 |
| CMD-06 | 工作流编排 | 拖拽式可视化编辑器，编排多 Agent 协作流程 | P3 | 🔲 未实现 |

**当前实现说明**: Agent 详情面板底部有"停止此 Agent"按钮。点击后前端调用 `POST /api/agents/:pid/kill`，后端对目标 PID 发送 SIGTERM 信号。操作完成后详情面板自动关闭，Agent 列表在下一次 WebSocket 推送时自动刷新。

---

### 3.5 设置与配置 (Settings & Configuration)

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| SET-01 | Agent 白名单 | 配置需要监控的进程名称列表（逗号分隔） | P0 | ✅ 已实现 |
| SET-02 | 轮询间隔配置 | 设置守护进程扫描本地进程的间隔时间（毫秒） | P0 | ✅ 已实现 |
| SET-03 | 系统凭证管理 | 安全存储 SSH Key/Token/API Key，支持加密存储 | P1 | 🔲 未实现 |
| SET-04 | 外观设置 | 深色/浅色主题切换、语言切换（中/英） | P3 | 🔲 未实现 |
| SET-05 | 用户管理 | 增删改查用户，分配角色 | P2 | 🔲 未实现 |

**当前实现说明**: 设置页面 (`/dashboard/settings`) 提供两项配置：Agent 白名单（当前默认 `claude, codex, gcloud, google, ollama`）和轮询间隔（默认 2000ms）。目前为前端展示，保存操作尚未与后端 Daemon 联动。

---

### 3.6 通知与集成 (Notifications & Integrations)

| 编号 | 功能项 | 描述 | 优先级 | 实现状态 |
|------|--------|------|--------|---------|
| NTF-01 | 浏览器通知 | 异常告警时发送浏览器 Push Notification | P1 | 🔲 未实现 |
| NTF-02 | 邮件通知 | 支持配置 SMTP 发送告警邮件 | P2 | 🔲 未实现 |
| NTF-03 | Webhook | 支持配置 Webhook URL 推送事件（兼容 Slack / 飞书 / 企业微信） | P1 | 🔲 未实现 |
| NTF-04 | API 开放 | 提供 REST API 供第三方系统集成查询 Agent 状态 | P1 | ✅ 部分实现 |

**当前实现说明**: 后端 Daemon 已提供以下 REST API 端点：
- `GET /api/health` — 健康检查
- `GET /api/agents` — 获取所有 Agent 列表
- `GET /api/system` — 获取当前系统硬件信息（CPU、内存、操作系统）
- `POST /api/agents/:pid/kill` — 终止指定 PID 的 Agent

---

## 4. 非功能需求 (Non-Functional Requirements)

| 类别 | 要求 |
|------|------|
| **安全** | TLS 1.3 加密传输；JWT Token 有效期管理；敏感信息 AES-256 加密存储 |
| **性能** | API 响应时间 < 50ms；WebSocket 推送延迟 < 200ms；支持 10,000+ Agent 并发监控 |
| **可用性** | 云端服务 99.9% SLA；本地 Daemon 支持 crash-recovery 自动重启 |
| **兼容性** | 前端支持 Chrome/Edge/Safari 最新 2 个版本；Daemon 支持 macOS/Linux |
| **可扩展** | 插件式架构，支持自定义 Agent 类型探测器和通知渠道 |

---

## 5. 技术架构概要 (Architecture Overview)

```
┌──────────────── Frontend (React + Vite) ────────────────┐
│  Landing Page │ Login │ Dashboard │ Settings             │
│  (React Router v6, Tailwind CSS, shadcn/ui)             │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API + WebSocket (port 3001)
┌───────────────────────┴─────────────────────────────────┐
│       Backend Daemon (Node.js + Express + WS)            │
│  systeminformation │ Ollama API │ Process Kill │ Sysinfo │
└──────┬───────────────┬───────────────┬──────────────────┘
       │               │               │
  ┌────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐
  │ Local   │   │ LAN         │  │ Remote    │
  │ Process │   │ Agent Nodes │  │ SSH/Token │
  │ Scan    │   │ (局域网)    │  │ (服务器)  │
  └─────────┘   └─────────────┘  └───────────┘
```

**技术栈详情**:
| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite | SPA 单页应用，热重载开发 |
| UI 组件 | shadcn/ui + Tailwind CSS | 暗色主题、响应式布局 |
| 路由 | React Router v6 | 嵌套路由、路由守卫 |
| 状态管理 | React Context | 认证状态全局管理 |
| 实时通信 | WebSocket (ws) | 2 秒轮询推送 Agent 数据 |
| 后端运行时 | Node.js + Express | REST API + 静态资源服务 |
| 进程监控 | systeminformation | 跨平台进程和系统信息采集 |
| LLM 监控 | Ollama REST API | 本地大模型运行状态采集 |

---

## 6. 分阶段实施路线 (Phased Roadmap)

### Phase 1 — 本地指挥官 (v0.1, 当前) ✅
- [x] 本地 Daemon 扫描本机 Agent 进程
- [x] Ollama API 集成
- [x] 前端实时 Agent Dashboard (WebSocket)
- [x] 登录/注册 + 路由守卫
- [x] Agent 详情面板 + 停止操作
- [x] Agent 搜索 + 类型筛选
- [x] 系统管理页面（本地系统 + 手动添加）
- [x] 设置页面（白名单 + 轮询间隔）
- [x] REST API（agents, system, health, kill）

### Phase 2 — 网络扩展 (v0.2)
- [ ] 远程 Daemon 部署脚本与通信协议
- [ ] 多系统 Agent 聚合（跨机器数据合并）
- [ ] 系统健康自动探活
- [ ] 告警规则引擎 + 浏览器/Webhook 通知
- [ ] JWT Token 后端认证

### Phase 3 — 蜂群指挥 (v0.3)
- [ ] Agent 远程启动/重启操作
- [ ] 批量操作和任务派发
- [ ] 可视化工作流编排器
- [ ] 历史数据持久化与趋势分析图表

### Phase 4 — 企业级 (v1.0)
- [ ] RBAC 多角色权限体系
- [ ] OAuth 第三方登录
- [ ] 云端 API 用量监控集成
- [ ] 插件市场（自定义 Agent 探测器）
- [ ] 私有化部署方案 (Docker / K8s)
- [ ] 国际化 (i18n) 与主题切换
