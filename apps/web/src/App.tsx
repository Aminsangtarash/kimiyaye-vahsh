import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { randomUUID } from "./uuid";
import { createGameSocket, SOCKET_EVENTS } from "./socket";
import { playCardWhoosh, playDealTick, playHunterRoar } from "./sfx";
import {
  IconBell,
  IconBot,
  IconChart,
  IconChevron,
  IconCoin,
  IconDiscord,
  IconDoor,
  IconGear,
  IconInstagram,
  IconLogin,
  IconMoon,
  IconStar,
  IconSwords,
  IconTelegram,
  IconTrophy,
  IconUser,
  IconUsers,
  LogoSeal,
  RealmMark,
} from "./icons";

type Screen = "entry" | "lobby" | "game" | "results";

const REALMS = [
  {
    id: "carnivore",
    fa: "گوشتخواران",
    attr: "قدرت",
    color: "#e53935",
    glow: "rgba(229, 57, 53, 0.55)",
    sample: { slug: "lion", name: "شیر" },
  },
  {
    id: "herbivore",
    fa: "گیاه‌خواران",
    attr: "پایداری",
    color: "#43a047",
    glow: "rgba(67, 160, 71, 0.55)",
    sample: { slug: "elephant", name: "فیل" },
  },
  {
    id: "bird",
    fa: "پرندگان",
    attr: "آزادی",
    color: "#1e88e5",
    glow: "rgba(30, 136, 229, 0.55)",
    sample: { slug: "harpy-eagle", name: "عقاب" },
  },
  {
    id: "reptile",
    fa: "خزندگان",
    attr: "دگردیسی",
    color: "#8e24aa",
    glow: "rgba(142, 36, 170, 0.55)",
    sample: { slug: "king-cobra", name: "کبرا" },
  },
] as const;

interface LobbySeat {
  seat: number;
  displayName: string;
  team: number;
  connected: boolean;
  controllerType: "human" | "bot";
  realm: string | null;
}

interface GameView {
  seat: number;
  team: number;
  yourRealm: string;
  playerRealms: string[];
  yourHand: { instanceId: string; slug: string; suit: string; displayRank: string; strength: number }[];
  yourSpecials?: { instanceId: string; slug: string }[];
  specialInventory?: { instanceId: string; slug: string; fa: string; shortFa: string }[];
  legalCardIds: string[];
  currentPlayer: number;
  currentLeader: number | null;
  hunterRealm: string | null;
  hunterSelectorSeat?: number;
  isHunterSelector?: boolean;
  selectionStartedAt?: number | null;
  selectionDeadlineAt?: number | null;
  hunterSelectionTimeoutMs?: number;
  handScore: { teamTricks: [number, number] };
  matchScore: { teamHands: [number, number] };
  currentTrick: {
    ledSuit: string | null;
    leader: number;
    plays: {
      seat: number;
      card: { slug: string; suit: string; displayRank: string; strength?: number };
      specials?: string[];
      effectiveSuit?: string;
      transformedByChameleon?: boolean;
      chameleon?: boolean;
      strengthDelta?: number;
    }[];
  } | null;
  trickPreview?: {
    resolved?: {
      seat: number;
      effectivePower: number;
      effectiveSuit: string;
      destroyedByArmageddon: boolean;
      modifiers: { source: string; delta?: number; note: string }[];
      baseRank: number;
    }[];
    fusions?: {
      seats: [number, number];
      fusionPower: number;
      effectiveSuit: string;
      showsFusionBeast: boolean;
      winnerSeat: number;
    }[];
    inversionActive?: boolean;
    inversionCancelled?: boolean;
    huntCommand?: { succeeded: boolean; proposedHunter: string; failReason?: string } | null;
  } | null;
  matchWinnerTeam: number | null;
  phase: string;
  stateVersion?: number;
  rulesVersion?: number;
  lastTrickWinner?: number | null;
  lastHandWinnerTeam?: number | null;
  seatStats: { tricksWon: number; impactScore: number }[];
  mvpParticipantIds: string[];
  controllers?: ("human" | "bot")[];
  specialCardsEnabled: boolean;
  canRequestSpecialDraw?: boolean;
  specialDrawAttemptedThisTurn?: boolean;
  pendingSpecialDiscard?: { seat: number; drawnInstanceId: string } | null;
  specialMaxInventory?: number;
  opponentHandSizes?: number[];
  resultAckTimeoutMs?: number;
  tricksPlayedThisHand?: number;
}

const SPECIAL_FA: Record<string, { fa: string; short: string }> = {
  doping: { fa: "دوپینگ", short: "+۲٫۵" },
  trap: { fa: "تله", short: "−۲٫۵ حریف" },
  chameleon: { fa: "نیرنگ آفتاب‌پرست", short: "تغییر دسته" },
  inversion: { fa: "نفرین وارونگی", short: "وارونگی" },
  team_bond: { fa: "همتازی", short: "پیوند تیم" },
  null: { fa: "پوچ", short: "بی‌اثر" },
  hunt_command: { fa: "فرمان شکار", short: "تغییر شکارچی" },
  armageddon: { fa: "آرماگدون", short: "نابودی A" },
};

interface MatchResult {
  winningTeamId: number | null;
  matchScore?: { teamHands: [number, number] };
  participants: {
    participantId: string;
    seat: number;
    teamId: number;
    realm: string;
    controllerType: string;
    displayName?: string;
    tricksWon: number;
    impactScore: number;
  }[];
  mvpParticipantIds: string[];
  hasBots: boolean;
  botSeatCount: number;
}

interface LobbyView {
  code: string;
  mode: string;
  status: string;
  lobbyPhase: string;
  countdownMsRemaining: number | null;
  quickMatchBotFillMsRemaining: number | null;
  availableRealms: string[];
  seats: (LobbySeat | null)[];
  hostSeat: number | null;
}

/** Full standard project cards (rank + nameplate + power bars). */
function cardUrl(slug: string) {
  return `/cards/final/clean/${slug}.webp`;
}

function cardBackUrl() {
  return `/cards/backs/default.png`;
}

function realmMeta(id: string | null | undefined) {
  return REALMS.find((r) => r.id === id);
}

function HandFanBacks({ count }: { count: number }) {
  const n = Math.min(Math.max(count, 0), 8);
  if (count <= 0) {
    return <div className="hand-fan-backs empty" title="بدون کارت" />;
  }
  return (
    <div className="hand-fan-backs" title={`${count} کارت در دست`} aria-label={`${count} کارت`}>
      {Array.from({ length: Math.max(n, 1) }, (_, i) => {
        const mid = (n - 1) / 2;
        const rot = (i - mid) * 9;
        return (
          <img
            key={i}
            src={cardBackUrl()}
            alt=""
            className="hand-fan-card"
            style={{ ["--r" as string]: `${rot}deg`, ["--i" as string]: i }}
            draggable={false}
          />
        );
      })}
      <span className="hand-fan-count">{count}</span>
    </div>
  );
}

function TrickStack({ count, label }: { count: number; label: string }) {
  const n = Math.min(Math.max(count, 0), 6);
  if (count <= 0) {
    return (
      <div className="trick-stack empty" title={label}>
        <span className="trick-stack-count">۰</span>
      </div>
    );
  }
  return (
    <div className="trick-stack" title={label}>
      {Array.from({ length: n }, (_, i) => (
        <img
          key={i}
          className="trick-stack-card"
          src={cardBackUrl()}
          alt=""
          style={{ ["--s" as string]: i }}
          draggable={false}
        />
      ))}
      <span className="trick-stack-count">{count}</span>
    </div>
  );
}

