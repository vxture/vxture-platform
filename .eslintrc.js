// 根目录 ESLint 配置（旧版 .eslintrc 格式，适用于 ESLint v8）
// 注意：portals/website 使用 ESLint v9 flat config（eslint.config.mjs），
// 该文件对 portals/website 不生效，两者并存不冲突。
module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "no-trailing-spaces": ["error", { ignoreComments: true }],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    // 全局强制禁止 any，与 tsconfig strict 模式双重保障
    "@typescript-eslint/no-explicit-any": "error",
  },
  overrides: [
    {
      files: ["**/*.tsx"],
      extends: ["plugin:react/recommended", "plugin:react/jsx-runtime"],
      settings: {
        react: {
          version: "detect",
        },
      },
    },
  ],
  env: {
    node: true,
    browser: true,
    es2023: true,
  },
};
