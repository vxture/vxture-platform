/**
 * oauth.schema.ts - OAuth provider credentials schema
 * @package @vxture/core-config
 * @description
 *   Optional OAuth provider credentials. All fields are optional — providers
 *   not configured at startup are simply unavailable. When a provider's key is
 *   set, the corresponding secret is required (enforced by superRefine).
 */

import { z } from "zod";

// ============================================================================
// OAuth Schema
// ============================================================================

export const oauthSchema = z
  .object({
    // DingTalk (enterprise-internal app)
    DINGTALK_APP_KEY: z.string().min(1).optional(),
    DINGTALK_APP_SECRET: z.string().min(1).optional(),
    // DingTalk (third-party suite, mutually exclusive with APP_KEY)
    DINGTALK_SUITE_KEY: z.string().min(1).optional(),
    DINGTALK_SUITE_SECRET: z.string().min(1).optional(),
    /** OAuth callback URL for DingTalk */
    DINGTALK_REDIRECT_URI: z.string().url().optional(),

    // Feishu
    FEISHU_APP_ID: z.string().min(1).optional(),
    FEISHU_APP_SECRET: z.string().min(1).optional(),
    /** OAuth callback URL for Feishu */
    FEISHU_REDIRECT_URI: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    const hasDingtalkId = !!(data.DINGTALK_APP_KEY ?? data.DINGTALK_SUITE_KEY);
    const hasDingtalkSecret = !!(
      data.DINGTALK_APP_SECRET ?? data.DINGTALK_SUITE_SECRET
    );
    if (hasDingtalkId && !hasDingtalkSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DINGTALK_APP_SECRET"],
        message:
          "DINGTALK_APP_SECRET (or DINGTALK_SUITE_SECRET) required when DINGTALK_APP_KEY is set",
      });
    }
    if (!hasDingtalkId && hasDingtalkSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DINGTALK_APP_KEY"],
        message:
          "DINGTALK_APP_KEY (or DINGTALK_SUITE_KEY) required when DingTalk secret is set",
      });
    }
    if (data.FEISHU_APP_ID && !data.FEISHU_APP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FEISHU_APP_SECRET"],
        message: "FEISHU_APP_SECRET required when FEISHU_APP_ID is set",
      });
    }
    if (!data.FEISHU_APP_ID && data.FEISHU_APP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FEISHU_APP_ID"],
        message: "FEISHU_APP_ID required when FEISHU_APP_SECRET is set",
      });
    }
  });

export type OauthConfig = z.infer<typeof oauthSchema>;
