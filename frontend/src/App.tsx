import React, { useState, useEffect, useRef } from 'react'
import {
  Excalidraw, 
  CaptureUpdateAction,
  ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw'
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
  ImageCrop
} from '@excalidraw/excalidraw/types/element/types'
import type { LocalPoint, Radians } from '@excalidraw/math'
import { convertMermaidToExcalidraw, DEFAULT_MERMAID_CONFIG } from './utils/mermaidConverter'
import type { MermaidConfig } from '@excalidraw/mermaid-to-excalidraw'

// Type definitions
type ExcalidrawAPIRefValue = ExcalidrawImperativeAPI;

interface ServerElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  
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
  
  // 已有属性 (可能在 ExcalidrawElementBase 中已有，但在此处也列出以明确语义)
  label?: {
    text: string;
  };
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  boundElements?: any[] | null;
  containerId?: string | null;
  locked?: boolean;
}

interface WebSocketMessage {
  type: string;
  element?: ServerElement;
  elements?: ServerElement[];
  elementId?: string;
  count?: number;
  timestamp?: string;
  source?: string;
  mermaidDiagram?: string;
  config?: MermaidConfig;
}

interface ApiResponse {
  success: boolean;
  elements?: ServerElement[];
  element?: ServerElement;
  count?: number;
  error?: string;
  message?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Helper function to clean elements for Excalidraw
const cleanElementForExcalidraw = (element: ServerElement): Partial<ExcalidrawElement> => {
  const {
    createdAt,
    updatedAt,
    version,
    syncedAt,
    source,
    syncTimestamp,
    ...cleanElement
  } = element;
  return cleanElement;
}

// 生成唯一ID的辅助函数
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

// 🔧 自定义 convertToExcalidrawElements 实现 - 使用底层包类型，根据 type 进行字段处理
const customConvertToExcalidrawElements = (
  elements: Partial<ExcalidrawElement>[], 
  options: { regenerateIds?: boolean } = {}
): Partial<ExcalidrawElement>[] => {
  const { regenerateIds = false } = options;
  
  return elements.map(element => {
    // 基础必需字段 - 所有元素都需要
    const baseElement: Partial<ExcalidrawElement> = {
      id: regenerateIds ? generateId() : (element.id || generateId()),
      type: element.type as any,
      x: element.x || 0,
      y: element.y || 0,
      versionNonce: element.versionNonce || Math.floor(Math.random() * 1000000),
      updated: element.updated || Date.now(),
      seed: element.seed || Math.floor(Math.random() * 1000000),
      isDeleted: element.isDeleted || false,
      angle: (element.angle as Radians) || (0 as Radians),
      opacity: element.opacity || 100,
      locked: element.locked || false,
      link: element.link || null,
      customData: element.customData || null,
      boundElements: element.boundElements || null,
      containerId: element.containerId || null,
      // 🔧 添加缺失的必需字段
      groupIds: (element.groupIds as readonly string[]) || [] as readonly string[],
      frameId: element.frameId || null,
      index: element.index || null,
      version: element.version || 1,
    };

    // 根据元素类型添加特定字段和默认值
    switch (element.type) {
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
        return {
          ...baseElement,
          type: element.type,
          width: element.width || 100,
          height: element.height || 100,
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent', // 🔧 修复：使用透明背景而非白色，避免遮挡其他元素
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性 // 🔧 修复：增加默认描边宽度，提高可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
          roundness: element.roundness || null,
        } as ExcalidrawElement;

      case 'arrow':
      case 'line':
        const linearElement = {
          ...baseElement,
          type: element.type,
          points: (element.points as readonly LocalPoint[]) || ([[0, 0], [100, 0]] as unknown as readonly LocalPoint[]),
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent',
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
          roundness: element.roundness || null,
          lastCommittedPoint: (element.lastCommittedPoint as LocalPoint) || null,
          // 🔗 关键：保留绑定字段
          startBinding: (element.startBinding as PointBinding) || null,
          endBinding: (element.endBinding as PointBinding) || null,
        };
        
        // 箭头特有字段
        if (element.type === 'arrow') {
          return {
            ...linearElement,
            startArrowhead: (element.startArrowhead as Arrowhead) || null,
            endArrowhead: (element.endArrowhead as Arrowhead) || 'arrow',
            elbowed: element.elbowed || false,
          } as ExcalidrawElement;
        }
        
        return linearElement as ExcalidrawElement;

      case 'text':
        const textContent = element.text || '';
        const fontSize = element.fontSize || 20;
        const lineHeight = element.lineHeight || 1.25;
        
        // 🔧 根据 autoResize 设置决定宽高处理策略
        let finalWidth = element.width;
        let finalHeight = element.height;
        
        // 如果用户启用了 autoResize，强制将宽高设为 0，让 Excalidraw 自动计算
        if (element.autoResize === true) {
          finalWidth = 0;
          finalHeight = 0;
        }
        // 如果用户没有设置 autoResize 或设为 false，使用用户传递的值（可能为 undefined）
        
        return {
          ...baseElement,
          type: 'text',
          text: textContent,
          fontSize: fontSize,
          fontFamily: element.fontFamily || 5,
          textAlign: (element.textAlign as TextAlign) || 'left',
          verticalAlign: (element.verticalAlign as VerticalAlign) || 'top',
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent',
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
          originalText: element.originalText || textContent,
          autoResize: element.autoResize !== undefined ? element.autoResize : true, // 文本元素默认自动调整大小
          lineHeight: lineHeight,
          // 根据 autoResize 设置使用对应的宽高值
          width: finalWidth,
          height: finalHeight,
        } as ExcalidrawElement;

      case 'freedraw':
        return {
          ...baseElement,
          type: 'freedraw',
          points: (element.points as readonly LocalPoint[]) || ([[0, 0]] as unknown as readonly LocalPoint[]),
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent',
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
          roundness: element.roundness || null, // 🔧 修复：添加缺失的 roundness 属性
          pressures: (element.pressures as readonly number[]) || [] as readonly number[],
          simulatePressure: element.simulatePressure !== undefined ? element.simulatePressure : true,
          lastCommittedPoint: (element.lastCommittedPoint as LocalPoint) || null,
        } as ExcalidrawElement;

      case 'image':
        return {
          ...baseElement,
          type: 'image',
          width: element.width || 100,
          height: element.height || 100,
          fileId: (element.fileId as FileId) || null,
          status: element.status || 'saved',
          scale: element.scale || [1, 1],
          crop: (element.crop as ImageCrop) || null,
        } as ExcalidrawElement;

      case 'frame':
        return {
          ...baseElement,
          type: 'frame',
          width: element.width || 200,
          height: element.height || 200,
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent', // 🔧 修复：使用透明背景而非浅灰色，保持一致性
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性 // 🔧 修复：增加默认描边宽度，提高可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
          roundness: element.roundness || null,
          name: element.name || null,
          children: (element.children as readonly ExcalidrawElement["id"][]) || [] as readonly ExcalidrawElement["id"][],
        } as ExcalidrawElement;

      default:
        console.warn(`Unknown element type: ${element.type}, using default rectangle properties`);
        return {
          ...baseElement,
          type: element.type as any,
          width: element.width || 100,
          height: element.height || 100,
          strokeColor: element.strokeColor || '#1e1e1e',
          backgroundColor: element.backgroundColor || 'transparent', // 🔧 修复：使用透明背景而非白色，保持一致性
          fillStyle: (element.fillStyle as FillStyle) || 'solid',
          strokeWidth: element.strokeWidth || 2, // 🔧 修复：增加默认描边宽度，提高自由绘制线条可见性 // 🔧 修复：增加默认描边宽度，提高可见性
          strokeStyle: (element.strokeStyle as StrokeStyle) || 'solid',
          roughness: element.roughness || 1,
        } as ExcalidrawElement;
    }
  });
};

// Helper function to validate and fix element binding data
const validateAndFixBindings = (elements: Partial<ExcalidrawElement>[]): Partial<ExcalidrawElement>[] => {
  const elementMap = new Map(elements.map(el => [el.id!, el]));
  
  return elements.map(element => {
    const fixedElement = { ...element };
    
    // Validate and fix boundElements
    if (fixedElement.boundElements) {
      if (Array.isArray(fixedElement.boundElements)) {
        fixedElement.boundElements = fixedElement.boundElements.filter((binding: any) => {
          // Ensure binding has required properties
          if (!binding || typeof binding !== 'object') return false;
          if (!binding.id || !binding.type) return false;
          
          // Ensure the referenced element exists
          const referencedElement = elementMap.get(binding.id);
          if (!referencedElement) return false;
          
          // Validate binding type
          if (!['text', 'arrow'].includes(binding.type)) return false;
          
          return true;
        });
        
        // Remove boundElements if empty
        if (fixedElement.boundElements.length === 0) {
          fixedElement.boundElements = null;
        }
      } else {
        // Invalid boundElements format, set to null
        fixedElement.boundElements = null;
      }
    }
    
    // Validate and fix containerId
    if (fixedElement.containerId) {
      const containerElement = elementMap.get(fixedElement.containerId);
      if (!containerElement) {
        // Container doesn't exist, remove containerId
        fixedElement.containerId = null;
      }
    }
    
    return fixedElement;
  });
}

function App(): JSX.Element {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPIRefValue | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const websocketRef = useRef<WebSocket | null>(null)
  
  // Sync state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // WebSocket connection
  useEffect(() => {
    connectWebSocket()
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  // Load existing elements when Excalidraw API becomes available
  useEffect(() => {
    if (excalidrawAPI) {
      loadExistingElements()
      
      // Ensure WebSocket is connected for real-time updates
      if (!isConnected) {
        connectWebSocket()
      }
    }
  }, [excalidrawAPI, isConnected])

  const loadExistingElements = async (): Promise<void> => {
    try {
      const response = await fetch('/api/elements')
      const result: ApiResponse = await response.json()
      
      if (result.success && result.elements && result.elements.length > 0) {
        const cleanedElements = result.elements.map(cleanElementForExcalidraw)
        const convertedElements = customConvertToExcalidrawElements(cleanedElements, { regenerateIds: false })
        excalidrawAPI?.updateScene({ elements: convertedElements })
      }
    } catch (error) {
      console.error('Error loading existing elements:', error)
    }
  }

  const connectWebSocket = (): void => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    
    websocketRef.current = new WebSocket(wsUrl)
    
    websocketRef.current.onopen = () => {
      setIsConnected(true)
      
      if (excalidrawAPI) {
        setTimeout(loadExistingElements, 100)
      }
    }
    
    websocketRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data)
      }
    }
    
