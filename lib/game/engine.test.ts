import { describe, expect, it } from "vitest";
import { addBot, advancePhase, applyFallback, freshRoom, missingTopics, pauseGame, scoreRound, setCap, setDebug, startGame, submitVote, submitWrite, tick, twisterSeat } from "./engine";
import type { RoomState } from "./types";

function base(cap = 3): RoomState {
  return freshRoom({
    code: "TEST",
    hostToken: "host",
    cap,
    demo: false,
    lineup: "classic",
    seed: 1,
    now: 0,
  });
}

function withPlayers(state: RoomState): RoomState {
  const names = ["Оля", "Макс", "Ира"];
  return {
    ...state,
    players: names.slice(0, state.cap).map((name, index) => ({
      id: `p${index}`,
      token: `t${index}`,
      name,
      color: "#fff",
      bot: false,
      host: index === 0,
      joinedAt: index,
    })),
  };
}

function ready(state: RoomState): RoomState {
  const filled = applyFallback(withPlayers(state));
  return {
    ...filled,
    cards: filled.cards.map((card) => (card.kind === "instagram" ? { ...card, photos: [] } : card)),
  };
}

describe("deck", () => {
  it("fills every seat in the lineup and only adds the new seats when the cap grows", () => {
    const room = applyFallback(base(3));
    expect(missingTopics(room)).toHaveLength(0);
    const bigger = setCap(room, 4);
    const missing = missingTopics(bigger);
    expect(missing).toHaveLength(room.playlist.length);
    expect(missing.every((slot) => slot.seat === 3)).toBe(true);
  });
});

describe("pairing", () => {
  it("never lets a player twist their own line", () => {
    for (let count = 3; count <= 8; count += 1) {
      for (let seat = 0; seat < count; seat += 1) {
        expect(twisterSeat(seat, count)).not.toBe(seat);
      }
    }
  });
});

describe("scoring", () => {
  it("pays the twister 100 a vote, adds 200 for a clear win, and doubles the finale", () => {
    let state = startGame(ready(base()), 0);
    const kind = state.playlist[0];
    state = {
      ...state,
      twists: [0, 1, 2].map((seat) => ({
        round: 0,
        seat,
        twisterId: state.seats[twisterSeat(seat, 3)],
        text: `подкол ${seat}`,
      })),
      submissions: [0, 1, 2].map((seat) => ({
        round: 0,
        seat,
        authorId: state.seats[seat],
        text: kind === "instagram" ? "" : `фраза ${seat}`,
        photo: null,
      })),
      votes: [
        { round: 0, voterId: state.seats[0], seat: 1 },
        { round: 0, voterId: state.seats[1], seat: 1 },
        { round: 0, voterId: state.seats[2], seat: 0 },
      ],
    };
    const regular = scoreRound(state);
    expect(regular.find((event) => event.playerId === state.seats[twisterSeat(1, 3)])?.delta).toBe(400);
    expect(regular.find((event) => event.playerId === state.seats[twisterSeat(0, 3)])?.delta).toBe(100);

    const finale = scoreRound({ ...state, round: state.playlist.length - 1, votes: state.votes.map((vote) => ({ ...vote, round: state.playlist.length - 1 })), twists: state.twists.map((twist) => ({ ...twist, round: state.playlist.length - 1 })), submissions: state.submissions.map((item) => ({ ...item, round: state.playlist.length - 1 })) });
    expect(finale.find((event) => event.playerId === state.seats[twisterSeat(1, 3)])?.delta).toBe(800);
    expect(finale[0].reason).toContain("финал ×2");
  });

  it("does not pay a best-burn bonus on a tie", () => {
    let state = startGame(ready(base()), 0);
    state = {
      ...state,
      submissions: [0, 1, 2].map((seat) => ({ round: 0, seat, authorId: state.seats[seat], text: "фраза", photo: null })),
      twists: [0, 1, 2].map((seat) => ({ round: 0, seat, twisterId: state.seats[twisterSeat(seat, 3)], text: "подкол" })),
      votes: [
        { round: 0, voterId: state.seats[0], seat: 1 },
        { round: 0, voterId: state.seats[1], seat: 2 },
        { round: 0, voterId: state.seats[2], seat: 1 },
      ],
    };
    const events = scoreRound({
      ...state,
      votes: [
        { round: 0, voterId: state.seats[0], seat: 1 },
        { round: 0, voterId: state.seats[2], seat: 2 },
      ],
    });
    expect(events.map((event) => event.delta).sort()).toEqual([100, 100]);
    expect(events.every((event) => !event.reason.includes("лучший"))).toBe(true);
  });
});

describe("debug pause", () => {
  it("holds the phase until the host steps, and keeps the pause on the next phase", () => {
    let state = setDebug(startGame(ready(base()), 0), true, 0);
    expect(tick(state, 999999).phase).toBe("write");
    state = pauseGame(state, 1000);
    expect(tick(state, 999999).paused).toBe(true);
    state = advancePhase(state, 1000);
    expect(state.phase).toBe("twist");
    expect(state.paused).toBe(true);
    expect(state.deadline).toBeNull();
  });

  it("adds a bot only before the start of a debug room", () => {
    const lobby = setCap(setDebug(ready(base()), true, 0), 4);
    const withBot = addBot(lobby, 10);
    expect(withBot.players.some((player) => player.bot)).toBe(true);
    expect(() => addBot({ ...withBot, phase: "write", status: "playing" }, 30)).toThrow(/до старта/);
  });
});

describe("votes", () => {
  it("rejects a vote for your own twist", () => {
    let state = startGame(ready(base()), 0);
    for (const id of state.seats) state = submitWrite(state, id, "нормальная фраза", null, 1000);
    expect(state.phase).toBe("twist");
    for (const id of state.seats) {
      const seat = state.seats.indexOf(id);
      const source = (seat - 1 + 3) % 3;
      state = {
        ...state,
        twists: [...state.twists.filter((twist) => twist.seat !== source), { round: state.round, seat: source, twisterId: id, text: "стыдно" }],
      };
    }
    let guard = 0;
    while (state.phase === "twist" || state.phase === "reveal") {
      state = tick(state, (state.deadline ?? 0) + 1);
      guard += 1;
      if (guard > 10) break;
    }
    expect(state.phase).toBe("vote");
    const voter = state.seats[1];
    const own = (1 - 1 + 3) % 3;
    expect(() => submitVote(state, voter, own, state.deadline ?? 0)).toThrow(/свой подкол/);
  });
});
