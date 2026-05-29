# 更新日志

本项目的所有重要更改都将记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2024-05-24

### 新增
- 🌐 Web 远程控制界面
- 🔐 密码认证系统（含防爆破机制）
- 📡 实时流式输出（SSE）
- 📂 文件浏览器（支持 Windows 盘符导航）
- 📜 对话历史管理（最近 200 条）
- 🧠 Claude Code 记忆文件查看
- ⚡ 极速/省 Token 模式
- 🚇 Ngrok 集成
- 🛡️ IP 封锁安全机制
- 📱 响应式设计，支持移动端

### 技术细节
- 后端：Node.js + Express
- 前端：原生 HTML/CSS/JavaScript
- 实时通信：Server-Sent Events (SSE)
- 隧道：Ngrok

---

## 未来计划

### 计划中
- [ ] 多用户支持
- [ ] WebSocket 替代 SSE
- [ ] 更丰富的文件操作
- [ ] 命令模板库
- [ ] 暗色/亮色主题切换
- [ ] 国际化支持
- [ ] Docker 部署支持
- [ ] GitHub Actions CI/CD

---

更多信息请查看 [GitHub Releases](https://github.com/lihuiyu301-alt/claude-remote/releases)
