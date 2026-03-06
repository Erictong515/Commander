为了满足你在 Dashboard 中查看 Claude 正在执行的任务详情，我正在寻找它的运行时状态文件（因为 Claude CLI 默认以本地进程形式运行，它的状态都保存在特定的日志中）。

刚才通过探测 ~/.claude/ 目录的内容，我发现了它用于存储 Session 数据的结构，特别是 history.jsonl（包含对话历史）。如果要获取特定运行中的 Agent/Agent 进程正在执行的任务或者 Session ID：

Claude CLI 的所有任务日志、历史和状态通常在 ~/.claude/projects/ 或 history.jsonl 中以 .jsonl 形式存储，并带有一个相应的 sessionId。
每个正在运行的 CLI 在内存中会把自己的执行输出通过标准流输出，但对于监控面板（Commander）来说，要想跨进程抓取到它正在做什么（The specific task），我们需要从它的日志/进程环境提取。
我会开发一个新的后端模块 claudeTracker，用来从系统的 ~/.claude/history.jsonl 中的最后几行，动态提取出最新正在活跃的 Session 和它的 "last message / working task"，以此来为你在面板上展示：不仅知道这个 Claude 进程活着，还能知道它目前在处理什么问题。

请稍等，我来修改后端的 API 和前端展示逻辑。