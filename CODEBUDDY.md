# CODEBUDDY.md 
本文件为 CodeBuddy Code 在此代码仓库中工作时提供指导。

## 项目概览

这是 **MCP Excalidraw 服务器** - 一个基于 TypeScript 的系统，将 Excalidraw 的绘图能力与模型上下文协议 (MCP) 集成，使 AI 代理能够在实时画布上创建和操作图表。

### 两个独立组件

系统由两个独立的进程组成：

1. **Canvas 服务器** (`src/server.ts` → `dist/server.js`) - 提供实时 Excalidraw Web 界面和 WebSocket 同步
2. **MCP 服务器** (`src/index.ts` → `dist/index.js`) - 实现 MCP 协议以集成 AI 代理

两个组件都完全基于 TypeScript，编译到 `dist/` 目录为 ES 模块。

## 基本命令

### 开发

```bash
# 构建整个项目（前端 + 后端）
npm run build

# 仅构建前端（React + Vite）
npm run build:frontend

# 仅构建 TypeScript 后端
npm run build:server

# 类型检查（不编译）
npm run type-check

# 开发模式（监视模式 + Vite 开发服务器）
npm run dev
```

### 运行服务器

```bash
# 启动 Canvas 服务器（端口 3000）
npm run canvas

# 启动 MCP 服务器（stdio 协议）
npm start

# 生产模式（构建 + 启动 canvas）
npm run production
```

### Docker

```bash
# 构建 Canvas 服务器镜像
docker build -f Dockerfile.canvas -t mcp-excalidraw-canvas .

# 构建 MCP 服务器镜像
docker build -f Dockerfile -t mcp-excalidraw .

# 运行 Canvas 服务器
docker run -d -p 3000:3000 --name mcp-excalidraw-canvas mcp-excalidraw-canvas

# 运行 MCP 服务器（需要 --network host 和 -i 标志）
docker run -i --rm --network host \
  -e EXPRESS_SERVER_URL=http://localhost:3000 \
  -e ENABLE_CANVAS_SYNC=true \
  mcp-excalidraw
```

## 架构

### 源代码结构

```
src/
├── index.ts      # MCP 服务器 - 实现 MCP 协议
├── server.ts     # Canvas 服务器 - Express + WebSocket 服务器
├── types.ts      # 全面的 TypeScript 类型定义
└── utils/
    └── logger.ts # 基于 Winston 的日志工具
```

### 构建输出结构

```
dist/
├── index.js           # 编译后的 MCP 服务器
├── server.js          # 编译后的 Canvas 服务器
├── types.js           # 编译后的类型
├── *.d.ts            # TypeScript 声明文件
├── utils/            # 编译后的工具
└── frontend/         # 构建的 React 应用（来自 Vite）
```

### 前端结构

```
frontend/
├── src/
│   ├── App.tsx       # 主 React 组件
│   └── main.tsx      # React 入口点
└── index.html        # HTML 模板
```

## 关键技术细节

### TypeScript 配置

- **目标**: ES2022
- **模块**: ESNext（ES 模块，非 CommonJS）
- **严格模式**: 启用所有严格标志
- **输出**: `dist/` 目录，包含声明文件
- **重要**: 此项目使用 ES 模块（package.json 中 `"type": "module"`）

### 类型系统 (`src/types.ts`)

项目定义了全面的类型：
- **ExcalidrawElement**: 包含所有属性的基础元素接口
- **ExcalidrawTextElement**: 文本特定元素
- **ExcalidrawArrowElement**: 带点的箭头/线条元素
- **ExcalidrawFrameElement**: 框架容器元素
- **ServerElement**: 带服务器端元数据的元素
- **WebSocket Messages**: 类型安全的 WebSocket 通信
- **API Responses**: 强类型 REST API 接口

### Canvas 服务器 (`src/server.ts`)

**技术栈**:
- Express.js 配合 TypeScript
- WebSocket (ws) 用于实时同步
- 内存元素存储
- 启用 CORS

**关键特性**:
- 元素 CRUD 的 REST API 端点
- WebSocket 广播到所有连接的客户端
- 从 `dist/index.html` 和 `dist/frontend/` 提供构建的 React 前端
- `/health` 健康检查端点

**重要**: 服务器提供两个路径：
1. `dist/index.html` - Canvas 页面
2. `dist/frontend/` - Vite 构建的资源

