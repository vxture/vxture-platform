import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Regression guard for route shadowing (found live on tenants.router.ts:
// @Get(":id") declared before @Get("verifications") made the latter
// unreachable — id="verifications" → uuid cast 22P02 → 500).
// Nest/Express register routes in declaration order, so within one controller
// an earlier pattern that matches everything a later pattern matches makes the
// later route dead. Scanning source text (not Reflect metadata) keeps this
// spec free of module side effects across all routers.

const ROUTERS_DIR = dirname(fileURLToPath(import.meta.url));

interface RouteDecl {
  method: string;
  path: string;
  line: number;
}

/** Strip /* *\/ and // comments so commented-out decorators are ignored. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, lead: string) => {
      return lead + " ".repeat(m.length - lead.length);
    });
}

function extractRoutes(source: string): RouteDecl[] {
  const stripped = stripComments(source);
  const routes: RouteDecl[] = [];
  const re = /@(Get|Post|Put|Delete|Patch)\(\s*(?:"([^"]*)"|'([^']*)')?\s*\)/g;
  for (const match of stripped.matchAll(re)) {
    routes.push({
      method: match[1] ?? "",
      path: match[2] ?? match[3] ?? "",
      line: stripped.slice(0, match.index).split("\n").length,
    });
  }
  return routes;
}

/**
 * True when `earlier` (declared first) captures every request `later` would
 * serve: same segment count and each earlier segment is a param or an exact
 * match. Identical paths count too (duplicate route).
 */
function shadows(earlier: string, later: string): boolean {
  const a = earlier.split("/").filter(Boolean);
  const b = later.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg.startsWith(":") || seg === b[i]);
}

describe("router route declaration order", () => {
  const files = readdirSync(ROUTERS_DIR).filter((f) =>
    f.endsWith(".router.ts"),
  );

  it("finds router files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} has no shadowed routes`, () => {
      const source = readFileSync(join(ROUTERS_DIR, file), "utf8");
      const routes = extractRoutes(source);
      const problems: string[] = [];
      routes.forEach((a, i) => {
        for (const b of routes.slice(i + 1)) {
          if (a.method !== b.method) continue;
          if (shadows(a.path, b.path)) {
            problems.push(
              `@${a.method}("${a.path}") at line ${a.line} shadows ` +
                `@${b.method}("${b.path}") at line ${b.line} — ` +
                `move the static route before the parameterized one`,
            );
          }
        }
      });
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
});
