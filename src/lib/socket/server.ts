import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server as HTTPServer } from "http";
import redis from "@/lib/redis";
import { getServerSession } from "@/lib/auth";

let io: SocketIOServer | null = null;

export function initIO(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  const pubClient = redis;
  const subClient = redis.duplicate();

  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL ?? "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      // Validate session via cookie forwarded in handshake
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const req = {
        headers: { cookie: cookieHeader },
        cookies: Object.fromEntries(
          cookieHeader.split(";").map((c) => {
            const [k, ...v] = c.trim().split("=");
            return [k.trim(), decodeURIComponent(v.join("="))];
          })
        ),
      } as Parameters<typeof getServerSession>[0];

      // getServerSession works without request in JWT strategy
      const session = await getServerSession();
      if (!session?.user?.tenantId) {
        return next(new Error("Unauthorized"));
      }

      socket.data.tenantId = session.user.tenantId;
      socket.data.userId = session.user.userId;
      socket.data.role = session.user.role;
      next();
    } catch (err) {
      next(new Error("Auth error"));
    }
  });

  io.on("connection", (socket) => {
    const { tenantId } = socket.data as { tenantId: string };
    const room = `tenant:${tenantId}`;
    socket.join(room);

    socket.on("disconnect", () => {
      socket.leave(room);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io server not initialized. Call initIO() first.");
  }
  return io;
}

export { io };
