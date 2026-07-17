import { io } from "socket.io-client";

let socket;

export function getSocket(token) {
  if (socket?.auth?.token === token) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    auth: { token },
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}
