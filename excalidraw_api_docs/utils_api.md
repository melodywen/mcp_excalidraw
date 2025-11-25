# Excalidraw API 工具函数 (Utils) 中文文档

> 本文档翻译自官方 Excalidraw API 工具函数文档，提供对 `@excalidraw/excalidraw` 包中导出的一系列纯 JavaScript 函数的详细说明。

## 概述

这些工具函数是从 `@excalidraw/excalidraw` 包中导出的纯 JavaScript 函数。它们主要用于场景数据的序列化、反序列化、坐标转换、元素操作、国际化支持等。

## 工具函数列表

### `serializeAsJSON`

将场景元素和状态序列化为 JSON 字符串。会移除已删除的元素以及 AppState 中的大部分属性。

**签名**
```typescript
serializeAsJSON({
  elements: ExcalidrawElement[],
  appState: AppState,
}): string
```

**使用方法**
```javascript
import { serializeAsJSON } from \"@excalidraw/excalidraw\";
```

**注意**
如果想要覆盖 JSON 字符串中的 `source` 字段，可以设置 `window.EXCALIDRAW_EXPORT_SOURCE` 为所需的值。

---

### `serializeLibraryAsJSON`

将库项目序列化为 JSON 字符串。

**签名**
```typescript
serializeLibraryAsJSON(libraryItems: LibraryItems[]): string
```

**使用方法**
```javascript
import { serializeLibraryAsJSON } from \"@excalidraw/excalidraw\";
```

**注意**
如果想要覆盖 JSON 字符串中的 `source` 字段，可以设置 `window.EXCALIDRAW_EXPORT_SOURCE` 为所需的值。

---

### `isInvisiblySmallElement`

如果元素小到不可见（例如，宽度和高度为零），则返回 `true`。

**签名**
```typescript
isInvisiblySmallElement(element: ExcalidrawElement): boolean
```

**使用方法**
```javascript
import { isInvisiblySmallElement } from \"@excalidraw/excalidraw\";
```

---

### `loadFromBlob`

从 Blob（或文件）加载场景数据。如果提供了 `localAppState`，则该值将优先于从 Blob 派生的 appState。

**签名**
```typescript
loadFromBlob(
  blob: Blob,
  localAppState: AppState | null,
  localElements: ExcalidrawElement[] | null,
  fileHandle?: FileSystemHandle | null
): Promise<RestoredDataState>
```

**使用方法**
```javascript
import { loadFromBlob } from \"@excalidraw/excalidraw\";

const scene = await loadFromBlob(file, null, null);
excalidrawAPI.updateScene(scene);
```

**注意**
如果 Blob 不包含有效的场景数据，则会抛出错误。

---

### `loadLibraryFromBlob`

从 Blob 加载库。还接受一个 `defaultStatus` 参数，用于设置库项目的默认状态（如果不存在），默认为 \"unpublished\"。

**签名**
```typescript
loadLibraryFromBlob(
  blob: Blob, 
  defaultStatus: \"published\" | \"unpublished\"
): Promise<ImportedLibraryState>
```

**使用方法**
```javascript
import { loadLibraryFromBlob } from \"@excalidraw/excalidraw\";
```

---

### `loadSceneOrLibraryFromBlob`

从提供的 Blob 加载场景或库数据。如果 Blob 包含场景数据，并且您传递了 `localAppState`，则 `localAppState` 的值将优先于从 Blob 派生的 appState。

**签名**
```typescript
loadSceneOrLibraryFromBlob(
  blob: Blob,
  localAppState: AppState | null,
  localElements: ExcalidrawElement[] | null,
  fileHandle?: FileSystemHandle | null
): Promise<{ type: string, data: RestoredDataState | ImportedLibraryState }>
```

**使用方法**
```javascript
import { loadSceneOrLibraryFromBlob, MIME_TYPES } from \"@excalidraw/excalidraw\";

const contents = await loadSceneOrLibraryFromBlob(file, null, null);
if (contents.type === MIME_TYPES.excalidraw) {
  excalidrawAPI.updateScene(contents.data);
} else if (contents.type === MIME_TYPES.excalidrawlib) {
  excalidrawAPI.updateLibrary(contents.data);
}
```

**注意**
如果 Blob 不包含有效的场景数据或库数据，则会抛出错误。

---

### `getFreeDrawSvgPath`

返回元素的自由绘制 SVG 路径。

