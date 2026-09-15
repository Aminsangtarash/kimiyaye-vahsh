import { useCallback, useEffect, useMemo, useState } from "react";
import { randomUUID } from "./uuid";
import { createGameSocket, SOCKET_EVENTS } from "./socket";

type Screen = "entry" | "lobby" | "game" | "results";

interface LobbySeat {
  seat: number;
  displayName: string;
  team: number;
  ready: boolean;
  connected: boolean;
}

interface GameView {
  seat: number;
  team: number;
  yourHand: { instanceId: string; slug: string; suit: string }[];
  yourSpecials: { instanceId: string; slug: string }[];
  legalCardIds: string[];
  currentPlayer: number;
  superiorSuit: string | null;
  handScore: { teamTricks: [number, number] };
  matchScore: { teamHands: [number, number] };
  currentTrick: {
    ledSuit: string | null;
    plays: { seat: number; card: { slug: string; suit: string } }[];
  } | null;
  pendingSpecial: boolean;
  matchWinnerTeam: number | null;
  phase: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [name, setName] = useState("Guest");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [lobby, setLobby] = useState<{ seats: (LobbySeat | null)[]; canStart?: boolean } | null>(
    null,
  );
  const [game, setGame] = useState<GameView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientSeq, setClientSeq] = useState(0);

  const sessionId = useMemo(() => randomUUID(), []);
  const socket = useMemo(() => createGameSocket(name, sessionId), [name, sessionId]);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on(SOCKET_EVENTS.event, (msg: { type: string; payload?: { lobby?: unknown; game?: GameView } }) => {
      if (msg.type !== "game_state" || !msg.payload) return;
      if (msg.payload.lobby) setLobby(msg.payload.lobby as typeof lobby);
      if (msg.payload.game) {
        setGame(msg.payload.game);
        setScreen(msg.payload.game.phase === "match_complete" ? "results" : "game");
      } else if (msg.payload.lobby) {
        setScreen("lobby");
      }
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off(SOCKET_EVENTS.event);
    };
  }, [socket]);

  const sendCommand = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      if (!roomId || seat === null) return;
      const nextSeq = clientSeq + 1;
      setClientSeq(nextSeq);
      socket.emit(SOCKET_EVENTS.command, {
        type,
        commandId: randomUUID(),
        roomId,
        clientSeq: nextSeq,
        payload,
      });
    },
    [clientSeq, roomId, seat, socket],
  );

  const joinAck = (ack: { ok?: boolean; roomId?: string; seat?: number; code?: string; error?: string }) => {
    if (!ack?.ok) {
      alert(ack?.error ?? "Join failed");
      return;
    }
    setRoomId(ack.roomId!);
    setSeat(ack.seat!);
    if (ack.code) setRoomCode(ack.code);
    setScreen("lobby");
  };

  const playGuest = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.quickMatch, {}, joinAck);
  };

  const createRoom = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.joinRoom, { create: true }, joinAck);
  };

  const joinRoom = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.joinRoom, { code: roomCode.trim() }, joinAck);
  };

  const suitFolder: Record<string, string> = {
    carnivore: "carnivores",
    herbivore: "herbivores",
    bird: "birds",
    reptile: "reptiles",
  };
  const cardUrl = (slug: string, suit: string) =>
    `/cards/portraits/final/${suitFolder[suit] ?? suit}/${slug}.webp`;

  return (
    <div className="app">
      <header className="hero">
        <p>چراغ نخستین · میدان ماه کامل</p>
        <h1>کیمیای وحش</h1>
        <p>Kimiyaye Vahsh — بازی کارتی</p>
      </header>

      {screen === "entry" && (
        <>
          <label>
            نام نمایشی{" "}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
          </label>
          <div className="entry-grid">
            <button className="primary" type="button" onClick={playGuest}>
              بازی مهمان · Quick Match
            </button>
            <button type="button" onClick={createRoom}>
              ساخت اتاق خصوصی
            </button>
          </div>
          <div className="entry-grid">
            <input
              placeholder="کد اتاق"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              aria-label="کد اتاق"
            />
            <button type="button" onClick={joinRoom}>
              پیوستن به اتاق
            </button>
          </div>
        </>
      )}

      {screen === "lobby" && lobby && (
        <section className="lobby" aria-label="لابی">
          <p>
            اتصال: {connected ? "متصل" : "قطع"} · کد: <strong>{roomCode}</strong>
          </p>
          <div className="seats">
            {lobby.seats.map((s, i) => (
              <div key={i} className={`seat ${s && seat === s.seat ? "you" : ""}`}>
                {s ? (
                  <>
                    <div>{s.displayName}</div>
                    <div className="team">تیم {s.team === 0 ? "الف" : "ب"} · {s.ready ? "آماده" : "…"}</div>
                  </>
                ) : (
                  <div className="team">خالی</div>
                )}
              </div>
            ))}
          </div>
          <p style={{ marginTop: "1rem" }}>
            هم‌تیمی روبه‌روی شما · چهار نفره
          </p>
          <button type="button" className="primary" onClick={() => sendCommand("READY")}>
            آماده
          </button>{" "}
          <button type="button" onClick={() => sendCommand("START_MATCH")}>
            شروع (میزبان)
          </button>
        </section>
      )}

      {screen === "game" && game && seat !== null && (
        <section className="game" aria-label="میز بازی">
          <div className="status-bar">
            <span>نوبت: بازیکن {game.currentPlayer + 1}</span>
            <span>
              دسته برتر: {game.superiorSuit ?? "—"}
            </span>
            <span>
              تریک: {game.handScore.teamTricks[0]} – {game.handScore.teamTricks[1]}
            </span>
            <span>
              دست: {game.matchScore.teamHands[0]} – {game.matchScore.teamHands[1]}
            </span>
          </div>
          <div className="table">
            <div>
              <h3>کارت‌های ویژه</h3>
              {game.yourSpecials.map((s) => (
                <button
                  key={s.instanceId}
                  type="button"
                  disabled={!game.pendingSpecial}
                  onClick={() => sendCommand("PLAY_SPECIAL", { specialInstanceId: s.instanceId })}
                >
                  {s.slug}
                </button>
              ))}
              {game.pendingSpecial && (
                <button type="button" onClick={() => sendCommand("PASS_SPECIAL")}>
                  رد کردن ویژه
                </button>
              )}
            </div>
            <div>
              <h3>تریک جاری</h3>
              <div className="trick-area">
                {game.currentTrick?.plays.map((p, i) => (
                  <img
                    key={i}
                    src={cardUrl(p.card.slug, p.card.suit)}
                    alt={p.card.slug}
                    width={86}
                    height={120}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3>دست شما</h3>
              <div className="hand">
                {game.yourHand.map((c) => {
                  const legal = game.legalCardIds.includes(c.instanceId);
                  const isTurn = game.currentPlayer === seat && !game.pendingSpecial;
                  return (
                    <button
                      key={c.instanceId}
                      type="button"
                      className={`card-btn ${legal && isTurn ? "legal" : ""} ${selected === c.instanceId ? "selected" : ""}`}
                      disabled={!legal || !isTurn}
                      onClick={() => {
                        setSelected(c.instanceId);
                        sendCommand("PLAY_CARD", { cardInstanceId: c.instanceId });
                      }}
                    >
                      <img src={cardUrl(c.slug, c.suit)} alt={c.slug} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "results" && game && (
        <section className="lobby">
          <h2>پایان مسابقه</h2>
          <p>
            تیم برنده: {game.matchWinnerTeam === game.team ? "شما" : "حریف"}
          </p>
          <button type="button" onClick={() => setScreen("entry")}>
            بازگشت
          </button>
        </section>
      )}
    </div>
  );
}
