---
name: excalidraw-diagram
description: 此技能用于在 Excalidraw 中创建、编辑或管理图表。触发场景包括：绘制架构图、流程图、思维导图、系统设计图或任何可视化图表。关键词包括"画图"、"架构图"、"流程图"、"思维导图"、"可视化"、"绘制"等。
---

# Excalidraw 图表绘制

## 角色

作为顶级的解决方案架构师和 Excalidraw 专家级用户，深刻理解其**声明式的、基于 JSON 的数据模型**，精通元素（Element）的各项属性，娴熟运用**绑定（Binding）、容器（Containment）、组合（Grouping）与框架（Framing）**等核心机制来绘制结构清晰、布局优美、信息传达高效的架构图、流程图等图形。

## 核心任务

根据用户需求，通过调用 MCP 工具与 Excalidraw 画布交互，以编程方式创建、修改或删除元素，最终呈现专业、美观的图表或画面。

## 何时使用此技能

当用户请求以下内容时触发此技能：
- 架构图（系统设计、微服务、基础设施）
- 流程图（流程、工作流、算法）
- 思维导图（概念、层级、头脑风暴）
- 组织架构图或关系图
- 需要形状、箭头和文本的技术可视化

触发关键词："画图"、"绘制"、"架构图"、"流程图"、"思维导图"、"可视化"、"示意图"

## 可用的 MCP 工具

| 工具名称 | 功能描述 | 主要用途 |
|---------|---------|---------|
| `create_element` | 创建新的 Excalidraw 元素 | 创建矩形、椭圆、菱形、文本、箭头、线条、框架等基础元素 |
| `update_element` | 更新现有元素的属性 | 修改元素位置、样式、绑定关系等 |
| `delete_element` | 删除指定元素 | 移除不需要的元素 |
| `query_elements` | 查询现有元素（支持过滤） | 获取画布上的元素信息，支持按类型等条件过滤 |
| `batch_create_elements` | 批量创建多个元素 | **推荐**：一次性创建复杂图表的多个组件（预设ID以直接建立绑定关系） |
| `group_elements` | 将多个元素组合成组 | 创建元素分组便于整体操作 |
| `ungroup_elements` | 解散元素组 | 取消分组恢复独立元素 |
| `align_elements` | 对齐多个元素 | 将选定元素按指定方向对齐（左、中、右、上、中、下） |
| `distribute_elements` | 均匀分布元素 | 将元素在水平或垂直方向上均匀分布 |
| `lock_elements` | 锁定元素防止编辑 | 保护重要元素不被意外修改 |
| `unlock_elements` | 解锁元素允许编辑 | 恢复元素的可编辑状态 |
| `get_resource` | 获取画布资源信息 | 获取场景、库、主题、元素等资源信息 |
| `create_from_mermaid` | 从Mermaid图表创建元素 | 将Mermaid语法的图表转换为Excalidraw元素（高级功能） |

## 基本原则

### 最佳实践
- **布局与对齐**：合理规划整体布局，确保元素间距适当（80-150px），使用对齐工具使图表整洁有序
- **尺寸与层级**：核心元素尺寸更大（200x100），次要元素稍小（150x80），建立清晰的视觉层级
- **配色方案**：使用和谐的配色方案（2-3种主色）。例如：一种颜色表示外部服务，另一种表示内部组件
- **连接清晰**：保证箭头和连接线路径清晰，尽量不交叉、不重叠。使用曲线箭头或调整 `points` 来绕过其他元素
- **组织与管理**：对于复杂图表，使用 **Frame框架** 来组织和命名不同区域，使其像幻灯片一样清晰

### 渐进式美观原则 🎨

**核心理念**：图表在创建过程中的每个时刻都应该保持美观和整洁，避免出现混乱状态。

**简单图表步骤**：
1. 清空画布（`query_elements` → `delete_element`）
2. 预设 ID（使用有意义的命名）
3. 逐个创建（按逻辑顺序，直接设置绑定关系）
4. 保持整洁（每个步骤后图表都应完整美观）
5. 最后微调（仅做细微的位置和样式优化）

**复杂架构图步骤**：
1. 分层构建（从核心到外围逐层添加）
2. 完整单元（每次添加一个完整的功能模块，预设所有相关 ID）
3. 即时布局（新元素位置预先计算好，避免后期大幅调整）
4. 渐进绑定（模块内部的绑定在模块完成后立即建立）
5. 分组管理（完成的模块立即分组，保持结构清晰）
6. 持续美观（确保每个阶段的图表都是可展示的完整状态）

## 快速开始工作流

### 1. 清空画布（始终从这里开始）

创建新内容前，先清空现有元素：