    websocketRef.current.onclose = (event: CloseEvent) => {
      setIsConnected(false)
      
      // Reconnect after 3 seconds if not a clean close
      if (event.code !== 1000) {
        setTimeout(connectWebSocket, 3000)
      }
    }
    
    websocketRef.current.onerror = (error: Event) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }
  }

  const handleWebSocketMessage = async (data: WebSocketMessage): Promise<void> => {
    if (!excalidrawAPI) {
      return
    }

    try {
      const currentElements = excalidrawAPI.getSceneElements()
      console.log('Current elements:', currentElements);
      // console.log('Current elements:', currentElements,JSON.stringify(currentElements));

      switch (data.type) {
        case 'initial_elements':
          if (data.elements && data.elements.length > 0) {
            const cleanedElements = data.elements.map(cleanElementForExcalidraw)
            const validatedElements = validateAndFixBindings(cleanedElements)
            const convertedElements = customConvertToExcalidrawElements(validatedElements, { regenerateIds: false })
            excalidrawAPI.updateScene({
              elements: convertedElements as ExcalidrawElement[],
              captureUpdate: CaptureUpdateAction.NEVER
            })
          }
          break

        case 'element_created':
          if (data.element) {
            const cleanedNewElement = cleanElementForExcalidraw(data.element)
            const newElement = customConvertToExcalidrawElements([cleanedNewElement], { regenerateIds: false })
            const updatedElementsAfterCreate = [...currentElements, ...newElement]
            excalidrawAPI.updateScene({ 
              elements: updatedElementsAfterCreate as ExcalidrawElement[],
              captureUpdate: CaptureUpdateAction.NEVER
            })
          }
          break
          
        case 'element_updated':
          if (data.element) {
            const cleanedUpdatedElement = cleanElementForExcalidraw(data.element)
            const convertedUpdatedElement = customConvertToExcalidrawElements([cleanedUpdatedElement], { regenerateIds: false })[0]
            const updatedElements = currentElements.map(el =>
              el.id === data.element!.id ? convertedUpdatedElement as ExcalidrawElement : el
            )
            excalidrawAPI.updateScene({
              elements: updatedElements,
              captureUpdate: CaptureUpdateAction.NEVER
            })
          }
          break

        case 'element_deleted':
          if (data.elementId) {
            const filteredElements = currentElements.filter(el => el.id !== data.elementId)
            excalidrawAPI.updateScene({
              elements: filteredElements,
              captureUpdate: CaptureUpdateAction.NEVER
            })
          }
          break

        case 'elements_batch_created':
          if (data.elements) {
            const cleanedBatchElements = data.elements.map(cleanElementForExcalidraw)
            const batchElements = customConvertToExcalidrawElements(cleanedBatchElements, { regenerateIds: false })
            const updatedElementsAfterBatch = [...currentElements, ...batchElements]
            excalidrawAPI.updateScene({ 
              elements: updatedElementsAfterBatch as ExcalidrawElement[],
              captureUpdate: CaptureUpdateAction.NEVER
            })
          }
          break
          
        case 'elements_synced':
          console.log(`Sync confirmed by server: ${data.count} elements`)
          // Sync confirmation already handled by HTTP response
          break
          
        case 'sync_status':
          console.log(`Server sync status: ${data.count} elements`)
          break
          
        case 'mermaid_convert':
          console.log('Received Mermaid conversion request from MCP')
          if (data.mermaidDiagram) {
            try {
              const result = await convertMermaidToExcalidraw(data.mermaidDiagram, data.config || DEFAULT_MERMAID_CONFIG)

              if (result.error) {
                console.error('Mermaid conversion error:', result.error)
                return
              }

              if (result.elements && result.elements.length > 0) {
                const convertedElements = customConvertToExcalidrawElements(result.elements as Partial<ExcalidrawElement>[], { regenerateIds: false })
                excalidrawAPI.updateScene({
                  elements: convertedElements as ExcalidrawElement[],
                  captureUpdate: CaptureUpdateAction.IMMEDIATELY
                })

                if (result.files) {
                  excalidrawAPI.addFiles(Object.values(result.files))
                }

                console.log('Mermaid diagram converted successfully:', result.elements.length, 'elements')

                // Sync to backend automatically after creating elements
                await syncToBackend()
              }
            } catch (error) {
              console.error('Error converting Mermaid diagram from WebSocket:', error)
            }
          }
          break
          
        default:
          console.log('Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error, data)
    }
  }

  // Data format conversion for backend
  const convertToBackendFormat = (element: ExcalidrawElement): ServerElement => {
    return {
      ...element
    } as ServerElement
  }

  // Format sync time display
  const formatSyncTime = (time: Date | null): string => {
    if (!time) return ''
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Main sync function
  const syncToBackend = async (): Promise<void> => {
    if (!excalidrawAPI) {
      console.warn('Excalidraw API not available')
      return
    }
    
    setSyncStatus('syncing')
    
    try {
      // 1. Get current elements
      const currentElements = excalidrawAPI.getSceneElements()
      console.log(`Syncing ${currentElements.length} elements to backend`)
      
      // Filter out deleted elements
      const activeElements = currentElements.filter(el => !el.isDeleted)
      
      // 3. Convert to backend format
      const backendElements = activeElements.map(convertToBackendFormat)
      
      // 4. Send to backend
      const response = await fetch('/api/elements/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: backendElements,
          timestamp: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        const result: ApiResponse = await response.json()
        setSyncStatus('success')
        setLastSyncTime(new Date())
        console.log(`Sync successful: ${result.count} elements synced`)
        
        // Reset status after 2 seconds
        setTimeout(() => setSyncStatus('idle'), 2000)
      } else {
        const error: ApiResponse = await response.json()
        setSyncStatus('error')
        console.error('Sync failed:', error.error)
      }
    } catch (error) {
      setSyncStatus('error')
      console.error('Sync error:', error)
    }
  }

  const clearCanvas = async (): Promise<void> => {
    if (excalidrawAPI) {
      try {
        // Get all current elements and delete them from backend
        const response = await fetch('/api/elements')
        const result: ApiResponse = await response.json()
        
        if (result.success && result.elements) {
          const deletePromises = result.elements.map(element => 
            fetch(`/api/elements/${element.id}`, { method: 'DELETE' })
          )
          await Promise.all(deletePromises)
        }
        
        // Clear the frontend canvas
        excalidrawAPI.updateScene({ 
          elements: [],
          captureUpdate: CaptureUpdateAction.IMMEDIATELY
        })
      } catch (error) {
        console.error('Error clearing canvas:', error)
        // Still clear frontend even if backend fails
        excalidrawAPI.updateScene({ 
          elements: [],
          captureUpdate: CaptureUpdateAction.IMMEDIATELY
        })
      }
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1>Excalidraw Canvas</h1>
        <div className="controls">
          <div className="status">
            <div className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {/* Sync Controls */}
          <div className="sync-controls">
            <button 
              className={`btn-primary ${syncStatus === 'syncing' ? 'btn-loading' : ''}`}
              onClick={syncToBackend}
              disabled={syncStatus === 'syncing' || !excalidrawAPI}
            >
              {syncStatus === 'syncing' && <span className="spinner"></span>}
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Backend'}
            </button>
            
            {/* Sync Status */}
            <div className="sync-status">
              {syncStatus === 'success' && (
                <span className="sync-success">✅ Synced</span>
              )}
              {syncStatus === 'error' && (
                <span className="sync-error">❌ Sync Failed</span>
              )}
              {lastSyncTime && syncStatus === 'idle' && (
                <span className="sync-time">
                  Last sync: {formatSyncTime(lastSyncTime)}
                </span>
              )}
            </div>
          </div>
          
          <button className="btn-secondary" onClick={clearCanvas}>Clear Canvas</button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="canvas-container">
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawAPIRefValue) => setExcalidrawAPI(api)}
          initialData={{
            elements: [],
            appState: {
              theme: 'light',
              viewBackgroundColor: '#ffffff'
            }
          }}
        />
      </div>
    </div>
  )
}

export default App