# Excalidraw 元素 Schema 参考文档

本文档提供使用 MCP API 操作 Excalidraw 元素的完整 schema 规范。

## 1. 元素骨架概念

通过 API 创建元素时，只需提供 `ExcalidrawElementSkeleton`（元素骨架）——一个仅包含必要属性的简化对象。Excalidraw 前端会自动填充版本号、随机种子等内部属性。

## 2. 通用属性

所有元素类型都支持以下属性：

| 属性 | 类型 | 描述 | 默认值 | 示例 |
|------|------|------|--------|------|
| `id` | string | **可选，复杂图表推荐设置**。唯一标识符。不提供则系统自动生成。 | 自动生成 | `"elem_abc123"` |
| `type` | string | **必需**。元素类型：`rectangle`（矩形）、`ellipse`（椭圆）、`diamond`（菱形）、`arrow`（箭头）、`text`（文本）、`line`（线条）、`frame`（框架）、`freedraw`（自由绘制） | - | `"rectangle"` |
| `x, y` | number | **必填**。元素左上角的画布坐标。 | - | `150`, `300` |
| `width, height` | number | **必填**。元素的尺寸。 | - | `200`, `80` |
| `angle` | number | 旋转角度（弧度） | `0` | `1.57`（90°） |
| `strokeColor` | string | 边框颜色（十六进制） | `"#1e1e1e"` | `"#1976d2"` |
| `backgroundColor` | string | 填充颜色（十六进制） | `"transparent"` | `"#e3f2fd"` |
| `fillStyle` | string | 填充样式：`"hachure"`（阴影线）、`"solid"`（实心）、`"zigzag"`（锯齿） | `"hachure"` | `"solid"` |
| `strokeWidth` | number | 边框粗细 | `1` | `2`, `4` |
| `strokeStyle` | string | 边框样式：`"solid"`（实线）、`"dashed"`（虚线）、`"dotted"`（点线） | `"solid"` | `"dashed"` |
| `roughness` | number | 手绘效果程度（0-2）。0=整洁，2=粗糙 | `1` | `0`, `2` |
| `opacity` | number | 透明度（0-100）。0=完全透明，100=完全不透明 | `100` | `50` |
| `groupIds` | string[] | **（关系）**此元素所属的组 ID 列表 | `[]` | `["group-A"]` |
| `frameId` | string | **（关系）**包含此元素的框架 ID | `null` | `"frame-1"` |
| `roundness` | object/null | 圆角设置。详见 2.1 节 | 不同 | `{"type": 3, "value": 16}` |
| `locked` | boolean | 是否锁定（不可编辑） | `false` | `true` |
| `link` | string | 超链接 URL | `null` | `"https://example.com"` |
| `customData` | object | 自定义元数据存储 | `{}` | `{"category": "db"}` |
| `boundElements` | array | **（关系）**绑定到此元素的其他元素（箭头、文本）。**必须形成双向绑定** | `[]` | `[{"id": "arrow-1", "type": "arrow"}]` |
| `containerId` | string | **（关系）**容器元素 ID（用于文本）。**必须与容器的 `boundElements` 形成双向绑定** | `null` | `"rect-1"` |

### 2.1 ID 生成策略

推荐使用**预设 ID 模式**以获得最佳效率：

| 模式 | 方式 | ID格式 | 适用场景 |
|------|------|--------|---------|
| **预设ID（推荐）** | 调用方预先生成ID并传递 | 有意义的命名，如 `rect_main`, `text_title` | 复杂图表、批量创建、需要直接建立绑定关系 |
| **系统自动生成** | 不传递ID，从返回值获取 | 随机字符串 | 简单场景、不确定ID时 |

**预设ID工作流**：
1. 规划图表结构，生成所有元素ID
2. 调用 `batch_create_elements` 传递预设ID
3. 创建时直接设置绑定关系（boundElements, containerId等）

**ID命名规范**：使用描述性前缀，如 `container_main`、`text_title`、`arrow_flow1`

