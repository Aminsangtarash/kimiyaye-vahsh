import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@kv/contracts";

const SERVER = import.meta.env.VITE_GAME_SERVER_URL ?? "http://localhost:4010";

export function createGameSocket(displayName: string, sessionId: string) {
  return io(SERVER, {
    autoConnect: false,
    auth: { displayName, sessionId },
  });
}

export { SOCKET_EVENTS };
export type { Socket };
