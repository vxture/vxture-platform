# @vxture/core-\* 包检查清单

你是 Vxture 平台架构师，请对指定的 core-\* 包进行全面架构检查。
严格按照以下清单逐项检查，每项给出 ✅ 通过 / ❌ 失败 / ⚠️ 警告，失败项必须给出具体位置和修复建议。

---

## 1. 依赖边界

### 1.1 允许的依赖

- ✅ dependencies 只包含：@vxture/shared、运行时必要的第三方库
- ✅ 禁止依赖任何 @vxture/core-\* 包（core 包之间不得互相依赖）
- ✅ 禁止依赖 @vxture/service-\*
- ✅ 禁止依赖 @vxture/bff-\*
- ✅ 禁止依赖 @vxture/model-runtime-client
- ✅ 禁止依赖 @vxture/design-system
- ✅ 禁止依赖 @vxture/platform-\*

### 1.2 NestJS 包声明规范

- ✅ 用到 NestJS 的包（有装饰器）：@nestjs/\* 必须在 peerDependencies，不得在 dependencies
- ✅ peerDependencies 中的包同时出现在 devDependencies（保证本包开发时可用）
- ✅ 无 NestJS 的包：不得出现任何 @nestjs/\* 依赖

### 1.3 运行时依赖合理性

- ✅ dependencies 中每个包都有对应的实际代码引用
- ✅ 无未使用的依赖
- ✅ devDependencies 中的包不在运行时代码中被 import

---

## 2. 导出结构

### 2.1 单一入口原则

- ✅ 包的唯一公共入口是 src/index.ts
- ✅ 消费方只能从包名导入：import { X } from '@vxture/core-xxx'
- ✅ 禁止从内部路径导入：import { X } from '@vxture/core-xxx/src/...'
- ✅ 具体名称导出，禁止：import \* from '@vxture/core-xxx/src/...'

### 2.2 目录内 index.ts 聚合规则

- ✅ 每个子目录（types/、client/、utils/、context/ 等）有且只有一个 index.ts
- ✅ index.ts 只做聚合导出，不包含任何业务逻辑
- ✅ src/index.ts 只从各子目录的 index.ts 导入，不直接引用具体文件

### 2.3 跨目录导入规则

- ✅ 同包内跨目录导入必须走目标目录的 index.ts
  - ✅ import { X } from '../types'
  - ✅ import { X } from '../types/xxx.types'
- ✅ 同目录内的文件可以直接互相引用（不需要走 index.ts）

### 2.4 类型与值分离导出

- ✅ export type { } 用于纯类型导出
- ✅ export { } 用于值（class、const、function）导出
- ✅ 使用明确的 export type { } 和 export { } 分别导出
- ✅ as const 对象（枚举替代品）用 export { }，对应类型用 export type { }

---

## 3. 目录职责边界

### 3.1 标准目录职责

- ✅ types/：只有类型定义（interface、type、as const 枚举），无运行时逻辑
- ✅ utils/：纯函数工具，无副作用，无框架依赖，可独立测试
- ✅ client/：有状态的客户端类，通常是 @Injectable() NestJS service
- ✅ context/：NestJS REQUEST 作用域 Provider，租户/用户上下文
- ✅ middleware/：NestJS Middleware，请求预处理
- ✅ module/：NestJS Module，DI 注册和导出
- ✅ guards/：NestJS Guard，访问控制
- ✅ decorators/：NestJS 装饰器，参数提取和元数据标注
- ✅ schemas/（core-config 专用）：zod schema，纯配置验证

### 3.2 职责交叉检查

- ✅ 运行时 class（错误类、客户端类）不在 types/ 目录下
- ✅ 业务逻辑不在 utils/ 中（utils 只有通用工具函数）
- ✅ NestJS 装饰器不在 utils/ 或 types/ 中
- ✅ 数据库操作、Redis 操作不在任何 core-\* 包中
- ✅ 浏览器 API（localStorage、window、document、fetch）不在任何 core-\* 包中

---

## 4. TypeScript 规范

### 4.1 严格模式合规

- ✅ 无 any 类型（包括函数参数、返回值、泛型默认值）
- ✅ 无 @ts-ignore 或 @ts-nocheck（有则必须有书面注释说明理由）
- ✅ 无 as unknown as X 双重断言（除非有充分理由）
- ✅ 数组索引访问处理了 undefined（noUncheckedIndexedAccess）

### 4.2 类型导入规范

- ✅ 纯类型导入使用 import type { }
- ✅ 值和类型混合导入时，类型部分加 type 关键字

### 4.3 枚举规范

