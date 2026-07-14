/**
 * llm/types.ts - LLM 相关类型定义
 * @package @vxture/model-runtime-client
 *
 * Description: LLM 客户端的类型定义，包括模型配置、请求参数、响应格式等
 *
 * @author AI-Generated
 * @date 2026-03-11 11:20:00
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Infrastructure
 * @category AI - LLM
 */

/**
 * LLM 模型类型
 */
export enum LLMModel {
  CLAUDE = "claude",
  DOUBAO = "doubao",
  CUSTOM = "custom",
}

/**
 * 模型运行时模型编码，支持平台预置枚举，也支持数据库注册的自定义模型编码
 */
export type LLMModelCode = LLMModel | string;

/**
 * 模型运行时应用类型
 *
 * agent 是历史智能体调用来源；workflow、api_client、internal_service
 * 用于后续把模型调用归因从单一智能体扩展到平台应用维度。
 */
export type ModelRuntimeApplicationType =
  | "agent"
  | "workflow"
  | "api_client"
  | "internal_service";

/**
 * LLM 请求配置
 */
export interface LLMConfig {
  /**
   * 模型名称
   */
  model: LLMModelCode;

  /**
   * 温度参数，控制输出的随机性
   * 0.0 - 1.0，值越高越随机
   */
  temperature?: number;

  /**
   * 最大输出令牌数
   */
  maxTokens?: number;

  /**
   * 顶 p 采样参数
   */
  topP?: number;

  /**
   * 顶 k 采样参数
   */
  topK?: number;
}

/**
 * LLM 消息类型
 */
export interface LLMMessage {
  /**
   * 角色：system / user / assistant / tool
   * 'tool' 用于把工具执行结果回填给模型，需配合 toolCallId 使用
   */
  role: "system" | "user" | "assistant" | "tool";

  /**
   * 消息内容
   * tool 角色：填工具执行结果（建议 JSON.stringify 后存入）
   * assistant 角色：发起工具调用时可为空字符串，工具调用元信息走 toolCalls 字段
   */
  content: string;

  /**
   * assistant 角色：模型本轮发起的工具调用列表
   */
  toolCalls?: LLMToolCall[];

  /**
   * tool 角色：本条消息对应的 toolCall ID
   */
  toolCallId?: string;

  /**
   * tool 角色：工具名称（部分 provider 的 tool 消息要求附带名称）
   */
  name?: string;

  /**
   * 消息时间戳
   */
  timestamp?: number;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  /**
   * 模型输出内容
   */
  content: string;

  /**
   * 模型本轮发起的工具调用列表（仅 function calling 场景下出现）
   */
  toolCalls?: LLMToolCall[];

  /**
   * 结束原因
   * stop / tool_calls / length / content_filter
   */
  finishReason?: LLMFinishReason;

  /**
   * 响应的使用的令牌统计
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * 模型名称
   */
  model?: string;

  /**
   * 响应时间
   */
  latency?: number;
}

/**
 * 模型结束原因
 * - stop：正常结束
 * - tool_calls：模型决定调用工具，等待调用结果
 * - length：超过 maxTokens 截断
 * - content_filter：被安全/合规过滤
 */
export type LLMFinishReason =
  | "stop"
  | "tool_calls"
  | "length"
  | "content_filter";

/**
 * 工具定义（function calling）
 *
 * 平台采用「OpenAI function calling 兼容形态」作为统一抽象，
 * 由 model-platform 在转发到不同 provider 时做协议适配（如 Claude tool_use）。
 */
export interface LLMTool {
  /** 工具名称，作为 LLM 调用的唯一标识 */
  name: string;
  /** 工具用途描述，提供给 LLM 用于决定是否调用 */
  description: string;
  /** 工具入参 JSON Schema */
  parameters: Record<string, unknown>;
}

/**
 * 工具选择策略
 * - 'auto'：由模型自行决定是否调用（默认）
 * - 'none'：禁止调用任何工具
 * - 'required'：强制必须调用某个工具（具体由模型决定调哪个）
 * - { type: 'function', name }：强制调用指定工具
 */
export type LLMToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; name: string };

/**
 * 模型发起的一次工具调用请求
 */
export interface LLMToolCall {
  /** Provider 侧的工具调用 ID（用于把工具结果回填给模型） */
  id: string;
  /** 被调用的工具名称 */
  name: string;
  /** 工具入参（已解析为对象） */
  arguments: Record<string, unknown>;
}

/**
 * 流式响应片段
 *
 * 调用方按事件类型增量处理：
 * - text 事件：拼接文本输出
 * - tool_call 事件：模型在本轮决定调用工具，arguments 为聚合后的完整入参
 * - done 事件：本轮结束，附带 usage 和 finishReason
 * - error 事件：流中错误（HTTP 层错误以异常形式抛出）
 */
export type LLMStreamChunk =
  | { type: "text"; delta: string }
  | { type: "tool_call"; toolCall: LLMToolCall }
  | {
      type: "done";
      usage?: LLMResponse["usage"];
      finishReason?: LLMFinishReason;
    }
  | { type: "error"; code: string; message: string };

/**
 * LLM 错误类型
 */
export interface LLMError {
  /**
   * 错误代码
   */
  code: string;

  /**
   * 错误信息
   */
  message: string;

  /**
   * 原始错误
   */
  originalError?: unknown;
}

/**
 * 流式响应回调
 */
export interface LLMStreamCallbacks {
  /**
   * 流式数据回调
   */
  onData?: (chunk: string) => void;

  /**
   * 错误回调
   */
  onError?: (error: LLMError) => void;

  /**
   * 完成回调
   */
  onComplete?: (response: LLMResponse) => void;
}

/**
 * LLM 请求选项
 */
export interface LLMOptions {
  /**
   * 是否使用流式响应
   */
  stream?: boolean;

  /**
   * 流式响应回调
   */
  callbacks?: LLMStreamCallbacks;

  /**
   * 请求超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 工具集合（function calling）
   * 传入时，模型可在本轮决定调用工具，返回 toolCalls
   */
  tools?: LLMTool[];

  /**
   * 工具选择策略，默认 'auto'
   */
  toolChoice?: LLMToolChoice;
}
