# Task Display Feature - Testing Guide

## 新功能说明

### ✅ 已实现

1. **Agent 列表新增"当前任务"列**
   - 显示 Claude CLI 正在执行的任务
   - 显示 Ollama 加载的模型信息
   - 任务文本过长时自动截断，鼠标悬停显示完整内容

2. **Ollama 任务追踪器 (ollamaTracker.ts)**
   - 追踪正在运行的 Ollama 模型
   - 为每个加载的模型创建任务信息
   - 包含模型族、参数大小、量化级别等详细信息

3. **新增 API 端点**
   - `GET /api/ollama/sessions` - 获取所有 Ollama 会话及任务
   - `GET /api/ollama/sessions/:modelName` - 获取特定模型的会话详情
   - `GET /api/ollama/health` - 检查 Ollama 是否运行

---

## 如何测试

### 1. 测试 Claude CLI 任务显示

```bash
# 在一个终端启动 Claude
claude code

# 在 Commander dashboard 中应该能看到：
# - Agent 列表中 "Claude CLI" 行
# - "当前任务" 列显示 Claude 正在执行的任务描述
# - 点击该行，右侧详情面板显示完整任务列表
```

**预期结果**：
- ✅ "当前任务"列显示 Claude 的活动任务
- ✅ 详情面板显示所有待处理/进行中/已完成的任务
- ✅ 任务状态实时更新（每2秒）

---

### 2. 测试 Ollama 任务显示

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 加载一个模型
ollama run glm-5:cloud "hello"

# 在 Commander dashboard 中应该能看到：
# - "Ollama Daemon" 进程
# - 如果有模型加载，会显示模型名称作为单独的 Agent
# - "当前任务"列显示 "Model loaded and ready for inference"
```

**预期结果**：
- ✅ 列表显示 "Ollama Daemon" (守护进程)
- ✅ 列表显示加载的模型（例如 "glm-5:cloud"）
- ✅ 当前任务显示模型加载信息
- ✅ 详情面板显示模型详细信息（参数大小、量化级别等）

---

### 3. 测试 API 端点

```bash
# 1. 检查 Ollama 健康状态
curl http://localhost:3001/api/ollama/health

# 预期响应：
# {
#   "running": true,
#   "timestamp": 1772814893132
# }

# 2. 获取所有 Ollama 会话
curl http://localhost:3001/api/ollama/sessions | jq '.'

# 预期响应（如果有模型加载）：
# {
#   "sessions": [
#     {
#       "sessionId": "ollama-glm-5:cloud-1772814893132",
#       "model": "glm-5:cloud",
#       "currentTask": "Model loaded and ready for inference",
#       "tasks": [
#         {
#           "taskId": "task-glm-5:cloud",
#           "subject": "Model glm-5:cloud loaded in memory",
#           "description": "Running glama model (5B parameters, Q4_0 quantization)",
#           "status": "active",
#           "model": "glm-5:cloud"
#         }
#       ],
#       "size": 3456789012,
#       "sizeVram": 3456789012
#     }
#   ],
#   "timestamp": 1772814933373
# }

# 3. 获取所有 Agent（包括任务信息）
curl http://localhost:3001/api/agents | jq '.agents[] | select(.currentTask != null)'
```

---

## UI 界面变化

### Agent 列表表格

**之前**：
```
| 名称 | 类型 | 状态 | 环境 | CPU | 内存 | PID |
```

**现在**：
```
| 名称 | 类型 | 状态 | 当前任务 | 环境 | CPU | 内存 | PID |
```

### 示例显示

```
Claude CLI    | CLI       | processing | 修复三个P0级别bug             | Terminal | 2.5% | 156 MB | 12345
Ollama Daemon | Local-LLM | active     | —                              | Terminal | 0%   | 71 MB  | 54286
glm-5:cloud   | Local-LLM | processing | Model loaded and ready for inf | Ollama   | 0%   | 3421 MB| —
```

---

## 详情面板任务展示

点击 Agent 后，右侧面板显示：

**Claude CLI**：
- ✅ 当前任务
- ✅ 工作目录
- ✅ 会话 ID
- ✅ 任务列表（可展开查看描述）
- ✅ 任务状态统计（✓ 完成 / ⟳ 进行中 / ○ 待处理）

**Ollama**：
- ✅ 当前任务
- ✅ 会话 ID
- ✅ 任务列表（显示模型详情）
- ✅ 模型规格（参数大小、量化级别、模型族等）

---

## 故障排查

### 问题：看不到 Claude 任务

**检查**：
1. Claude CLI 是否在运行？
2. 守护进程是否正常运行？`curl http://localhost:3001/api/health`
3. 检查 Claude session 文件：`~/.config/claude/sessions/*/conversation.json`

**解决**：
```bash
# 重启守护进程
kill $(lsof -ti:3001)
npm run daemon
```

### 问题：看不到 Ollama 任务

**检查**：
1. Ollama 是否在运行？`ollama list`
2. 是否有模型加载？`curl http://localhost:11434/api/ps`
3. 检查 API：`curl http://localhost:3001/api/ollama/sessions`

**解决**：
```bash
# 启动 Ollama
ollama serve

# 加载一个模型
ollama run glm-5:cloud "test"
```

### 问题：任务信息不更新

**原因**：WebSocket 连接可能断开

**解决**：
1. 刷新浏览器页面
2. 检查控制台是否有 WebSocket 错误
3. 重启守护进程

---

## 代码结构

```
Commander/
├── src/
│   ├── server/
│   │   ├── index.ts           # 主守护进程（已更新）
│   │   ├── claudeTracker.ts   # Claude 任务追踪器
│   │   └── ollamaTracker.ts   # Ollama 任务追踪器（新增）
│   └── pages/
│       └── dashboard/
│           └── SwarmPage.tsx  # Agent 列表页面（已更新）
```

---

## Git 提交

```bash
Commit: c482525
Message: feat: add Ollama task tracking and display current task in agent list
Files: 3 changed, 314 insertions(+), 81 deletions(-)
```

---

## 下一步优化建议

1. **实时对话追踪**：
   - 追踪 Ollama 正在进行的对话内容
   - 显示最近的提示词和响应

2. **性能指标**：
   - 显示模型推理速度（tokens/秒）
   - 显示 VRAM 使用率

3. **任务历史**：
   - 保存已完成任务的历史记录
   - 显示任务执行时间统计

4. **任务操作**：
   - 暂停/恢复 Ollama 推理
   - 取消当前任务
   - 查看任务日志

---

## 已知限制

1. **Ollama 任务是合成的**：
   - 基于已加载模型生成任务信息
   - 无法获取实际推理请求的详细信息（Ollama API 限制）

2. **Claude 任务匹配**：
   - 如果有多个 Claude 进程，无法精确匹配进程和会话
   - 当前使用最近的会话作为匹配

3. **更新频率**：
   - 任务信息每2秒更新一次
   - 不是完全实时的（WebSocket 推送间隔）

---

完成！🎉 现在你可以在 Agent 列表中看到 Claude 和 Ollama 的任务了！
