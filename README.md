# 🎨 泫晨懿然·灵犀绘梦助手

> 基于 Tauri + React 开发的灵犀绘梦桌面应用，支持 Seedream 和 Banana 2 两大 AI 绘画模型

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

### 🔤 智能提示词解析

- 自动识别 `@角色名` 格式，提取角色信息
- 文本内容智能分段：场景、动作、人物、背景、时间、天气、风格
- 支持中英文混合输入

### 👤 角色绑定系统

- 上传参考图片绑定角色
- 支持人物/场景两种参考图类型
- 本地路径和 Base64 图片双支持
- 角色绑定信息持久化存储

### 🖼️ AI 图片生成

- **Seedream 4.5** - 支持 1K/2K/4K 超清图片、组图功能、水印控制
- **Banana 2** - 支持多种比例和分辨率的图片生成
- 实时进度显示
- 角色融图支持（通过参考图路径）

### 📦 批量处理功能

- **批量提示词拆分** - 支持自定义分隔符（`|`、`;;`、`---`、换行、TAB等）或自动识别场景模式
- **批量角色绑定** - 每个场景可单独绑定角色参考图
- **并发生成** - 可配置 1-5 张图片同时生成
- **生成参数弹框** - 批量生成时可快速调整模型和参数

### ⚙️ 配置管理

- API Key 和 Base URL 灵活配置
- 生成参数预设保存
- 测试连接功能

## 🛠️ 技术栈

| 技术         | 描述           |
| ------------ | -------------- |
| React 19     | 前端框架       |
| TypeScript   | 类型安全       |
| Vite         | 构建工具       |
| Tauri 2.x    | 桌面应用框架   |
| Ant Design 6 | UI 组件库      |
| Axum         | Rust HTTP 服务 |
| Zustand      | 状态管理       |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- Windows 10/11

### 安装

```bash
# 安装前端依赖
npm install
```

### 开发

```bash
# 方式一：使用启动脚本（推荐）
powershell -ExecutionPolicy Bypass -File start_dev.ps1

# 方式二：分别启动
# 终端1 - 启动前端
npm run dev

# 终端2 - 启动 Tauri 后端
cd src-tauri && cargo run
```

### 构建

```bash
# 构建桌面应用
npm run tauri build
```

## 📖 使用指南

### 1. 配置 API

点击界面右上角 **API配置** 按钮，配置以下信息：

- **Seedream API**
  - Base URL: `https://eggfans.com`
  - API Key: 你的密钥

- **Banana 2 API**
  - Base URL: `https://api.bananaprostudio.com`
  - API Key: 你的密钥

### 2. 输入提示词

在输入框中描述你的画面，使用 `@角色名` 绑定参考图：

```
在阳光明媚的森林里@小明 正在愉快地跑步
```

### 3. 解析提示词

点击 **开始解析**，系统会：

- 提取角色信息
- 分隔文本内容
- 显示分段类型标签

### 4. 绑定参考图

点击角色旁的 **绑定参考图** 按钮：

- 上传参考图片
- 选择图片类型（人物/场景）
- 确认绑定

### 5. 生成图片

选择模型和参数，点击 **开始生成**：

- Seedream: 支持尺寸、图片质量、组图、格式、水印设置
- Banana 2: 支持比例、分辨率设置

### 6. 批量处理（可选）

启用 **批量模式** 可一次性生成多张图片：

- **模式切换**: 点击"单图/批量"开关切换模式
- **拆分场景**: 输入包含多个场景的提示词，使用 `|` 分隔或自动识别场景模式
- **角色绑定**: 每个场景可单独绑定角色参考图
- **设置**: 点击"设置"按钮可调整模型和参数
- **并发生成**: 可配置 1-5 张图片同时生成

批量提示词示例：

```
场景1: 阳光明媚的公园里@小明 在跑步|场景2: 夜晚的街道@女孩 在行走|场景3: 海边的日落@英雄 站在礁石上
```

## 📁 项目结构

```
xuanchen_huiben/
├── src/                      # 前端源码
│   ├── api.ts               # API 调用
│   ├── App.tsx              # 主应用组件
│   ├── types/               # TypeScript 类型
│   └── store/               # 状态管理
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── api.rs           # HTTP API
│   │   ├── commands/        # Tauri 命令
│   │   │   ├── image_generator.rs
│   │   │   ├── character_binding.rs
│   │   │   └── prompt_parser.rs
│   │   └── main.rs          # 入口
│   └── Cargo.toml
├── vite.config.ts           # Vite 配置
└── README.md
```

## 🔧 配置说明

### 生成参数

| 参数   | 说明        | 可选值                          |
| ------ | ----------- | ------------------------------- |
| 模型   | AI 模型选择 | seedream, banana_pro            |
| 尺寸   | 图片分辨率  | 1024x1024, 2048x2048, 4096x4096 |
| 比例   | 图片比例    | 1:1, 16:9, 9:16, 4:3, 3:4       |
| 分辨率 | 分辨率      | 1K, 2K, 4K                      |
| 组图   | 连图功能    | auto, disabled                  |
| 格式   | 返回格式    | url, b64_json                   |
| 水印   | 水印开关    | true, false                     |
| 数量   | 生成数量    | 1, 2, 4                         |
| 质量   | 图片质量    | standard, high, ultra           |
| 并发   | 并发数      | 1, 2, 3, 4, 5                   |

### 存储路径

- 配置文件: `%APPDATA%/xuanchen-huiben/`
- 参考图片: `%APPDATA%/xuanchen-huiben/reference_images/`

## 📄 许可证

MIT License

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
