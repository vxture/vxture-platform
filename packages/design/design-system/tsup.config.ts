import { defineConfig } from "tsup";

/**
 * "use client" 注入插件
 *
 * 背景：tsup 的 banner 选项在 treeshake:true 时会被 Rollup 的 renderChunk 覆盖。
 * 改用 buildEnd 钩子（所有 renderChunk 完成、文件已写入磁盘后）直接修改产物文件，
 * 保证 "use client" 指令稳定前置在 ESM/CJS 产物首行。
 *
 * 只对主组件入口 index 注入。tokens/types/server 子入口保持 server-safe，
 * 供 Next Server Component 或后端工具安全读取类型和 token 引用。
 *
 * 注：tsup 会将 config 文件 bundle 成临时 .mjs，顶层 import 'fs' 会被 esbuild
 * 转换为 require('fs') 并在 ESM 上下文中失败。使用动态 import() 可绕过此问题。
 */
const useClientPlugin = {
  name: "use-client-banner",
  async buildEnd({ writtenFiles }: { writtenFiles: { name: string }[] }) {
    // 动态导入 fs，避免 tsup bundle config 时将顶层 import 转换为 require()
    const { readFileSync, writeFileSync } = await import("node:fs");

    for (const file of writtenFiles) {
      const normalized = file.name.replaceAll("\\", "/");
      if (/\/index\.(mjs|cjs)$/.test(normalized)) {
        const content = readFileSync(file.name, "utf8");
        if (!content.startsWith('"use client"')) {
          writeFileSync(file.name, `"use client";\n${content}`);
        }
      }
    }
  },
};

export default defineConfig({
  entry: {
    index: "src/index.ts",
    tokens: "src/tokens-entry.ts",
    types: "src/types-entry.ts",
    server: "src/server.ts",
  },
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
  dts: true,
  sourcemap: true,
  // clean 移至 package.json build 脚本显式执行，避免 watch 模式下触发循环
  target: "es2023",
  treeshake: true,
  experimentalDts: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
    options.keepNames = true;
  },
  plugins: [useClientPlugin],

  // React 和 React-DOM 不打包进产物，由消费方提供
  external: ["react", "react-dom", "react/jsx-runtime"],
});
