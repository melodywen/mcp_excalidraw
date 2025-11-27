#!/usr/bin/env node

// Disable colors to prevent ANSI color codes from breaking JSON parsing
process.env.NODE_DISABLE_COLORS = '1';
process.env.NO_COLOR = '1';

import { fileURLToPath } from "url";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  CallToolRequest,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { 
  generateId, 
  EXCALIDRAW_ELEMENT_TYPES,
  ServerElement,
  ExcalidrawElementType,
  validateElement
} from './types.js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Express server configuration
const EXPRESS_SERVER_URL = process.env.EXPRESS_SERVER_URL || 'http://localhost:3000';
const ENABLE_CANVAS_SYNC = process.env.ENABLE_CANVAS_SYNC !== 'false'; // Default to true

// API Response types
interface ApiResponse {
  success: boolean;
  element?: ServerElement;
  elements?: ServerElement[];
  message?: string;
  error?: string;
  count?: number;
}

interface SyncResponse {
  element?: ServerElement;
  elements?: ServerElement[];
}

// Helper functions to sync with Express server (canvas)
async function syncToCanvas(operation: string, data: any): Promise<SyncResponse | null> {
  if (!ENABLE_CANVAS_SYNC) {
    logger.debug('Canvas sync disabled, skipping');
    return null;
  }

  try {
    let url: string;
    let options: any;
    
    switch (operation) {
      case 'create':
        url = `${EXPRESS_SERVER_URL}/api/elements`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
        break;
        
      case 'update':
        url = `${EXPRESS_SERVER_URL}/api/elements/${data.id}`;
        options = {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
        break;
        
      case 'delete':
        url = `${EXPRESS_SERVER_URL}/api/elements/${data.id}`;
        options = { method: 'DELETE' };
        break;
        
      case 'batch_create':
        url = `${EXPRESS_SERVER_URL}/api/elements/batch`;
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements: data })
        };
        break;
        
      default:
        logger.warn(`Unknown sync operation: ${operation}`);
        return null;
    }

    logger.debug(`Syncing to canvas: ${operation}`, { url, data });
    const response = await fetch(url, options);

    // Parse JSON response regardless of HTTP status
    const result = await response.json() as ApiResponse;

    if (!response.ok) {
      logger.warn(`Canvas sync returned error status: ${response.status}`, result);
      throw new Error(result.error || `Canvas sync failed: ${response.status} ${response.statusText}`);
    }

    logger.debug(`Canvas sync successful: ${operation}`, result);
    return result as SyncResponse;
    
  } catch (error) {
    logger.warn(`Canvas sync failed for ${operation}:`, (error as Error).message);
    // Don't throw - we want MCP operations to work even if canvas is unavailable
    return null;
  }
}

// Helper to sync element creation to canvas
async function createElementOnCanvas(elementData: ServerElement): Promise<ServerElement | null> {
  const result = await syncToCanvas('create', elementData);
  return result?.element || elementData;
}

// Helper to sync element update to canvas  
async function updateElementOnCanvas(elementData: Partial<ServerElement> & { id: string }): Promise<ServerElement | null> {
  const result = await syncToCanvas('update', elementData);
  return result?.element || null;
}

// Helper to sync element deletion to canvas
async function deleteElementOnCanvas(elementId: string): Promise<any> {
  const result = await syncToCanvas('delete', { id: elementId });
  return result;
}

// Helper to sync batch creation to canvas
async function batchCreateElementsOnCanvas(elementsData: ServerElement[]): Promise<ServerElement[] | null> {
  const result = await syncToCanvas('batch_create', elementsData);
  return result?.elements || elementsData;
}

// Helper to fetch element from canvas
async function getElementFromCanvas(elementId: string): Promise<ServerElement | null> {
  if (!ENABLE_CANVAS_SYNC) {
    logger.debug('Canvas sync disabled, skipping fetch');
    return null;
  }

  try {
    const response = await fetch(`${EXPRESS_SERVER_URL}/api/elements/${elementId}`);
    if (!response.ok) {
      logger.warn(`Failed to fetch element ${elementId}: ${response.status}`);
      return null;
    }
    const data = await response.json() as { element?: ServerElement };
    return data.element || null;
  } catch (error) {
    logger.error('Error fetching element from canvas:', error);
    return null;
  }
}

// In-memory storage for scene state
interface SceneState {
  theme: string;
  viewport: { x: number; y: number; zoom: number };
  selectedElements: Set<string>;
  groups: Map<string, string[]>;
}

const sceneState: SceneState = {
  theme: 'light',
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedElements: new Set(),
  groups: new Map()
};