**优势**：
- 一次批量调用创建完整的绑定关系
- 有意义的命名提高可维护性
- 无需多步骤建立关系

**示例**：
```json
batch_create_elements({
  elements: [
    {
      // ======== 必填字段 ========
      "id": "api-server-main",           // 预设 ID（推荐）
      "type": "rectangle",               // ✅ 必填：元素类型
      "x": 300,                          // ✅ 必填：X 坐标
      "y": 200,                          // ✅ 必填：Y 坐标
      "width": 200,                      // ✅ 必填：宽度
      "height": 120,                     // ✅ 必填：高度
      
      // ======== 可选样式 ========
      "backgroundColor": "#e3fafc",      // 背景色
      "strokeColor": "#0c8599",          // 边框色
      "strokeWidth": 2,                  // 边框宽度
      "fillStyle": "solid",              // 填充样式
      "roundness": {"type": 3, "value": 8},  // 圆角
      
      // ======== 必需绑定 ========
      "boundElements": [                 // 绑定的元素
        {"id": "text-api-label", "type": "text"}
      ]
    },
    {
      // ======== 必填字段 ========
      "id": "text-api-label",            // 预设 ID（推荐）
      "type": "text",                    // ✅ 必填：元素类型
      "x": 310,                          // ✅ 必填：X 坐标
      "y": 235,                          // ✅ 必填：Y 坐标
      "width": 180,                      // ✅ 必填：宽度（文本也要！）
      "height": 50,                      // ✅ 必填：高度（文本也要！）
      "text": "API Server",              // ✅ 必填：文本内容
      
      // ======== 可选样式 ========
      "fontSize": 28,                    // 字体大小
      "fontFamily": 1,                   // 字体族
      "textAlign": "center",             // 水平对齐
      "verticalAlign": "middle",         // 垂直对齐
      
      // ======== 必需绑定 ========
      "containerId": "api-server-main"   // 容器 ID（绑定关系）
    }
  ]
})
```

**系统生成 ID 模式**：

| 步骤 | 操作 |
|------|------|
| 1 | 调用 `create_element` 不传 `id` |
| 2 | 从响应中提取生成的 ID |
| 3 | 存储 ID 以备后用 |
| 4 | 使用 `update_element` 建立关系 |

**何时使用**：简单场景，不需要预先建立关系。

### 2.2 Roundness 属性详解

| 元素类型 | roundness 值 | 效果 |
|---------|-------------|------|
| **形状（rectangle、diamond）** | `null` | 尖角（无圆角） |
| | `{"type": 1}` | 自适应圆角半径 |
| | `{"type": 2}` | 自适应圆角半径（与 type 1 类似） |
| | `{"type": 3, "value": 32}` | 指定像素半径（32px） |
| **箭头/线条** | `null` | 尖角折线 |
| | `{"type": 2}` | 平滑曲线 |

## 3. 形状元素（rectangle、ellipse、diamond）

**关键概念**：形状本身不直接包含文本。要添加标签，需创建单独的 `text` 元素并使用 `containerId` 绑定。

**推荐**：为将作为容器或箭头目标的形状预设 ID。

### 3.1 示例：带文本的矩形

```json
batch_create_elements({
  "elements": [
    {
      "id": "rect-container",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "backgroundColor": "#e3f2fd",
      "strokeColor": "#1976d2",
      "fillStyle": "solid",
      "roundness": {"type": 3, "value": 12},
      "boundElements": [
        {"id": "text-label", "type": "text"}
      ]
    },
    {
      "id": "text-label",
      "type": "text",
      "x": 110,
      "y": 125,
      "width": 180,
      "height": 50,
      "text": "API 服务器\n(Node.js)",
      "containerId": "rect-container",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "verticalAlign": "middle"
    }
  ]
})
```

## 4. 文本元素（text）

### 4.1 文本专有属性

