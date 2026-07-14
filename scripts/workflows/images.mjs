/**
 * images.mjs - Docker 镜像构建配置（单一数据源）。
 * @package  @vxture/repo
 * @layer    Infrastructure
 * @category workflow
 * @description
 *   12 个镜像的 matrix 构建配置（name / image / dockerfile / build-args）。
 *   被 classify-changes.mjs 的 `--matrix` 模式消费，产出 docker-build 的动态 matrix：
 *   只为「本次需重建」的镜像生成 matrix 项，docs/scripts-only 时为空集 → build job
 *   整体跳过。镜像名 + 路径规则的对应在 classify-changes.mjs 的 IMAGE_RULES 维护，
 *   两处 name 必须一致。
 *
 * @author AI-Generated
 * @date 2026-06-10
 */

export const IMAGES = [
  // ── Next.js 门户 ───────────────────────────────────────────────────────────
  {
    name: "website",
    image: "ghcr.io/vxture/website",
    dockerfile: "deploy/docker/Dockerfile.nextjs",
    "build-args":
      "PORTAL_PATH=portals/website\nPACKAGE_FILTER=@vxture/website\nNEXT_PUBLIC_API_URL=https://api.vxture.com\nNEXT_PUBLIC_WEBSITE_BFF_URL=https://vxture.com",
  },
  {
    name: "console",
    image: "ghcr.io/vxture/console",
    dockerfile: "deploy/docker/Dockerfile.nextjs",
    "build-args":
      "PORTAL_PATH=portals/console\nPACKAGE_FILTER=@vxture/console\nNEXT_PUBLIC_API_URL=https://api.vxture.com\nNEXT_PUBLIC_CONSOLE_BFF_URL=https://console.vxture.com",
  },
  {
    name: "admin",
    image: "ghcr.io/vxture/admin",
    dockerfile: "deploy/docker/Dockerfile.nextjs",
    "build-args":
      "PORTAL_PATH=portals/admin\nPACKAGE_FILTER=@vxture/admin\nNEXT_PUBLIC_API_URL=https://api.vxture.com\nNEXT_PUBLIC_ADMIN_BFF_URL=https://admin.vxture.com",
  },
  {
    name: "accounts",
    image: "ghcr.io/vxture/accounts",
    dockerfile: "deploy/docker/Dockerfile.nextjs",
    "build-args":
      "PORTAL_PATH=portals/accounts\nPACKAGE_FILTER=@vxture/accounts\nNEXT_PUBLIC_OIDC_API_BASE=https://accounts.vxture.com",
  },
  // ── 平台 BFF ───────────────────────────────────────────────────────────────
  {
    name: "bff-gateway",
    image: "ghcr.io/vxture/bff-gateway",
    dockerfile: "deploy/docker/Dockerfile.gateway",
    "build-args": "",
  },
  {
    name: "bff-auth",
    image: "ghcr.io/vxture/bff-auth",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args": "SERVICE_PATH=bff/auth-bff\nPACKAGE_FILTER=@vxture/bff-auth",
  },
  {
    name: "bff-website",
    image: "ghcr.io/vxture/bff-website",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args":
      "SERVICE_PATH=bff/website-bff\nPACKAGE_FILTER=@vxture/bff-website",
  },
  {
    name: "bff-console",
    image: "ghcr.io/vxture/bff-console",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args":
      "SERVICE_PATH=bff/console-bff\nPACKAGE_FILTER=@vxture/bff-console",
  },
  {
    name: "bff-admin",
    image: "ghcr.io/vxture/bff-admin",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args":
      "SERVICE_PATH=bff/admin-bff\nPACKAGE_FILTER=@vxture/bff-admin",
  },
  {
    name: "bff-platform-api",
    image: "ghcr.io/vxture/bff-platform-api",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args":
      "SERVICE_PATH=bff/platform-api\nPACKAGE_FILTER=@vxture/bff-platform-api",
  },
  // ── Agent BFF ──────────────────────────────────────────────────────────────
  {
    name: "bff-varda",
    image: "ghcr.io/vxture/bff-varda",
    dockerfile: "deploy/docker/Dockerfile.nestjs",
    "build-args": "SERVICE_PATH=bff/varda-bff\nPACKAGE_FILTER=@vxture/bff-varda",
  },
  // ── Agent Server ───────────────────────────────────────────────────────────
  {
    name: "agent-varda",
    image: "ghcr.io/vxture/agent-varda",
    dockerfile: "deploy/docker/Dockerfile.nestjs-prisma",
    "build-args":
      "SERVICE_PATH=agent-server/varda\nPACKAGE_FILTER=@vxture/agent-server-varda\nPRISMA_SCHEMA=agent-server/varda/prisma/schema.prisma",
  },
  // ── 共享服务 ───────────────────────────────────────────────────────────────
  {
    name: "service-model-platform",
    image: "ghcr.io/vxture/service-model-platform",
    dockerfile: "deploy/docker/Dockerfile.nestjs-prisma",
    "build-args":
      "SERVICE_PATH=services/model/platform\nPACKAGE_FILTER=@vxture/service-model-platform\nPRISMA_SCHEMA=services/model/platform/prisma/schema.prisma",
  },
];

export const ALL_IMAGE_NAMES = IMAGES.map((entry) => entry.name);
