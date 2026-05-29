# Claude Code 远程控制

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-14+-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![GitHub Stars](https://img.shields.io/github/stars/lihuiyu301-alt/claude-remote?style=social)](https://github.com/lihuiyu301-alt/claude-remote/stargazers)

> 通过手机或任何设备远程控制电脑上的 Claude Code，随时随地让 AI 帮你写代码。

<p align="center">
  <img src="https://via.placeholder.com/800x400?text=Claude+Code+Remote+Control" alt="Claude Code Remote Control" width="100%">
</p>

## ✨ 功能特性

- 🌐 **Web 远程控制** — 通过浏览器访问，支持手机、平板、电脑
- 🔐 **密码保护** — 访问需要密码验证，含防爆破机制（5次失败封锁24小时）
- 📡 **实时流式输出** — 使用 SSE 技术，实时查看 Claude Code 的执行过程
- 📂 **文件浏览器** — 可视化选择工作目录，支持 Windows 盘符导航
- 📜 **对话历史** — 自动保存最近 200 条对话记录，支持查看和重用
- 🧠 **记忆管理** — 查看和管理 Claude Code 的记忆文件
- ⚡ **极速模式** — 省 Token 模式，快速获取结果
- 🚇 **Ngrok 集成** — 一键生成公网访问地址
- 🛡️ **安全机制** — Token 认证、IP 封锁、进程隔离

## 📋 前置要求

- **Node.js** >= 14.0
- **Claude Code** 已安装并配置
- **Ngrok**（可选，用于公网访问）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lihuiyu301-alt/claude-remote.git
cd claude-remote
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置密钥

编辑 `server.js`，修改第 10 行的密钥：

```javascript
const SECRET = '你的密钥';
```

### 4. 启动服务

**方式一：使用启动脚本（Windows）**

```bash
start.bat
```

**方式二：手动启动**

```bash
# 启动服务器
node server.js

# （可选）启动 Ngrok 隧道
ngrok http 3001 --region ap --basic-auth user:你的密钥
```

### 5. 访问

- **本地访问：** http://localhost:3001
- **公网访问：** 使用 Ngrok 生成的 URL

## 📖 使用说明

### 基本操作

1. 打开浏览器访问服务地址
2. 输入密码登录
3. 在"命令"标签页输入指令
4. 点击"发送给 Claude Code"或按 `Ctrl+Enter`
5. 实时查看输出结果

### 文件浏览器

- 点击"浏览"按钮打开文件浏览器
- 支持 Windows 盘符快捷导航
- 点击文件夹图标上的"🎯 工作区"可快速设置工作目录
- 点击文件图标上的"📋 路径"可复制文件路径

### 对话历史

- 切换到"历史"标签页查看过往对话
- 点击"重新发送"可快速重用之前的指令
- 支持删除单条历史记录

### 记忆管理

- 切换到"记忆"标签页查看 Claude Code 的记忆文件
- 记忆文件按修改时间排序

### 极速模式

- 勾选"极速/省Token模式"复选框
- 自动追加优化指令，减少不必要的工具调用

## 🔧 API 接口

所有 API 需要在 Header 中携带 `x-token` 进行认证。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/run` | 执行 Claude Code 指令 |
| POST | `/api/stop` | 终止正在运行的任务 |
| GET | `/api/history` | 获取对话历史列表 |
| GET | `/api/history/:id` | 获取历史详情 |
| DELETE | `/api/history/:id` | 删除历史记录 |
| GET | `/api/memory` | 获取记忆文件列表 |
| GET | `/api/memory/:name` | 获取记忆文件内容 |
| GET | `/api/files` | 浏览文件系统 |

### 执行指令示例

```bash
curl -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -H "x-token: 你的密钥" \
  -d '{"prompt": "帮我写一个 Python 爬虫", "workdir": "C:\\Projects"}'
```

## 🏗️ 项目结构

```
claude-remote/
├── .gitignore          # Git 忽略配置
├── server.js           # 后端服务器（Express）
├── public/
│   └── index.html      # 前端界面
├── package.json        # 项目配置
├── start.bat           # Windows 启动脚本
└── README.md           # 项目说明
```

## 🔒 安全说明

- 所有 API 请求需要 Token 认证
- 连续 5 次密码错误将封锁 IP 24 小时
- `.env` 文件和日志不会上传到 GitHub
- 建议定期更换访问密钥
- 公网访问时请使用 HTTPS

## 🛠️ 技术栈

- **后端：** Node.js + Express
- **前端：** 原生 HTML/CSS/JavaScript
- **实时通信：** Server-Sent Events (SSE)
- **隧道：** Ngrok

## 📝 更新日志

### v1.0.0 (2024-05-24)
- 初始版本发布
- 支持远程执行 Claude Code
- 支持文件浏览器
- 支持对话历史管理
- 支持记忆文件查看

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@lihuiyu301-alt](https://github.com/lihuiyu301-alt)
