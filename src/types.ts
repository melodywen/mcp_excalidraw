import type {
  ExcalidrawElement,
  FillStyle,
  StrokeStyle,
  RoundnessType,
  FileId,
  Arrowhead,
  TextAlign,
  VerticalAlign,
  PointBinding,
  ImageCrop,
  LocalPoint,
  Radians
} from '@excalidraw/excalidraw/types/element/types'

export interface ExcalidrawElementBase {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  groupIds?: string[];
  frameId?: string | null;
  roundness?: {
    type: number;
    value?: number;
  } | null;
  seed?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  locked?: boolean;
  link?: string | null;
  customData?: Record<string, any> | null;
  boundElements?: readonly ExcalidrawBoundElement[] | null;
  updated?: number;
  containerId?: string | null;
}

export interface ExcalidrawTextElement extends ExcalidrawElementBase {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  baseline?: number;
  lineHeight?: number;
}

export interface ExcalidrawRectangleElement extends ExcalidrawElementBase {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface ExcalidrawEllipseElement extends ExcalidrawElementBase {
  type: 'ellipse';
  width: number;
  height: number;
}

export interface ExcalidrawDiamondElement extends ExcalidrawElementBase {
  type: 'diamond';
  width: number;
  height: number;
}

export interface ExcalidrawArrowElement extends ExcalidrawElementBase {
  type: 'arrow';
  points: readonly [number, number][];
  lastCommittedPoint?: readonly [number, number] | null;
  startBinding?: ExcalidrawBinding | null;
  endBinding?: ExcalidrawBinding | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
}

export interface ExcalidrawLineElement extends ExcalidrawElementBase {
  type: 'line';
  points: readonly [number, number][];
  lastCommittedPoint?: readonly [number, number] | null;
  startBinding?: ExcalidrawBinding | null;
  endBinding?: ExcalidrawBinding | null;
}

export interface ExcalidrawFreedrawElement extends ExcalidrawElementBase {
  type: 'freedraw';
  points: readonly [number, number][];
  pressures?: readonly number[];
  simulatePressure?: boolean;
  lastCommittedPoint?: readonly [number, number] | null;
}

export type ExcalidrawElement = 
  | ExcalidrawTextElement
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawArrowElement
  | ExcalidrawLineElement
  | ExcalidrawFreedrawElement;

export interface ExcalidrawBoundElement {
  id: string;
  type: 'text' | 'arrow';
}

export interface ExcalidrawBinding {
  elementId: string;
  focus: number;
  gap: number;
  fixedPoint?: readonly [number, number] | null;
}

export type ExcalidrawElementType = 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'line' | 'freedraw' | 'label';

// Excalidraw element types
export const EXCALIDRAW_ELEMENT_TYPES: Record<string, ExcalidrawElementType> = {
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  TEXT: 'text',
  LABEL: 'label',
  FREEDRAW: 'freedraw',
  LINE: 'line'
} as const;

// Server-side element with metadata
export interface ServerElement extends Omit<ExcalidrawElementBase, 'id'> {
  id: string;
  type: ExcalidrawElementType;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  label?: {
    text: string;
  };
  boundElements?: any[] | null;
  containerId?: string | null;
  locked?: boolean;

  // ExcalidrawElement 共有或大部分元素共有的属性
  fillStyle?: FillStyle; // 所有形状元素: 填充样式
  strokeStyle?: StrokeStyle; // 所有形状元素: 边框样式
  roundness?: null | { type: RoundnessType; value?: number; }; // 所有形状元素: 圆角
  angle?: Radians; // 所有元素: 旋转角度
  link?: string | null; // 所有元素: 链接
  customData?: Record<string, any>; // 所有元素: 自定义数据

  // ExcalidrawTextElement 专有属性
  text?: string; // 文本元素: 文本内容
  fontSize?: number; // 文本元素: 字号
  fontFamily?: string | number; // 文本元素: 字体
  textAlign?: TextAlign; // 文本元素: 水平对齐方式
  verticalAlign?: VerticalAlign; // 文本元素: 垂直对齐方式
  originalText?: string; // 文本元素: 原始文本
  autoResize?: boolean; // 文本元素: 是否自动调整大小
  lineHeight?: number; // 文本元素: 行高 (简化类型，移除品牌)