**签名**
```typescript
getFreeDrawSvgPath(element: ExcalidrawFreeDrawElement): string
```

**使用方法**
```javascript
import { getFreeDrawSvgPath } from \"@excalidraw/excalidraw\";
```

---

### `isLinearElement`

如果元素是线性类型（箭头或直线），则返回 `true`，否则返回 `false`。

**签名**
```typescript
isLinearElement(elementType?: ExcalidrawElement): boolean
```

**使用方法**
```javascript
import { isLinearElement } from \"@excalidraw/excalidraw\";
```

---

### `getNonDeletedElements`

返回未删除元素的数组。

**签名**
```typescript
getNonDeletedElements(elements: readonly ExcalidrawElement[]): readonly NonDeletedExcalidrawElement[]
```

**使用方法**
```javascript
import { getNonDeletedElements } from \"@excalidraw/excalidraw\";
```

---

### `mergeLibraryItems`

合并两个 LibraryItems 数组，其中来自 `otherItems` 的唯一项在返回的数组中排在前面。

**签名**
```typescript
mergeLibraryItems(
  localItems: LibraryItems,
  otherItems: LibraryItems
): LibraryItems
```

**使用方法**
```javascript
import { mergeLibraryItems } from \"@excalidraw/excalidraw\";
```

---

### `parseLibraryTokensFromUrl`

如果 URL 中存在库参数（期望是 `#addLibrary` 哈希键），则解析它们，并返回一个包含 `libraryUrl` 和 `idToken` 的对象。如果未找到 `#addLibrary` 哈希键，则返回 `null`。

**签名**
```typescript
parseLibraryTokensFromUrl(): {
    libraryUrl: string;
    idToken: string | null;
} | null
```

**使用方法**
```javascript
import { parseLibraryTokensFromUrl } from \"@excalidraw/excalidraw\";
```

---

### `useHandleLibrary`

一个钩子，用于在初始加载时或编辑会话期间（例如，当用户安装新库时）自动从 URL 导入库（如果存在 `#addLibrary` 哈希键），并在提供了 `getInitialLibraryItems` 获取器时处理初始库加载。

**签名**
```typescript
useHandleLibrary(opts: {
  excalidrawAPI: ExcalidrawAPI,
  getInitialLibraryItems?: () => LibraryItemsSource
}): void
```

**使用方法**
```javascript
import { useHandleLibrary } from \"@excalidraw/excalidraw\";

export const App = () => {
  // ...
  useHandleLibrary({ excalidrawAPI });
};
```

**未来计划**
未来，我们将增加对将库持久化到浏览器存储（或其他地方）的支持。

---

### `getSceneVersion`

返回当前场景版本。

**签名**
```typescript
getSceneVersion(elements: ExcalidrawElement[]): number
```

**使用方法**
```javascript
import { getSceneVersion } from \"@excalidraw/excalidraw\";
```

---

### `sceneCoordsToViewportCoords`

将提供的场景坐标转换为等效的视口坐标。

**签名**
```typescript
sceneCoordsToViewportCoords(
  { sceneX: number, sceneY: number },
  appState: AppState
): { x: number, y: number }
```

**使用方法**
```javascript
import { sceneCoordsToViewportCoords } from \"@excalidraw/excalidraw\";
```

---

### `viewportCoordsToSceneCoords`

将提供的视口坐标转换为等效的场景坐标。

**签名**
```typescript
viewportCoordsToSceneCoords(
  { clientX: number, clientY: number },
  appState: AppState
): { x: number, y: number }
```

**使用方法**
```javascript
import { viewportCoordsToSceneCoords } from \"@excalidraw/excalidraw\";
```

---

### `useEditorInterface`

此钩子可用于检查正在使用的设备类型。它只能在 Excalidraw 组件的子组件内部使用。

**返回值**
`EditorInterface` 对象具有以下属性：

| 名称 | 类型 | 描述 |
|------|------|-------------|
| `formFactor` | `\'phone\' \| \'tablet\' \| \'desktop\'` | 基于屏幕尺寸指示设备类型 |
| `desktopUIMode` | `\'compact\' \| \'full\'` | 桌面设备的 UI 模式 |
| `userAgent.raw` | `string` | 原始用户代理字符串 |
| `userAgent.isMobileDevice` | `boolean` | 如果设备是移动设备则为 true |
| `userAgent.platform` | `\'ios\' \| \'android\' \| \'other\' \| \'unknown\'` | 设备平台 |
| `isTouchScreen` | `boolean` | 如果检测到触摸事件则为 true |
| `canFitSidebar` | `boolean` | 如果侧边栏可以适应视口则为 true |
| `isLandscape` | `boolean` | 如果视口处于横屏模式则为 true |

