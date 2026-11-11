<div align="center">
  <img src="https://www.xxyopen.com/images/resource/os/tools/logo.jpeg" alt="一键工具狗 Logo" width="120" height="120" style="display:block;margin:0 auto;">
  <h1 style="margin:6px 0 8px;padding:0;border:0;font-size:30px;">一键工具狗</h1>
  一款隐私优先的微信小程序工具合集，主打本地处理、零联网、免登录。<br>
  <br>
  <a href="https://github.com/201206030/mini-tools/releases"><img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version"></a>
  <img src="https://img.shields.io/badge/Vue-3.4-42B883?logo=vue.js" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript" alt="TypeScript">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="Apache-2.0"></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome">
</div>

## 目录

- [项目简介](#项目简介)
- [主要特性](#主要特性)
- [项目预览](#项目预览)
- [内置工具](#内置工具)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [目录结构](#目录结构)
- [扩展：新增一个工具](#扩展新增一个工具)
- [测试](#测试)
- [隐私与安全](#隐私与安全)
- [后续计划](#后续计划)
- [贡献指南](#贡献指南)
- [相关文档](#相关文档)
- [开源协议](#开源协议)
- [免责声明](#免责声明)
- [致谢与联系](#致谢与联系)

## 项目简介

**一键工具狗**是面向普通用户的微信小程序工具合集，内置 12 个日常高频小工具，覆盖计算、生活、图片与文本四类场景。打开即用，没有注册、登录、会员和广告。

它最大的特点是坚持隐私优先的设计理念，所有计算与图片处理都在手机本机完成，**没有后端服务、没有网络请求、不上传任何输入内容，也不接入统计 SDK**。

除了可以直接使用，它还是一个结构清晰、适合学习和二次开发的 UniApp + Vue 3 + TypeScript 项目示例。

在工程设计上，项目采用业务逻辑与界面分离的方式。每个工具的算法集中在独立的 `logic.ts` 纯函数中，配套单元测试。界面层只负责交互与小程序能力调用，便于单独复用或迁移。

## 主要特性

| 特性       | 说明                                                        |
|----------|-----------------------------------------------------------|
| 完全本地     | 无服务器、无网络请求、无第三方 API、无云开发，断网可用                             |
| 隐私优先     | 不采集、不上传输入的文字、数字、图片与生成的密码，「最近使用」只记录工具 ID 与时间               |
| 零门槛使用    | 无需登录、无会员、无广告，全简体中文界面                                      |
| 12 个真实工具 | 4 大分类，逻辑均为完整实现，非占位页面                                      |
| 易扩展      | 统一工具注册表，新增工具只需 3 步，首页、搜索、分类、收藏、最近使用自动生效                   |
| 工程质量     | TypeScript 严格模式、Pinia 状态管理、10 个测试文件 / 119 个用例、Vitest 单元测试 |
| 无第三方 UI  | 自绘组件与线性图标，不引入 UI 框架、统计 SDK 和在线服务                          |

## 项目预览

### 小程序截图

<p align="center">
  <img src="https://www.xxyopen.com/images/resource/os/tools/iphone.png" alt="一键工具狗 小程序截图">
</p>

### 小程序码

<p align="center">
  <img src="https://www.xxyopen.com/images/resource/os/tools/qrcode.jpeg" alt="一键工具狗 小程序码" width="220">
</p>
<p align="center">微信扫一扫，打开「一键工具狗」小程序</p>

### 公众号

<p align="center">
  <img src="https://youdoc.github.io/img/qrcode_for_gh.jpg" alt="公众号截图" width="220">
</p>
<p align="center">公众号：xxyopen</p>

## 内置工具

| 分类 | 工具     | 说明                                      |
|----|--------|-----------------------------------------|
| 计算 | 日期计算器  | 相隔天数、前后 N 天、距离今天；整数民用历换算，无时区偏差          |
| 计算 | 单位换算器  | 长度、重量、面积、容量、温度、数据 6 类；支持斤、两、亩等中文单位      |
| 计算 | 房贷计算器  | 商业贷 / 公积金贷 / 组合贷；等额本息 / 等额本金对比与还款明细     |
| 计算 | 个税计算器  | 按年度综合所得口径估算工资薪金个税，政策参数集中在 `rules.ts`    |
| 生活 | 二维码生成  | 文字 / 网址 / 名片（MECARD），本地生成并保存到相册         |
| 生活 | 随机数生成  | 指定范围、数量与是否不重复                           |
| 生活 | 随机抽签   | 每行一个选项，不重复抽取，记录已抽结果                     |
| 生活 | 密码生成器  | 自定义长度与字符集，优先使用安全随机源，不保存历史               |
| 图片 | 图片压缩   | 质量滑块、压缩前后对比，失败时回退 Canvas 2D 重编码         |
| 图片 | 图片尺寸调整 | 自定义宽高、锁定比例，Canvas 2D 真实重绘               |
| 文本 | 字数统计   | 汉字 / 单词 / 数字 / 标点 / 行数，正确处理 Emoji 组合字素簇 |
| 文本 | 文本去重   | 按行去重，可保留首次或最后一次，保留原始顺序                  |

页面与通用能力：实时搜索、常用工具与收藏、四大分类浏览、最近使用（上限 10 条）、一键清除本地数据、复制结果、保存图片到相册、相册权限拒绝后的重新授权引导。

## 技术栈

| 层次   | 选型                                        | 版本                     |
|------|-------------------------------------------|------------------------|
| 跨端框架 | UniApp（`@dcloudio/uni-*`）                 | 3.0.0-5030420261029002 |
| 前端框架 | Vue 3（Composition API / `<script setup>`） | 3.4.21                 |
| 语言   | TypeScript（严格模式）                          | ^5.7.3                 |
| 构建   | Vite + `@dcloudio/vite-plugin-uni`        | 5.2.8                  |
| 状态管理 | Pinia                                     | 2.1.7                  |
| 样式   | SCSS / Sass                               | ^1.83.0                |
| 测试   | Vitest                                    | ^2.1.8                 |
| 二维码  | qrcode-generator（纯 JS，离线）                 | 1.4.4                  |

> 版本锁定说明：`pinia` 固定 `2.1.7`（`2.3.x` 要求 `vue ^3.5.11`，与 uni 编译器锁定的 Vue 3.4.21 冲突），`vite` 固定 `5.2.8`
> （uni 插件 peer 要求）。请勿随意升级这两项。

## 快速开始

### 环境要求

- Node.js ≥ 18（已在 Node 20 / 22 下验证）
- npm ≥ 9
- 微信开发者工具（稳定版），基础库建议 ≥ 2.15.0

### 获取代码并安装依赖

```bash
git clone https://github.com/201206030/mini-tools.git
cd tools
npm install
```

### 配置 AppID

打开 `src/manifest.json`，把顶层 `appid` 与 `mp-weixin.appid` 两处替换为**你自己的小程序 AppID**；本地调试也可以使用「测试号」。

> 仓库中保留的是原作者的开发用 AppID，仅用于工程可构建，不能用于你自己的预览、上传或提审。本项目不包含任何密钥或凭据。

### 构建与预览

```bash
npm run dev:mp-weixin      # 开发构建，输出到 dist/dev/mp-weixin
npm run build:mp-weixin    # 生产构建，输出到 dist/build/mp-weixin
```

在微信开发者工具中选择「导入项目」，目录指向 **`dist/build/mp-weixin`**（或开发模式下的 `dist/dev/mp-weixin`），而不是仓库根目录。
`dist/` 已被 `.gitignore` 忽略，首次导入前需要先执行一次构建。

真机验证图片类工具时，请在首次保存图片时允许「添加到相册」权限，被拒绝后界面会提供「去设置」重新授权入口。

## 常用命令

| 命令                        | 作用                             |
|---------------------------|--------------------------------|
| `npm install`             | 安装依赖（锁文件已提交）                   |
| `npm run dev:mp-weixin`   | 开发构建，配合微信开发者工具实时预览             |
| `npm run build:mp-weixin` | 生产构建，输出 `dist/build/mp-weixin` |
| `npm run type-check`      | TypeScript 严格类型检查              |
| `npm test`                | 运行 Vitest 单元测试                 |

## 目录结构

```
tools/
├── src/
│   ├── main.ts / App.vue          # 应用入口、全局样式与本地偏好恢复
│   ├── manifest.json              # 小程序名称、AppID、构建设置（含统计开关）
│   ├── pages.json                 # 页面路由与全局窗口样式
│   ├── data/
│   │   ├── categories.ts          # 四大分类元数据
│   │   └── tools.ts               # 统一工具注册表：元数据 / 搜索 / 推荐
│   ├── tools/<id>/                # 12 个工具，每个含 logic.ts + index.vue
│   ├── services/                  # Storage、剪贴板、提示弹窗、图片与相册能力
│   ├── stores/app.ts              # Pinia：收藏、最近使用、偏好
│   ├── utils/                     # 日期、数值、文本、随机、校验等纯函数
│   ├── components/                # 12 个可复用公共组件
│   ├── pages/                     # 首页 / 工具详情壳 / 我的
│   ├── styles/                    # 品牌色变量与通用样式
│   ├── static/                    # Logo 与底部导航图标
│   └── types/                     # 类型声明
├── tests/                         # 10 个测试文件 / 119 个用例
├── assets/                        # 小程序头像与隐私补充说明
├── vite.config.ts / vitest.config.ts
├── tsconfig.json
└── package.json
```

## 扩展：新增一个工具

1. 在 `src/tools/<id>/` 下新增 `index.vue`（界面）与 `logic.ts`（纯函数业务逻辑）。
2. 在 `src/data/tools.ts` 的 `TOOLS` 数组追加一条元数据（id、名称、说明、分类、关键词等）。
3. 在 `src/pages/tool/detail.vue` 中静态 `import` 并挂载组件。

完成后，首页展示、分类、搜索、收藏、最近使用会自动生效，无需改动其他页面。

> 小程序不支持 Vue 动态组件，因此详情页采用静态导入 + `v-if / v-else-if` 条件渲染，请沿用这一写法。

## 测试

```bash
npm run type-check   # 期望：0 错误
npm test             # 期望：10 个文件 / 119 个用例全部通过
```

测试覆盖日期边界（闰年、月末、跨年）、单位换算、房贷与个税公式、随机数与抽签、Emoji 字素簇统计、二维码编码、图片参数校验、工具注册表与
Storage 降级容错等。欢迎在补充新工具时同步添加对应的 `logic.ts` 单元测试。

## 隐私与安全

- 业务代码无网络请求，不使用 `uni.request` / `wx.request` / `fetch` / `XMLHttpRequest`。
- 不采集、不上传用户输入的文字、数字、图片与生成的密码，不输出敏感日志。
- 本地仅保存收藏 ID、最近使用 ID + 时间、少量偏好，「我的」页可一键清除。
- 相册写入权限仅在实际保存图片时申请，选择图片只允许从相册选取，不调用摄像头。
- 未接入任何第三方插件、UI 框架或统计 SDK，`manifest.json` 已全局关闭 uni 统计。

## 后续计划

- 集成更多实用工具
- 适配 H5、App 和其他小程序平台

欢迎在 Issue 中提出建议，或直接提交 PR。

## 贡献指南

完整的贡献流程、提交信息规范与项目约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。以下为要点：

1. Fork 本仓库，基于主分支创建特性分支，例如 `feat/add-xxx-tool`。
2. 保持代码风格一致：中文界面文案、纯函数放在 `logic.ts`、不引入网络请求与统计 SDK、不引入新的第三方 UI 框架。
3. 提交前确保通过：

   ```bash
   npm run type-check
   npm test
   npm run build:mp-weixin
   ```

4. 提交 PR，说明改动动机、影响范围与验证方式；涉及界面改动建议附截图。
5. Bug 反馈请在 Issue 中提供微信版本、基础库版本、机型与复现步骤。

新增工具只需 3 步（详见[扩展章节](#扩展新增一个工具)）：新增 `logic.ts` + `index.vue`、在 `src/data/tools.ts` 注册、在
`detail.vue` 静态挂载，并同步补充单元测试。

## 相关文档

| 文档                                                             | 内容                                       |
|----------------------------------------------------------------|------------------------------------------|
| [README.md](README.md)                                         | 项目简介、快速开始、功能与技术栈（本文）                     |
| [CONTRIBUTING.md](CONTRIBUTING.md)                             | 贡献流程、提交规范、项目约定、PR 与 Issue 模板             |
| [assets/privacy-supplement.txt](assets/privacy-supplement.txt) | 小程序后台用户隐私保护指引补充文档                        |
| [LICENSE](LICENSE) / [NOTICE](NOTICE)                          | Apache-2.0 协议全文与归属声明                     |

## 开源协议

本项目采用 **Apache License 2.0** 开源，协议全文见 [LICENSE](LICENSE)，归属声明见 [NOTICE](NOTICE)。

你可以自由使用、复制、修改与再分发源代码（包括商业用途），但需遵守以下主要条件：

- 保留版权、专利、商标与归属声明，并向接收者提供协议副本；
- 修改过的文件需带有明显的变更说明；
- 分发衍生作品时，需保留并可读地附上 [NOTICE](NOTICE) 中的归属信息；
- 贡献者授予明确的专利授权；若就该作品发起专利诉讼，相关专利授权将终止。

协议按「现状」提供，不附带任何明示或暗示的担保。提交贡献即表示你同意按 Apache-2.0 第 5
条授权你的代码，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

> 「一键工具狗」名称、Logo 与品牌素材不在协议授权范围内，详见下方免责声明。

## 免责声明

- 个税、房贷等计算结果均为简化估算，不等同于税务机关核定结果或金融机构正式方案；
- 生成的密码与随机数不保证适用于重要账号或安全场景；
- 本项目按「现状」提供，作者不对使用本工具产生的任何直接或间接损失负责。

「一键工具狗」名称、Logo 及相关品牌素材的权利归原作者所有。开源协议仅覆盖源代码，不默认授权商标与品牌标识的使用。

## 致谢与联系

- 基于 [uni-app](https://uniapp.dcloud.net.cn/)、[Vue 3](https://vuejs.org/)、[Vite](https://vitejs.dev/)、[Vitest](https://vitest.dev/)
与 [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 构建。
- 问题反馈与功能建议：请在 [GitHub Issues](https://github.com/201206030/mini-tools/issues) 提交。

如果这个项目对你有帮助，欢迎点个 Star 或分享给需要的人。


