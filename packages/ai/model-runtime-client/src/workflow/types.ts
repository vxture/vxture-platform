/**
 * workflow/types.ts - Workflow 相关类型定义
 * @package @vxture/model-runtime-client
 *
 * Description: 多步骤工作流编排模块的类型定义
 *
 * @author AI-Generated
 * @date 2026-03-11 11:20:00
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Infrastructure
 * @category AI - Workflow
 */

/**
 * 工作流步骤状态
 */
export enum WorkflowStepStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

/**
 * 工作流状态
 */
export enum WorkflowStatus {
  IDLE = "idle",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * 工作流上下文
 */
export interface WorkflowContext {
  /**
   * 工作流 ID
   */
  workflowId: string;

  /**
   * 执行 ID
   */
  executionId: string;

  /**
   * 全局状态
   */
  state: Record<string, unknown>;

  /**
   * 环境变量
   */
  env?: Record<string, string>;

  /**
   * 开始时间
   */
  startTime?: number;

  /**
   * 结束时间
   */
  endTime?: number;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  /**
   * 步骤 ID
   */
  id: string;

  /**
   * 步骤名称
   */
  name: string;

  /**
   * 步骤类型
   */
  type: string;

  /**
   * 步骤状态
   */
  status: WorkflowStepStatus;

  /**
   * 输入配置
   */
  input?: Record<string, unknown>;

  /**
   * 输出结果
   */
  output?: Record<string, unknown>;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 依赖的前置步骤
   */
  dependsOn?: string[];

  /**
   * 开始时间
   */
  startTime?: number;

  /**
   * 结束时间
   */
  endTime?: number;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecution {
  /**
   * 执行 ID
   */
  executionId: string;

  /**
   * 工作流 ID
   */
  workflowId: string;

  /**
   * 执行状态
   */
  status: WorkflowStatus;

  /**
   * 所有步骤
   */
  steps: WorkflowStep[];

  /**
   * 最终输出
   */
  output?: Record<string, unknown>;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 开始时间
   */
  startTime?: number;

  /**
   * 结束时间
   */
  endTime?: number;
}
