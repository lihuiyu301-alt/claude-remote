const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const SECRET = 'Lhy@123456';

// 日志目录
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// 当前运行的子进程
let currentProc = null;
let currentRes = null;

// 密码防爆破：记录各 IP 连续失败次数
const authFailures = {};
const MAX_FAIL = 5;
const BLOCK_MS = 24 * 60 * 60 * 1000; // 24小时

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 记录日志
function log(prompt, workdir, result) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toLocaleTimeString('zh-CN');
  const line = `[${time}] workdir=${workdir || 'default'} prompt="${prompt.slice(0, 100)}" result=${result}\n`;
  fs.appendFileSync(path.join(LOG_DIR, `${date}.log`), line);
}

// 鉴权中间件（含防爆破）
app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const record = authFailures[ip];

  // 检查是否在封锁期内
  if (record && record.blockUntil && Date.now() < record.blockUntil) {
    return res.status(403).json({ error: '访问已被封锁，请24小时后再试' });
  }

  const token = req.headers['x-token'];
  if (token !== SECRET) {
    // 记录失败
    if (!authFailures[ip]) authFailures[ip] = { count: 0, blockUntil: 0 };
    authFailures[ip].count++;
    if (authFailures[ip].count >= MAX_FAIL) {
      authFailures[ip].blockUntil = Date.now() + BLOCK_MS;
    }
    return res.status(401).json({ error: '密码错误' });
  }

  // 认证成功，清除失败计数
  if (authFailures[ip]) {
    authFailures[ip].count = 0;
    authFailures[ip].blockUntil = 0;
  }
  next();
});

// 执行 Claude Code 命令
app.post('/api/run', (req, res) => {
  const { prompt, workdir } = req.body;
  if (!prompt) return res.status(400).json({ error: '指令不能为空' });

  // 如果有正在运行的任务，先终止
  if (currentProc) {
    const oldProc = currentProc;
    const oldRes = currentRes;

    // 立即重置全局变量，确保不阻塞新任务的启动
    currentProc = null;
    currentRes = null;

    if (oldRes) {
      try {
        oldRes.write(`data: ${JSON.stringify({ type: 'done', code: -1, text: '进程已被新指令终止' })}\n\n`);
        oldRes.end();
      } catch (e) {}
    }

    const pid = oldProc.pid;
    if (pid && pid !== process.pid) {
      if (process.platform === 'win32') {
        try {
          // 异步强杀，不阻塞当前请求
          spawn('cmd.exe', ['/s', '/c', `taskkill /pid ${pid} /f /t`], { windowsHide: true });
        } catch (e) {}
      } else {
        try {
          oldProc.kill('SIGKILL');
        } catch (e) {}
      }
    }
  }

  // 验证工作目录
  const cwd = workdir || os.homedir();
  if (!fs.existsSync(cwd)) {
    return res.status(400).json({ error: `目录不存在: ${cwd}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 心跳，防止连接断开
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) {}
  }, 15000);

  // 用 spawn 实现真正的实时流式输出
  const escapedPrompt = prompt.replace(/"/g, '""');
  const redirect = process.platform === 'win32' ? ' < nul' : ' < /dev/null';
  const cmdLine = `cd /d "${cwd}" && claude -p --dangerously-skip-permissions "${escapedPrompt}"${redirect}`;

  let outputBuffer = '';

  const proc = spawn('cmd.exe', ['/s', '/c', cmdLine], {
    shell: true,
    windowsVerbatimArguments: true,
    env: { ...process.env, PATH: path.join(os.homedir(), 'AppData', 'Roaming', 'npm') + ';' + (process.env.PATH || '') }
  });

  currentProc = proc;
  currentRes = res;

  // 实时推送 stdout
  proc.stdout.on('data', data => {
    const text = data.toString();
    outputBuffer += text;
    try { res.write(`data: ${JSON.stringify({ type: 'out', text })}\n\n`); } catch (e) {}
  });

  // 实时推送 stderr
  proc.stderr.on('data', data => {
    const text = data.toString();
    outputBuffer += text;
    try { res.write(`data: ${JSON.stringify({ type: 'err', text })}\n\n`); } catch (e) {}
  });

  // 进程结束
  proc.on('close', code => {
    clearInterval(heartbeat);
    if (currentProc === proc) {
      currentProc = null;
    }
    if (currentRes === res) {
      currentRes = null;
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'done', code: code || 0 })}\n\n`);
      res.end();
    } catch (e) {}

    log(prompt, cwd, code === 0 ? 'success' : 'error');

    // 保存到对话历史
    const history = loadHistory();
    history.unshift({
      id: Date.now().toString(),
      prompt,
      workdir: cwd,
      time: new Date().toISOString(),
      output: outputBuffer
    });
    if (history.length > 200) history.length = 200;
    saveHistory(history);
  });

  proc.on('error', err => {
    clearInterval(heartbeat);
    if (currentProc === proc) {
      currentProc = null;
    }
    if (currentRes === res) {
      currentRes = null;
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'err', text: `启动失败: ${err.message}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', code: -1 })}\n\n`);
      res.end();
    } catch (e) {}
    log(prompt, cwd, 'spawn-error');
  });

  // 客户端断开时清理（不杀进程，让 claude 执行完毕并保存历史）
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// 记忆文件目录
const MEMORY_DIR = path.join(os.homedir(), '.claude', 'projects', 'C--Users-19915', 'memory');

// 获取记忆列表
app.get('/api/memory', (req, res) => {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(MEMORY_DIR, f)).mtime
      }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 读取指定记忆文件
