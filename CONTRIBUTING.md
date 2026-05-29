# 贡献指南

感谢你对本项目的关注！欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

1. 在 [Issues](https://github.com/lihuiyu301-alt/claude-remote/issues) 页面创建新 Issue
2. 使用 Bug 报告模板
3. 描述清楚复现步骤、期望行为和实际行为
4. 附上截图或错误日志（如有）

### 提交功能建议

1. 在 Issues 页面创建新 Issue
2. 使用功能建议模板
3. 描述清楚你想要的功能和使用场景

### 提交代码

1. Fork 本仓库
2. 创建你的功能分支：`git checkout -b feature/amazing-feature`
3. 提交你的更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 开发环境

### 前置要求

- Node.js >= 14.0
- Git
- Claude Code（用于测试）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/lihuiyu301-alt/claude-remote.git
cd claude-remote

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 代码规范

- 使用 2 空格缩进
- 使用单引号字符串
- 添加必要的注释
- 保持代码简洁

### 提交规范

提交信息请遵循以下格式：

```
<类型>(<范围>): <描述>

[可选正文]

[可选脚注]
```

类型包括：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat(file-browser): add file preview feature
fix(auth): fix token validation issue
docs(readme): update installation guide
```

## Pull Request 流程

1. 确保代码符合项目规范
2. 更新相关文档
3. 确保所有测试通过
4. 填写 PR 模板中的所有必要信息
5. 等待代码审查

## 行为准则

- 尊重所有参与者
- 接受建设性批评
- 专注于对社区最有利的事情
- 对他人表示同理心

## 问题？

如有任何问题，请在 Issues 中提问。

感谢你的贡献！🎉