- ✅ 使用 as const 对象替代：const LogLevel = { DEBUG: 'debug', ... } as const
- ✅ 使用 as const 对象替代：const X = { A: 'a' } as const

---

## 5. NestJS 设计规范

### 5.1 模块设计

- ✅ 对外暴露的 Module 使用 DynamicModule（register() 工厂方法）
- ✅ 有状态的全局 Module 加 @Global() 装饰器
- ✅ Module exports 只导出消费方需要的 Provider
- ✅ 不使用模块级全局变量（let instance = null 单例模式）

### 5.2 Provider 设计

- ✅ 配置通过 Symbol token 注入，不使用字符串 token（避免冲突）
- ✅ REQUEST 作用域 Provider 使用 Scope.REQUEST
- ✅ @Optional() 注入的 Provider 在 getter 中有 assertLoaded 保护

### 5.3 装饰器规范

- ✅ @Injectable() 只在 class 上使用
- ✅ 自定义装饰器的使用 vx: 前缀
- ✅ @Inject() 的 token 使用 Symbol，不使用字符串

---

## 6. 框架无关原则

### 6.1 utils/ 纯函数性

- ✅ utils/ 中的函数无 NestJS 依赖（不导入 @nestjs/\*）
- ✅ utils/ 中的函数可以脱离 NestJS 独立运行
- ✅ utils/ 中的函数入参是普通对象，不是 NestJS 的 ExecutionContext 等

### 6.2 环境隔离

- ✅ 无 NestJS 装饰器的包（core-utils、core-locale）确认不依赖 @nestjs/\*
- ✅ 服务端专用包不使用浏览器 API
- ✅ tsconfig.json 中 types 字段按实际需要配置（有 Node API 才加 node）

---

## 7. 包配置规范

### 7.1 package.json

- ✅ version 为 1.2.2（monorepo 内部包，统一版本）
- ✅ private: true（不发布到 npm）
- ✅ type: "module"
- ✅ exports 字段结构正确：types / import / require 三个条件
- ✅ exports 中文件路径与 tsup 实际产物对应（.mjs / .cjs）
- ✅ engines.node >= 22.0.0
- ✅ 无 main、module、types 顶层字段（已由 exports 替代）

### 7.2 tsconfig.json

- ✅ extends 路径正确（../../../tsconfig.base.json，三级）
- ✅ noEmit: true（类型检查专用，不输出文件）
- ✅ rootDir: "src"
- ✅ 有 NestJS 装饰器的包：experimentalDecorators: true + emitDecoratorMetadata: true
- ✅ 有 Node.js API 的包：types: ["node"]
- ✅ 纯工具包（core-locale、shared）：无多余的 types 和装饰器配置
- ✅ 无 tsconfig.build.json（tsup 不使用它，删除避免混淆）

### 7.3 tsup.config.ts

- ✅ format: ['esm', 'cjs']
- ✅ outExtension 显式指定：esm → .mjs，cjs → .cjs
- ✅ dts: true
- ✅ clean: true
- ✅ 无 splitting（单入口包不需要）
- ✅ 无 minify（库包不压缩）

---

## 8. 包特定检查（按包）

### core-config

- ✅ schemas/ 中每个 schema 文件对应一个业务域
- ✅ 确认需要类型转换的字段都使用 z.coerce
- ✅ 确认 strict 默认值为 true
- ✅ CONFIG_TOKEN 使用 Symbol，不使用字符串
- ✅ VxConfigService 每个 getter 有 assertLoaded 保护
- ✅ 唯一运行时依赖是 zod（不依赖任何其他包）

### core-utils

- ✅ VxtureError 及子类从 @vxture/shared 重新导出（不在此处定义）
- ✅ logger.utils.ts 中 VxLogger 无 NestJS 依赖（框架无关）
- ✅ env.utils.ts 只读 process.env，不读 core-config

### core-locale

- ✅ @vxture/shared 已定义的变量，必须导入，不得本地重复定义
- ✅ 无任何 NestJS 依赖

### core-auth

- ✅ OAuthProviderType 和 PlatformRole 使用 as const
- ✅ JwtAuthGuard 验证通过后挂载 AuthUser 到 request.user
- ✅ guards/ 和 decorators/ 中的文件只依赖 @nestjs/\*，不依赖具体业务
- ✅ provider.utils.ts 中无任何第三方 OAuth SDK 导入
- ✅ VxJwtClient 使用 @nestjs/jwt，不直接依赖 jsonwebtoken

### core-tenant