function relativeSlot(absoluteSeat: number, selfSeat: number) {
  const delta = (absoluteSeat - selfSeat + 4) % 4;
  if (delta === 0) return "south";
  if (delta === 1) return "east";
  if (delta === 2) return "north";
  return "west";
}

function Wallpaper({ variant }: { variant: "menu" | "board" | "panel" }) {
  const src = variant === "board" ? "/ui/wallpaper-board.jpg" : "/ui/wallpaper-menu.jpg";
  return (
    <div className={`wallpaper wallpaper-${variant}`} aria-hidden>
      <img className="wallpaper-img" src={src} alt="" />
      <div className="wallpaper-veil" />
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [name, setName] = useState("سایه‌گرد");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [preferredRealm, setPreferredRealm] = useState<string>("carnivore");
  const [connected, setConnected] = useState(false);
  const [clientSeq, setClientSeq] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedSpecials, setSelectedSpecials] = useState<string[]>([]);
  const [drawFlash, setDrawFlash] = useState<string | null>(null);
  const [dealVisible, setDealVisible] = useState(0);
  const [dealing, setDealing] = useState(false);
  const [hunterFlash, setHunterFlash] = useState<string | null>(null);
  const [flyCard, setFlyCard] = useState<{ slug: string; slot: string; key: string } | null>(null);
  /** Face-up cards pinned on the table (survives server clearing the trick). */
  const [tablePlays, setTablePlays] = useState<
    { seat: number; card: { slug: string; suit: string; displayRank: string } }[] | null
  >(null);
  const [collectAnim, setCollectAnim] = useState<{
    plays: { seat: number; card: { slug: string; suit: string; displayRank: string } }[];
    winnerSeat: number;
  } | null>(null);
  const prevHunter = useRef<string | null>(null);
  const prevHandLen = useRef(0);
  const prevTrickLen = useRef(0);
  const holdUntilRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const collectTimerRef = useRef<number | null>(null);
  const lockedTrickRef = useRef<
    { seat: number; card: { slug: string; suit: string; displayRank: string } }[] | null
  >(null);
  const pendingWinnerRef = useRef<number | null>(null);
  const [trickUi, setTrickUi] = useState<"live" | "holding" | "collecting">("live");
  const trickUiRef = useRef<"live" | "holding" | "collecting">("live");
  const gameRef = useRef(game);
  gameRef.current = game;
  const setTrickStage = (stage: "live" | "holding" | "collecting") => {
    trickUiRef.current = stage;
    setTrickUi(stage);
  };

  const TRICK_HOLD_MS = 2200;
  const COLLECT_ANIM_MS = 1100;
  const RESULT_DISPLAY_MS = 10_000;

  const [resultSecondsLeft, setResultSecondsLeft] = useState<number | null>(null);
  const handContinueSentRef = useRef(false);
  const resultPhaseKeyRef = useRef<string | null>(null);

  const sessionId = useMemo(() => randomUUID(), []);
  const socket = useMemo(() => createGameSocket(name, sessionId), [name, sessionId]);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on(
      SOCKET_EVENTS.event,
      (msg: {
        type: string;
        payload?: { lobby?: LobbyView; game?: GameView; matchResult?: MatchResult | null };
      }) => {
        if (msg.type !== "game_state" || !msg.payload) return;
        if (msg.payload.lobby) setLobby(msg.payload.lobby);
        if (msg.payload.matchResult) setMatchResult(msg.payload.matchResult);
        if (msg.payload.game) {
          const next = msg.payload.game;
          setGame(next);
          setSelectedCard((prev) =>
            prev && next.yourHand.some((c) => c.instanceId === prev) ? prev : null,
          );
          if (next.phase === "match_complete") setScreen("results");
          else setScreen("game");
        } else if (msg.payload.lobby) {
          setScreen("lobby");
        }
      },
    );
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off(SOCKET_EVENTS.event);
    };
  }, [socket]);

  // Deal animation when a fresh hand arrives
  useEffect(() => {
    if (!game) return;
    const len = game.yourHand.length;
    const grewFromEmpty = prevHandLen.current === 0 && len > 0;
    const fullRedeal = len >= 10 && len > prevHandLen.current + 3;
    if (grewFromEmpty || fullRedeal || game.phase === "dealing") {
      setDealing(true);
      setDealVisible(0);
      let i = 0;
      const total = len;
      const timer = window.setInterval(() => {
        i += 1;
        setDealVisible(i);
        playDealTick();
        if (i >= total) {
          window.clearInterval(timer);
          setDealing(false);
        }
      }, 90);
      prevHandLen.current = len;
      return () => window.clearInterval(timer);
    }
    prevHandLen.current = len;
  }, [game?.matchScore.teamHands[0], game?.matchScore.teamHands[1], game?.phase, game?.yourHand.length]);

  // Reset hunter announce when a new round enters selection
  useEffect(() => {
    if (game?.phase === "hunter_selection") {
      prevHunter.current = null;
    }
  }, [game?.phase, game?.matchScore.teamHands[0], game?.matchScore.teamHands[1]]);

  // Tick selection countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    if (game?.phase !== "hunter_selection") return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [game?.phase]);

  // Hand-result countdown only (match result stays until player closes)
  useEffect(() => {
    const isHandResult = game?.phase === "hand_complete";
    if (!isHandResult) {
      if (screen !== "results") setResultSecondsLeft(null);
      handContinueSentRef.current = false;
      if (screen !== "results") resultPhaseKeyRef.current = null;
      return;
    }
    const key = `hand-${game.matchScore.teamHands[0]}-${game.matchScore.teamHands[1]}`;
    if (resultPhaseKeyRef.current !== key) {
      resultPhaseKeyRef.current = key;
      handContinueSentRef.current = false;
    }
    const timeoutMs = game.resultAckTimeoutMs ?? RESULT_DISPLAY_MS;
    const started = Date.now();
    setResultSecondsLeft(Math.ceil(timeoutMs / 1000));
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((timeoutMs - (Date.now() - started)) / 1000));
      setResultSecondsLeft(left);
    }, 200);
    return () => window.clearInterval(id);
  }, [
    game?.phase,
    game?.matchScore.teamHands[0],
    game?.matchScore.teamHands[1],
    game?.resultAckTimeoutMs,
    screen,
  ]);

  // Lock page scroll while hunter / result dialog is open
  useEffect(() => {
    if (game?.phase !== "hunter_selection" && game?.phase !== "hand_complete") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [game?.phase]);

  // Announce Hunter once when selected for the round (not every trick)
  useEffect(() => {
    if (!game?.hunterRealm) return;
    if (prevHunter.current !== game.hunterRealm) {
      prevHunter.current = game.hunterRealm;
      setHunterFlash(game.hunterRealm);
      playHunterRoar();
      const t = window.setTimeout(() => setHunterFlash(null), 1800);
      return () => window.clearTimeout(t);
    }
  }, [game?.hunterRealm]);

  // Play-to-table whoosh when a new trick card appears
  useEffect(() => {
    const n = game?.currentTrick?.plays.length ?? 0;
    if (n > prevTrickLen.current && game?.currentTrick && trickUiRef.current !== "collecting") {
      const last = game.currentTrick.plays[n - 1];
      if (last && seat !== null) {
        playCardWhoosh();
        setFlyCard({
          slug: last.card.slug,
          slot: relativeSlot(last.seat, seat),
          key: `${last.seat}-${last.card.slug}-${n}`,
        });
        const t = window.setTimeout(() => setFlyCard(null), 420);
        prevTrickLen.current = n;
        return () => window.clearTimeout(t);
      }
    }
    if (n === 0 && trickUiRef.current === "live") prevTrickLen.current = 0;
    else if (n > 0) prevTrickLen.current = n;
  }, [game?.currentTrick?.plays, game?.phase, seat]);

  // Pin completed tricks on the table for TRICK_HOLD_MS, then animate collect to winner.
  useEffect(() => {
    if (!game || seat === null) return;

    const clearHoldTimer = () => {
      if (holdTimerRef.current != null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
    const clearCollectTimer = () => {
      if (collectTimerRef.current != null) {
        window.clearTimeout(collectTimerRef.current);
        collectTimerRef.current = null;
      }
    };

    const beginCollect = (winnerSeat: number) => {
      const locked = lockedTrickRef.current;
      if (!locked?.length || trickUiRef.current === "collecting") return;
      setTrickStage("collecting");
      setCollectAnim({ plays: locked, winnerSeat });
      setTablePlays(locked);
      playCardWhoosh();
      clearCollectTimer();
      collectTimerRef.current = window.setTimeout(() => {
        setCollectAnim(null);
        lockedTrickRef.current = null;
        pendingWinnerRef.current = null;
        holdUntilRef.current = 0;
        setTrickStage("live");
        const nextPlays = gameRef.current?.currentTrick?.plays ?? [];
        setTablePlays(nextPlays.length ? nextPlays : null);
        prevTrickLen.current = nextPlays.length;
        collectTimerRef.current = null;
      }, COLLECT_ANIM_MS);
    };

    const armCollect = () => {
      clearHoldTimer();
      const tryCollect = () => {
        const remaining = holdUntilRef.current - Date.now();
        if (remaining > 16) {
          holdTimerRef.current = window.setTimeout(tryCollect, remaining);
          return;
        }
        const winner = pendingWinnerRef.current;
        if (winner == null) {
          // Winner arrives with RESOLVE_TRICK; retry briefly, then give up.
          if (Date.now() - (holdUntilRef.current - TRICK_HOLD_MS) < 6000) {
            holdTimerRef.current = window.setTimeout(tryCollect, 50);
          } else {
            lockedTrickRef.current = null;
            setTrickStage("live");
            setTablePlays(null);
          }
          return;
        }
        beginCollect(winner);
      };
      tryCollect();
    };

    const plays = game.currentTrick?.plays ?? [];

    // Completed trick on server (or still resolving): lock faces and start hold clock.
    if (plays.length === 4 || (game.phase === "resolving_trick" && plays.length >= 4)) {
      lockedTrickRef.current = plays.map((p) => ({ seat: p.seat, card: { ...p.card } }));
      setTablePlays(lockedTrickRef.current);
      if (trickUiRef.current !== "holding" && trickUiRef.current !== "collecting") {
        setTrickStage("holding");
        holdUntilRef.current = Date.now() + TRICK_HOLD_MS;
        armCollect();
      }
      if (game.lastTrickWinner != null) pendingWinnerRef.current = game.lastTrickWinner;
      return;
    }

    // Server cleared the trick — keep locked faces until hold elapses, then collect.
    if (plays.length === 0) {
      if (game.lastTrickWinner != null) pendingWinnerRef.current = game.lastTrickWinner;
      if (lockedTrickRef.current?.length === 4 && trickUiRef.current === "holding") {
        armCollect();
        return;
      }
      if (trickUiRef.current === "live") {
        setTablePlays(null);
      }
      return;
    }

    // Mid-trick live updates (1–3 cards). Don't clobber a hold/collect.
    if (trickUiRef.current === "holding" || trickUiRef.current === "collecting") return;
    setTablePlays(plays);
  }, [game?.currentTrick, game?.phase, game?.lastTrickWinner, game?.stateVersion, seat]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current);
      if (collectTimerRef.current != null) window.clearTimeout(collectTimerRef.current);
    };
  }, []);

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
      alert(ack?.error ?? "خطا در پیوستن");
      return;
    }
    setRoomId(ack.roomId!);
    setSeat(ack.seat!);
    if (ack.code) setRoomCode(ack.code);
    setScreen("lobby");
  };

  const playQuick = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.quickMatch, {}, joinAck);
  };
  const playVsBots = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.playVsBots, { realm: preferredRealm }, joinAck);
  };
  const createRoom = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.joinRoom, { create: true }, joinAck);
  };
  const joinRoomCode = () => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.joinRoom, { code: roomCode.trim() }, joinAck);
  };

  const wallpaperVariant = screen === "entry" ? "menu" : screen === "game" ? "board" : "panel";

  const playSelected = () => {
    if (!selectedCard || !game || seat === null) return;
    if (!game.legalCardIds.includes(selectedCard) || game.currentPlayer !== seat) return;
    if (game.pendingSpecialDiscard) return;
    sendCommand("PLAY_CARD", {
      cardInstanceId: selectedCard,
      specialInstanceIds: selectedSpecials.length ? selectedSpecials : undefined,
    });
    setSelectedCard(null);
    setSelectedSpecials([]);
  };

  const requestSpecialDraw = () => {
    if (!game?.canRequestSpecialDraw) return;
    sendCommand("REQUEST_SPECIAL_DRAW");
    setDrawFlash("در حال امتحان شانس…");
    window.setTimeout(() => setDrawFlash(null), 1600);
  };

  const discardSpecial = (specialInstanceId: string) => {
    sendCommand("DISCARD_SPECIAL", { specialInstanceId });
  };

  const toggleSpecial = (instanceId: string) => {
    setSelectedSpecials((prev) => {
      if (prev.includes(instanceId)) return prev.filter((x) => x !== instanceId);
      if (prev.length >= 2) return prev;
      return [...prev, instanceId];
    });
  };

  const selectHunterRealm = (realm: string) => {
    sendCommand("SELECT_HUNTER_REALM", { realm });
  };

  const continueHand = () => {
    if (handContinueSentRef.current) return;
    handContinueSentRef.current = true;
    sendCommand("CONTINUE_HAND");
  };

  const hunterSelectRemainingSec =
    game?.phase === "hunter_selection" && game.selectionDeadlineAt
      ? Math.max(0, Math.ceil((game.selectionDeadlineAt - Date.now()) / 1000))
      : null;

  const onHandCardClick = (instanceId: string) => {
    if (!game || seat === null) return;
    if (game.currentPlayer !== seat) return;
    if (game.pendingSpecialDiscard) return;
    if (!game.legalCardIds.includes(instanceId)) return;
    if (selectedCard === instanceId) {
      sendCommand("PLAY_CARD", {
        cardInstanceId: instanceId,
        specialInstanceIds: selectedSpecials.length ? selectedSpecials : undefined,
      });
      setSelectedCard(null);
      setSelectedSpecials([]);
      return;
    }
    setSelectedCard(instanceId);
  };

  return (
    <div className={`app app-${screen}`} dir="rtl">
      <Wallpaper variant={wallpaperVariant} />

      {screen !== "game" && (
        <header className="topnav glass-bar">
          <div className="brand">
            <LogoSeal size={44} />
            <div className="brand-text">
              <strong>کیمیای وحش</strong>
              <small>KIMIYAYE VAHSH</small>
            </div>
          </div>
          <nav className="nav-links" aria-label="منو">
            <span className="active">خانه</span>
            <span>آموزش</span>
            <span>اخبار و رویدادها</span>
            <span>جامعه</span>
          </nav>
          <div className="top-tools">
            <div className={`link-dot ${connected ? "on" : ""}`} title={connected ? "متصل" : "قطع"} />
            <div className="coin-pill">
              <IconCoin size={16} />
              <span>۱۲٬۴۵۰</span>
            </div>
            <button type="button" className="icon-btn" aria-label="اعلان‌ها">
              <IconBell size={18} />
            </button>
            <div className="user-pill">
              <span className="mini-avatar" style={{ color: realmMeta(preferredRealm)?.color }}>
                <RealmMark realm={preferredRealm} size={16} />
              </span>
              <span className="user-meta">
                <strong>{name}</strong>
                <small>سطح ۱۲</small>
              </span>
            </div>
            <button type="button" className="icon-btn" aria-label="تنظیمات">
              <IconGear size={18} />
            </button>
          </div>
        </header>
      )}

      {screen === "entry" && (
        <main className="menu-page">
          <section className="menu-hero">
            <div className="hero-copy">
              <h1>کیمیای وحش</h1>
              <p className="eyebrow">بیش از یک بازی، نبرد قلمروها</p>
              <p className="tagline">قدرت در اتحاد ماست · طبیعت کیمیای ماست</p>
              <label className="name-field">
                <span>نام نمایشی</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
              </label>
            </div>

            <aside className="hero-aside">
              <div className="info-card glass-panel">
                <div className="info-card-head">
                  <IconMoon size={18} />
                  <strong>میدان ماه کامل</strong>
                </div>
                <p>نبرد ۲ در ۲ روی میدان آیینی. قلمرو شکارچی هر تریک را تعیین می‌کند و امتیاز اثرگذاری، MVP را می‌سازد.</p>
                <button type="button" className="text-link">
                  جزئیات بیشتر
                </button>
              </div>

              <div className="sample-pack glass-panel">
                <div className="sample-head">
                  <span>نمونه کارت‌ها از چهار قلمرو</span>
                  <button type="button" className="text-link">
                    مشاهده همه
                  </button>
                </div>
                <div className="sample-row">
                  {REALMS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`sample-card ${preferredRealm === r.id ? "active" : ""}`}
                      style={{ ["--realm" as string]: r.color, ["--glow" as string]: r.glow }}
                      onClick={() => setPreferredRealm(r.id)}
                      aria-label={`${r.sample.name} · ${r.fa}`}
                    >
                      <img src={cardUrl(r.sample.slug)} alt={`${r.sample.name} — کارت استاندارد`} />
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          <section className="action-rail" aria-label="ورود به بازی">
            <button type="button" className="mode-tile primary" onClick={playQuick}>
              <span className="mode-ico">
                <IconSwords size={26} />
              </span>
              <span className="mode-body">
                <strong>شروع بازی سریع</strong>
                <small>همین حالا وارد میدان شوید</small>
              </span>
              <IconChevron size={18} className="mode-chev" />
            </button>
            <button type="button" className="mode-tile" onClick={createRoom}>
              <span className="mode-ico">
                <IconUsers size={24} />
              </span>
              <span className="mode-body">
                <strong>ساخت اتاق خصوصی</strong>
                <small>بازی با دوستان</small>
              </span>
            </button>
            <button type="button" className="mode-tile" onClick={joinRoomCode}>
              <span className="mode-ico">
                <IconDoor size={24} />
              </span>
              <span className="mode-body">
                <strong>ورود به اتاق</strong>
                <small>با کد اتاق</small>
              </span>
            </button>
            <button type="button" className="mode-tile accent" onClick={playVsBots}>
              <span className="mode-ico">
                <IconBot size={24} />
              </span>
              <span className="mode-body">
                <strong>بازی با ربات‌ها</strong>
                <small>تمرین و مهارت</small>
              </span>
            </button>
            <button type="button" className="mode-tile" onClick={playQuick}>
              <span className="mode-ico">
                <IconUser size={24} />
              </span>
              <span className="mode-body">
                <strong>بازی مهمان</strong>
                <small>بدون ثبت‌نام</small>
              </span>
            </button>
            <div className="mode-tile join-tile">
              <span className="mode-ico">
                <IconLogin size={22} />
              </span>
              <input
                placeholder="کد اتاق"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                aria-label="کد اتاق"
              />
              <button type="button" onClick={joinRoomCode}>
                پیوستن
              </button>
            </div>
          </section>

          <footer className="menu-footer">
            <div className="profile-dash glass-panel">
              <div className="dash-id">
                <div className="dash-avatar" style={{ color: realmMeta(preferredRealm)?.color, borderColor: realmMeta(preferredRealm)?.color }}>
                  <RealmMark realm={preferredRealm} size={24} />
                </div>
                <div>
                  <strong>{name || "مهمان"}</strong>
                  <div className="xp-row">
                    <span>سطح ۱۲</span>
                    <div className="xp-bar">
                      <i style={{ width: "60%" }} />
                    </div>
                    <small>۷۲۰ / ۱۲۰۰</small>
                  </div>
                </div>
              </div>
              <div className="dash-stats">
                <div>
                  <IconTrophy size={18} className="stat-ico" />
                  <strong>۳۶</strong>
                  <small>پیروزی تیمی</small>
                </div>
                <div>
                  <IconStar size={18} className="stat-ico" />
                  <strong>۴</strong>
                  <small>MVP</small>
                </div>
                <div>
                  <IconChart size={18} className="stat-ico" />
                  <strong>#۲۴۷</strong>
                  <small>رتبه کلی</small>
                </div>
              </div>
            </div>

            <div className="legal-row">
              <div className="legal-links">
                <span>درباره ما</span>
                <span>قوانین</span>
                <span>حریم خصوصی</span>
                <span>پشتیبانی</span>
              </div>
              <div className="socials">
                <IconDiscord size={18} />
                <IconTelegram size={18} />
                <IconInstagram size={18} />
              </div>
              <p className="legal-tag">کیمیای وحش — همیشه زنده است</p>
            </div>
          </footer>
        </main>
      )}

      {screen === "lobby" && lobby && (
        <main className="panel-page">
          <section className="panel-card glass-panel">
            <div className="panel-head">
              <div>
                <h2>لابی میدان ماه کامل</h2>
                <p>
                  کد <strong className="gold">{lobby.code}</strong> · {lobby.mode} · {lobby.lobbyPhase}
                </p>
              </div>
              {lobby.countdownMsRemaining != null && lobby.countdownMsRemaining > 0 && (
                <div className="countdown">
                  <strong>{Math.ceil(lobby.countdownMsRemaining / 1000)}</strong>
                  <small>ثانیه تا شروع</small>
                </div>
              )}
            </div>

            {lobby.quickMatchBotFillMsRemaining != null && (
              <p className="notice">
                در حال جستجوی بازیکن… ربات تا {Math.ceil(lobby.quickMatchBotFillMsRemaining / 1000)} ثانیه دیگر جای خالی را پر
                می‌کند
              </p>
            )}

            <div className="seat-grid">
              {lobby.seats.map((s, i) => {
                const meta = realmMeta(s?.realm);
                return (
                  <div
                    key={i}
                    className={`seat-card ${s && seat === s.seat ? "you" : ""} ${!s ? "empty" : ""}`}
                    style={meta ? { borderColor: meta.color, boxShadow: `0 0 18px ${meta.glow}` } : undefined}
                  >
                    {s ? (
                      <>
                        <div className="seat-top">
                          <span className="seat-avatar" style={{ color: meta?.color ?? "#aaa" }}>
                            {meta ? <RealmMark realm={meta.id} size={22} /> : <IconUser size={20} />}
                          </span>
                          <div>
                            <strong>
                              {s.displayName}
                              {s.controllerType === "bot" ? " · ربات" : ""}
                            </strong>
                            <small>
                              تیم {s.team === 0 ? "الف" : "ب"} · صندلی {i + 1}
                            </small>
                          </div>
                        </div>
                        <div className="seat-realm" style={{ color: meta?.color }}>
                          {meta ? `${meta.fa} · ${meta.attr}` : "قلمرو انتخاب نشده"}
                        </div>
                      </>
                    ) : (
                      <div className="seat-empty">جای خالی</div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="section-label">انتخاب قلمرو</h3>
            <div className="realm-pick">
              {REALMS.map((r) => {
                const taken = !lobby.availableRealms.includes(r.id) && lobby.seats[seat!]?.realm !== r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`realm-pick-btn ${lobby.seats[seat!]?.realm === r.id ? "active" : ""}`}
                    style={{ ["--realm" as string]: r.color, ["--glow" as string]: r.glow }}
                    disabled={taken}
                    onClick={() => sendCommand("SELECT_REALM", { realm: r.id })}
                  >
                    <img src={cardUrl(r.sample.slug)} alt={r.sample.name} />
                    <span className="realm-pick-ico" style={{ color: r.color }}>
                      <RealmMark realm={r.id} size={18} />
                    </span>
                    <strong>{r.fa}</strong>
                    <small>{r.attr}</small>
                  </button>
                );
              })}
            </div>

            {lobby.hostSeat === seat && lobby.mode === "private" && (
              <div className="host-row">
                <button type="button" className="ghost-btn" onClick={() => sendCommand("ADD_BOT")}>
                  افزودن ربات
                </button>
                <button type="button" className="ghost-btn" onClick={() => sendCommand("FILL_BOTS")}>
                  پر کردن با ربات
                </button>
              </div>
            )}
            <p className="hint">بدون Ready — با ۴ بازیکن و ۴ قلمرو یکتا، شمارش‌معکوس خودکار شروع می‌شود.</p>
          </section>
        </main>
      )}

      {screen === "game" &&
        game &&
        seat !== null &&
        game.phase === "hunter_selection" &&
        createPortal(
          <div className="hunter-select-overlay" role="dialog" aria-modal="true" aria-labelledby="hunter-select-title">
            <div className="hunter-select-dialog">
              {(game.isHunterSelector ?? game.hunterSelectorSeat === seat) ? (
                <section className="hunter-select-panel glass-panel">
                  <header className="hunter-select-head">
                    <div>
                      <p className="hunter-select-kicker">قلمرو شما: {realmMeta(game.yourRealm)?.fa}</p>
                      <h2 id="hunter-select-title">انتخاب قلمرو شکارچی این دور</h2>
                      <p>با توجه به ۵ کارت نخست، قلمرو شکارچی را انتخاب کنید. بازی بعد از این انتخاب شروع می‌شود.</p>
                    </div>
                    {hunterSelectRemainingSec != null && (
                      <div className="hunter-select-timer">
                        <strong>{hunterSelectRemainingSec}</strong>
                        <small>ثانیه</small>
                      </div>
                    )}
                  </header>
                  <div className="hunter-select-cards">
                    {game.yourHand.map((c) => (
                      <figure key={c.instanceId} className="hunter-select-card">
                        <img src={cardUrl(c.slug)} alt={`${c.slug} ${c.displayRank}`} />
                      </figure>
                    ))}
                  </div>
                  <div className="hunter-select-options">
                    {REALMS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="hunter-select-option"
                        style={{ ["--realm" as string]: r.color, ["--glow" as string]: r.glow }}
                        onClick={() => selectHunterRealm(r.id)}
                      >
                        <RealmMark realm={r.id} size={36} />
                        <strong>{r.fa}</strong>
                        <small>قلمرو شکارچی</small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="hunter-select-wait glass-panel">
                  <RealmMark realm={game.playerRealms[game.hunterSelectorSeat ?? 0]} size={64} />
                  <h2 id="hunter-select-title">در انتظار انتخاب قلمرو شکارچی</h2>
                  <p>
                    صندلی {(game.hunterSelectorSeat ?? 0) + 1}
                    {game.controllers?.[game.hunterSelectorSeat ?? 0] === "bot" ? " (ربات)" : ""} در حال انتخاب است…
                  </p>
                  {hunterSelectRemainingSec != null && <small>حداکثر {hunterSelectRemainingSec} ثانیه</small>}
                </section>
              )}
            </div>
          </div>,
          document.body,
        )}

      {screen === "game" &&
        game &&
        seat !== null &&
        game.phase === "hand_complete" &&
        createPortal(
          <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="hand-result-title">
            <div className="result-dialog">
              <section className="result-panel glass-panel">
                <p className="result-kicker">پایان دست</p>
                <h2 id="hand-result-title">
                  {(game.lastHandWinnerTeam ?? null) === game.team ? "دست را بردید!" : "دست را واگذار کردید"}
                </h2>
                <p className="result-hero-line">
                  برنده دست:{" "}
                  <strong className="gold">
                    {(game.lastHandWinnerTeam ?? null) === game.team ? "تیم شما" : "تیم حریف"}
                  </strong>
                </p>
                <div className="result-score-grid">
                  <div className="result-score-card">
                    <span>امتیاز دست‌ها</span>
                    <strong>
                      {game.matchScore.teamHands[0]} – {game.matchScore.teamHands[1]}
                    </strong>
                    <small>تیم زوج / تیم فرد</small>
                  </div>
                  <div className="result-score-card">
                    <span>تریک‌های این دست</span>
                    <strong>
                      {game.handScore.teamTricks[0]} – {game.handScore.teamTricks[1]}
                    </strong>
                    <small>تریک‌های ثبت‌شده این دست</small>
                  </div>
                </div>
                <p className="result-countdown">
                  {resultSecondsLeft != null && resultSecondsLeft > 0
                    ? `ادامه خودکار تا ${resultSecondsLeft} ثانیه`
                    : "در حال شروع دست بعد…"}
                </p>
                <button type="button" className="mode-tile primary wide result-continue-btn" onClick={continueHand}>
                  <span className="mode-body">
                    <strong>ادامه بازی</strong>
                    <small>شروع دست بعدی</small>
                  </span>
                </button>
              </section>
            </div>
          </div>,
          document.body,
        )}

      {screen === "game" &&
        game &&
        seat !== null &&
        game.pendingSpecialDiscard &&
        createPortal(
          <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="discard-title">
            <div className="result-dialog">
              <section className="result-panel glass-panel">
                <p className="result-kicker">موجودی پر است</p>
                <h2 id="discard-title">یکی را دور بینداز</h2>
                <p>چهار مکمل دارید — یکی را انتخاب کنید تا دور انداخته شود.</p>
                <div className="discard-grid">
                  {(game.specialInventory ?? []).map((s) => (
                    <button
                      key={s.instanceId}
                      type="button"
                      className={`special-chip large slug-${s.slug} ${s.instanceId === game.pendingSpecialDiscard?.drawnInstanceId ? "new" : ""}`}
                      onClick={() => discardSpecial(s.instanceId)}
                    >
                      <strong>{s.fa}</strong>
                      <small>{s.shortFa}</small>
                      {s.instanceId === game.pendingSpecialDiscard?.drawnInstanceId && <em>تازه</em>}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>,
          document.body,
        )}

      {screen === "game" && game && seat !== null && (
        <main className="board-page">
          <header className="board-top glass-bar">
            <div className="board-brand">
              <LogoSeal size={34} />
              <div>
                <strong>کیمیای وحش</strong>
                <small>میدان ماه کامل · ۲ در ۲</small>
              </div>
            </div>
            <div className={`turn-badge ${game.currentPlayer === seat ? "yours" : ""}`}>
              {game.phase === "hunter_selection"
                ? "انتخاب قلمرو شکارچی…"
                : game.currentPlayer === seat
                  ? "نوبت شما"
                  : `نوبت صندلی ${game.currentPlayer + 1}`}
            </div>
            <div className="board-top-actions score-chips">
              <div
                className="you-chip"
                style={{
                  ["--realm" as string]: realmMeta(game.yourRealm)?.color ?? "#d7b56a",
                  ["--glow" as string]: realmMeta(game.yourRealm)?.glow ?? "transparent",
                }}
              >
                <span className="you-chip-avatar">
                  <RealmMark realm={game.yourRealm} size={28} />
                </span>
                <span className="you-chip-text">
                  <strong>شما</strong>
                  <small>{realmMeta(game.yourRealm)?.fa}</small>
                </span>
                <span className="you-chip-stat" title="تریک برده">
                  تریک {game.seatStats[seat]?.tricksWon ?? 0}
                </span>
                <span className="you-chip-stat" title="کارت در دست">
                  دست {game.yourHand.length}
                </span>
              </div>
              <span className="chip strong">
                دورها {game.matchScore.teamHands[0]} – {game.matchScore.teamHands[1]}
              </span>
              <span className="chip">
                تریک‌ها {game.handScore.teamTricks[0]} – {game.handScore.teamTricks[1]}
              </span>
            </div>
          </header>

          <div className="board-grid">
            <aside className="hud-left">
              <div className="hud-card glass-panel">
                <div className="hud-title">دورهای برده‌شده</div>
                <div className="team-score">
                  <div>
                    <span>تیم الف</span>
                    <strong>{game.matchScore.teamHands[0]}</strong>
                  </div>
                  <div>
                    <span>تیم ب</span>
                    <strong>{game.matchScore.teamHands[1]}</strong>
                  </div>
                </div>
              </div>
              <div className="hud-card glass-panel">
                <div className="hud-title">تریک این دور</div>
                <div className="team-score">
                  <div>
                    <span>تیم الف</span>
                    <strong>{game.handScore.teamTricks[0]}</strong>
                  </div>
                  <div>
                    <span>تیم ب</span>
                    <strong>{game.handScore.teamTricks[1]}</strong>
                  </div>
                </div>
              </div>
            </aside>

            <section className="arena-wrap">
              <div className="play-field opponents-only">
                {[0, 1, 2, 3]
                  .filter((i) => i !== seat)
                  .map((i) => {
                    const meta = realmMeta(game.playerRealms[i]);
                    const slot = relativeSlot(i, seat);
                    const isTurn = game.currentPlayer === i;
                    const handSize = game.opponentHandSizes?.[i] ?? 0;
                    const tricks = game.seatStats[i]?.tricksWon ?? 0;
                    const playerTeam = i % 2;
                    const relation = playerTeam === game.team ? "هم‌تیمی" : "حریف";
                    return (
                      <article
                        key={i}
                        className={`player-plaque compact slot-${slot} ${isTurn ? "turn" : ""}`}
                        style={{ ["--realm" as string]: meta?.color ?? "#aaa", ["--glow" as string]: meta?.glow ?? "transparent" }}
                      >
                        <div className="plaque-ornament" aria-hidden />
                        <div className="plaque-top">
                          <HandFanBacks count={handSize} />
                          <div className="plaque-avatar-wrap">
                            <div className="plaque-avatar-ring" />
                            <div className="plaque-avatar">
                              {meta ? <RealmMark realm={meta.id} size={40} /> : <IconUser size={24} />}
                            </div>
                            {isTurn && <span className="plaque-turn-dot" />}
                          </div>
                          <TrickStack count={tricks} label={`تریک برده: ${tricks}`} />
                        </div>
                        <div className="plaque-nameplate">
                          <strong className="plaque-name">
                            صندلی {i + 1}
                            {game.controllers?.[i] === "bot" ? <span className="plaque-bot">ربات</span> : null}
                          </strong>
                          <span className="plaque-realm">{meta ? meta.fa : "—"}</span>
                          <span className="plaque-rel">{relation}</span>
                        </div>
                      </article>
                    );
                  })}

                {/* local player's won-trick pile sits near the hand edge, not a full plaque */}
                <div className="self-trick-dock">
                  <TrickStack count={game.seatStats[seat]?.tricksWon ?? 0} label="تریک‌های شما" />
                </div>

                <div
                  className={`trick-stage ${
                    trickUi === "holding" || game.phase === "resolving_trick" ? "resolving" : ""
                  } ${collectAnim || trickUi === "collecting" ? "collecting" : ""}`}
                >
                  {collectAnim && seat !== null ? (
                    collectAnim.plays.map((p, idx) => {
                      const from = relativeSlot(p.seat, seat);
                      const to = relativeSlot(collectAnim.winnerSeat, seat);
                      const delta: Record<string, { x: number; y: number }> = {
                        north: { x: 0, y: -168 },
                        south: { x: 0, y: 168 },
                        east: { x: 168, y: 0 },
                        west: { x: -168, y: 0 },
                      };
                      const a = delta[from] ?? { x: 0, y: 0 };
                      const b = delta[to] ?? { x: 0, y: 0 };
                      return (
                        <figure
                          key={`collect-${p.seat}-${p.card.slug}`}
                          className={`played-card collect-fly slot-${from} to-${to}`}
                          style={{
                            animationDelay: `${idx * 70}ms`,
                            ["--dx" as string]: `${b.x - a.x}px`,
                            ["--dy" as string]: `${b.y - a.y}px`,
                          }}
                        >
                          <img src={cardBackUrl()} alt="" />
                        </figure>
                      );
                    })
                  ) : tablePlays?.length ? (
                    tablePlays.map((p) => {
                      const meta = realmMeta(p.card.suit);
                      const live = game.currentTrick?.plays.find((x) => x.seat === p.seat);
                      const resolved = game.trickPreview?.resolved?.find((x) => x.seat === p.seat);
                      const specs = live?.specials ?? [];
                      const fusion = game.trickPreview?.fusions?.find((f) => f.seats.includes(p.seat));
                      const showBeast = fusion?.showsFusionBeast && fusion.seats[0] === p.seat;
                      if (fusion?.showsFusionBeast && fusion.seats[1] === p.seat) {
                        return null;
                      }
                      if (showBeast && fusion) {
                        const a = tablePlays.find((x) => x.seat === fusion.seats[0]);
                        const b = tablePlays.find((x) => x.seat === fusion.seats[1]);
                        return (
                          <figure
                            key={`fusion-${fusion.seats.join("-")}`}
                            className={`played-card fusion-beast arrive slot-${relativeSlot(p.seat, seat)}`}
                            style={{
                              ["--realm" as string]: realmMeta(fusion.effectiveSuit)?.color ?? "#888",
                              ["--glow" as string]: realmMeta(fusion.effectiveSuit)?.glow ?? "transparent",
                            }}
                          >
                            <div className="fusion-beast-art">
                              {a && <img src={cardUrl(a.card.slug)} alt="" />}
                              {b && <img src={cardUrl(b.card.slug)} alt="" />}
                            </div>
                            <figcaption className="fusion-beast-cap">
                              <strong>هیولای ترکیبی</strong>
                              <span>قدرت {fusion.fusionPower}</span>
                              <small>{realmMeta(fusion.effectiveSuit)?.fa}</small>
                            </figcaption>
                          </figure>
                        );
                      }
                      return (
                        <figure
                          key={`${p.seat}-${p.card.slug}`}
                          className={`played-card arrive slot-${relativeSlot(p.seat, seat)} ${resolved?.destroyedByArmageddon ? "destroyed" : ""} ${specs.includes("doping") ? "fx-doping" : ""} ${specs.includes("trap") ? "fx-trap" : ""} ${game.trickPreview?.inversionActive ? "fx-inversion" : ""} ${fusion && !fusion.showsFusionBeast ? "fx-bond" : ""}`}
                          style={{
                            ["--realm" as string]: meta?.color ?? "#888",
                            ["--glow" as string]: meta?.glow ?? "transparent",
                          }}
                          title={
                            resolved
                              ? `پایه ${resolved.baseRank} → نهایی ${resolved.effectivePower}`
                              : undefined
                          }
                        >
                          <img src={cardUrl(p.card.slug)} alt={`${p.card.slug} ${p.card.displayRank}`} />
                          {resolved && (
                            <span className="eff-power">
                              {resolved.destroyedByArmageddon ? "نابود" : resolved.effectivePower}
                            </span>
                          )}
                          {specs.length > 0 && (
                            <span className="played-specs">
                              {specs.map((s) => SPECIAL_FA[s]?.fa ?? s).join(" · ")}
                            </span>
                          )}
                          {fusion && !fusion.showsFusionBeast && fusion.seats[0] === p.seat && (
                            <span className="bond-badge">همتازی {fusion.fusionPower}</span>
                          )}
                        </figure>
                      );
                    })
                  ) : (
                    <p className="waiting">منتظر بازی کارت…</p>
                  )}
                  {trickUi === "holding" && !collectAnim && (
                    <div className="resolve-banner">کارت‌ها روی میز…</div>
                  )}
                  {flyCard && !collectAnim && (
                    <div key={flyCard.key} className={`fly-ghost slot-${flyCard.slot}`} aria-hidden>
                      <img src={cardUrl(flyCard.slug)} alt="" />
                    </div>
                  )}
                </div>                {hunterFlash && (
                  <div className="hunter-burst" style={{ ["--realm" as string]: realmMeta(hunterFlash)?.color ?? "#d7b56a" }}>
                    <RealmMark realm={hunterFlash} size={120} />
                    <strong>{realmMeta(hunterFlash)?.fa}</strong>
                    <span>قلمرو شکارچی</span>
                  </div>
                )}
              </div>
            </section>

            <aside className="hud-right">
              <div
                className="hud-card glass-panel hunter"
                style={{
                  ["--realm" as string]: realmMeta(game.hunterRealm)?.color ?? "#d4b05a",
                  ["--glow" as string]: realmMeta(game.hunterRealm)?.glow ?? "rgba(212,176,90,.4)",
                }}
              >
                <div className="hud-title">قلمرو شکارچی</div>
                <div className="hunter-face">
                  {game.hunterRealm ? <RealmMark realm={game.hunterRealm} size={56} /> : <IconMoon size={32} />}
                </div>
                <strong>{realmMeta(game.hunterRealm)?.fa ?? "—"}</strong>
                <p>ثابت برای تمام تریک‌های این دور · جدا از قلمرو نمایندهٔ شما</p>
              </div>
              <div className="hud-card glass-panel">
                <div className="hud-title">امتیاز اثرگذاری · MVP</div>
                <ul className="impact-list">
                  {[...game.playerRealms.map((r, i) => ({ r, i, score: game.seatStats[i]?.impactScore ?? 0 }))]
                    .sort((a, b) => b.score - a.score)
                    .map((row, rank) => (
                      <li key={row.i}>
                        <span className="rank-num">{rank + 1}</span>
                        <span className="impact-name">
                          <RealmMark realm={row.r} size={18} />
                          صندلی {row.i + 1}
                          {game.controllers?.[row.i] === "bot" ? " · ربات" : ""}
                        </span>
                        <strong>{row.score}</strong>
                      </li>
                    ))}
                </ul>
              </div>
            </aside>
          </div>

          <footer className="hand-bar glass-panel">
            {game.specialCardsEnabled && (
              <div className="specials-rail">
                <div className="specials-rail-head">
                  <strong>مکمل‌ها</strong>
                  <small>
                    {(game.specialInventory ?? game.yourSpecials ?? []).length}/
                    {game.specialMaxInventory ?? 3}
                  </small>
                  {game.currentPlayer === seat && !game.pendingSpecialDiscard && (
                    <button
                      type="button"
                      className="ghost-btn special-draw-btn"
                      disabled={!game.canRequestSpecialDraw}
                      onClick={requestSpecialDraw}
                    >
                      امتحان شانس برای کارت مکمل
                    </button>
                  )}
                  {drawFlash && <span className="draw-flash">{drawFlash}</span>}
                  {game.specialDrawAttemptedThisTurn && !game.canRequestSpecialDraw && (
                    <span className="hint">شانس این نوبت استفاده شد</span>
                  )}
                </div>
                <div className="specials-row">
                  {(game.specialInventory ?? []).map((s) => {
                    const on = selectedSpecials.includes(s.instanceId);
                    return (
                      <button
                        key={s.instanceId}
                        type="button"
                        className={`special-chip slug-${s.slug} ${on ? "selected" : ""}`}
                        onClick={() => toggleSpecial(s.instanceId)}
                        disabled={game.currentPlayer !== seat || Boolean(game.pendingSpecialDiscard)}
                      >
                        <strong>{s.fa}</strong>
                        <small>{s.shortFa}</small>
                      </button>
                    );
                  })}
                  {(game.specialInventory ?? []).length === 0 && (
                    <span className="hint">هنوز مکملی ندارید</span>
                  )}
                </div>
              </div>
            )}
            {game.trickPreview?.inversionActive && (
              <div className="trick-status curse">نفرین وارونگی فعال است</div>
            )}
            {game.trickPreview?.inversionCancelled && (
              <div className="trick-status cancel">وارونگی با A روی Lead لغو شد</div>
            )}
            {game.trickPreview?.resolved?.some((r) => r.destroyedByArmageddon) && (
              <div className="trick-status arma">آرماگدون فعال است — کارت A تیم مقابل نابود می‌شود</div>
            )}
            {game.trickPreview?.huntCommand && (
              <div className="trick-status hunt">
                {game.trickPreview.huntCommand.succeeded
                  ? "فرمان شکار موفق شد"
                  : game.currentTrick && game.currentTrick.plays.length >= 4
                    ? `فرمان شکار شکست خورد${game.trickPreview.huntCommand.failReason ? ` (${game.trickPreview.huntCommand.failReason})` : ""}`
                    : "فرمان شکار در انتظار…"}
              </div>
            )}
            <div className="hand-fan" style={{ ["--n" as string]: game.yourHand.length }}>
              {game.yourHand.map((c, idx) => {
                const legal = game.legalCardIds.includes(c.instanceId);
                const isTurn = game.currentPlayer === seat;
                const meta = realmMeta(c.suit);
                const selected = selectedCard === c.instanceId;
                const revealed = !dealing || idx < dealVisible;
                return (
                  <button
                    key={c.instanceId}
                    type="button"
                    className={`hand-card ${legal && isTurn ? "legal" : ""} ${selected ? "selected" : ""} ${revealed ? "dealt" : "undealt"}`}
                    style={{
                      ["--realm" as string]: meta?.color ?? "#666",
                      ["--glow" as string]: meta?.glow ?? "transparent",
                      ["--i" as string]: idx,
                      ["--n" as string]: game.yourHand.length,
                      animationDelay: `${idx * 40}ms`,
                    }}
                    disabled={!legal || !isTurn || dealing || !revealed}
                    onClick={() => onHandCardClick(c.instanceId)}
                    aria-label={`${c.slug} رتبه ${c.displayRank}`}
                  >
                    <img src={cardUrl(c.slug)} alt={`${c.slug} ${c.displayRank}`} loading="lazy" />
                  </button>
                );
              })}
            </div>
            <div className="hand-actions">
              <p className="hand-hint">یک‌بار انتخاب · بار دوم بازی</p>
              <button type="button" className="ghost-btn" onClick={() => setSelectedCard(null)}>
                لغو انتخاب
              </button>
              <button
                type="button"
                className="play-btn"
                disabled={!selectedCard || game.currentPlayer !== seat || !game.legalCardIds.includes(selectedCard) || dealing}
                onClick={playSelected}
              >
                بازی کردن کارت
              </button>
            </div>
          </footer>
        </main>
      )}

      {screen === "results" && (
        <main className="panel-page">
          <section className="panel-card glass-panel results result-panel-final">
            <p className="result-kicker">پایان نبرد</p>
            <h2>
              {(matchResult?.winningTeamId ?? game?.matchWinnerTeam) === game?.team
                ? "پیروزی شما!"
                : "شکست در نبرد"}
            </h2>
            {(matchResult || game) && (
              <>
                {(() => {
                  const winner = matchResult?.winningTeamId ?? game?.matchWinnerTeam;
                  const hands =
                    matchResult?.matchScore?.teamHands ?? game?.matchScore.teamHands ?? ([0, 0] as [number, number]);
                  const mvp = new Set(matchResult?.mvpParticipantIds ?? game?.mvpParticipantIds ?? []);
                  const rows =
                    matchResult?.participants?.length
                      ? matchResult.participants
                      : (game?.seatStats ?? []).map((s, i) => ({
                          participantId: `seat-${i}`,
                          seat: i,
                          teamId: i % 2,
                          realm: game!.playerRealms[i],
                          controllerType: game!.controllers?.[i] ?? "human",
                          displayName: lobby?.seats[i]?.displayName,
                          tricksWon: s.tricksWon,
                          impactScore: s.impactScore,
                        }));
                  const teamLabel = (teamId: number) =>
                    teamId === game?.team ? "تیم شما" : "تیم حریف";
                  const nameOf = (p: (typeof rows)[number]) =>
                    p.displayName ||
                    lobby?.seats[p.seat]?.displayName ||
                    (p.controllerType === "bot" ? `ربات ${p.seat + 1}` : `بازیکن ${p.seat + 1}`);

                  return (
                    <>
                      <div className="match-final-score">
                        <div className={`match-final-side ${winner === 0 ? "won" : ""}`}>
                          <span>{teamLabel(0)}</span>
                          <strong>{hands[0]}</strong>
                        </div>
                        <div className="match-final-vs">در برابر</div>
                        <div className={`match-final-side ${winner === 1 ? "won" : ""}`}>
                          <span>{teamLabel(1)}</span>
                          <strong>{hands[1]}</strong>
                        </div>
                      </div>

                      <div className="match-teams">
                        {[0, 1].map((teamId) => {
                          const members = rows.filter((p) => p.teamId === teamId);
                          const isWinner = winner === teamId;
                          return (
                            <section
                              key={teamId}
                              className={`match-team-card ${isWinner ? "winner" : "loser"}`}
                            >
                              <header className="match-team-head">
                                <div>
                                  <p className="result-kicker">{isWinner ? "برنده" : "بازنده"}</p>
                                  <h3>{teamLabel(teamId)}</h3>
                                </div>
                                <strong className="match-team-hands">{hands[teamId as 0 | 1]} دست</strong>
                              </header>
                              <ul className="match-roster">
                                {members.map((p) => {
                                  const meta = realmMeta(p.realm);
                                  const isMvp = mvp.has(p.participantId);
                                  return (
                                    <li
                                      key={p.participantId}
                                      className={`match-player ${isMvp ? "mvp" : ""} ${p.seat === seat ? "you" : ""}`}
                                      style={
                                        meta
                                          ? {
                                              ["--realm" as string]: meta.color,
                                              ["--glow" as string]: meta.glow,
                                            }
                                          : undefined
                                      }
                                    >
                                      <div className="match-player-art">
                                        <img
                                          src={cardUrl(meta?.sample.slug ?? "lion")}
                                          alt=""
                                          className="match-player-card"
                                        />
                                        <span className="match-player-mark">
                                          {meta ? <RealmMark realm={meta.id} size={28} /> : <IconUser size={24} />}
                                        </span>
                                      </div>
                                      <div className="match-player-meta">
                                        <strong>
                                          {nameOf(p)}
                                          {p.seat === seat ? " · شما" : ""}
                                          {p.controllerType === "bot" ? " · ربات" : ""}
                                        </strong>
                                        <small>
                                          {meta?.fa ?? "قلمرو"} · صندلی {p.seat + 1}
                                        </small>
                                        <div className="match-player-stats">
                                          <span>{p.tricksWon} تریک</span>
                                          <span>{p.impactScore} اثر</span>
                                        </div>
                                        {isMvp && (
                                          <em className="match-mvp-badge">
                                            <IconStar size={14} /> مؤثرترین بازیکن
                                          </em>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </section>
                          );
                        })}
                      </div>

                      {matchResult?.hasBots && (
                        <p className="hint">مسابقه با ربات ({matchResult.botSeatCount} بات)</p>
                      )}
                      <p className="result-stay-hint">نتیجه تا وقتی خودتان ببندید روی صفحه می‌ماند.</p>
                    </>
                  );
                })()}
              </>
            )}
            <button type="button" className="mode-tile primary wide" onClick={() => window.location.reload()}>
              <span className="mode-body">
                <strong>بستن و بازگشت به منو</strong>
                <small>با تأیید شما بسته می‌شود</small>
              </span>
            </button>
          </section>
        </main>
      )}
    </div>
  );
}
