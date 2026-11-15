export const ROUND_KINDS = [
  "messenger",
  "thread",
  "job",
  "market",
  "search",
  "review",
  "video",
  "ai",
  "instagram",
] as const;

export type RoundKind = (typeof ROUND_KINDS)[number];

export type LineupId = "classic" | "browsing";

export type Phase = "lobby" | "write" | "twist" | "reveal" | "vote" | "scores" | "done";

export type MessengerSkin = "telegram" | "whatsapp" | "viber";
export type JobSkin = "workua" | "linkedin" | "indeed";
export type MarketSkin = "olx" | "amazon";
export type ThreadSkin = "threads" | "x";

export type Skins = {
  messenger: MessengerSkin;
  job: JobSkin;
  market: MarketSkin;
  thread: ThreadSkin;
};

export type Photo = {
  url: string;
  thumb: string;
  author: string;
  license: string;
  page: string;
};

export type Card = {
  kind: RoundKind;
  seat: number;
  topic: string;
  query: string;
  photos: Photo[] | null;
  photoError: boolean;
};

export type Player = {
  id: string;
  token: string;
  name: string;
  color: string;
  bot: boolean;
  host: boolean;
  joinedAt: number;
};

export type Submission = {
  round: number;
  seat: number;
  authorId: string;
  text: string;
  photo: number | null;
};

export type Twist = {
  round: number;
  seat: number;
  twisterId: string;
  text: string;
};

export type Vote = {
  round: number;
  voterId: string;
  seat: number;
};

export type ScoreEvent = {
  round: number;
  playerId: string;
  delta: number;
  reason: string;
};

export type RoomState = {
  code: string;
  demo: boolean;
  cap: number;
  lineup: LineupId;
  seed: number;
  hostToken: string;
  createdAt: number;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  phase: Phase;
  round: number;
  playlist: RoundKind[];
  cards: Card[];
  submissions: Submission[];
  twists: Twist[];
  votes: Vote[];
  scores: Record<string, number>;
  log: ScoreEvent[];
  reveal: number;
  deadline: number | null;
  seats: string[];
  deckLock: number | null;
  promptSource: "model" | "backup" | null;
};

export type ShownCard = {
  seat: number;
  kind: RoundKind;
  authorName: string;
  authorColor: string;
  twisterName: string;
  write: string;
  twist: string;
  photo: Photo | null;
  topic: string;
  votable: boolean;
  votes: number;
};

export type PlayerTask =
  | {
      phase: "write";
      kind: RoundKind;
      topic: string;
      photos: Photo[];
      max: number;
    }
  | {
      phase: "twist";
      kind: RoundKind;
      hint: string;
      sourceText: string;
      sourceName: string;
      photo: Photo | null;
      max: number;
    }
  | {
      phase: "vote";
      options: Array<ShownCard & { mine: boolean; selected: boolean }>;
    };

export type ClientView = {
  version: number;
  serverNow: number;
  code: string;
  demo: boolean;
  cap: number;
  lineup: LineupId;
  skins: Skins;
  status: RoomState["status"];
  phase: Phase;
  round: number;
  roundCount: number;
  kind: RoundKind | null;
  playlist: RoundKind[];
  deadline: number | null;
  players: Array<{ id: string; name: string; color: string; bot: boolean; host: boolean; score: number }>;
  seatsReady: string[];
  deck: { ready: boolean; done: number; total: number; label: string; source: RoomState["promptSource"] };
  spotlight: ShownCard | null;
  ballot: ShownCard[];
  scoreboard: Array<{ id: string; name: string; color: string; total: number; delta: number; reason: string }>;
  winners: string[];
  you: {
    id: string;
    name: string;
    host: boolean;
    seat: number;
    task: PlayerTask | null;
  } | null;
  isHost: boolean;
  joinPath: string;
};