- ✅ TenantResolveSource 包含 HEADER、SUBDOMAIN、JWT、FALLBACK 四个值
- ✅ resolveTenantId 解析顺序：header → subdomain → jwt → fallback
- ✅ TenantMiddleware 解析失败时不阻断请求（catch 后调用 next）
- ✅ TenantContext 是 REQUEST 作用域（Scope.REQUEST）
- ✅ TenantModule 无静态属性存储配置（通过 DI token 传递）
- ✅ 无 localStorage、无浏览器 API

### core-api

- ✅ VxHttpClient 基于 @nestjs/axios HttpService，不直接用 fetch
- ✅ 重试逻辑从 VX_HTTP_OPTIONS token 读取默认值
- ✅ RequestOptions.raw 字段在 request() 中被实际处理
- ✅ 确认覆盖所有常见状态码
- ✅ VxtureError 及子类从 @vxture/shared 导入（不从 core-utils）
- ✅ 文件上传使用 form-data 库（Node.js 环境）
- ✅ ok()、fail()、buildPageResult() 等响应工具是纯函数

---

## 输出格式

每个检查项输出，在本文档标记，严格使用以下标记符号，保留列表符号：
✅ 通过
❌ [文件路径:行号] 问题描述 → 修复建议
⚠️ [文件路径] 警告描述 → 建议优化

---

## 检查结果汇总

检查时间：2026-03-15 13:00:00

### 严重问题（❌）：0 个

无严重问题

### 警告（⚠️）：0 个

无警告

### 整体评分（满分 10 分）：10.0 分

### 是否通过检查：是

---

## 详细检查结果

### 1. 依赖边界 ✅

所有 core-\* 包都严格遵守依赖规则：

- 仅依赖 `@vxture/shared` 和必要的第三方库
- 未发现 core 包之间互相依赖
- 未发现依赖其他业务包（@vxture/service-_、@vxture/bff-_ 等）
- NestJS 包都正确放在 peerDependencies 中，devDependencies 同步
- 无未使用的依赖声明

### 2. 导出结构 ✅

所有包都遵循单一入口原则：

- 每个包的唯一公共入口都是 `src/index.ts`
- 子目录都有独立的 index.ts 聚合导出
- 同包内跨目录导入都通过目标目录的 index.ts
- 类型和值分离导出，未使用 `export * from` 语法

### 3. 目录职责边界 ✅

所有包都符合标准目录职责：

- types/：仅包含类型定义
- utils/：纯函数工具，无副作用和框架依赖
- client/：有状态的客户端类
- context/：REQUEST 作用域 Provider
- middleware/：NestJS 中间件
- module/：NestJS 模块
- guards/：NestJS 守卫
- decorators/：NestJS 装饰器
- schemas/（core-config）：zod schema 定义

### 4. TypeScript 规范 ✅

- 未发现 `any` 类型、`@ts-ignore` 或双重断言
- 纯类型导入使用 `import type` 语法
- 未发现 TypeScript enum，都使用 `as const` 替代

### 5. NestJS 设计规范 ✅

- 模块设计：
  - 所有带装饰器的模块都使用了 DynamicModule 工厂方法
  - 全局模块添加了 `@Global()` 装饰器（如 core-config）
  - 模块 exports 只导出必要的 Provider
- Provider 设计：
  - 配置通过 Symbol token 注入（如 CONFIG_TOKEN）
  - REQUEST 作用域 Provider 使用 `Scope.REQUEST`（如 TenantContext）
  - 可选注入的 Provider 在 getter 中有 assertLoaded 保护（如 VxConfigService）
- 装饰器规范：正确使用 @Injectable()、@Inject() 等装饰器

### 6. 框架无关原则 ✅

- utils/ 中的函数无 NestJS 依赖，可以脱离框架独立运行
- 无浏览器 API 调用，所有代码都运行在 Node.js 环境
- 无数据库或 Redis 操作

### 7. 包配置规范 ✅

- package.json：
  - version 统一为 1.2.2，符合规范
  - private: true，type: "module"
  - exports 字段结构正确，包含 types/import/require
  - engines.node >= 22.0.0
- tsconfig.json：
  - extends 路径正确，继承根目录 tsconfig.base.json
  - noEmit: true，rootDir: "src"
  - 带装饰器的包正确启用了 experimentalDecorators 和 emitDecoratorMetadata
- tsup.config.ts：
  - format: ['esm', 'cjs']，正确配置输出扩展名
  - dts: true，clean: true，无 splitting 和 minify

### 8. 包特定检查 ✅

- core-config：✅ 符合所有特定规则
- core-utils：✅ 符合所有特定规则
- core-locale：✅ 符合所有特定规则
- core-auth：✅ 符合所有特定规则
- core-tenant：✅ 符合所有特定规则
- core-api：✅ 符合所有特定规则
