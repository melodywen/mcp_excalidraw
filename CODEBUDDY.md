# CODEBUDDY.md This file provides guidance to CodeBuddy Code when working with code in this repository.

## Project Overview

This is **MCP Excalidraw Server** - a TypeScript-based system that integrates Excalidraw's drawing capabilities with the Model Context Protocol (MCP), enabling AI agents to create and manipulate diagrams in real-time on a live canvas.

### Two Independent Components

The system consists of two separate processes:

1. **Canvas Server** (`src/server.ts` → `dist/server.js`) - Provides the live Excalidraw web interface with WebSocket synchronization
2. **MCP Server** (`src/index.ts` → `dist/index.js`) - Implements MCP protocol for AI agent integration

Both components are fully TypeScript-based and compile to ES modules in the `dist/` directory.

## Essential Commands

### Development

```bash
# Build entire project (frontend + backend)
npm run build

# Build only frontend (React + Vite)
npm run build:frontend

# Build only TypeScript backend
npm run build:server

# Type checking without compilation
npm run type-check

# Development mode (watch mode + Vite dev server)
npm run dev
```

### Running Servers

```bash
# Start Canvas Server (port 3000)
npm run canvas

# Start MCP Server (stdio protocol)
npm start

# Production mode (build + start canvas)
npm run production
```

### Docker

```bash
# Build Canvas Server image
docker build -f Dockerfile.canvas -t mcp-excalidraw-canvas .

# Build MCP Server image
docker build -f Dockerfile -t mcp-excalidraw .

# Run Canvas Server
docker run -d -p 3000:3000 --name mcp-excalidraw-canvas mcp-excalidraw-canvas

# Run MCP Server (requires --network host and -i flag)
docker run -i --rm --network host \
  -e EXPRESS_SERVER_URL=http://localhost:3000 \
  -e ENABLE_CANVAS_SYNC=true \
  mcp-excalidraw
```

## Architecture

### Source Structure

```
src/
├── index.ts      # MCP Server - Implements MCP protocol
├── server.ts     # Canvas Server - Express + WebSocket server
├── types.ts      # Comprehensive TypeScript type definitions
└── utils/
    └── logger.ts # Winston-based logging utility
```

### Build Output Structure

```
dist/
├── index.js           # Compiled MCP server
├── server.js          # Compiled Canvas server
├── types.js           # Compiled types
├── *.d.ts            # TypeScript declaration files
├── utils/            # Compiled utilities
└── frontend/         # Built React app (from Vite)
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx       # Main React component
│   └── main.tsx      # React entry point
└── index.html        # HTML template
```

## Key Technical Details

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext (ES modules, not CommonJS)
- **Strict Mode**: Enabled with all strict flags
- **Output**: `dist/` directory with declaration files
- **Important**: This project uses ES modules (`"type": "module"` in package.json)

### Type System (`src/types.ts`)

The project defines comprehensive types for:
- **ExcalidrawElement**: Base element interface with all properties
- **ExcalidrawTextElement**: Text-specific element
- **ExcalidrawArrowElement**: Arrow/line elements with points
- **ExcalidrawFrameElement**: Frame container elements
- **ServerElement**: Elements with server-side metadata
- **WebSocket Messages**: Type-safe WebSocket communication
- **API Responses**: Strongly typed REST API interfaces

### Canvas Server (`src/server.ts`)

**Technology Stack**:
- Express.js with TypeScript
- WebSocket (ws) for real-time sync
- In-memory element storage
- CORS enabled

**Key Features**:
- REST API endpoints for element CRUD
- WebSocket broadcast to all connected clients
- Serves built React frontend from `dist/index.html` and `dist/frontend/`
- Health check endpoint at `/health`

**Important**: The server serves TWO paths:
1. `dist/index.html` - Canvas page
2. `dist/frontend/` - Vite-built assets

### MCP Server (`src/index.ts`)

**Technology Stack**:
- `@modelcontextprotocol/sdk` for MCP protocol
- Zod for schema validation
- HTTP client to communicate with Canvas Server

**Communication**:
- Uses stdio protocol (stdin/stdout)
- Sends HTTP requests to Canvas Server when `ENABLE_CANVAS_SYNC=true`
- Implements 15+ MCP tools for element manipulation

**Tools Implemented**:
- `create_element`, `update_element`, `delete_element`
- `query_elements`, `batch_create_elements`
- `group_elements`, `ungroup_elements`
- `align_elements`, `distribute_elements`
- `lock_elements`, `unlock_elements`
- `get_resource`
- `create_from_mermaid` (Mermaid diagram conversion)

### Frontend (`frontend/src/App.tsx`)

**Technology Stack**:
- React 18 + TypeScript (TSX)
- Official `@excalidraw/excalidraw` package
- WebSocket client for real-time updates
- Vite for building

**Key Features**:
- Dual-path element loading (HTTP + WebSocket)
- Auto-reconnection logic
- Clean UI with connection status
- Clear canvas button
- Mermaid test button (development)

**WebSocket Protocol**:
```typescript
// Client receives
{ type: 'init', elements: ExcalidrawElement[] }
{ type: 'update', element: ExcalidrawElement }
{ type: 'delete', id: string }
{ type: 'clear' }
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXPRESS_SERVER_URL` | `http://localhost:3000` | Canvas server URL for MCP sync |
| `ENABLE_CANVAS_SYNC` | `true` | Enable/disable canvas sync |
| `PORT` | `3000` | Canvas server port |
| `HOST` | `localhost` | Canvas server host |
| `LOG_FILE_PATH` | `excalidraw.log` | Log file path |
| `DEBUG` | `false` | Debug logging |

