// globals.d.ts
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
    }
  }
}
