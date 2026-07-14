/**
 * index.ts - Agent01 后端入口
 * @package @vxture/agent-server-agent01
 *
 * Description: Agent01 私有后端服务的主入口
 *
 * @author AI-Generated
 * @date 2026-03-11 11:20:00
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application / Domain
 * @category Agent01 - Backend
 */

import { createServer } from "http";

/**
 * Agent01 后端服务器
 */
class Agent01Server {
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Agent01 backend server is running",
            timestamp: new Date().toISOString(),
          }),
        );
      });

      this.server.listen(this.port, () => {
        console.log(`Agent01 backend server running on port ${this.port}`);
        resolve();
      });

      this.server.on("error", (error) => {
        console.error("Server error:", error);
        reject(error);
      });
    });
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            console.error("Error closing server:", error);
            reject(error);
          } else {
            console.log("Agent01 backend server stopped");
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * 启动服务器的函数
 */
export function startAgent01Server(port?: number): Promise<Agent01Server> {
  const server = new Agent01Server(port);
  return server.start().then(() => server);
}

/**
 * 默认导出
 */
export default Agent01Server;
