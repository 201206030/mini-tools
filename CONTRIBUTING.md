# 贡献指南

感谢你愿意为「一键工具狗」贡献力量。无论是修复缺陷、新增工具、补充测试、完善文档，还是反馈使用问题，都欢迎。

## 目录

- [你可以贡献什么](#你可以贡献什么)
- [基本原则](#基本原则)
- [开始之前](#开始之前)
- [开发流程](#开发流程)
- [提交信息规范](#提交信息规范)
- [项目约定](#项目约定)
- [新增一个工具](#新增一个工具)
- [提交前自检](#提交前自检)
- [提交 Pull Request](#提交-pull-request)
- [报告 Issue](#报告-issue)
- [开源协议与贡献授权](#开源协议与贡献授权)
- [相关文档](#相关文档)

## 你可以贡献什么

| 类型 | 说明 | 是否需要先开 Issue 讨论 |
| --- | --- | --- |
| 修复缺陷 | 计算结果错误、边界输入、机型兼容、样式错位 | 不需要，但请附上复现步骤 |
| 新增工具 | 在现有六大分类下补充本机可运行的工具 | 需要，先确认是否符合「本机优先、隐私优先」的定位、是否与已有工具重复 |
| 补充测试 | 为 `logic.ts` / 静态数据模块增加边界与非法输入用例 | 不需要 |
| 文档改进 | README、注释、说明文案、错别字 | 不需要 |
| 架构级改动 | 更换框架、引入新依赖、改动注册表结构 | 必须，先讨论方案再动手 |

## 基本原则

- **守住本机优先底线**：不引入后端服务、云开发、第三方在线 API 或统计 SDK。唯一允许的网络请求是「汇率计算器」通过 `services/exchange-rate.ts` 获取公开参考汇率；新增任何联网能力必须先开 Issue 讨论。
- **隐私优先**：不采集、不上传用户输入内容，不在日志中输出敏感数据；联网请求不得携带用户输入，本地存储只保存必要的 ID、偏好与公开汇率缓存。
- **面向日常使用**：全简体中文界面，无登录、无会员、无广告；工具以日常刚需为主，也包含学习与轻办公场景。除汇率计算器外一律零联网、零后端、零第三方 SDK。
- **保持轻量**：不引入 UI 框架或重型依赖；确需新增依赖时，请在 Issue 中说明理由与许可证兼容性。
- **复用优先**：新增功能若与已有工具相近（例如新的日期推算方式、新的二维码内容类型），优先并入该工具成为新模式，并补上搜索关键词，不要新建功能重叠的卡片。
- **一次只做一件事**：一个 PR 聚焦一个主题，便于审查与回滚。

## 开始之前

环境要求：Node.js ≥ 18、npm ≥ 9、微信开发者工具（稳定版，基础库建议 ≥ 2.15.0）。

```bash
git clone https://gitee.com/xiongxyang/mini-tools.git
cd mini-tools
npm install
```

配置 AppID：把 `src/manifest.json` 顶层 `appid` 与 `mp-weixin.appid` 两处换成你自己的 AppID，或在微信开发者工具中使用「测试号」。仓库中保留的是原作者的开发用 AppID，不能用于你自己的上传与提审。

导入项目：`dist/` 已被 `.gitignore` 忽略，需先构建，再把微信开发者工具的导入目录指向 `dist/build/mp-weixin`（开发模式为 `dist/dev/mp-weixin`），而不是仓库根目录。

配置 `request` 合法域名：汇率计算器需要访问 `https://api.frankfurter.dev` 与 `https://open.er-api.com`。开发调试时 `mp-weixin.setting.urlCheck` 为 `false` 可不校验域名，但真机预览与发布前必须在微信公众平台把两者加入 `request 合法域名`；否则联网获取汇率会失败（已有本机缓存仍可离线换算）。

## 开发流程

1. Fork 仓库并克隆到本机。
2. 从默认分支创建特性分支，命名建议：`feat/xxx`、`fix/xxx`、`docs/xxx`、`test/xxx`、`refactor/xxx`。
3. 小步提交，提交信息遵循下方规范。
4. 提交前跑完三条自检命令。
5. 推送分支，向本仓库发起 Pull Request，并按模板填写描述。
6. 根据 Review 意见补充提交，保持分支与主分支同步。

## 提交信息规范

采用 Conventional Commits：`<type>(<scope>): <subject>`。

| 字段 | 取值 |
| --- | --- |
| `type` | `feat` / `fix` / `docs` / `test` / `refactor` / `perf` / `style` / `chore` |
| `scope` | 工具 ID 或模块名，如 `tax-calculator`、`storage`、`readme` |
| `subject` | 中文、动词开头、不加句号、建议不超过 50 字 |

示例：

```
feat(unit-converter): 新增压强单位换算
fix(date-calculator): 修复跨年月末借位产生负天数
test(tax-calculator): 补充税率分档边界用例
docs(readme): 补充微信开发者工具导入步骤
```

## 项目约定

这些约定来自小程序平台的实际限制与现有架构，改动时请沿用：

- **逻辑与视图分离**：算法放在 `src/tools/<id>/logic.ts` 的纯函数中（公式、元素等静态数据类工具可放在 `formulas.ts` / `elements.ts`），`index.vue` 只负责交互；纯函数不得直接调用 `uni` / `wx` API。
- **注册表驱动**：工具元数据统一维护在 `src/data/tools.ts`，首页、搜索、分类、收藏、最近使用均由此派生，不要在页面里硬编码工具列表。
- **静态导入**：小程序不支持 Vue 动态组件，`src/pages/tool/detail.vue` 采用静态 `import` + `v-if / v-else-if` 条件渲染，新增工具必须同步挂载。
- **能力走封装层**：复制、保存图片、相册授权、图片像素读取与 Base64 读取、提示弹窗、汇率获取统一使用 `src/services/`；本地存储统一使用 `services/storage.ts`（`wntx_` 前缀、内存降级与损坏容错），不要直接调用 `uni.setStorageSync`。新增本地键必须登记到 `ALL_KEYS`，否则「清除本地数据」清不干净。图片相关能力只处理用户主动选择的那一张，不扫描相册、不上传。
- **联网只走汇率模块**：`services/exchange-rate.ts` 是项目唯一的网络入口，请求地址固定、不带用户输入、失败保留旧缓存；不要在 `logic.ts` 里直接调用 `uni.request`。
- **权限要有兜底**：相册写入权限只在实际保存时申请，被拒绝时给出中文说明与「去设置」重新授权入口。
- **文案**：界面与错误提示全部使用简体中文，提示语复用 `services/feedback.ts`。
- **样式**：颜色变量在 `src/styles/variables.scss`（主色 `#3EAF7C`）；不使用 flex `gap` 与 `calc(百分比 - rpx)`，不用 `:last-child` 清零组件间距，避免部分机型解析差异。长文本 `<textarea>` 必须写 `:maxlength="-1"`，否则微信小程序默认只收 140 字；Canvas 2D 能力需判断 `getImageData` 是否存在并给出中文兜底提示。
- **类型**：TypeScript 严格模式，避免 `any`；新增类型声明放在 `src/types/`。
- **版本锁定**：`pinia@2.1.7` 与 `vite@5.2.8` 与 uni 编译器锁定的 Vue 3.4.21 强相关，请勿升级。
- **测试**：每个 `logic.ts` / 静态数据模块配套 `tests/*.test.ts`，覆盖正常值、边界值与非法输入。

## 新增一个工具

1. 在 `src/tools/<id>/` 下新增 `index.vue` 与 `logic.ts`（纯静态数据类工具可用 `formulas.ts` / `elements.ts` 等命名）。
2. 在 `src/data/tools.ts` 的 `TOOLS` 数组追加一条元数据：

   ```ts
   {
     id: 'my-tool',
     name: '示例工具',
     desc: '一句话说明这个工具能做什么',
     category: 'calc', // calc | life | image | text | study | office
     icon: '例',       // 单个汉字线性图标，不使用 Emoji
     keywords: ['示例', '关键词'],
     recommended: false,
     tip: '可选的使用提示'
   }
   ```

3. 在 `src/pages/tool/detail.vue` 静态导入组件，并追加一组 `v-else-if` 分支。
4. 在 `tests/` 中为纯逻辑 / 静态数据模块补充单元测试。

完成后，首页展示、分类、搜索、收藏、最近使用会自动生效，无需改动其他页面。

## 提交前自检

```bash
npm run type-check      # 期望：0 错误
npm test                # 期望：全部用例通过
npm run build:mp-weixin # 期望：DONE Build complete.
```

涉及真机能力的改动（相册保存、Canvas 2D 导出、权限弹窗、软键盘与不同屏幕适配）无法在命令行验证，请在微信开发者工具或真机上确认，并在 PR 中说明验证机型与基础库版本。

## 提交 Pull Request

PR 描述建议包含：

```markdown
## 改动内容
简要说明改了什么。

## 动机 / 关联 Issue
Fixes #123

## 验证方式
- [ ] npm run type-check
- [ ] npm test
- [ ] npm run build:mp-weixin
- [ ] 微信开发者工具 / 真机验证（如涉及）

## 截图
界面改动请附前后对比截图（注意不要包含个人数据）。
```

审查时会重点看：是否破坏本机优先与隐私约定、是否新增未讨论的联网请求、是否与已有工具功能重复、是否引入不必要的依赖、边界条件是否有测试覆盖、界面文案是否符合中文习惯。请勿在 PR 中提交密钥、真实 AppID、个人数据或用户隐私内容。

## 报告 Issue

请尽量提供以下信息，能大幅缩短定位时间：

- 微信版本、基础库版本、机型与系统版本
- 复现步骤（1、2、3）与涉及的页面 / 工具
- 期望结果与实际结果
- 截图或报错信息（请先脱敏，不要粘贴用户输入的真实内容）
- 是否涉及相册权限、Canvas 或本地存储

功能建议请说明使用场景与目标用户，便于判断是否适合本项目的定位。

## 开源协议与贡献授权

本项目采用 **Apache License 2.0**，协议全文见 [LICENSE](LICENSE)，归属声明见 [NOTICE](NOTICE)。

除非你明确另有声明，任何有意提交并合入本项目的贡献均视为依据 Apache License 2.0 第 5 条按该协议授权。提交即表示你确认：有权以该协议提交这些内容；若包含第三方代码或素材，已在 PR 中注明来源与许可证，并确认与 Apache-2.0 兼容。

「一键工具狗」名称、Logo 及品牌素材不在源代码授权范围内，请勿在衍生作品中直接沿用，相关说明见 README 的免责声明章节。

## 相关文档

| 文档 | 内容 |
| --- | --- |
| [README.md](README.md) | 项目简介、快速开始、功能与技术栈 |
| [assets/privacy-supplement.txt](assets/privacy-supplement.txt) | 小程序后台隐私指引补充文档 |
| [LICENSE](LICENSE) / [NOTICE](NOTICE) | 开源协议与归属声明 |

感谢你的每一次提交。
