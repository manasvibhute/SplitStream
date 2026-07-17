const { verifyAccessToken } = require("../utils/tokens");

function registerSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = verifyAccessToken(token);
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("group:join", (groupId) => {
      if (groupId) socket.join(groupId);
    });

    socket.on("group:leave", (groupId) => {
      if (groupId) socket.leave(groupId);
    });
  });
}

module.exports = registerSockets;