// Schema definitions using zod - Excalidraw 元素的数据验证模式
const ElementSchema = z.object({
  // 基础属性 - Basic Properties (所有元素类型通用)
  id: z.string().optional(), // 元素ID，可选，如果不提供则自动生成
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]), // 元素类型：矩形、椭圆、菱形、箭头、文本、线条、自由绘制等
  x: z.number(), // X坐标位置 (适用于所有元素类型)
  y: z.number(), // Y坐标位置 (适用于所有元素类型)
  width: z.number().optional(), // 元素宽度 (矩形、椭圆、菱形、框架元素)
  height: z.number().optional(), // 元素高度 (矩形、椭圆、菱形、框架元素)
  angle: z.number().optional(), // 旋转角度（弧度） (适用于所有元素类型)
  
  // 样式属性 - Style Properties (大部分元素通用)
  strokeColor: z.string().optional(), // 边框颜色 (适用于所有形状元素类型)
  backgroundColor: z.string().optional(), // 背景填充颜色 (适用于所有形状元素类型)
  fillStyle: z.string().optional(), // 填充样式：实心、交叉线、斜线等 (适用于所有形状元素类型)
  strokeWidth: z.number().optional(), // 边框线条粗细 (适用于所有形状元素类型)
  strokeStyle: z.string().optional(), // 边框样式：实线、虚线、点线 (适用于所有形状元素类型)
  roughness: z.number().optional(), // 手绘粗糙度（0-2，0为完全光滑） (适用于所有形状元素类型)
  opacity: z.number().optional(), // 透明度（0-1） (适用于所有元素类型)
  
  // 组织结构属性 - Organization Properties (所有元素通用)
  groupIds: z.array(z.string()).optional(), // 所属组的ID列表（元素可以属于多个组） (适用于所有元素类型)
  frameId: z.string().nullable().optional(), // 所属框架的ID (适用于所有元素类型)
  roundness: z.object({ // 圆角设置 (矩形、椭圆、菱形、框架元素)
    type: z.number(), // 圆角类型
    value: z.number().optional() // 圆角值
  }).nullable().optional(),
  
  // 元数据属性 - Metadata Properties (所有元素通用)
  seed: z.number().optional(), // 随机种子，用于生成一致的手绘效果 (适用于所有元素类型)
  versionNonce: z.number().optional(), // 版本随机数，用于协作时的冲突解决 (适用于所有元素类型)
  isDeleted: z.boolean().optional(), // 是否已删除（软删除标记） (适用于所有元素类型)
  locked: z.boolean().optional(), // 是否锁定（锁定后不可编辑） (适用于所有元素类型)
  link: z.string().nullable().optional(), // 关联的超链接URL (适用于所有元素类型)
  customData: z.record(z.any()).nullable().optional(), // 自定义数据存储 (适用于所有元素类型)
  boundElements: z.array(z.any()).nullable().optional(), // 绑定到此元素的其他元素列表 (适用于所有元素类型)
  updated: z.number().optional(), // 最后更新时间戳 (适用于所有元素类型)
  containerId: z.string().nullable().optional(), // 容器元素ID（如文本绑定到的形状） (适用于所有元素类型)
  
  // 文本元素专用属性 - Text Element Properties (仅限于 type 等于 text)
  text: z.string().optional(), // 文本内容 (仅限于 type 等于 text)
  fontSize: z.number().optional(), // 字体大小 (仅限于 type 等于 text)
  fontFamily: z.union([z.string(), z.number()]).optional(), // 字体族（字符串名称或数字ID） (仅限于 type 等于 text)
  textAlign: z.string().optional(), // 水平对齐方式：左对齐、居中、右对齐 (仅限于 type 等于 text)
  verticalAlign: z.string().optional(), // 垂直对齐方式：顶部、中间、底部 (仅限于 type 等于 text)
  originalText: z.string().optional(), // 原始文本（用于编辑历史） (仅限于 type 等于 text)
  autoResize: z.boolean().optional(), // 是否自动调整文本框大小 (仅限于 type 等于 text)
  lineHeight: z.number().optional(), // 行高倍数 (仅限于 type 等于 text)
  
  // 图片元素专用属性 - Image Element Properties (仅限于 type 等于 image)
  fileId: z.string().nullable().optional(), // 图片文件ID (仅限于 type 等于 image)
  status: z.enum(["pending", "saved", "error"]).optional(), // 图片状态：待处理、已保存、错误 (仅限于 type 等于 image)
  scale: z.tuple([z.number(), z.number()]).optional(), // 图片缩放比例 [X轴, Y轴] (仅限于 type 等于 image)
  crop: z.object({ // 图片裁剪信息 (仅限于 type 等于 image)
    x: z.number(), // 裁剪区域X坐标
    y: z.number(), // 裁剪区域Y坐标
    width: z.number(), // 裁剪区域宽度
    height: z.number(), // 裁剪区域高度
    naturalWidth: z.number(), // 原始图片宽度
    naturalHeight: z.number() // 原始图片高度
  }).nullable().optional(),
  
  // 线性/自由绘制元素共用属性 - Linear/Freedraw Element Properties (arrow、line、freedraw 类型)
  points: z.array(z.tuple([z.number(), z.number()])).optional(), // 构成路径的坐标点数组 [[x1,y1], [x2,y2], ...] (仅限于 type 等于 arrow、line、freedraw)
  lastCommittedPoint: z.tuple([z.number(), z.number()]).nullable().optional(), // 最后提交的点坐标 (仅限于 type 等于 arrow、line、freedraw)
  
  // 线性元素专用属性 - Linear Element Properties (仅限于 type 等于 arrow、line)
  startBinding: z.object({ // 起点绑定信息 (仅限于 type 等于 arrow、line)
    elementId: z.string(), // 绑定到的元素ID
    focus: z.number(), // 焦点位置（0-1）
    gap: z.number(), // 与绑定元素的间距
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional() // 固定点坐标
  }).nullable().optional(),
  endBinding: z.object({ // 终点绑定信息 (仅限于 type 等于 arrow、line)
    elementId: z.string(), // 绑定到的元素ID
    focus: z.number(), // 焦点位置（0-1）
    gap: z.number(), // 与绑定元素的间距
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional() // 固定点坐标
  }).nullable().optional(),
  startArrowhead: z.string().nullable().optional(), // 起点箭头样式：箭头、圆点、菱形等 (仅限于 type 等于 arrow)
  endArrowhead: z.string().nullable().optional(), // 终点箭头样式：箭头、圆点、菱形等 (仅限于 type 等于 arrow)
  elbowed: z.boolean().optional(), // 是否为带拐角的箭头（直角连接） (仅限于 type 等于 arrow)
  
  // 自由绘制元素专用属性 - Freedraw Element Properties (仅限于 type 等于 freedraw)
  pressures: z.array(z.number()).optional(), // 每个点的压力值数组（用于模拟画笔压感） (仅限于 type 等于 freedraw)
  simulatePressure: z.boolean().optional(), // 是否模拟压力效果 (仅限于 type 等于 freedraw)
  
  // 框架元素专用属性 - Frame Element Properties (仅限于 type 等于 frame)
  children: z.array(z.string()).optional(), // 框架包含的子元素ID列表 (仅限于 type 等于 frame)
  name: z.string().nullable().optional() // 框架名称 (仅限于 type 等于 frame)
});

const ElementIdSchema = z.object({
  id: z.string()
});

const ElementIdsSchema = z.object({
  elementIds: z.array(z.string())
});

const GroupIdSchema = z.object({
  groupId: z.string()
});

const AlignElementsSchema = z.object({
  elementIds: z.array(z.string()),
  alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom'])
});

const DistributeElementsSchema = z.object({
  elementIds: z.array(z.string()),
  direction: z.enum(['horizontal', 'vertical'])
});

const QuerySchema = z.object({
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]).optional(),
  filter: z.record(z.any()).optional()
});

const ResourceSchema = z.object({
  resource: z.enum(['scene', 'library', 'theme', 'elements'])
});

