/**
 * http.module.ts - VxHttpModule
 * @package @vxture/core-api
 * @description
 *   Global HTTP module that registers VxHttpClient for all modules to use.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { DynamicModule, Global, Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";

import { VxHttpClient } from "../client/http.client";

export const VX_HTTP_OPTIONS = Symbol("VX_HTTP_OPTIONS");

export interface VxHttpModuleOptions {
  /** 全局 baseURL，BFF 调用 agent-server 时设置 */
  baseURL?: string;
  /** 全局超时（毫秒），默认 30000 */
  timeout?: number;
  /** 全局重试次数，默认 2 */
  retries?: number;
  /** 全局默认 headers */
  headers?: Record<string, string>;
}

@Global()
@Module({})
export class VxHttpModule {
  static register(options: VxHttpModuleOptions = {}): DynamicModule {
    return {
      module: VxHttpModule,
      imports: [
        HttpModule.register({
          ...(options.baseURL !== undefined
            ? { baseURL: options.baseURL }
            : {}),
          timeout: options.timeout ?? 30_000,
          ...(options.headers !== undefined
            ? { headers: options.headers }
            : {}),
        }),
      ],
      providers: [
        { provide: VX_HTTP_OPTIONS, useValue: options },
        VxHttpClient,
      ],
      exports: [VxHttpClient],
    };
  }
}