### MCP 服务器 (`src/index.ts`)

**技术栈**:
- `@modelcontextprotocol/sdk` 用于 MCP 协议
- Zod 用于 schema 验证
- HTTP 客户端与 Canvas 服务器通信

**通信方式**:
- 使用 stdio 协议（stdin/stdout）
- 当 `ENABLE_CANVAS_SYNC=true` 时向 Canvas 服务器发送 HTTP 请求
- 实现 13 个 MCP 工具用于元素操作

**已实现的工具**:
- `create_element`, `update_element`, `delete_element`
- `query_elements`, `batch_create_elements`
- `group_elements`, `ungroup_elements`
- `align_elements`, `distribute_elements`
- `lock_elements`, `unlock_elements`
- `get_resource`
- `create_from_mermaid`（Mermaid 图表转换）

**重要元素属性说明**:
- **opacity（透明度）**: 使用 **0-100** 的数值范围（而非 0-1）
  - `100` = 完全不透明（默认值）
  - `50` = 半透明
  - `0` = 完全透明
  - 注意：虽然 TypeScript 类型定义为 `number`，但 Excalidraw 实际使用百分比值（0-100）

### 前端 (`frontend/src/App.tsx`)

**技术栈**:
- React 18 + TypeScript (TSX)
- 官方 `@excalidraw/excalidraw` 包
- WebSocket 客户端用于实时更新
- Vite 用于构建

**关键特性**:
- 双路径元素加载（HTTP + WebSocket）
- 自动重连逻辑
- 简洁的连接状态 UI
- 清空画布按钮
- Mermaid 测试按钮（开发用）

**WebSocket 协议**:
```typescript
// 客户端接收
{ type: 'init', elements: ExcalidrawElement[] }
{ type: 'update', element: ExcalidrawElement }
{ type: 'delete', id: string }
{ type: 'clear' }
```

## 环境变量

| 变量 | 默认值 | 用途 |
|----------|---------|---------|
| `EXPRESS_SERVER_URL` | `http://localhost:3000` | MCP 同步的 Canvas 服务器 URL |
| `ENABLE_CANVAS_SYNC` | `true` | 启用/禁用画布同步 |
| `PORT` | `3000` | Canvas 服务器端口 |
| `HOST` | `localhost` | Canvas 服务器主机 |
| `LOG_FILE_PATH` | `excalidraw.log` | 日志文件路径 |
| `DEBUG` | `false` | 调试日志 |

## 开发工作流

### 修改后端代码

1. 编辑 `src/` 中的 TypeScript 文件
2. 运行 `npm run build:server` 或使用监视模式：`npm run dev`
3. 编译输出出现在 `dist/`
4. 使用 `npm run canvas` 或 `npm start` 测试

### 修改前端代码

1. 编辑 `frontend/src/` 中的 React 组件
2. 运行 `npm run build:frontend` 或使用开发服务器：`npm run dev`
3. 构建输出出现在 `dist/frontend/`
4. Canvas 服务器从 `dist/index.html` 和 `dist/frontend/` 提供服务

### 测试完整集成

1. 构建所有内容：`npm run build`
2. 启动 canvas 服务器：`npm run canvas`
3. 打开浏览器：`http://localhost:3000`
4. 在 Claude Desktop/Code/Cursor 中配置 MCP 服务器
5. 让 AI 创建图表

## 关键集成点

### Canvas ↔ MCP 服务器通信

**MCP 服务器 → Canvas 服务器**:
```typescript
// HTTP POST 创建元素
fetch('http://localhost:3000/api/elements', {
  method: 'POST',
  body: JSON.stringify(element)
})
```

**Canvas 服务器 → 前端**:
```typescript
// WebSocket 广播
wss.clients.forEach(client => {
  client.send(JSON.stringify({
    type: 'update',
    element: element
  }))
})
```

### Docker 网络

**重要**: 在 Docker 中运行 MCP 服务器时：
- 必须使用 `--network host` 标志（访问 localhost:3000）
- 必须使用 `-i` 标志（stdio 协议）
- Canvas 服务器可以是本地或 Docker（都可以）

## IDE 配置

MCP 服务器在 IDE 配置文件中配置：
- **Claude Desktop**: `claude_desktop_config.json`（macOS 中：`~/Library/Application Support/Claude/`）
- **Claude Code**: `.mcp.json`（项目根目录）
- **Cursor**: `.cursor/mcp.json`