## Development Workflow

### Making Changes to Backend

1. Edit TypeScript files in `src/`
2. Run `npm run build:server` or use watch mode: `npm run dev`
3. Compiled output appears in `dist/`
4. Test with `npm run canvas` or `npm start`

### Making Changes to Frontend

1. Edit React components in `frontend/src/`
2. Run `npm run build:frontend` or use dev server: `npm run dev`
3. Built output appears in `dist/frontend/`
4. Canvas server serves from `dist/index.html` and `dist/frontend/`

### Testing Full Integration

1. Build everything: `npm run build`
2. Start canvas server: `npm run canvas`
3. Open browser: `http://localhost:3000`
4. Configure MCP server in Claude Desktop/Code/Cursor
5. Ask AI to create diagrams

## Critical Integration Points

### Canvas ↔ MCP Server Communication

**MCP Server → Canvas Server**:
```typescript
// HTTP POST to create element
fetch('http://localhost:3000/api/elements', {
  method: 'POST',
  body: JSON.stringify(element)
})
```

**Canvas Server → Frontend**:
```typescript
// WebSocket broadcast
wss.clients.forEach(client => {
  client.send(JSON.stringify({
    type: 'update',
    element: element
  }))
})
```

### Docker Networking

**Important**: When running MCP server in Docker:
- MUST use `--network host` flag (to access localhost:3000)
- MUST use `-i` flag (for stdio protocol)
- Canvas server can be local OR Docker (both work)

## IDE Configuration

The MCP server is configured in IDE config files:
- **Claude Desktop**: `claude_desktop_config.json` (in macOS: `~/Library/Application Support/Claude/`)
- **Claude Code**: `.mcp.json` (project root)
- **Cursor**: `.cursor/mcp.json`

**Local MCP Server Config**:
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

**Docker MCP Server Config**:
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

## Common Issues

### Build Issues

**Problem**: Build fails with type errors
- **Solution**: Run `npm run type-check` to identify issues
- **Solution**: Check TypeScript version: `npx tsc --version` (should be 5.x)
- **Solution**: Delete `dist/` and rebuild: `rm -rf dist && npm run build`

**Problem**: Frontend not loading
- **Solution**: Ensure `dist/index.html` exists after `npm run build:frontend`
- **Solution**: Verify `dist/frontend/` directory has Vite output
- **Solution**: Check console for 404 errors on asset paths

### Runtime Issues

**Problem**: Elements not syncing to canvas
- **Solution**: Verify canvas server is running on port 3000
- **Solution**: Check `ENABLE_CANVAS_SYNC=true` in MCP config
- **Solution**: Confirm `EXPRESS_SERVER_URL` points to correct URL
- **Solution**: For Docker MCP, ensure `--network host` is used

**Problem**: WebSocket connection failed
- **Solution**: Check browser console (F12) for WebSocket errors
- **Solution**: Verify no firewall blocking port 3000
- **Solution**: Test health endpoint: `curl http://localhost:3000/health`

**Problem**: MCP tools not appearing in IDE
- **Solution**: Restart IDE after config changes
- **Solution**: Check MCP server logs in IDE's MCP panel
- **Solution**: Verify `dist/index.js` exists and is executable

## Testing

### Manual Testing Canvas Server

```bash
# Start server
npm run canvas

# Test health endpoint
curl http://localhost:3000/health

# Test create element
curl -X POST http://localhost:3000/api/elements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 100
  }'

# Test get elements
curl http://localhost:3000/api/elements
```

### Manual Testing MCP Server

1. Configure in Claude Desktop/Code/Cursor
2. Open IDE and check MCP connection status
3. Ask Claude to create a diagram
4. Verify elements appear on canvas at http://localhost:3000

## Project-Specific Skills

This repository includes a CodeBuddy skill for Excalidraw diagram creation:

**Location**: `.codebuddy/skills/excalidraw-diagram/`

**Structure**:
```
.codebuddy/skills/excalidraw-diagram/
├── SKILL.md                    # Main skill instructions
└── references/
    └── schema.md              # Complete Excalidraw schema reference
```

**When to load**: When users request diagram creation, architecture diagrams, flowcharts, mind maps, or any visual diagrams.

**Key concepts**:
- Element skeleton (ExcalidrawElementSkeleton)
- Dual-direction bindings (container↔text, arrow↔element)
- Batch element creation with preset IDs
- Layout planning and color schemes

## Dependencies

### Production Dependencies

- `@excalidraw/excalidraw` - Official Excalidraw React component
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `express` - Web server
- `ws` - WebSocket server
- `winston` - Logging
- `zod` - Schema validation
- `react` + `react-dom` - Frontend framework

### Development Dependencies

- `typescript` - TypeScript compiler (5.8+)
- `vite` - Frontend build tool
- `@vitejs/plugin-react` - React plugin for Vite
- Various `@types/*` packages for TypeScript definitions

## Node.js Requirements

- **Minimum**: Node.js 18.x
- **Recommended**: Node.js 20.x
- **Module System**: ES modules only (not CommonJS)