app.get('/api/memory/:name', (req, res) => {
  try {
    const filePath = path.join(MEMORY_DIR, req.params.name);
    if (!filePath.startsWith(MEMORY_DIR)) {
      return res.status(403).json({ error: '禁止访问' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 对话历史
const HISTORY_FILE = path.join(__dirname, 'history.json');

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch (e) { return []; }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

// 获取历史列表
app.get('/api/history', (req, res) => {
  const history = loadHistory();
  res.json({ history: history.map(h => ({ id: h.id, prompt: h.prompt, workdir: h.workdir, time: h.time, preview: h.output.slice(0, 100) })) });
});

// 获取历史详情
app.get('/api/history/:id', (req, res) => {
  const history = loadHistory();
  const item = history.find(h => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: '记录不存在' });
  res.json(item);
});

// 删除历史记录
app.delete('/api/history/:id', (req, res) => {
  let history = loadHistory();
  history = history.filter(h => h.id !== req.params.id);
  saveHistory(history);
  res.json({ ok: true });
});

// 文件浏览器 - 获取盘符列表
function getDrives(callback) {
  if (process.platform !== 'win32') return callback([]);
  const { exec } = require('child_process');
  exec('wmic logicaldisk get name', { timeout: 5000 }, (err, stdout) => {
    if (err) return callback([]);
    const drives = stdout.split(/\s+/)
      .filter(d => /^[A-Z]:$/i.test(d))
      .map(d => ({ name: d.toUpperCase(), type: 'drive', path: d.toUpperCase() + '\\' }));
    callback(drives);
  });
}

// 文件浏览器 - 列出目录内容
app.get('/api/files', (req, res) => {
  const rawPath = req.query.path;

  // 请求盘符列表
  if (!rawPath || rawPath === 'DRIVES') {
    return getDrives(drives => {
      if (!drives.length) {
        // 非 Windows 或获取失败，回退到 home 目录
        const home = os.homedir();
        return res.json({
          current: 'DRIVES',
          parent: null,
          items: [{ name: home, type: 'dir', path: home }]
        });
      }
      res.json({ current: 'DRIVES', parent: null, items: drives });
    });
  }

  const dirPath = rawPath;
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return res.status(400).json({ error: '目录不存在' });
    }
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const dirs = [];
    const files = [];
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      try {
        const fullPath = path.join(dirPath, item.name);
        const stat = fs.statSync(fullPath);
        if (item.isDirectory()) {
          dirs.push({ name: item.name, type: 'dir', path: fullPath, mtime: stat.mtime });
        } else {
          files.push({ name: item.name, type: 'file', path: fullPath, size: stat.size, mtime: stat.mtime });
        }
      } catch (e) {
        // 跳过无权限的文件
      }
    }

    // 判断是否有上级目录；盘符根目录（如 C:\）的上级设为 DRIVES
    const parent = path.dirname(dirPath) !== dirPath ? path.dirname(dirPath) : 'DRIVES';

    res.json({ current: dirPath, parent, items: [...dirs, ...files] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 终止正在运行的任务（Windows 下 taskkill 强杀进程树）
app.post('/api/stop', (req, res) => {
  if (!currentProc) {
    return res.json({ ok: true, message: '没有正在运行的任务' });
  }

  const proc = currentProc;
  const procRes = currentRes;
  const pid = proc.pid;

  // 严格确保 pid 存在且不是当前 Node.js 主服务进程
  if (!pid || pid === process.pid) {
    currentProc = null;
    currentRes = null;
    if (procRes) {
      try { procRes.end(); } catch (e) {}
    }
    return res.json({ ok: true, message: '无效或受保护的 PID' });
  }

  let responded = false;
  const cleanUpAndRespond = () => {
    if (responded) return;
    responded = true;
    currentProc = null;
    currentRes = null;
    try {
      res.json({ ok: true });
    } catch (e) {}
  };

  if (process.platform === 'win32') {
    try {
      const killer = spawn('cmd.exe', ['/s', '/c', `taskkill /pid ${pid} /f /t`], { windowsHide: true });
      
      killer.on('close', cleanUpAndRespond);
      killer.on('error', cleanUpAndRespond);

      // 通知客户端进程已被终止
      if (procRes) {
        try {
          procRes.write(`data: ${JSON.stringify({ type: 'done', code: -1, text: '进程已被手动停止' })}\n\n`);
          procRes.end();
        } catch (e) {}
      }

      // 5秒安全超时网，防止 taskkill 进程卡死导致回调无法触发
      setTimeout(cleanUpAndRespond, 5000);
    } catch (e) {
      if (procRes) {
        try { procRes.end(); } catch (err) {}
      }
      cleanUpAndRespond();
    }
  } else {
    try {
      proc.kill('SIGKILL');
    } catch (e) {
      // 捕获异常
    }
    if (procRes) {
      try {
        procRes.write(`data: ${JSON.stringify({ type: 'done', code: -1, text: '进程已被手动停止' })}\n\n`);
        procRes.end();
      } catch (e) {}
    }
    cleanUpAndRespond();
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  if (currentProc && currentProc.pid && currentProc.pid !== process.pid) {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${currentProc.pid} /f /t`);
      } catch (e) {}
    } else {
      try { currentProc.kill('SIGKILL'); } catch (e) {}
    }
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ 服务已启动 http://localhost:${PORT}`);
  console.log(`📂 默认工作目录: ${os.homedir()}`);
});