**本地 MCP 服务器配置**:
```json
{
  "command": "node",
  "args": ["/absolute/path/to/dist/index.js"],
  "env": {
    "EXPRESS_SERVER_URL": "http://localhost:3000",
    "ENABLE_CANVAS_SYNC": "true"
  }
}
```

**Docker MCP 服务器配置**:
```json
{
  "command": "docker",
  "args": [
    "run", "-i", "--rm", "--network", "host",
    "-e", "EXPRESS_SERVER_URL=http://localhost:3000",
    "-e", "ENABLE_CANVAS_SYNC=true",
    "ghcr.io/yctimlin/mcp_excalidraw:latest"
  ]
}
```

## 常见问题

### 构建问题

**问题**: 构建因类型错误失败
- **解决方案**: 运行 `npm run type-check` 识别问题
- **解决方案**: 检查 TypeScript 版本：`npx tsc --version`（应为 5.x）
- **解决方案**: 删除 `dist/` 并重建：`rm -rf dist && npm run build`

**问题**: 前端无法加载
- **解决方案**: 确保 `npm run build:frontend` 后存在 `dist/index.html`
- **解决方案**: 验证 `dist/frontend/` 目录有 Vite 输出
- **解决方案**: 检查控制台中资源路径的 404 错误

### 运行时问题

**问题**: 元素未同步到画布
- **解决方案**: 验证 canvas 服务器运行在端口 3000
- **解决方案**: 检查 MCP 配置中的 `ENABLE_CANVAS_SYNC=true`
- **解决方案**: 确认 `EXPRESS_SERVER_URL` 指向正确的 URL
- **解决方案**: 对于 Docker MCP，确保使用 `--network host`

**问题**: WebSocket 连接失败
- **解决方案**: 检查浏览器控制台（F12）中的 WebSocket 错误
- **解决方案**: 验证没有防火墙阻止端口 3000
- **解决方案**: 测试健康端点：`curl http://localhost:3000/health`

**问题**: MCP 工具未出现在 IDE 中
- **解决方案**: 配置更改后重启 IDE
- **解决方案**: 检查 IDE 的 MCP 面板中的 MCP 服务器日志
- **解决方案**: 验证 `dist/index.js` 存在且可执行

## 测试

### 手动测试 Canvas 服务器

```bash
# 启动服务器
npm run canvas

# 测试健康端点
curl http://localhost:3000/health

# 测试创建元素
curl -X POST http://localhost:3000/api/elements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 100
  }'

# 测试获取元素
curl http://localhost:3000/api/elements
```

### 手动测试 MCP 服务器

1. 在 Claude Desktop/Code/Cursor 中配置
2. 打开 IDE 并检查 MCP 连接状态
3. 让 Claude 创建图表
4. 验证元素出现在 http://localhost:3000 的画布上

## 项目特定技能

此仓库包含用于 Excalidraw 图表创建的 CodeBuddy 技能：

**位置**: `.codebuddy/skills/excalidraw-diagram/`

**结构**:
```
.codebuddy/skills/excalidraw-diagram/
├── SKILL.md                    # 主技能说明
└── references/
    └── schema.md              # 完整 Excalidraw schema 参考
```

**何时加载**: 当用户请求创建图表、架构图、流程图、思维导图或任何可视化图表时。

**关键概念**:
- 元素骨架（ExcalidrawElementSkeleton）
- 双向绑定（容器↔文本，箭头↔元素）
- 使用预设 ID 批量创建元素
- 布局规划和配色方案

## 依赖项

### 生产依赖

- `@excalidraw/excalidraw` - 官方 Excalidraw React 组件
- `@modelcontextprotocol/sdk` - MCP 协议实现
- `express` - Web 服务器
- `ws` - WebSocket 服务器
- `winston` - 日志记录
- `zod` - Schema 验证
- `react` + `react-dom` - 前端框架

### 开发依赖

- `typescript` - TypeScript 编译器（5.8+）
- `vite` - 前端构建工具
- `@vitejs/plugin-react` - Vite 的 React 插件
- 各种 `@types/*` 包用于 TypeScript 定义

## Node.js 要求

- **最低**: Node.js 18.x
- **推荐**: Node.js 20.x
- **模块系统**: 仅 ES 模块（非 CommonJS）