| 属性 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| `text` | string | **必需**。显示文本。使用 `\n` 换行 | - |
| `originalText` | string | 编辑器存储的原始文本。未设置时使用 `text` 值 | 同 `text` |
| `fontSize` | number | 字体大小（像素） | `20` |
| `fontFamily` | number | 字体：`1`（Virgil/手写）、`2`（Helvetica/正常）、`3`（Cascadia/代码） | `1` |
| `textAlign` | string | 水平对齐：`"left"`、`"center"`、`"right"` | `"left"` |
| `verticalAlign` | string | 垂直对齐：`"top"`、`"middle"`、`"bottom"` | `"top"` |
| `containerId` | string | **（关键）**绑定到的容器元素 ID | `null` |
| `autoResize` | boolean | 自动扩展文本框 | `true` |
| `lineHeight` | number | 行高倍数 | `1.25` |

### 4.2 ⚠️ 关键：容器中文本的定位

当设置了 `containerId` 时，**必须手动指定 width 和 height**，否则渲染失败。

**计算公式**：

| 属性 | 计算公式 |
|------|---------|
| `text.x` | `container.x + 10` |
| `text.y` | `container.y + (container.height - text.height) / 2` |
| `text.width` | `container.width - 20` |
| `text.height` | `行数 × fontSize × lineHeight` |

**高度计算表**：

| 行数 | fontSize | lineHeight | 公式 | height |
|------|----------|------------|------|--------|
| 1行 | 20 | 1.25 | 1 × 20 × 1.25 | **25** |
| 2行 | 20 | 1.25 | 2 × 20 × 1.25 | **50** |
| 3行 | 20 | 1.25 | 3 × 20 × 1.25 | **75** |
| 2行 | 18 | 1.25 | 2 × 18 × 1.25 | **45** |
| 3行 | 18 | 1.25 | 3 × 18 × 1.25 | **67.5** → 68 |

### 4.3 示例：200x80 容器中的单行文本

```json
{
  "type": "text",
  "text": "容器标题",
  "x": 110,              // 100 + 10
  "y": 127,              // 100 + (80 - 25)/2
  "width": 180,          // 200 - 20
  "height": 25,          // 1 × 20 × 1.25
  "containerId": "rect-1",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "lineHeight": 1.25
}
```

### 4.4 示例：200x120 容器中的三行文本

```json
{
  "type": "text",
  "text": "API 服务器\n(Node.js)\n端口: 3000",
  "x": 110,              // 100 + 10
  "y": 122,              // 100 + (120 - 75)/2
  "width": 180,          // 200 - 20
  "height": 75,          // 3 × 20 × 1.25
  "containerId": "rect-2",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "lineHeight": 1.25
}
```

## 5. 箭头和线条元素（arrow、line）

### 5.1 箭头/线条专有属性

| 属性 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| `points` | number[][] | **必需**。路径坐标点**相对于元素的 (x,y)**。至少 2 个点 | - |
| `startArrowhead` | string/null | 起点箭头样式：`"arrow"`、`"dot"`、`"triangle"`、`"bar"`、`null` | `null` |
| `endArrowhead` | string/null | 终点箭头样式：`"arrow"`、`"dot"`、`"triangle"`、`"bar"`、`null` | `"arrow"`（箭头类型） |
| `roundness` | object/null | 曲线类型。`{"type": 2}` = 平滑曲线，`null` = 直线/尖角 | `{"type": 2}` |
| `elbowed` | boolean | 90° 直角转折（肘形箭头） | `false` |
| `startBinding` | object/null | 起点绑定的元素信息。详见 6.2 节 | `null` |
| `endBinding` | object/null | 终点绑定的元素信息。详见 6.2 节 | `null` |

### 5.2 绑定对象属性（Binding）

| 属性 | 类型 | 描述 |
|------|------|------|
| `elementId` | string | 目标元素 ID |
| `focus` | number | 边缘位置（-1 到 1，0=中心） |
| `gap` | number | 箭头与元素的像素间隙 |

### 5.3 箭头类型对照表

