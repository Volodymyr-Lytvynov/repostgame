# Digital Footprint

A browser party game. Phones play, a shared screen can show the room, and the server keeps the clock.

Players reply, leak a chat, explain a scandal, or write half of a meme. The room votes with likes. The model writes the setups once, before play, and then stays quiet.

## How to play

1. Create a room for 4 to 8 people.
2. Open the screen on a TV, or stay on one phone.
3. Everyone joins with a nickname. The host picks the language (English or Russian), the intensity, what to leave out, and the playlist.
4. Start. The server freezes the roster, asks the model once, and looks up avatars.
5. Play 2 to 5 rounds. Doomscroll is just the order of RATIO, Leaked DMs, Explain Yourself, and Sabotage.

A sample room seats four bots and starts on its own.

## Rules

Likes are the only score. People vote. The model never judges.

- RATIO and Explain Yourself: two players answer the same setup. A 1,000-like pool splits by the votes. One lonely answer gets 500. Matching answers score nothing.
- Leaked DMs: an ordinary answer, then someone else writes the message that makes it worse. Each vote pays 800 to the setup and 200 to the answer. A missing partner does not get the other share.
- Sabotage: two halves, joined by a template. Each vote pays 500 and 500, with the same missing-partner rule.
- The final-round doubler exists and is off unless the host turns it on.

Badges are cosmetic. Favorites at the end do not change the score. The gallery is fictional and lives only as long as the room.

## Content

One model call per match, with no retry. A bad response is filled from the bundled text bank, so the room can still play.

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional)
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)

Avatars come from Openverse only, at most six grouped searches. There is no saved image library. A failed lookup becomes a colored initials circle. The game is playable with no image provider and no model key.

## Run

```bash
npm install
npm run dev
```

The site listens on port 4179. Rules tests: `npm test`.

Published rooms live in Postgres. Locally, without `DATABASE_URL`, the process keeps them in memory and they disappear on restart.
