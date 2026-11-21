import { Server } from "socket.io";
import logger from "../logger/logger.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"],
    },
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("join", (userId) => {
      if (userId) {
        socket.join(userId.toString());
        logger.info(`Socket ${socket.id} joined user room: ${userId}`);
      }
    });

    socket.on("join_role", (role) => {
      if (role) {
        socket.join(`role:${role}`);
        logger.info(`Socket ${socket.id} joined role room: role:${role}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (io && userId) {
    io.to(userId.toString()).emit(event, payload);
  }
};

export const emitToRole = (role, event, payload) => {
  if (io && role) {
    io.to(`role:${role}`).emit(event, payload);
  }
};

export const broadcastEvent = (event, payload) => {
  if (io) {
    io.emit(event, payload);
  }
};