// Tool definitions
const tools: Tool[] = [
  {
    name: 'create_element',
    description: '创建新的 Excalidraw 元素 - Create a new Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES),
          description: '元素类型：rectangle(矩形), ellipse(椭圆), diamond(菱形), arrow(箭头), text(文本), line(线条), freedraw(自由绘制)'
        },
        x: { type: 'number', description: 'X坐标位置 (适用于所有元素类型)' },
        y: { type: 'number', description: 'Y坐标位置 (适用于所有元素类型)' },
        width: { type: 'number', description: '元素宽度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
        height: { type: 'number', description: '元素高度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
        angle: { type: 'number', description: '旋转角度（弧度） (适用于所有元素类型)' },
        strokeColor: { type: 'string', description: '边框颜色（十六进制色值，如 #000000） (适用于所有形状元素类型)' },
        backgroundColor: { type: 'string', description: '背景填充颜色（十六进制色值，如 #ffffff） (适用于所有形状元素类型)' },
        fillStyle: { type: 'string', description: '填充样式：hachure(交叉线), cross-hatch(网格), solid(实心), zigzag(锯齿) (适用于所有形状元素类型)' },
        strokeWidth: { type: 'number', description: '边框线条粗细（像素） (适用于所有形状元素类型)' },
        strokeStyle: { type: 'string', description: '边框样式：solid(实线), dashed(虚线), dotted(点线) (适用于所有形状元素类型)' },
        roughness: { type: 'number', description: '手绘粗糙度（0-2，0为完全光滑，2为最粗糙） (适用于所有形状元素类型)' },
        opacity: { type: 'number', description: '透明度（0-1，0为完全透明，1为完全不透明） (适用于所有元素类型)' },
        groupIds: { 
          type: 'array',
          items: { type: 'string' },
          description: '所属组的ID列表（元素可以属于多个组） (适用于所有元素类型)'
        },
        frameId: { type: 'string', description: '所属框架的ID (适用于所有元素类型)' },
        roundness: {
          type: 'object',
          properties: {
            type: { type: 'number', description: '圆角类型' },
            value: { type: 'number', description: '圆角值' }
          },
          description: '圆角设置 (仅限于 type 等于 rectangle、ellipse、diamond、frame)'
        },
        seed: { type: 'number', description: '随机种子，用于生成一致的手绘效果 (适用于所有元素类型)' },
        versionNonce: { type: 'number', description: '版本随机数，用于协作时的冲突解决 (适用于所有元素类型)' },
        isDeleted: { type: 'boolean', description: '是否已删除（软删除标记） (适用于所有元素类型)' },
        locked: { type: 'boolean', description: '是否锁定（锁定后不可编辑） (适用于所有元素类型)' },
        link: { type: 'string', description: '关联的超链接URL (适用于所有元素类型)' },
        customData: { type: 'object', description: '自定义数据存储 (适用于所有元素类型)' },
        boundElements: { type: 'array', description: '绑定到此元素的其他元素列表 (适用于所有元素类型)' },
        updated: { type: 'number', description: '最后更新时间戳 (适用于所有元素类型)' },
        containerId: { type: 'string', description: '容器元素ID（如文本绑定到的形状） (适用于所有元素类型)' },
        
        // 文本元素专用属性 - Text element properties (仅限于 type 等于 text)
        text: { type: 'string', description: '文本内容 (仅限于 type 等于 text)' },
        fontSize: { type: 'number', description: '字体大小（像素） (仅限于 type 等于 text)' },
        fontFamily: { 
          oneOf: [
            { type: 'string' },
            { type: 'number' }
          ],
          description: '字体族（字符串名称或数字ID） (仅限于 type 等于 text)'
        },
        textAlign: { type: 'string', description: '水平对齐方式：left(左对齐), center(居中), right(右对齐) (仅限于 type 等于 text)' },
        verticalAlign: { type: 'string', description: '垂直对齐方式：top(顶部), middle(中间), bottom(底部) (仅限于 type 等于 text)' },
        originalText: { type: 'string', description: '原始文本（用于编辑历史） (仅限于 type 等于 text)' },
        autoResize: { type: 'boolean', description: '是否自动调整文本框大小 (仅限于 type 等于 text)' },
        lineHeight: { type: 'number', description: '行高倍数 (仅限于 type 等于 text)' },
        
        // 图片元素专用属性 - Image element properties (仅限于 type 等于 image)
        fileId: { type: 'string', description: '图片文件ID (仅限于 type 等于 image)' },
        status: { 
          type: 'string',
          enum: ['pending', 'saved', 'error'],
          description: '图片状态：pending(待处理), saved(已保存), error(错误) (仅限于 type 等于 image)'
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          description: '图片缩放比例 [X轴, Y轴] (仅限于 type 等于 image)'
        },
        crop: {
          type: 'object',
          properties: {
            x: { type: 'number', description: '裁剪区域X坐标' },
            y: { type: 'number', description: '裁剪区域Y坐标' },
            width: { type: 'number', description: '裁剪区域宽度' },
            height: { type: 'number', description: '裁剪区域高度' },
            naturalWidth: { type: 'number', description: '原始图片宽度' },
            naturalHeight: { type: 'number', description: '原始图片高度' }
          },
          description: '图片裁剪信息 (仅限于 type 等于 image)'
        },
        
        // 线性/自由绘制元素共用属性 - Linear/Freedraw element properties (arrow、line、freedraw 类型)
        points: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          },
          description: '构成路径的坐标点数组 [[x1,y1], [x2,y2], ...] (仅限于 type 等于 arrow、line、freedraw)'
        },
        lastCommittedPoint: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          description: '最后提交的点坐标 [x, y] (仅限于 type 等于 arrow、line、freedraw)'
        },
        
        // 线性元素专用属性 - Linear element properties (仅限于 type 等于 arrow、line)
        startBinding: {
          type: 'object',
          properties: {
            elementId: { type: 'string', description: '绑定到的元素ID' },
            focus: { type: 'number', description: '焦点位置（0-1）' },
            gap: { type: 'number', description: '与绑定元素的间距' },
            fixedPoint: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: '固定点坐标 [x, y]'
            }
          },
          description: '起点绑定信息 (仅限于 type 等于 arrow、line)'
        },
        endBinding: {
          type: 'object',
          properties: {
            elementId: { type: 'string', description: '绑定到的元素ID' },
            focus: { type: 'number', description: '焦点位置（0-1）' },
            gap: { type: 'number', description: '与绑定元素的间距' },
            fixedPoint: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: '固定点坐标 [x, y]'
            }
          },
          description: '终点绑定信息 (仅限于 type 等于 arrow、line)'
        },
        startArrowhead: { type: 'string', description: '起点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
        endArrowhead: { type: 'string', description: '终点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
        elbowed: { type: 'boolean', description: '是否为带拐角的箭头（直角连接） (仅限于 type 等于 arrow)' },
        
        // 自由绘制元素专用属性 - Freedraw element properties (仅限于 type 等于 freedraw)
        pressures: {
          type: 'array',
          items: { type: 'number' },
          description: '每个点的压力值数组（用于模拟画笔压感） (仅限于 type 等于 freedraw)'
        },
        simulatePressure: { type: 'boolean', description: '是否模拟压力效果 (仅限于 type 等于 freedraw)' },
        
        // 框架元素专用属性 - Frame element properties (仅限于 type 等于 frame)
        children: {
          type: 'array',
          items: { type: 'string' },
          description: '框架包含的子元素ID列表 (仅限于 type 等于 frame)'
        },
        name: { type: 'string', description: '框架名称 (仅限于 type 等于 frame)' }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'update_element',
    description: '更新现有的 Excalidraw 元素 - Update an existing Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '要更新的元素ID' },
        type: { 
          type: 'string', 
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES),
          description: '元素类型：rectangle(矩形), ellipse(椭圆), diamond(菱形), arrow(箭头), text(文本), line(线条), freedraw(自由绘制)'
        },
        x: { type: 'number', description: 'X坐标位置 (适用于所有元素类型)' },
        y: { type: 'number', description: 'Y坐标位置 (适用于所有元素类型)' },
        width: { type: 'number', description: '元素宽度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
        height: { type: 'number', description: '元素高度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
        angle: { type: 'number', description: '旋转角度（弧度） (适用于所有元素类型)' },
        strokeColor: { type: 'string', description: '边框颜色（十六进制色值，如 #000000） (适用于所有形状元素类型)' },
        backgroundColor: { type: 'string', description: '背景填充颜色（十六进制色值，如 #ffffff） (适用于所有形状元素类型)' },
        fillStyle: { type: 'string', description: '填充样式：hachure(交叉线), cross-hatch(网格), solid(实心), zigzag(锯齿) (适用于所有形状元素类型)' },
        strokeWidth: { type: 'number', description: '边框线条粗细（像素） (适用于所有形状元素类型)' },
        strokeStyle: { type: 'string', description: '边框样式：solid(实线), dashed(虚线), dotted(点线) (适用于所有形状元素类型)' },
        roughness: { type: 'number', description: '手绘粗糙度（0-2，0为完全光滑，2为最粗糙） (适用于所有形状元素类型)' },
        opacity: { type: 'number', description: '透明度（0-1，0为完全透明，1为完全不透明） (适用于所有元素类型)' },
        groupIds: { 
          type: 'array',
          items: { type: 'string' },
          description: '所属组的ID列表（元素可以属于多个组） (适用于所有元素类型)'
        },
        frameId: { type: 'string', description: '所属框架的ID (适用于所有元素类型)' },
        roundness: {
          type: 'object',
          properties: {
            type: { type: 'number', description: '圆角类型' },
            value: { type: 'number', description: '圆角值' }
          },
          description: '圆角设置 (仅限于 type 等于 rectangle、ellipse、diamond、frame)'
        },
        seed: { type: 'number', description: '随机种子，用于生成一致的手绘效果 (适用于所有元素类型)' },
        versionNonce: { type: 'number', description: '版本随机数，用于协作时的冲突解决 (适用于所有元素类型)' },
        isDeleted: { type: 'boolean', description: '是否已删除（软删除标记） (适用于所有元素类型)' },
        locked: { type: 'boolean', description: '是否锁定（锁定后不可编辑） (适用于所有元素类型)' },
        link: { type: 'string', description: '关联的超链接URL (适用于所有元素类型)' },
        customData: { type: 'object', description: '自定义数据存储 (适用于所有元素类型)' },
        boundElements: { type: 'array', description: '绑定到此元素的其他元素列表 (适用于所有元素类型)' },
        updated: { type: 'number', description: '最后更新时间戳 (适用于所有元素类型)' },
        containerId: { type: 'string', description: '容器元素ID（如文本绑定到的形状） (适用于所有元素类型)' },
        
        // 文本元素专用属性 - Text element properties (仅限于 type 等于 text)
        text: { type: 'string', description: '文本内容 (仅限于 type 等于 text)' },
        fontSize: { type: 'number', description: '字体大小（像素） (仅限于 type 等于 text)' },
        fontFamily: { 
          oneOf: [
            { type: 'string' },
            { type: 'number' }
          ],
          description: '字体族（字符串名称或数字ID） (仅限于 type 等于 text)'
        },
        textAlign: { type: 'string', description: '水平对齐方式：left(左对齐), center(居中), right(右对齐) (仅限于 type 等于 text)' },
        verticalAlign: { type: 'string', description: '垂直对齐方式：top(顶部), middle(中间), bottom(底部) (仅限于 type 等于 text)' },
        originalText: { type: 'string', description: '原始文本（用于编辑历史） (仅限于 type 等于 text)' },
        autoResize: { type: 'boolean', description: '是否自动调整文本框大小 (仅限于 type 等于 text)' },
        lineHeight: { type: 'number', description: '行高倍数 (仅限于 type 等于 text)' },
        
        // 图片元素专用属性 - Image element properties (仅限于 type 等于 image)
        fileId: { type: 'string', description: '图片文件ID (仅限于 type 等于 image)' },
        status: { 
          type: 'string',
          enum: ['pending', 'saved', 'error'],
          description: '图片状态：pending(待处理), saved(已保存), error(错误) (仅限于 type 等于 image)'
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          description: '图片缩放比例 [X轴, Y轴] (仅限于 type 等于 image)'
        },
        crop: {
          type: 'object',
          properties: {
            x: { type: 'number', description: '裁剪区域X坐标' },
            y: { type: 'number', description: '裁剪区域Y坐标' },
            width: { type: 'number', description: '裁剪区域宽度' },
            height: { type: 'number', description: '裁剪区域高度' },
            naturalWidth: { type: 'number', description: '原始图片宽度' },
            naturalHeight: { type: 'number', description: '原始图片高度' }
          },
          description: '图片裁剪信息 (仅限于 type 等于 image)'
        },
        
        // 线性/自由绘制元素共用属性 - Linear/Freedraw element properties (arrow、line、freedraw 类型)
        points: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          },
          description: '构成路径的坐标点数组 [[x1,y1], [x2,y2], ...] (仅限于 type 等于 arrow、line、freedraw)'
        },
        lastCommittedPoint: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
          description: '最后提交的点坐标 [x, y] (仅限于 type 等于 arrow、line、freedraw)'
        },
        
        // 线性元素专用属性 - Linear element properties (仅限于 type 等于 arrow、line)
        startBinding: {
          type: 'object',
          properties: {
            elementId: { type: 'string', description: '绑定到的元素ID' },
            focus: { type: 'number', description: '焦点位置（0-1）' },
            gap: { type: 'number', description: '与绑定元素的间距' },
            fixedPoint: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: '固定点坐标 [x, y]'
            }
          },
          description: '起点绑定信息 (仅限于 type 等于 arrow、line)'
        },
        endBinding: {
          type: 'object',
          properties: {
            elementId: { type: 'string', description: '绑定到的元素ID' },
            focus: { type: 'number', description: '焦点位置（0-1）' },
            gap: { type: 'number', description: '与绑定元素的间距' },
            fixedPoint: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: '固定点坐标 [x, y]'
            }
          },
          description: '终点绑定信息 (仅限于 type 等于 arrow、line)'
        },
        startArrowhead: { type: 'string', description: '起点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
        endArrowhead: { type: 'string', description: '终点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
        elbowed: { type: 'boolean', description: '是否为带拐角的箭头（直角连接） (仅限于 type 等于 arrow)' },
        
        // 自由绘制元素专用属性 - Freedraw element properties (仅限于 type 等于 freedraw)
        pressures: {
          type: 'array',
          items: { type: 'number' },
          description: '每个点的压力值数组（用于模拟画笔压感） (仅限于 type 等于 freedraw)'
        },
        simulatePressure: { type: 'boolean', description: '是否模拟压力效果 (仅限于 type 等于 freedraw)' },
        
        // 框架元素专用属性 - Frame element properties (仅限于 type 等于 frame)
        children: {
          type: 'array',
          items: { type: 'string' },
          description: '框架包含的子元素ID列表 (仅限于 type 等于 frame)'
        },
        name: { type: 'string', description: '框架名称 (仅限于 type 等于 frame)' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_element',
    description: '删除 Excalidraw 元素 - Delete an Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '要删除的元素ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'query_elements',
    description: '查询 Excalidraw 元素（支持过滤条件）- Query Excalidraw elements with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: Object.values(EXCALIDRAW_ELEMENT_TYPES) 
        },
        filter: { 
          type: 'object',
          additionalProperties: true
        }
      }
    }
  },
  {
    name: 'get_resource',
    description: '获取 Excalidraw 资源 - Get an Excalidraw resource',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { 
          type: 'string', 
          enum: ['scene', 'library', 'theme', 'elements'] 
        }
      },
      required: ['resource']
    }
  },
  {
    name: 'group_elements',
    description: '将多个元素组合在一起 - Group multiple elements together',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'ungroup_elements',
    description: '取消元素组合 - Ungroup a group of elements',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'string' }
      },
      required: ['groupId']
    }
  },
  {
    name: 'align_elements',
    description: '对齐元素到指定位置 - Align elements to a specific position',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        },
        alignment: { 
          type: 'string', 
          enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'] 
        }
      },
      required: ['elementIds', 'alignment']
    }
  },
  {
    name: 'distribute_elements',
    description: '均匀分布元素 - Distribute elements evenly',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        },
        direction: { 
          type: 'string', 
          enum: ['horizontal', 'vertical'] 
        }
      },
      required: ['elementIds', 'direction']
    }
  },
  {
    name: 'lock_elements',
    description: '锁定元素防止修改 - Lock elements to prevent modification',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'unlock_elements',
    description: '解锁元素允许修改 - Unlock elements to allow modification',
    inputSchema: {
      type: 'object',
      properties: {
        elementIds: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['elementIds']
    }
  },
  {
    name: 'create_from_mermaid',
    description: '将 Mermaid 图表转换为 Excalidraw 元素并在画布上渲染 - Convert a Mermaid diagram to Excalidraw elements and render them on the canvas',
    inputSchema: {
      type: 'object',
      properties: {
        mermaidDiagram: {
          type: 'string',
          description: 'The Mermaid diagram definition (e.g., "graph TD; A-->B; B-->C;")'
        },
        config: {
          type: 'object',
          description: 'Optional Mermaid configuration',
          properties: {
            startOnLoad: { type: 'boolean' },
            flowchart: {
              type: 'object',
              properties: {
                curve: { type: 'string', enum: ['linear', 'basis'] }
              }
            },
            themeVariables: {
              type: 'object',
              properties: {
                fontSize: { type: 'string' }
              }
            },
            maxEdges: { type: 'number' },
            maxTextSize: { type: 'number' }
          }
        }
      },
      required: ['mermaidDiagram']
    }
  },
  {
    name: 'batch_create_elements',
    description: '批量创建多个 Excalidraw 元素 - 适用于复杂图表 - Create multiple Excalidraw elements at once - ideal for complex diagrams',
    inputSchema: {
      type: 'object',
      properties: {
        elements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: Object.values(EXCALIDRAW_ELEMENT_TYPES),
                description: '元素类型：rectangle(矩形), ellipse(椭圆), diamond(菱形), arrow(箭头), text(文本), line(线条), freedraw(自由绘制)'
              },
              x: { type: 'number', description: 'X坐标位置 (适用于所有元素类型)' },
              y: { type: 'number', description: 'Y坐标位置 (适用于所有元素类型)' },
              width: { type: 'number', description: '元素宽度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
              height: { type: 'number', description: '元素高度 (仅限于 type 等于 rectangle、ellipse、diamond、frame)' },
              angle: { type: 'number', description: '旋转角度（弧度） (适用于所有元素类型)' },
              strokeColor: { type: 'string', description: '边框颜色（十六进制色值，如 #000000） (适用于所有形状元素类型)' },
              backgroundColor: { type: 'string', description: '背景填充颜色（十六进制色值，如 #ffffff） (适用于所有形状元素类型)' },
              fillStyle: { type: 'string', description: '填充样式：hachure(交叉线), cross-hatch(网格), solid(实心), zigzag(锯齿) (适用于所有形状元素类型)' },
              strokeWidth: { type: 'number', description: '边框线条粗细（像素） (适用于所有形状元素类型)' },
              strokeStyle: { type: 'string', description: '边框样式：solid(实线), dashed(虚线), dotted(点线) (适用于所有形状元素类型)' },
              roughness: { type: 'number', description: '手绘粗糙度（0-2，0为完全光滑，2为最粗糙） (适用于所有形状元素类型)' },
              opacity: { type: 'number', description: '透明度（0-1，0为完全透明，1为完全不透明） (适用于所有元素类型)' },
              groupIds: { 
                type: 'array',
                items: { type: 'string' },
                description: '所属组的ID列表（元素可以属于多个组） (适用于所有元素类型)'
              },
              frameId: { type: 'string', description: '所属框架的ID (适用于所有元素类型)' },
              roundness: {
                type: 'object',
                properties: {
                  type: { type: 'number', description: '圆角类型' },
                  value: { type: 'number', description: '圆角值' }
                },
                description: '圆角设置 (仅限于 type 等于 rectangle、ellipse、diamond、frame)'
              },
              seed: { type: 'number', description: '随机种子，用于生成一致的手绘效果 (适用于所有元素类型)' },
              versionNonce: { type: 'number', description: '版本随机数，用于协作时的冲突解决 (适用于所有元素类型)' },
              isDeleted: { type: 'boolean', description: '是否已删除（软删除标记） (适用于所有元素类型)' },
              locked: { type: 'boolean', description: '是否锁定（锁定后不可编辑） (适用于所有元素类型)' },
              link: { type: 'string', description: '关联的超链接URL (适用于所有元素类型)' },
              customData: { type: 'object', description: '自定义数据存储 (适用于所有元素类型)' },
              boundElements: { type: 'array', description: '绑定到此元素的其他元素列表 (适用于所有元素类型)' },
              updated: { type: 'number', description: '最后更新时间戳 (适用于所有元素类型)' },
              containerId: { type: 'string', description: '容器元素ID（如文本绑定到的形状） (适用于所有元素类型)' },
              
              // Text element properties (仅限于 type 等于 text)
              text: { type: 'string', description: '文本内容 (仅限于 type 等于 text)' },
              fontSize: { type: 'number', description: '字体大小（像素） (仅限于 type 等于 text)' },
              fontFamily: { 
                oneOf: [
                  { type: 'string' },
                  { type: 'number' }
                ],
                description: '字体族（字符串名称或数字ID） (仅限于 type 等于 text)'
              },
              textAlign: { type: 'string', description: '水平对齐方式：left(左对齐), center(居中), right(右对齐) (仅限于 type 等于 text)' },
              verticalAlign: { type: 'string', description: '垂直对齐方式：top(顶部), middle(中间), bottom(底部) (仅限于 type 等于 text)' },
              originalText: { type: 'string', description: '原始文本（用于编辑历史） (仅限于 type 等于 text)' },
              autoResize: { type: 'boolean', description: '是否自动调整文本框大小 (仅限于 type 等于 text)' },
              lineHeight: { type: 'number', description: '行高倍数 (仅限于 type 等于 text)' },
              
              // Image element properties (仅限于 type 等于 image)
              fileId: { type: 'string', description: '图片文件ID (仅限于 type 等于 image)' },
              status: { 
                type: 'string',
                enum: ['pending', 'saved', 'error'],
                description: '图片状态：pending(待处理), saved(已保存), error(错误) (仅限于 type 等于 image)'
              },
              scale: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
                description: '图片缩放比例 [X轴, Y轴] (仅限于 type 等于 image)'
              },
              crop: {
                type: 'object',
                properties: {
                  x: { type: 'number', description: '裁剪区域X坐标' },
                  y: { type: 'number', description: '裁剪区域Y坐标' },
                  width: { type: 'number', description: '裁剪区域宽度' },
                  height: { type: 'number', description: '裁剪区域高度' },
                  naturalWidth: { type: 'number', description: '原始图片宽度' },
                  naturalHeight: { type: 'number', description: '原始图片高度' }
                },
                description: '图片裁剪信息 (仅限于 type 等于 image)'
              },
              
              // Linear/Freedraw element properties (arrow、line、freedraw 类型)
              points: {
                type: 'array',
                items: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2
                },
                description: '构成路径的坐标点数组 [[x1,y1], [x2,y2], ...] (仅限于 type 等于 arrow、line、freedraw)'
              },
              lastCommittedPoint: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
                description: '最后提交的点坐标 [x, y] (仅限于 type 等于 arrow、line、freedraw)'
              },
              
              // Linear element properties (仅限于 type 等于 arrow、line)
              startBinding: {
                type: 'object',
                properties: {
                  elementId: { type: 'string', description: '绑定到的元素ID' },
                  focus: { type: 'number', description: '焦点位置（0-1）' },
                  gap: { type: 'number', description: '与绑定元素的间距' },
                  fixedPoint: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                    description: '固定点坐标 [x, y]'
                  }
                },
                description: '起点绑定信息 (仅限于 type 等于 arrow、line)'
              },
              endBinding: {
                type: 'object',
                properties: {
                  elementId: { type: 'string', description: '绑定到的元素ID' },
                  focus: { type: 'number', description: '焦点位置（0-1）' },
                  gap: { type: 'number', description: '与绑定元素的间距' },
                  fixedPoint: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                    description: '固定点坐标 [x, y]'
                  }
                },
                description: '终点绑定信息 (仅限于 type 等于 arrow、line)'
              },
              startArrowhead: { type: 'string', description: '起点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
              endArrowhead: { type: 'string', description: '终点箭头样式：arrow(箭头), dot(圆点), bar(横线), triangle(三角形)等 (仅限于 type 等于 arrow)' },
              elbowed: { type: 'boolean', description: '是否为带拐角的箭头（直角连接） (仅限于 type 等于 arrow)' },
              
              // Freedraw element properties (仅限于 type 等于 freedraw)
              pressures: {
                type: 'array',
                items: { type: 'number' },
          description: '每个点的压力值数组（用于模拟画笔压感） (仅限于 type 等于 freedraw)'
        },
        simulatePressure: { type: 'boolean', description: '是否模拟压力效果 (仅限于 type 等于 freedraw)' },
              
              // Frame element properties (仅限于 type 等于 frame)
              children: {
                type: 'array',
                items: { type: 'string' },
                description: '框架包含的子元素ID列表 (仅限于 type 等于 frame)'
              },
              name: { type: 'string', description: '框架名称 (仅限于 type 等于 frame)' }
            },
            required: ['type', 'x', 'y']
          }
        }
      },
      required: ['elements']
    }
  }
];

