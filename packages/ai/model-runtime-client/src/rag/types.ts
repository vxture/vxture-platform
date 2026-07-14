/**
 * rag/types.ts - RAG 相关类型定义
 * @package @vxture/model-runtime-client
 *
 * Description: 检索增强生成模块的类型定义
 *
 * @author AI-Generated
 * @date 2026-03-11 11:20:00
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Infrastructure
 * @category AI - RAG
 */

/**
 * 文档块
 */
export interface DocumentChunk {
  /**
   * 文档块 ID
   */
  id: string;

  /**
   * 文档 ID
   */
  documentId: string;

  /**
   * 文档内容
   */
  content: string;

  /**
   * 元数据
   */
  metadata?: Record<string, unknown>;

  /**
   * 相似度分数
   */
  score?: number;
}

/**
 * 检索结果
 */
export interface RetrievalResult {
  /**
   * 检索到的文档块
   */
  chunks: DocumentChunk[];

  /**
   * 总结果数
   */
  total: number;

  /**
   * 检索用时（毫秒）
   */
  latency?: number;
}

/**
 * RAG 配置
 */
export interface RAGConfig {
  /**
   * 检索的最大结果数
   */
  topK?: number;

  /**
   * 相似度阈值
   */
  scoreThreshold?: number;

  /**
   * 是否使用混合检索
   */
  hybridSearch?: boolean;
}
