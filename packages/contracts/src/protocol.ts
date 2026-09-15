/** Wire protocol version for Socket.IO game channel */
export const PROTOCOL_VERSION = 1;

export const SOCKET_EVENTS = {
  connect: "connect",
  disconnect: "disconnect",
  joinRoom: "kv:join_room",
  leaveRoom: "kv:leave_room",
  command: "kv:command",
  event: "kv:event",
  quickMatch: "kv:quick_match",
} as const;

/** Server assigns monotonic stateVersion on each accepted command */
export interface CommandAck {
  ok: boolean;
  commandId: string;
  stateVersion: number;
  error?: string;
}