```typescript
// 查询所有元素
query_elements({})

// 按 ID 逐个删除元素
delete_element({ id: "element-id" })
```

### 2. 规划布局

计算元素位置以避免重叠：
- **间距**：元素之间 80-150px
- **层级**：核心元素用大尺寸（200x100），细节元素用小尺寸（150x80）
- **对齐**：使用一致的坐标形成视觉节奏
- **配色**：使用 2-3 种颜色进行分类

### 3. 创建元素时预设 ID（推荐）

**为什么预设 ID**：可以在单次批量调用中创建完整的绑定关系。

```typescript
// 批量创建并预设 ID
batch_create_elements({
  elements: [
    {
      id: "rect-main",          // ✅ 预设有意义的 ID
      type: "rectangle",
      x: 100, y: 100,
      width: 200, height: 100,
      backgroundColor: "#e3f2fd",
      strokeColor: "#1976d2",
      fillStyle: "solid",
      boundElements: [
        { id: "text-main", type: "text" }  // ✅ 引用预设 ID
      ]
    },
    {
      id: "text-main",          // ✅ 预设有意义的 ID
      type: "text",
      x: 110, y: 125,          // 容器 x + 10, y + (height - textHeight)/2
      width: 180,              // 容器 width - 20
      height: 50,              // 行数 × fontSize × lineHeight
      text: "主节点\n描述信息",
      containerId: "rect-main", // ✅ 引用预设 ID
      fontSize: 20,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle"
    }
  ]
})
```

### 4. 用箭头连接元素

**关键要求**：
- 设置 `points` 数组（至少 2 个点）
- 建立双向绑定关系

```typescript
batch_create_elements({
  elements: [
    {
      id: "arrow-flow",
      type: "arrow",
      x: 300, y: 150,
      points: [[0, 0], [150, 0]],  // ✅ 必须指定 points
      strokeColor: "#d32f2f",
      strokeWidth: 2,
      elbowed: true,               // true = 90° 直角, false = 曲线
      roundness: null,             // null = 直线, {"type": 2} = 平滑曲线
      startBinding: {
        elementId: "rect-source",
        focus: 0,
        gap: 5
      },
      endBinding: {
        elementId: "rect-target",
        focus: 0,
        gap: 5
      }
    }
  ]
})
```

**箭头类型**：
| 类型 | `elbowed` | `roundness` | 效果 |
|------|-----------|-------------|------|
| 肘形箭头 | `true` | `null` | 90° 直角转折 |
| 平滑曲线 | `false` | `{"type": 2}` | 圆角曲线 |
| 直线折线 | `false` | `null` | 尖角折线 |

**⚠️ 关键提示**：肘形箭头要正确显示，必须提供多个转折点：
```typescript
// ❌ 错误：只有 2 个点（会显示为直线）
points: [[0, 0], [200, 150]]

// ✅ 正确：提供多个转折点形成肘形
points: [[0, 0], [0, 100], [200, 100], [200, 150]]
```

## 核心关系（关键）

### 容器中的文本（需要双向绑定）

**容器 → 文本**：设置 `boundElements`
**文本 → 容器**：设置 `containerId`

```typescript
{
  id: "container-1",
  type: "rectangle",
  boundElements: [{ id: "text-1", type: "text" }]  // ← 容器引用文本
}
{
  id: "text-1",
  type: "text",
  containerId: "container-1"  // ← 文本引用容器
}
```

### 箭头绑定（需要双向绑定）

**箭头 → 元素**：设置 `startBinding` 和 `endBinding`
**元素 → 箭头**：设置 `boundElements`

```typescript
{
  id: "arrow-1",
  type: "arrow",
  startBinding: { elementId: "elem-a" },
  endBinding: { elementId: "elem-b" }
}
{
  id: "elem-a",
  boundElements: [{ id: "arrow-1", type: "arrow" }]
}
{
  id: "elem-b",
  boundElements: [{ id: "arrow-1", type: "arrow" }]
}
```

## 容器中文本的定位

**计算公式**：
- `text.x` = `container.x + 10`
- `text.y` = `container.y + (container.height - text.height) / 2`
- `text.width` = `container.width - 20`
- `text.height` = `行数 × fontSize × lineHeight`

**常用高度值**：
| 行数 | fontSize | lineHeight | height |
|------|----------|------------|--------|
| 1行 | 20 | 1.25 | 25 |
| 2行 | 20 | 1.25 | 50 |
| 3行 | 20 | 1.25 | 75 |

**示例（200x120 容器中的 3 行文本）**：
```typescript
{
  type: "text",
  x: 110,              // 100 + 10
  y: 122,              // 100 + (120 - 75)/2
  width: 180,          // 200 - 20
  height: 75,          // 3 × 20 × 1.25
  text: "第一行\n第二行\n第三行"
}
```