| 类型 | `roundness` | `elbowed` | 视觉效果 |
|------|-------------|-----------|---------|
| 平滑曲线 | `{"type": 2}` | `false` | 圆角曲线 |
| 直线折线 | `null` | `false` | 尖角折线 |
| 肘形箭头 | `null` | `true` | 90° 直角转折 |

### 5.4 ⚠️ 关键：箭头 Points

**必须指定 `points` 数组**。不能只依赖 `width`/`height`。

**对于肘形箭头**：提供多个转折点，而不仅仅是起点和终点。

```typescript
// ❌ 错误：只有 2 个点（即使 elbowed=true 也显示为直线）
{
  "elbowed": true,
  "points": [[0, 0], [200, 150]]
}

// ✅ 正确：提供多个转折点形成肘形
{
  "elbowed": true,
  "roundness": null,
  "points": [
    [0, 0],          // 起点
    [0, 100],        // 第一个转折（向下）
    [200, 100],      // 第二个转折（向右）
    [200, 150]       // 终点
  ]
}
```

### 5.5 示例：简单的水平箭头

```json
{
  "id": "arrow-1",
  "type": "arrow",
  "x": 300,
  "y": 150,
  "points": [[0, 0], [160, 0]],  // ← 简单直线
  "strokeColor": "#d32f2f",
  "strokeWidth": 2,
  "roundness": {"type": 2}  // 平滑曲线（对直线无效）
}
```

### 5.6 示例：带绑定的肘形箭头

```json
{
  "id": "arrow-elbow",
  "type": "arrow",
  "x": 280,
  "y": 150,
  "points": [
    [0, 0],
    [0, 100],      // 向下 100px
    [170, 100],    // 向右 170px
    [170, 150]     // 向下 50px
  ],
  "strokeColor": "#1976d2",
  "strokeWidth": 3,
  "elbowed": true,
  "roundness": null,  // 肘形箭头必需
  "startBinding": {
    "elementId": "rect-source",
    "focus": 0.0,
    "gap": 5
  },
  "endBinding": {
    "elementId": "rect-target",
    "focus": 0.0,
    "gap": 5
  }
}
```

## 6. 关系机制深度解析

### 6.1 容器中的文本（双向绑定）

**必需关系**：

| 方向 | 设置方式 |
|------|---------|
| 容器 → 文本 | 容器的 `boundElements` 数组包含文本 ID 和类型 |
| 文本 → 容器 | 文本的 `containerId` 引用容器 ID |

**示例**：
```json
{
  "id": "container-1",
  "type": "rectangle",
  "boundElements": [
    {"id": "text-1", "type": "text"}  // ← 容器知道文本
  ]
}
{
  "id": "text-1",
  "type": "text",
  "containerId": "container-1"  // ← 文本知道容器
}
```

### 6.2 箭头绑定（双向绑定）

**必需关系**：

| 方向 | 设置方式 |
|------|---------|
| 箭头 → 元素 | 箭头的 `startBinding` 和 `endBinding` 引用元素 ID |
| 元素 → 箭头 | 元素的 `boundElements` 数组包含箭头 ID 和类型 |

**完整示例**：
```json
[
  {
    "id": "rect-a",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 180,
    "height": 100,
    "boundElements": [
      {"id": "arrow-1", "type": "arrow"}  // ← 元素知道箭头
    ]
  },
  {
    "id": "rect-b",
    "type": "rectangle",
    "x": 450,
    "y": 100,
    "width": 180,
    "height": 100,
    "boundElements": [
      {"id": "arrow-1", "type": "arrow"}  // ← 元素知道箭头
    ]
  },
  {
    "id": "arrow-1",
    "type": "arrow",
    "x": 280,
    "y": 150,
    "points": [[0, 0], [170, 0]],
    "strokeColor": "#d32f2f",
    "strokeWidth": 2,
    "startBinding": {
      "elementId": "rect-a",  // ← 箭头知道起点元素
      "focus": 0.0,
      "gap": 5
    },
    "endBinding": {
      "elementId": "rect-b",  // ← 箭头知道终点元素
      "focus": 0.0,
      "gap": 5
    }
  }
]
```