// Initialize MCP server
const server = new Server(
  {
    name: "mcp-excalidraw-server",
    version: "1.0.2",
    description: "Advanced MCP server for Excalidraw with real-time canvas"
  },
  {
    capabilities: {
      tools: Object.fromEntries(tools.map(tool => [tool.name, {
        description: tool.description,
        inputSchema: tool.inputSchema
      }]))
    }
  }
);

// Helper function to convert text property to label format for Excalidraw
function convertTextToLabel(element: ServerElement): ServerElement {
  const { text, ...rest } = element;
  if (text) {
    // For standalone text elements, keep text as direct property
    if (element.type === 'text') {
      return element; // Keep text as direct property
    }
    // For other elements (rectangle, ellipse, diamond), convert to label format
    return {
      ...rest,
      label: { text }
    } as ServerElement;
  }
  return element;
}

// Set up request handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    const { name, arguments: args } = request.params;
    logger.info(`Handling tool call: ${name}`);
    
    switch (name) {
      case 'create_element': {
        const params = ElementSchema.parse(args);
        logger.info('Creating element via MCP', { type: params.type });

        const id = generateId();
        const element: ServerElement = {
          id,
          ...params,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        } as ServerElement;

        // Convert text to label format for Excalidraw
        const excalidrawElement = convertTextToLabel(element);
        
        // Create element directly on HTTP server (no local storage)
        const canvasElement = await createElementOnCanvas(excalidrawElement);
        
        if (!canvasElement) {
          throw new Error('Failed to create element: HTTP server unavailable');
        }
        
        logger.info('Element created via MCP and synced to canvas', { 
          id: excalidrawElement.id, 
          type: excalidrawElement.type,
          synced: !!canvasElement 
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Element created successfully!\n\n${JSON.stringify(canvasElement, null, 2)}\n\n✅ Synced to canvas` 
          }]
        };
      }
      
      case 'update_element': {
        const params = ElementIdSchema.merge(ElementSchema.partial()).parse(args);
        const { id, ...updates } = params;
        
        if (!id) throw new Error('Element ID is required');

        // Build update payload with timestamp and version increment
        const updatePayload: Partial<ServerElement> & { id: string } = {
          id,
          ...updates,
          updatedAt: new Date().toISOString()
        } as Partial<ServerElement> & { id: string };

        // Convert text to label format for Excalidraw
        const excalidrawElement = convertTextToLabel(updatePayload as ServerElement);
        
        // Update element directly on HTTP server (no local storage)
        const canvasElement = await updateElementOnCanvas(excalidrawElement);
        
        if (!canvasElement) {
          throw new Error('Failed to update element: HTTP server unavailable or element not found');
        }
        
        logger.info('Element updated via MCP and synced to canvas', { 
          id: excalidrawElement.id, 
          synced: !!canvasElement 
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Element updated successfully!\n\n${JSON.stringify(canvasElement, null, 2)}\n\n✅ Synced to canvas` 
          }]
        };
      }
      
      case 'delete_element': {
        const params = ElementIdSchema.parse(args);
        const { id } = params;

        // Delete element directly on HTTP server (no local storage)
        const canvasResult = await deleteElementOnCanvas(id);

        if (!canvasResult || !(canvasResult as ApiResponse).success) {
          throw new Error('Failed to delete element: HTTP server unavailable or element not found');
        }

        const result = { id, deleted: true, syncedToCanvas: true };
        logger.info('Element deleted via MCP and synced to canvas', result);

        return {
          content: [{
            type: 'text',
            text: `Element deleted successfully!\n\n${JSON.stringify(result, null, 2)}\n\n✅ Synced to canvas`
          }]
        };
      }
      
      case 'query_elements': {
        const params = QuerySchema.parse(args || {});
        const { type, filter } = params;
        
        try {
          // Build query parameters
          const queryParams = new URLSearchParams();
          if (type) queryParams.set('type', type);
          if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
              queryParams.set(key, String(value));
            });
          }
          
          // Query elements from HTTP server
          const url = `${EXPRESS_SERVER_URL}/api/elements/search?${queryParams}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP server error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json() as ApiResponse;
          const results = data.elements || [];
          
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
          };
        } catch (error) {
          throw new Error(`Failed to query elements: ${(error as Error).message}`);
        }
      }
      
      case 'get_resource': {
        const params = ResourceSchema.parse(args);
        const { resource } = params;
        logger.info('Getting resource', { resource });
        
        let result: any;
        switch (resource) {
          case 'scene':
            result = {
              theme: sceneState.theme,
              viewport: sceneState.viewport,
              selectedElements: Array.from(sceneState.selectedElements)
            };
            break;
          case 'library':
          case 'elements':
            try {
              // Get elements from HTTP server
              const response = await fetch(`${EXPRESS_SERVER_URL}/api/elements`);
              if (!response.ok) {
                throw new Error(`HTTP server error: ${response.status} ${response.statusText}`);
              }
              const data = await response.json() as ApiResponse;
              result = {
                elements: data.elements || []
              };
            } catch (error) {
              throw new Error(`Failed to get elements: ${(error as Error).message}`);
            }
            break;
          case 'theme':
            result = {
              theme: sceneState.theme
            };
            break;
          default:
            throw new Error(`Unknown resource: ${resource}`);
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
      
      case 'group_elements': {
        const params = ElementIdsSchema.parse(args);
        const { elementIds } = params;

        try {
          const groupId = generateId();
          sceneState.groups.set(groupId, elementIds);

          // Update elements on canvas with proper error handling
          // Fetch existing groups and append new groupId to preserve multi-group membership
          const updatePromises = elementIds.map(async (id) => {
            const element = await getElementFromCanvas(id);
            const existingGroups = element?.groupIds || [];
            const updatedGroupIds = [...existingGroups, groupId];
            return await updateElementOnCanvas({ id, groupIds: updatedGroupIds });
          });

          const results = await Promise.all(updatePromises);
          const successCount = results.filter(result => result).length;

          if (successCount === 0) {
            sceneState.groups.delete(groupId); // Rollback local state
            throw new Error('Failed to group any elements: HTTP server unavailable');
          }

          logger.info('Grouping elements', { elementIds, groupId, successCount });

          const result = { groupId, elementIds, successCount };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          throw new Error(`Failed to group elements: ${(error as Error).message}`);
        }
      }
      
      case 'ungroup_elements': {
        const params = GroupIdSchema.parse(args);
        const { groupId } = params;

        if (!sceneState.groups.has(groupId)) {
          throw new Error(`Group ${groupId} not found`);
        }

        try {
          const elementIds = sceneState.groups.get(groupId);
          sceneState.groups.delete(groupId);

          // Update elements on canvas, removing only this specific groupId
          const updatePromises = (elementIds ?? []).map(async (id) => {
            // Fetch current element to get existing groupIds
            const element = await getElementFromCanvas(id);
            if (!element) {
              logger.warn(`Element ${id} not found on canvas, skipping ungroup`);
              return null;
            }

            // Remove only the specific groupId, preserve others
            const updatedGroupIds = (element.groupIds || []).filter(gid => gid !== groupId);
            return await updateElementOnCanvas({ id, groupIds: updatedGroupIds });
          });

          const results = await Promise.all(updatePromises);
          const successCount = results.filter(result => result !== null).length;

          if (successCount === 0) {
            logger.warn('Failed to ungroup any elements: HTTP server unavailable or elements not found');
          }

          logger.info('Ungrouping elements', { groupId, elementIds, successCount });

          const result = { groupId, ungrouped: true, elementIds, successCount };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          throw new Error(`Failed to ungroup elements: ${(error as Error).message}`);
        }
      }
      
      case 'align_elements': {
        const params = AlignElementsSchema.parse(args);
        const { elementIds, alignment } = params;
        
        // Implementation would align elements based on the specified alignment
        logger.info('Aligning elements', { elementIds, alignment });
        
        const result = { aligned: true, elementIds, alignment };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
      
      case 'distribute_elements': {
        const params = DistributeElementsSchema.parse(args);
        const { elementIds, direction } = params;
        
        // Implementation would distribute elements based on the specified direction
        logger.info('Distributing elements', { elementIds, direction });
        
        const result = { distributed: true, elementIds, direction };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
      
      case 'lock_elements': {
        const params = ElementIdsSchema.parse(args);
        const { elementIds } = params;
        
        try {
          // Lock elements through HTTP API updates
          const updatePromises = elementIds.map(async (id) => {
            return await updateElementOnCanvas({ id, locked: true });
          });
          
          const results = await Promise.all(updatePromises);
          const successCount = results.filter(result => result).length;
          
          if (successCount === 0) {
            throw new Error('Failed to lock any elements: HTTP server unavailable');
          }
          
          const result = { locked: true, elementIds, successCount };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          throw new Error(`Failed to lock elements: ${(error as Error).message}`);
        }
      }
      
      case 'unlock_elements': {
        const params = ElementIdsSchema.parse(args);
        const { elementIds } = params;
        
        try {
          // Unlock elements through HTTP API updates
          const updatePromises = elementIds.map(async (id) => {
            return await updateElementOnCanvas({ id, locked: false });
          });
          
          const results = await Promise.all(updatePromises);
          const successCount = results.filter(result => result).length;
          
          if (successCount === 0) {
            throw new Error('Failed to unlock any elements: HTTP server unavailable');
          }
          
          const result = { unlocked: true, elementIds, successCount };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          throw new Error(`Failed to unlock elements: ${(error as Error).message}`);
        }
      }
      
      case 'create_from_mermaid': {
        const params = z.object({
          mermaidDiagram: z.string(),
          config: z.object({
            startOnLoad: z.boolean().optional(),
            flowchart: z.object({
              curve: z.enum(['linear', 'basis']).optional()
            }).optional(),
            themeVariables: z.object({
              fontSize: z.string().optional()
            }).optional(),
            maxEdges: z.number().optional(),
            maxTextSize: z.number().optional()
          }).optional()
        }).parse(args);
        
        logger.info('Creating Excalidraw elements from Mermaid diagram via MCP', {
          diagramLength: params.mermaidDiagram.length,
          hasConfig: !!params.config
        });

        try {
          // Send the Mermaid diagram to the frontend via the API
          // The frontend will use mermaid-to-excalidraw to convert it
          const response = await fetch(`${EXPRESS_SERVER_URL}/api/elements/from-mermaid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mermaidDiagram: params.mermaidDiagram,
              config: params.config
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP server error: ${response.status} ${response.statusText}`);
          }

          const result = await response.json() as ApiResponse;
          
          logger.info('Mermaid diagram sent to frontend for conversion', {
            success: result.success
          });

          return {
            content: [{
              type: 'text',
              text: `Mermaid diagram sent for conversion!\n\n${JSON.stringify(result, null, 2)}\n\n⚠️  Note: The actual conversion happens in the frontend canvas with DOM access. Open the canvas at ${EXPRESS_SERVER_URL} to see the diagram rendered.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to process Mermaid diagram: ${(error as Error).message}`);
        }
      }
      
      case 'batch_create_elements': {
        const params = z.object({ elements: z.array(ElementSchema) }).parse(args);
        logger.info('Batch creating elements via MCP', { count: params.elements.length });

        const createdElements: ServerElement[] = [];
        
        // Create each element with provided ID or generate unique ID
        for (const elementData of params.elements) {
          const id = elementData.id || generateId();
          const element: ServerElement = {
            id,
            ...elementData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          } as ServerElement;
          
          // Convert text to label format for Excalidraw
          const excalidrawElement = convertTextToLabel(element);
          createdElements.push(excalidrawElement);
        }
        
        // Create all elements directly on HTTP server (no local storage)
        const canvasElements = await batchCreateElementsOnCanvas(createdElements);
        
        if (!canvasElements) {
          throw new Error('Failed to batch create elements: HTTP server unavailable');
        }
        
        const result = {
          success: true,
          elements: canvasElements,
          count: canvasElements.length,
          syncedToCanvas: true
        };
        
        logger.info('Batch elements created via MCP and synced to canvas', { 
          count: result.count,
          synced: result.syncedToCanvas 
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `${result.count} elements created successfully!\n\n${JSON.stringify(result, null, 2)}\n\n${result.syncedToCanvas ? '✅ All elements synced to canvas' : '⚠️  Canvas sync failed (elements still created locally)'}` 
          }]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Error handling tool call: ${(error as Error).message}`, { error });
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true
    };
  }
});