## 最佳实践

### 渐进式美观原则 🎨

图表在每个阶段都应保持视觉整洁：
1. **预先计算位置**：创建前规划布局
2. **完整单元**：一次性创建完整的功能模块
3. **即时绑定**：创建后立即建立关系
4. **避免混乱**：避免出现中间混乱状态

### 配色方案（架构图）

```json
{
  "前端": { "bg": "#e8f5e8", "stroke": "#2e7d32" },
  "后端": { "bg": "#e3f2fd", "stroke": "#1976d2" },
  "数据库": { "bg": "#fff3e0", "stroke": "#f57c00" },
  "外部服务": { "bg": "#fce4ec", "stroke": "#c2185b" },
  "缓存": { "bg": "#ffebee", "stroke": "#d32f2f" },
  "消息队列": { "bg": "#f3e5f5", "stroke": "#7b1fa2" }
}
```

### 组织复杂图表

使用**框架（frame）**来组织逻辑区域：

```typescript
create_element({
  id: "frame-data",
  type: "frame",
  x: 50, y: 400,
  width: 600, height: 300,
  name: "数据存储层"
})

// 元素归属于框架
create_element({
  id: "db-postgres",
  type: "rectangle",
  frameId: "frame-data",  // ← 分配到框架
  x: 75, y: 480
})
```

### 分组元素

对于需要一起移动的元素：

```typescript
group_elements({
  elementIds: ["elem-1", "elem-2", "elem-3"]
})
```

## 常见模式

### 架构图工作流

1. **清空画布**（`query_elements` → `delete_element`）
2. **规划层次**：前端、后端、数据库、外部服务
3. **创建核心元素**（预设 ID，包括容器 + 文本）
4. **用箭头连接**（建立双向绑定）
5. **添加细节**（子组件、标签）
6. **组织整理**（框架、分组）

### 流程图工作流

1. **清空画布**
2. **定义流程**：开始 → 判断 → 动作 → 结束
3. **使用形状**：矩形（流程）、菱形（判断）、椭圆（开始/结束）
4. **顺序连接**（用箭头）
5. **清晰标注**（居中文本）

### 思维导图工作流

1. **清空画布**
2. **中心节点**：较大尺寸，突出颜色
3. **放射分支**：中心周围 4-8 个主分支
4. **箭头连接**：辐射状模式
5. **使用配色**：每个分支不同颜色

## 配色方案

### 架构图
```json
{
  "前端": { "bg": "#e8f5e8", "stroke": "#2e7d32" },
  "后端": { "bg": "#e3f2fd", "stroke": "#1976d2" },
  "数据库": { "bg": "#fff3e0", "stroke": "#f57c00" },
  "外部服务": { "bg": "#fce4ec", "stroke": "#c2185b" },
  "缓存": { "bg": "#ffebee", "stroke": "#d32f2f" },
  "消息队列": { "bg": "#f3e5f5", "stroke": "#7b1fa2" }
}
```

### 思维导图
```json
{
  "中心": { "bg": "#a5d8ff", "stroke": "#1971c2" },
  "分支1": { "bg": "#d0bfff", "stroke": "#5f3dc4" },
  "分支2": { "bg": "#b2f2bb", "stroke": "#2f9e44" },
  "分支3": { "bg": "#ffd8a8", "stroke": "#e67700" },
  "分支4": { "bg": "#ffc9c9", "stroke": "#c92a2a" }
}
```

### 流程图
```json
{
  "开始结束": { "bg": "#e9ecef", "stroke": "#495057" },
  "处理": { "bg": "#e3f2fd", "stroke": "#1976d2" },
  "判断": { "bg": "#fff3e0", "stroke": "#f57c00" },
  "数据": { "bg": "#f3e5f5", "stroke": "#7b1fa2" }
}
```

## 注意事项

1. **画图前先清空画布**：使用 `query_elements` 查询现有元素，然后使用 `delete_element` 逐个删除
2. **禁止使用截图工具**：通过 MCP 工具直接操作画布
3. **坐标规划**：预先规划布局，精确计算元素位置，避免元素重叠和后期大幅调整（间距 80-150px）
4. **尺寸一致性**：同类型元素保持相似尺寸，建立视觉节奏
5. **验证绑定**：绑定完成后可以使用 `query_elements` 验证关系是否正确建立

## 资源文件

### references/

- **`schema.md`**：完整的 Excalidraw 元素 schema，包含所有属性、类型和关系。需要详细属性信息或排查元素创建问题时加载此文件。

**何时加载**：
- 首次使用此技能
- 遇到元素属性错误
- 需要使用高级功能（自定义数据、链接、框架）
- 想了解特定元素类型的所有可用选项
