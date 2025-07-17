# Groq API Proxy for Claude Code

[English](#english) | [中文](#中文)

---

## English

A Cloudflare Workers proxy that converts Anthropic Claude API format to Groq API format, routing all requests to Groq's `moonshotai/kimi-k2-instruct` model for Claude Code editor integration.

### Features

- 🔄 Converts Anthropic Claude API to Groq API format
- 🚀 Routes to `moonshotai/kimi-k2-instruct` model - extremely fast (~250 tokens/sec)
- 🛠️ Supports function calling and tools
- ⚡ Serverless deployment on Cloudflare Workers
- 🔧 Direct Claude Code integration

### ⚠️ Rate Limits

This service uses Groq's free tier with strict limits:
- **RPM**: 60 requests per minute
- **RPD**: 1,000 requests per day  
- **TPM**: 10,000 tokens per minute
- **TPD**: 300,000 tokens per day

**For testing and development purposes only.**

### Quick Deploy

#### 1. Create Cloudflare Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Click "Create" → "Create Worker"
3. Name it (e.g., `groq-claude-proxy`) and click "Deploy"
4. Click "Edit code", replace with code from `workers.js`, then "Deploy"

#### 2. Configure Claude Code

Add to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export ANTHROPIC_BASE_URL=https://groq-claude-proxy.your-subdomain.workers.dev
export ANTHROPIC_API_KEY=your-groq-api-key-here
```

Reload: `source ~/.zshrc`

#### 3. Test

```bash
curl -X POST https://groq-claude-proxy.your-subdomain.workers.dev/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-groq-api-key" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 中文

一个将 Anthropic Claude API 格式转换为 Groq API 格式的 Cloudflare Workers 代理，将所有请求路由到 Groq 的 `moonshotai/kimi-k2-instruct` 模型，用于 Claude Code 编辑器集成。

### 功能特性

- 🔄 转换 Anthropic Claude API 到 Groq API 格式
- 🚀 路由到 `moonshotai/kimi-k2-instruct` 模型 - 速度极快（约250 tokens/秒）
- 🛠️ 支持函数调用和工具使用
- ⚡ 在 Cloudflare Workers 上无服务器部署
- 🔧 直接与 Claude Code 集成

### ⚠️ 速率限制

本服务使用 Groq 免费套餐，限制严格：
- **RPM**: 每分钟 60 次请求
- **RPD**: 每天 1,000 次请求
- **TPM**: 每分钟 10,000 个令牌
- **TPD**: 每天 300,000 个令牌

**仅供测试和开发体验使用。**

### 快速部署

#### 1. 创建 Cloudflare Worker

1. 访问 [Cloudflare 控制台](https://dash.cloudflare.com) → Workers & Pages
2. 点击"创建" → "创建 Worker"
3. 命名（如 `groq-claude-proxy`）并点击"部署"
4. 点击"编辑代码"，替换为 `workers.js` 中的代码，然后"部署"

#### 2. 配置 Claude Code

添加到你的 shell 配置文件（`~/.zshrc` 或 `~/.bashrc`）：

```bash
export ANTHROPIC_BASE_URL=https://groq-claude-proxy.your-subdomain.workers.dev
export ANTHROPIC_API_KEY=your-groq-api-key-here
```

重新加载：`source ~/.zshrc`

#### 3. 测试

```bash
curl -X POST https://groq-claude-proxy.your-subdomain.workers.dev/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-groq-api-key" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "你好！"}]
  }'
```

---

## Acknowledgments | 致谢

Inspired by [claude-code-kimi-groq](https://github.com/fakerybakery/claude-code-kimi-groq).

本项目受 [claude-code-kimi-groq](https://github.com/fakerybakery/claude-code-kimi-groq) 启发。