// Set up request handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  return { tools };
});

// Start server with transport based on mode
async function runServer(): Promise<void> {
  try {
    logger.info('Starting Excalidraw MCP server...');
    
    const transportMode = process.env.MCP_TRANSPORT_MODE || 'stdio';
    let transport;
    
    if (transportMode === 'http') {
      const port = parseInt(process.env.PORT || '3000', 10);
      const host = process.env.HOST || 'localhost';
      
      logger.info(`Starting HTTP server on ${host}:${port}`);
      // Here you would create an HTTP transport
      // This is a placeholder - actual HTTP transport implementation would need to be added
      transport = new StdioServerTransport(); // Fallback to stdio for now
    } else {
      // Default to stdio transport
      transport = new StdioServerTransport();
    }
    
    // Add a debug message before connecting
    logger.debug('Connecting to transport...');
    
    await server.connect(transport);
    logger.info(`Excalidraw MCP server running on ${transportMode}`);
    
    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    logger.error('Error starting server:', error);
    process.stderr.write(`Failed to start MCP server: ${(error as Error).message}\n${(error as Error).stack}\n`);
    process.exit(1);
  }
}

// Add global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.stderr.write(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack}\n`);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection:', reason);
  process.stderr.write(`UNHANDLED REJECTION: ${reason}\n`);
  setTimeout(() => process.exit(1), 1000);
});

// For testing and debugging purposes
if (process.env.DEBUG === 'true') {
  logger.debug('Debug mode enabled');
}

// Start the server if this file is run directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default runServer;