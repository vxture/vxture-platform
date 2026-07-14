/**
 * public.decorator.ts - Mark route as public
 * @package @vxture/core-auth
 * @description
 *   Marks a route as public, skipping JWT verification
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "vx:isPublic";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
