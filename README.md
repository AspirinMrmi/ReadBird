# ReadBird

中文 | [English](#english)

> Save `X / Twitter` posts into a clean, searchable read-later list.
>
> 把 `X / Twitter` 上值得回看的内容，整理成干净、可搜索的稍后阅读列表。

ReadBird 是一个轻量的浏览器扩展，帮助你把 `X / Twitter` 上的帖子、线程和技术内容保存下来，并通过分类、标签、备注和已读状态进行管理。

ReadBird is a lightweight browser extension for saving posts, threads, and useful content from `X / Twitter`, then organizing them with categories, tags, notes, and read status.

## 为什么使用 ReadBird

- 收藏刷到但暂时没时间看的内容
- 给技术帖子加分类、标签和备注
- 把零散信息整理成自己的阅读清单
- 通过搜索和已读状态快速回顾历史内容
- 用本地存储保存数据，不依赖外部服务

## 功能特性

- 保存 `X / Twitter` 帖子到本地阅读列表
- 按分类管理收藏内容
- 支持标签与备注
- 标记已读 / 未读
- 支持搜索作者、链接、分类、标签和备注
- 支持数据导出与导入（JSON）
- 所有数据保存在浏览器本地存储中

## 截图

你可以在这里放项目截图：

- `docs/screenshot-feed.png`：保存帖子弹层
- `docs/screenshot-manager.png`：管理页列表与详情

如果你后续提供截图文件，我可以继续帮你把图片直接插入到 README 中。

## 技术栈

- `React`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Chrome Extension Manifest V3`

## 项目结构

```text
public/              扩展清单与图标
src/background/      后台脚本
src/content/         内容脚本，注入 X/Twitter 页面
src/manager/         管理页面（收藏列表 UI）
src/shared/          存储、类型与共享逻辑
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 监听构建

```bash
npm run dev
```

构建产物会输出到 `dist/` 目录。

## 加载到浏览器

1. 打开 Chrome 或其他兼容 Chromium 的浏览器
2. 进入扩展管理页面：`chrome://extensions`
3. 打开“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择项目中的 `dist/` 目录

## 使用方式

1. 打开 `x.com` 或 `twitter.com` 上的帖子
2. 使用页面中的“复制链接”相关入口
3. 通过 ReadBird 弹出的保存界面选择分类、填写标签或备注
4. 在扩展管理页查看和整理已保存内容

## 数据存储

ReadBird 使用浏览器的 `chrome.storage.local` 保存数据，包括：

- 已保存的帖子
- 分类
- 应用设置

你也可以通过管理页导出为 JSON，或从 JSON 文件导入数据。

## 权限说明

扩展当前使用以下权限：

- `storage`：保存收藏数据
- `tabs`：访问当前标签页信息
- `https://x.com/*`
- `https://twitter.com/*`

## 适用场景

ReadBird 适合以下场景：

- 收藏技术观点、产品观察和长线程
- 给资料添加自己的标签和批注
- 建立一个简单的个人知识输入清单
- 作为轻量级 `X / Twitter` 稍后阅读工具长期使用

## Roadmap

- 更丰富的筛选与排序
- 默认分类设置
- 批量操作
- 更完善的数据管理体验
- 更好的移动端 / 小屏适配

---

# English

> Save `X / Twitter` posts into a clean, searchable read-later list.
>
> Turn interesting posts from `X / Twitter` into an organized reading queue.

ReadBird is a lightweight browser extension that helps you save posts, threads, and useful content from `X / Twitter`, then organize them with categories, tags, notes, and read status.

## Why ReadBird

- Save interesting content before it disappears in the timeline
- Add categories, tags, and notes to technical posts
- Turn scattered discoveries into a personal reading queue
- Revisit saved content quickly with search and read/unread status
- Keep data locally in the browser without relying on external services

## Features

- Save `X / Twitter` posts to a local reading list
- Organize saved items by category
- Add tags and notes
- Mark items as read or unread
- Search by author, URL, category, tag, and note
- Export and import data as JSON
- Store everything locally in the browser

## Screenshots

You can place screenshots here later:

- `docs/screenshot-feed.png`: save overlay on post pages
- `docs/screenshot-manager.png`: manager page with list and details

If you share actual screenshots, I can also wire them directly into the README.

## Tech Stack

- `React`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Chrome Extension Manifest V3`

## Project Structure

```text
public/              Extension manifest and icons
src/background/      Background script
src/content/         Content script for X/Twitter pages
src/manager/         Manager page (saved list UI)
src/shared/          Storage, types, and shared logic
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Build the project

```bash
npm run build
```

### 3. Watch for changes

```bash
npm run dev
```

Build output is generated in `dist/`.

## Load the Extension

1. Open Chrome or another Chromium-based browser
2. Go to `chrome://extensions`
3. Enable Developer Mode
4. Click `Load unpacked`
5. Select the `dist/` directory

## How to Use

1. Open a post on `x.com` or `twitter.com`
2. Use the page action related to copying the post link
3. Save the post through the ReadBird overlay, optionally adding a category, tags, and a note
4. Manage saved items in the extension manager page

## Data Storage

ReadBird stores data in `chrome.storage.local`, including:

- Saved posts
- Categories
- App settings

You can also export your data as JSON or import it back from a JSON file.

## Permissions

The extension currently uses these permissions:

- `storage`: store saved data locally
- `tabs`: access current tab information
- `https://x.com/*`
- `https://twitter.com/*`

## Use Cases

ReadBird works well for:

- Saving technical threads, product insights, and long-form posts
- Annotating posts with personal tags and notes
- Building a lightweight personal reading inbox
- Keeping a focused read-later workflow for `X / Twitter`

## Roadmap

- Richer filtering and sorting
- Default category support
- Bulk actions
- Better data management experience
- Improved small-screen support
