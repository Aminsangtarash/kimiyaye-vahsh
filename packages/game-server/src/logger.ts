type Level = "info" | "warn" | "error" | "debug";

export interface LogFields {
  matchId?: string;
  roomId?: string;
  sessionId?: string;
  userId?: string;
  event?: string;
  [key: string]: unknown;
}

const SECRET_KEYS = new Set([
  "token",
  "ticket",
  "secret",
  "password",
  "authorization",
  "GAME_TICKET_SECRET",
  "SESSION_SECRET",
]);

function scrub(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SECRET_KEYS.has(k) || /secret|token|ticket|password/i.test(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function log(level: Level, message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...scrub(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
