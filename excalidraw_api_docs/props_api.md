# Props（属性）

所有 `props` 都是 _可选的_。

| 名称 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| [`initialData`](/docs/@excalidraw/excalidraw/api/props/initialdata) | `object` \| `null` \| `Promise<object \| null>` | `null` | 应用加载时使用的初始数据。 |
| [`excalidrawAPI`](/docs/@excalidraw/excalidraw/api/props/excalidraw-api) | `function` | \_ | 渲染完成后触发的回调函数，并传入 excalidraw API 实例。 |
| [`isCollaborating`](#iscollaborating) | `boolean` | \_ | 指示应用是否处于 `协作` 模式。 |
| [`onChange`](#onchange) | `function` | \_ | 当组件因任何更改而更新时触发此回调。此回调将接收 excalidraw 的 `elements` 和当前的 `app state`。 |
| [`onPointerUpdate`](#onpointerupdate) | `function` | \_ | 鼠标指针更新时触发的回调。 |
| [`onPointerDown`](#onpointerdown) | `function` | \_ | 如果传递了此属性，将在指针按下事件时触发。 |
| [`onScrollChange`](#onscrollchange) | `function` | \_ | 如果传递了此属性，在滚动画布时触发。 |
| [`onPaste`](#onpaste) | `function` | \_ | 当有内容粘贴到场景中时，如果传递了此回调则会被触发。 |
| [`onLibraryChange`](#onlibrarychange) | `function` | \_ | 如果提供了此回调，当库更新时触发，并接收库项目。 |
| [`generateLinkForSelection`](#generatelinkforselection) | `function` | \_ | 允许您在链接到 Excalidraw 元素时覆盖 `url` 的生成方式。 |
| [`onLinkOpen`](#onlinkopen) | `function` | \_ | 如果提供了此回调，当任何链接被打开时触发。 |
| [`langCode`](#langcode) | `string` | `en` | 在 Excalidraw 中使用的语言代码字符串。 |
| [`renderTopRightUI`](/docs/@excalidraw/excalidraw/api/props/render-props#rendertoprightui) | `function` | \_ | 渲染函数，用于在右上角渲染自定义 UI。 |
| [`renderCustomStats`](/docs/@excalidraw/excalidraw/api/props/render-props#rendercustomstats) | `function` | \_ | 渲染函数，可用于在统计对话框上渲染自定义统计信息。 |
| [`viewModeEnabled`](#viewmodeenabled) | `boolean` | \_ | 指示应用是否处于 `查看` 模式。 |
| [`zenModeEnabled`](#zenmodeenabled) | `boolean` | \_ | 指示是否启用了 `禅` 模式。 |
| [`gridModeEnabled`](#gridmodeenabled) | `boolean` | \_ | 指示是否启用了 `网格` 模式。 |
| [`libraryReturnUrl`](#libraryreturnurl) | `string` | \_ | 安装库时，[libraries.excalidraw.com](https://libraries.excalidraw.com) 应该返回的 URL。 |
| [`theme`](#theme) | \"light\" \| \"dark\" | \"light\" | Excalidraw 组件的主题。 |
| [`name`](#name) | `string` | | 绘图的名称。 |
| [`UIOptions`](/docs/@excalidraw/excalidraw/api/props/ui-options) | `object` | [DEFAULT UI OPTIONS](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/constants.ts#L151) | 用于自定义 UI 选项。目前支持自定义 [`画布操作`](/docs/@excalidraw/excalidraw/api/props/ui-options#canvasactions)。 |
| [`detectScroll`](#detectscroll) | `boolean` | `true` | 指示当最近的祖先元素滚动时是否更新偏移量。 |
| [`handleKeyboardGlobally`](#handlekeyboardglobally) | `boolean` | `false` | 指示是否将键盘事件绑定到 document 上。 |
| [`autoFocus`](#autofocus) | `boolean` | `false` | 指示是否在页面加载时聚焦到 Excalidraw 组件。 |
| [`generateIdForFile`](#generateidforfile) | `function` | \_ | 允许您覆盖在画布上添加的文件（如图片）的 `id` 生成方式。 |
| [`validateEmbeddable`](#validateembeddable) | `string[]` \| `boolean` \| `RegExp` \| `RegExp[]` \| `((link: string) => boolean \| undefined)` | \_ | 用于自定义源 URL 验证。 |
| [`renderEmbeddable`](/docs/@excalidraw/excalidraw/api/props/render-props#renderEmbeddable) | `function` | \_ | 渲染函数，可以覆盖内置的 `<iframe>`。 |
| \[renderScrollbars\] | `boolean` | `false` | 渲染滚动条。 |

## 在 Excalidraw 元素上存储自定义数据

除了 Excalidraw 元素本身支持的属性外，您可以在每个元素的 `customData` 对象中存储 `自定义` 数据。该属性的类型是 [`Record<string, any>`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/element/types.ts#L66) 并且是可选的。

您可以使用此功能来添加任何需要跟踪的额外信息。

您可以在将元素作为 [`initialData`](/docs/@excalidraw/excalidraw/api/props/initialdata) 传递时添加 `customData`，或者之后使用 [`updateScene`](/docs/@excalidraw/excalidraw/api/props/excalidraw-api#updatescene) / [`updateLibrary`](/docs/@excalidraw/excalidraw/api/props/excalidraw-api#updatelibrary) 添加。

```json
{
  \"type\": \"rectangle\",
  \"id\": \"oDVXy8D6rom3H1-LLH2-f\",
  \"customData\": {
    \"customId\": \"162\"
  }
}
```

## isCollaborating

此属性指示应用是否处于 `协作` 模式。

## onChange

每次组件更新时，如果传递了此回调，它将被触发，并具有以下签名。

```typescript
(excalidrawElements, appState, files) => void;
```

1.  `excalidrawElements`: 场景中的 [excalidrawElements](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/element/types.ts#L114) 数组。
2.  `appState`: 场景的 [AppState](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts#L95)。
3.  `files`: 添加到场景中的 [BinaryFiles](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts#L64)。

您可以在此回调中尝试将数据保存到后端或本地存储。

## onPointerUpdate

当鼠标指针更新时触发此回调。

```typescript
({ x, y }, button, pointersMap) => void;
```

1.  `{x, y}`: 指针坐标。
2.  `button`: 按钮的状态。值为 `[\"down\", \"up\"]` 之一。
3.  `pointersMap`: 场景的 [`pointers`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts#L131) 映射。

```typescript
(exportedElements, appState, canvas) => void
```

1.  `exportedElements`: 需要导出的 [未删除元素](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/element/types.ts#L87) 数组。
2.  `appState`: 场景的 [AppState](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts#L95)。
3.  `canvas`: 场景的 `HTMLCanvasElement`。

## onPointerDown

如果传递了此属性，将在指针按下事件时触发，并具有以下签名。

```typescript
(activeTool: AppState[\"activeTool\"], pointerDownState: PointerDownState) => void
```

## onScrollChange

如果传递了此属性，将在画布滚动时触发，并具有以下签名。

```typescript
(scrollX: number, scrollY: number) => void
```

## onPaste

当有内容粘贴到场景中时，如果传递了此回调则会被触发。您可以使用此回调在粘贴事件发生时执行额外的操作。

```typescript
(data: ClipboardData, event: ClipboardEvent | null) => boolean
```

此回调必须返回一个 `boolean` 值或一个解析为布尔值的 [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise)。

如果您想阻止 Excalidraw 的默认粘贴操作，必须返回 `false`，这将停止原生的 Excalidraw 剪贴板管理流程（不会有任何内容被粘贴到场景中）。

## onLibraryChange

如果提供了此回调，当库更新时触发，并具有以下签名。

```typescript
(items: LibraryItems) => void | Promise<any>
```

当用户清空库时，它会以空项目被调用。您可以在库更新时需要执行额外操作（例如将其持久化到本地存储）时使用此回调。

## generateLinkForSelection

如果传递了此属性，它将用于替换默认的链接生成函数。目的是让宿主应用可以接管元素链接的创建，这些链接可用于导航到特定元素或组。如果宿主应用为元素链接 ID 选择了不同的键，则宿主应用还应负责在 `onLinkOpen` 中处理导航。

```typescript
(id: string, type: \"element\" | \"group\") => string;
```

## onLinkOpen

如果传递了此属性，将在点击 `链接` 时触发。要自行处理重定向（例如在内部链接中使用自己的路由器时），必须调用 `event.preventDefault()`。

```typescript
(element: ExcalidrawElement, event: CustomEvent<{ nativeEvent: MouseEvent }>) => void
```

示例：

```typescript
const history = useHistory();

// 使用应用的路由器打开内部链接，但在新标签页/窗口中打开外部链接
const onLinkOpen: ExcalidrawProps[\"onLinkOpen\"] = useCallback((element, event) => {
  const link = element.link;
  const { nativeEvent } = event.detail;
  const isNewTab = nativeEvent.ctrlKey || nativeEvent.metaKey;
  const isNewWindow = nativeEvent.shiftKey;
  const isInternalLink = link.startsWith(\"/\") || link.includes(window.location.origin);

  if (isInternalLink && !isNewTab && !isNewWindow) {
    history.push(link.replace(window.location.origin, \"\"));
    // 表示我们正在自行处理重定向
    event.preventDefault();
  }
}, [history]);
```

## langCode

确定 UI 的 `语言`。它应该是 [可用的语言代码](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/i18n.ts#L14) 之一。默认为 `en`（英语）。我们还导出了默认语言和支持的语言，您可以按如下方式导入。

```typescript
import { defaultLang, languages } from \"@excalidraw/excalidraw\";
```

| 名称 | 类型 |
| :--- | :--- |
| `defaultLang` | `string` |
| `languages` | [`Language[]`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/i18n.ts#L15) |

## viewModeEnabled

此属性指示应用是否处于 `查看模式`。当提供此属性时，其值优先于 _intialData.appState.viewModeEnabled_，`查看模式` 将完全由宿主应用控制，用户将无法从应用内部切换它。

## zenModeEnabled

此属性指示应用是否处于 `禅模式`。当提供此属性时，其值优先于 _intialData.appState.zenModeEnabled_，`禅模式` 将完全由宿主应用控制，用户将无法从应用内部切换它。

## gridModeEnabled

此属性指示是否显示网格。当提供此属性时，其值优先于 _intialData.appState.gridModeEnabled_，网格将完全由宿主应用控制，用户将无法从应用内部切换它。

## libraryReturnUrl

如果提供了此 URL，当用户尝试从 [libraries.excalidraw.com](https://libraries.excalidraw.com) 安装库时将使用此 URL。默认为 _window.location.origin + window.location.pathname_。要在打开库的同一标签页中安装库，您需要设置 `window.name`（为任何字母数字字符串）——如果未设置，它将在新标签页中打开。

## theme

此属性控制 Excalidraw 的主题。当提供此属性时，其值优先于 _intialData.appState.theme_，主题将完全由宿主应用控制，并且除非将 _UIOptions.canvasActions.toggleTheme_ 设置为 `true`，否则用户将无法从应用内部切换它。如果设置为 `true`，则 `theme` 属性将控制 Excalidraw 的默认主题，并允许主题切换（您必须在从 [onChange](#onchange) 回调检测到 `appState.theme` 更改时负责更新 `theme` 属性）。

您可以使用 [`THEME`](/docs/@excalidraw/excalidraw/api/utils#theme) 来指定主题。

## name

此属性设置绘图的 `名称`，该名称将在导出绘图时使用。当提供此属性时，其值优先于 _intialData.appState.name_，`名称` 将完全由宿主应用控制，用户将无法在 Excalidraw 内部编辑它。

## detectScroll

指示 Excalidraw 是否应监听 DOM 树中最近可滚动容器的 `scroll` 事件，并在组件位置更改时重新计算坐标（例如，以正确处理光标）。当您确定这不会影响您的应用或者您想自行处理（调用 [`refresh()`](#ref) 方法）时，可以禁用此功能。

## handleKeyboardGlobally

指示是否将键盘事件绑定到 `document` 上。默认禁用，意味着键盘事件绑定到 Excalidraw 组件。这允许多个 Excalidraw 组件共存于同一页面，并确保在组件未聚焦时 Excalidraw 的键盘处理不会与您的应用（或浏览器）冲突。

如果您希望 Excalidraw 在组件未聚焦时（例如，用户正在与导航栏、侧边栏或类似元素交互）也能处理键盘事件，请启用此选项。

## autoFocus

此属性指示是否在页面加载时 `聚焦` 到 Excalidraw 组件。默认为 false。

## generateIdForFile

允许您覆盖在画布上添加的文件（图像）的 `id` 生成方式。默认情况下，使用文件的 SHA-1 摘要。

```typescript
(file: File) => string | Promise<string>
```

## validateEmbeddable

```typescript
validateEmbeddable?: boolean | string[] | RegExp | RegExp[] | ((link: string) => boolean | undefined)
```

这是一个可选属性。默认情况下，我们支持一些知名的网站。您可以通过提供自定义验证器来允许其他站点或禁止默认站点。如果传递 `true`，则允许所有 URL。您还可以提供主机名列表、RegExp（或 RegExp 对象列表）或一个函数。如果函数返回 `undefined`，则将使用内置验证器。

提供主机名列表（带或不带 `www.`）是允许特定域名列表的首选方法。


**注意：** 表格中关于 `renderEmbeddable` 和 `renderScrollbars` 的描述是直接从英文原文翻译的，因为页面上的描述非常简洁。页面中指向子页面的链接（如 `/docs/@excalidraw/excalidraw/api/props/initialdata`）是相对路径，在完整的文档站点中有效。如果您需要这些子页面的详细内容，请告知，我可以继续抓取和翻译。