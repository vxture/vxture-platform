/**
 * embedding/types.ts - Embedding 相关类型定义
 * @package @vxture/model-runtime-client
 *
 * Description: 文本向量化模块的类型定义
 *
 * @author AI-Generated
 * @date 2026-03-11 11:20:00
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Infrastructure
 * @category AI - Embedding
 */

/**
 * 向量数据
 */
export interface EmbeddingVector {
  /**
   * 向量 ID
   */
  id: string;

  /**
   * 向量值
   */
  values: number[];

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 嵌入模型配置
 */
export interface EmbeddingConfig {
  /**
   * 模型名称
   */
  model?: string;

  /**
   * 输出维度
   */
  dimensions?: number;

  /**
   * 批次大小
   */
  batchSize?: number;
}
