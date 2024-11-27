import { verify } from "jsr:@wok/djwt";

type EventCallback = (data: any) => void;
type CommandResponse = string;

export interface DenoriteConfig {
  port: number;
  jwtSecret: string;
  allowedOrigins: string[];
}

export class Denorite {
  private sockets: Set<WebSocket> = new Set();
  private messageId = 0;
  private pendingCommands = new Map<string, {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }>();
  private key: CryptoKey;
  private eventListeners = new Map<string, Set<EventCallback>>();
  private abortController = new AbortController();
  private serverPromise: Promise<void> | null = null;

  constructor(private config: DenoriteConfig) {}

  /**
   * Send a command to the Minecraft server and wait for its response
   */
  async sendCommand(command: string): Promise<CommandResponse> {
    const id = (this.messageId++).toString();
    const message = JSON.stringify({
      id,
      type: "command",
      data: command
    });

    const socket = this.sockets.values().next().value;
    if (!socket) throw new Error("No Minecraft server connected");

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error("Command timed out"));
        }
      }, 5000);
      socket.send(message);
    });
  }

  /**
   * Register an event listener for Minecraft events
   */
  on(eventType: string, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  /**
   * Remove an event listener
   */
  off(eventType: string, callback: EventCallback): void {
    this.eventListeners.get(eventType)?.delete(callback);
  }

  /**
   * Remove all event listeners for a specific event type
   */
  removeAllListeners(eventType: string): void {
    this.eventListeners.delete(eventType);
  }

  /**
   * Get the number of connected Minecraft servers
   */
  get connectionCount(): number {
    return this.sockets.size;
  }

  private emit(eventType: string, data: any): void {
    this.eventListeners.get(eventType)?.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${eventType} event handler:`, err);
      }
    });
  }

  private async initialize() {
    this.key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.config.jwtSecret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["verify"]
    );
  }

  private async validateAuth(req: Request): Promise<boolean> {
    try {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return false;
      
      const token = auth.split(" ")[1];
      await verify(token, this.key, {
        algorithms: ["HS512"],
        audience: "denorite",
      });
      return true;
    } catch (err) {
      console.error("JWT validation failed:", err);
      return false;
    }
  }

  private validateOrigin(req: Request): boolean {
    const origin = req.headers.get("Origin");
    if (!origin) return false;
    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Start the Denorite server
   */
  async start(): Promise<void> {
    if (this.serverPromise) {
      throw new Error("Server is already running");
    }

    await this.initialize();

    this.serverPromise = Deno.serve({
      port: this.config.port,
      signal: this.abortController.signal,
    }, async (req) => {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response(null, { status: 501 });
      }

      if (!await this.validateAuth(req)) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (!this.validateOrigin(req)) {
        return new Response("Invalid origin", { status: 403 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.addEventListener("open", () => {
        this.sockets.add(socket);
        this.emit("connection", { count: this.sockets.size });
      });

      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id && this.pendingCommands.has(data.id)) {
            const { resolve, reject } = this.pendingCommands.get(data.id)!;
            this.pendingCommands.delete(data.id);
            
            if (data.error) {
              reject(new Error(data.error));
            } else {
              resolve(data.result || "Command completed");
            }
          } else if (data.eventType) {
            this.emit(data.eventType, data.data);
          }
        } catch (err) {
          console.error("Error handling message:", err);
        }
      });

      socket.addEventListener("close", () => {
        this.sockets.delete(socket);
        this.emit("disconnection", { count: this.sockets.size });
        
        for (const [id, { reject }] of this.pendingCommands) {
          reject(new Error("Minecraft server disconnected"));
        }
        this.pendingCommands.clear();
      });

      socket.addEventListener("error", (err) => {
        this.emit("error", err);
      });

      return response;
    }).finished;

    console.log(`Denorite server running on port ${this.config.port}`);
  }

  /**
   * Stop the Denorite server
   */
  async stop(): Promise<void> {
    this.abortController.abort();
    if (this.serverPromise) {
      await this.serverPromise;
      this.serverPromise = null;
    }
    
    for (const socket of this.sockets) {
      socket.close();
    }
    this.sockets.clear();
    this.pendingCommands.clear();
    this.eventListeners.clear();
    console.log("Denorite server stopped");
  }
}