### 6.3 元素分组

**方法 1：使用 MCP 工具**
```typescript
group_elements({
  elementIds: ["elem-1", "elem-2", "elem-3"]
})
```

**方法 2：手动设置 groupIds**
```json
{
  "id": "elem-1",
  "groupIds": ["auth-group"]
}
{
  "id": "elem-2",
  "groupIds": ["auth-group"]
}
```

**效果**：分组元素在 UI 中一起移动和变换。

### 6.4 框架分配

**方法**：设置元素的 `frameId` 为框架的 `id`

```json
{
  "id": "frame-data",
  "type": "frame",
  "x": 50,
  "y": 400,
  "width": 600,
  "height": 300,
  "name": "数据层"
}
{
  "id": "postgres-db",
  "type": "rectangle",
  "frameId": "frame-data",  // ← 分配元素到框架
  "x": 75,
  "y": 480
}
```

## 7. 常用配色方案

### 7.1 架构图配色

| 类别 | backgroundColor | strokeColor |
|------|----------------|-------------|
| 前端 | `#e8f5e8` | `#2e7d32` |
| 后端 | `#e3f2fd` | `#1976d2` |
| 数据库 | `#fff3e0` | `#f57c00` |
| 外部服务 | `#fce4ec` | `#c2185b` |
| 缓存 | `#ffebee` | `#d32f2f` |
| 消息队列 | `#f3e5f5` | `#7b1fa2` |

### 7.2 思维导图配色（鲜艳）

| 节点类型 | backgroundColor | strokeColor |
|---------|----------------|-------------|
| 中心 | `#a5d8ff` | `#1971c2` |
| 分支1 | `#d0bfff` | `#5f3dc4` |
| 分支2 | `#b2f2bb` | `#2f9e44` |
| 分支3 | `#ffd8a8` | `#e67700` |
| 分支4 | `#ffc9c9` | `#c92a2a` |

### 7.3 流程图配色（专业）

| 元素类型 | backgroundColor | strokeColor |
|---------|----------------|-------------|
| 开始/结束 | `#e9ecef` | `#495057` |
| 处理 | `#e3f2fd` | `#1976d2` |
| 判断 | `#fff3e0` | `#f57c00` |
| 数据 | `#f3e5f5` | `#7b1fa2` |

## 8. 最佳实践总结

| 序号 | 实践 | 说明 |
|------|------|------|
| 1 | **复杂图表始终使用预设 ID** | 实现一次性创建完整关系 |
| 2 | **建立双向绑定** | 两个元素必须互相引用（容器↔文本、箭头↔元素） |
| 3 | **精确计算文本尺寸** | 使用公式计算容器文本的位置和尺寸 |
| 4 | **预先规划布局** | 计算位置避免重叠（间距 80-150px） |
| 5 | **明确指定箭头 points** | 对于肘形箭头尤其关键（需要多个转折点） |
| 6 | **使用一致的配色方案** | 2-3 种颜色用于分类，建立视觉层级 |
| 7 | **开始前清空画布** | 先查询再逐个删除所有元素 |
| 8 | **用框架组织** | 用于复杂的多区域图表，实现逻辑分组 |

## 9. 框架元素（frame）

**用途**：将画布组织为命名区域，类似于幻灯片或章节。

### 9.1 框架专有属性

| 属性 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| `name` | string | 框架名称/标题 | `""` |
| `children` | string[] | 框架内元素的 ID（自动管理，无需手动设置） | `[]` |

### 9.2 示例

```json
{
  "id": "frame-backend",
  "type": "frame",
  "x": 50,
  "y": 400,
  "width": 600,
  "height": 300,
  "name": "后端服务"
}

// 框架内的元素
{
  "id": "api-service",
  "type": "rectangle",
  "frameId": "frame-backend",  // ← 分配到框架
  "x": 100,
  "y": 450,
  "width": 180,
  "height": 80
}
```