**使用方法**
```javascript
import { useEditorInterface } from \"@excalidraw/excalidraw\";

const MobileFooter = ({}) => {
  const editorInterface = useEditorInterface();
  if (editorInterface.formFactor === \"phone\") {
    return (
      <Footer>
        <button
          className=\"custom-footer\"
          style={{ marginLeft: \"20px\", height: \"2rem\" }}
          onClick={() => alert(\"This is custom footer in mobile menu\")}
        >
          custom footer
        </button>
      </Footer>
    );
  }
  return null;
};
```

---

### 国际化 (i18n)

为了帮助进行本地化，我们导出了以下内容。

**导出的项目**
- `defaultLang`: 默认语言代码，`\'en\'`
- `languages`: 支持的语言代码列表。您可以将其中任何一个传递给 Excalidraw 的 `langCode` 属性
- `useI18n()`: 一个钩子，返回当前语言代码和翻译辅助函数

**使用方法**
```javascript
import { defaultLang, languages, useI18n } from \"@excalidraw/excalidraw\";

function App() {
  const { t } = useI18n();
  return (
    <div style={{ height: \"500px\" }}>
      <Excalidraw>
        <button
          style={{ position: \"absolute\", zIndex: 10, height: \"2rem\" }}
          onClick={() => window.alert(t(\"labels.madeWithExcalidraw\"))}
        >
          {t(\"buttons.confirm\")}
        </button>
      </Excalidraw>
    </div>
  );
}
```

---

### `getCommonBounds`

可用于获取所传递元素的公共边界。

**签名**
```typescript
getCommonBounds(
  elements: readonly ExcalidrawElement[]
): readonly [
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
]
```

**使用方法**
```javascript
import { getCommonBounds } from \"@excalidraw/excalidraw\";
```

---

### `elementsOverlappingBBox`

用于过滤位于边界矩形内部、重叠或包含边界矩形的元素。

边界检查是近似的，不精确遵循元素的形状。您还可以提供 `errorMargin`，这实际上会按该量扩大边界。

此 API 具有三种操作类型：`overlap`、`contain` 和 `inside`：
- `overlap` - 过滤与边界重叠或位于边界内部的元素
- `contain` - 过滤位于边界内部或边界包含元素的元素
- `inside` - 过滤位于边界内部的元素

**签名**
```typescript
elementsOverlappingBBox(
  elements: readonly NonDeletedExcalidrawElement[];
  bounds: Bounds | ExcalidrawElement;
  errorMargin?: number;
  type: \"overlap\" | \"contain\" | \"inside\";
): NonDeletedExcalidrawElement[];
```

**使用方法**
```javascript
import { elementsOverlappingBBox } from \"@excalidraw/excalidraw\";
```

---

### `isElementInsideBBox`

比 `elementsOverlappingBBox` 更低级的 API，用于检查单个元素是否位于边界内部。如果 `eitherDirection=true`，当元素完全位于边界矩形内部，或者边界矩形完全位于元素内部时，返回 `true`。当为 `false` 时，仅在前一种情况下返回 `true`。

**签名**
```typescript
isElementInsideBBox(
  element: NonDeletedExcalidrawElement,
  bounds: Bounds,
  eitherDirection?: boolean
): boolean
```

**使用方法**
```javascript
import { isElementInsideBBox } from \"@excalidraw/excalidraw\";
```

---

### `elementPartiallyOverlapsWithOrContainsBBox`

检查元素是否与边界矩形重叠，或者是否完全位于其内部。

**签名**
```typescript
elementPartiallyOverlapsWithOrContainsBBox(
  element: NonDeletedExcalidrawElement,
  bounds: Bounds
): boolean
```

**使用方法**
```javascript
import { elementPartiallyOverlapsWithOrContainsBBox } from \"@excalidraw/excalidraw\";
```

## 相关链接

- [导出工具函数 (Export Utilities)](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export-utils)
- [恢复工具函数 (Restore Utilities)](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/restore-utils)

---

*本文档最后更新日期：2023年（根据源文档推断）*  
*版权 © 2023 Excalidraw 社区。使用 Docusaurus ❤️ 构建*