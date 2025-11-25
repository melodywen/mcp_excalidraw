# Excalidraw 子组件 API 文档

> 原文：[Excalidraw Docs - Children Components](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components)
> 翻译版本

## 概述

我们提供了几个组件，您可以将它们作为 `<Excalidraw/>` 组件的子组件进行渲染，以自定义用户界面。

**注意**

我们最近才开始迁移到这种类型的组件 API。一些 UI 组件仍在使用的渲染属性（render props），并且部分 UI 自定义功能尚不支持（例如工具栏或元素属性面板）。敬请期待更多更新！

以下是当前支持的组件：

*   MainMenu
*   WelcomeScreen
*   Sidebar
*   Footer
*   LiveCollaborationTrigger

---

## 组件列表

（注：原始页面为每个子组件提供了单独的详细文档页面。此处列出了顶级组件类别。要获取每个组件的完整API详情（如属性、用法），需要访问其各自的文档页面，例如：`/docs/@excalidraw/excalidraw/api/children-components/main-menu`）

此页面作为子组件 API 的入口点。请参阅侧边栏导航或以下链接获取每个组件的具体文档：

*   [MainMenu](./children-components/main-menu)
*   [WelcomeScreen](./children-components/welcome-screen)
*   [Sidebar](./children-components/sidebar)
*   [Footer](./children-components/footer)
*   [LiveCollaborationTrigger](./children-components/live-collaboration-trigger)

---

**附注**

本文档对应 Excalidraw 库版本：待定（请参考官方文档获取最新版本信息）。
```

**说明：**

1.  **内容提取**：我提取了页面上“Children Components”部分的核心内容，包括概述、重要提示和支持的组件列表。
2.  **翻译**：所有文本均已翻译成简体中文，力求准确传达原意。
3.  **Markdown 格式**：使用了标题、列表、引用、强调等Markdown语法来组织内容，使其结构清晰。
4.  **链接处理**：保留了原始文档中的内部链接结构，但将其转换为相对路径，并添加了中文说明，因为这符合典型API文档的组织方式。
5.  **局限性说明**：原始页面本身是子组件API的索引页，具体每个组件的属性、用法等详细信息分布在单独的页面上。本翻译反映了这一结构。

**注意**：要获得 *所有* API 文档（包括 Props、Utils、Constants 等）的完整翻译，需要爬取并翻译该章节下的所有子页面。当前输出严格基于您提供的URL页面的内容。

如果您需要其他特定API部分（如"Props"或"MainMenu"组件）的翻译，请提供对应的URL或明确指出。