  // ExcalidrawImageElement 专有属性
  fileId?: FileId | null; // 图片元素: 图片文件 ID
  status?: "pending" | "saved" | "error"; // 图片元素: 图片状态
  scale?: [number, number]; // 图片元素: 图片缩放
  crop?: ImageCrop | null; // 图片元素: 图片裁剪信息

  // ExcalidrawLinearElement (线/箭头) & ExcalidrawFreeDrawElement (自由绘制) 共用属性
  points?: readonly LocalPoint[]; // 线性/自由绘制元素: 构成路径的坐标点数组
  lastCommittedPoint?: LocalPoint | null; // 线性/自由绘制元素: 最后提交的点

  // ExcalidrawLinearElement (箭头) 专有属性
  startBinding?: PointBinding | null; // 线性元素: 起点绑定
  endBinding?: PointBinding | null; // 线性元素: 终点绑定
  startArrowhead?: Arrowhead | null; // 线性元素: 起点箭头样式
  endArrowhead?: Arrowhead | null; // 线性元素: 终点箭头样式
  elbowed?: boolean; // 箭头元素: 是否为带拐角的箭头 (直角连接)

  // ExcalidrawFreeDrawElement (自由绘制) 专有属性
  pressures?: readonly number[]; // 自由绘制元素: 每个点的压力值
  simulatePressure?: boolean; // 自由绘制元素: 是否模拟压力

  // ExcalidrawFrameElement (框架) & ExcalidrawMagicFrameElement (魔法框架) 专有属性
  children?: readonly ExcalidrawElement["id"][]; // 框架元素: 框架包含的子元素 ID
  name?: string | null; // 框架元素: 框架名称
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ElementsResponse extends ApiResponse {
  elements: ServerElement[];
  count: number;
}

export interface ElementResponse extends ApiResponse {
  element: ServerElement;
}

export interface SyncResponse extends ApiResponse {
  count: number;
  syncedAt: string;
  beforeCount: number;
  afterCount: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

export type WebSocketMessageType = 
  | 'initial_elements'
  | 'element_created'
  | 'element_updated'
  | 'element_deleted'
  | 'elements_batch_created'
  | 'elements_synced'
  | 'sync_status'
  | 'mermaid_convert';

export interface InitialElementsMessage extends WebSocketMessage {
  type: 'initial_elements';
  elements: ServerElement[];
}

export interface ElementCreatedMessage extends WebSocketMessage {
  type: 'element_created';
  element: ServerElement;
}

export interface ElementUpdatedMessage extends WebSocketMessage {
  type: 'element_updated';
  element: ServerElement;
}

export interface ElementDeletedMessage extends WebSocketMessage {
  type: 'element_deleted';
  elementId: string;
}

export interface BatchCreatedMessage extends WebSocketMessage {
  type: 'elements_batch_created';
  elements: ServerElement[];
}

export interface SyncStatusMessage extends WebSocketMessage {
  type: 'sync_status';
  elementCount: number;
  timestamp: string;
}

export interface MermaidConvertMessage extends WebSocketMessage {
  type: 'mermaid_convert';
  mermaidDiagram: string;
  config?: MermaidConfig;
  timestamp: string;
}

// Mermaid conversion types
export interface MermaidConfig {
  startOnLoad?: boolean;
  flowchart?: {
    curve?: 'linear' | 'basis';
  };
  themeVariables?: {
    fontSize?: string;
  };
  maxEdges?: number;
  maxTextSize?: number;
}

export interface MermaidConversionRequest {
  mermaidDiagram: string;
  config?: MermaidConfig;
}

export interface MermaidConversionResponse extends ApiResponse {
  elements: ServerElement[];
  files?: any;
  count: number;
}

// In-memory storage for Excalidraw elements
export const elements = new Map<string, ServerElement>();

// Validation function for Excalidraw elements
export function validateElement(element: Partial<ServerElement>): element is ServerElement {
  const requiredFields: (keyof ServerElement)[] = ['type', 'x', 'y'];
  const hasRequiredFields = requiredFields.every(field => field in element);
  
  if (!hasRequiredFields) {
    throw new Error(`Missing required fields: ${requiredFields.join(', ')}`);
  }

  if (!Object.values(EXCALIDRAW_ELEMENT_TYPES).includes(element.type as ExcalidrawElementType)) {
    throw new Error(`Invalid element type: ${element.type}`);
  }

  return true;
}

// Helper function to generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}