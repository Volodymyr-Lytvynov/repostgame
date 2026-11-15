# DIGITAL FOOTPRINT
## Game Design Document — v0.3

**Tagline:** Everything you post will age poorly.  
**Product:** Browser-based adult multiplayer comedy party game.  
**Core promise:** Give players something to react to, and let them make it worse.

**Status:** Proposed design, not playtested. This revision simplifies live per-session asset discovery to one image-search provider, grouped queries, compact AI output and a dependency-free local fallback. No permanent asset library. The examples below are original fictional content and editorial references, not a required runtime prompt bank. Avatar descriptions are search/visual briefs, not verified or bundled images.

## 1. Product concept

Digital Footprint is a fictional, dysfunctional internet populated by newly generated accounts, fake brands and chronically online personalities. Players compete to produce the funniest replies, out-of-context messages, excuses and accidental memes.

- 4–8 players; private room code; mobile browser controllers and optional shared desktop display.
- 2–5 rounds (default 3); target 10–25 minutes, subject to testing.
- Adult, post-ironic, dark, dirty and absurd internet humor; social satire and deadpan delivery rather than constant shock value.
- Every player receives a contextual starting point. No task should simply be “write something funny.”
- Exactly one model generation request at initialization and **zero model calls during play**. Ordinary image-search/download requests are separate; use one image-search provider only, with a small query budget. No AI retry: use bundled fallback text if needed.
- No permanent image collection, recurring-account database or need to ship a static media pack. Every match creates its own fictional cast. Reuse an account within that match for continuity, not across matches by default.

## 2. Game modes

### 2.1 RATIO — flagship mode

*Be the reason someone disables their comments.*

Two players independently reply to the same pre-generated fictional Twitter/Threads-style post. Other players vote for the funnier reply. Twitter is a presentation model, not a live integration; no real content is posted.

1. Generate N posts in a round with N players. Assign each post to two distinct players and two posts to each player.
2. Players write short replies simultaneously (60 seconds total for both; 280 characters each).
3. Reveal one post and two anonymous replies at a time. Give non-authors 15 seconds to vote by liking one reply; abstaining is allowed.
4. Reveal the authors, vote counts, actual earned likes and special events after voting closes.
5. Move to the next matchup, then show the round leaderboard.

Post cards display a fictional name, @handle, avatar, optional fictional verification and engagement, post text and optional attachment. Actual ballots and scores must be visually distinct from fictional likes/views. Instagram, Reddit and corporate social posts can later be skins for the same reply mechanic; do not create a new mode for each platform.

**Example A — financial guru**

> 🥂 **Andrew Capital ✓** · @escapedthematrix · 4h  
> Avatar brief: stylized fictional entrepreneur illustration, not a real person.  
> At 24, I bought my first house.  
> No university. No 9–5. No excuses.
>
> **Reply A:** Bro's biggest financial decision was being born.  
> **Reply B:** Sorry about your dad passing.

**Example B — funeral business**

> ⚰️ **Peaceful Departures™ ✓** · @peacefuldepartures · 6h  
> Avatar brief: generic coffin icon or black-and-gold illustration.  
> We're excited to announce our new loyalty program for returning customers!
>
> **Reply A:** My family is currently on a 3 kill streak.  
> **Reply B:** Do the points expire or do we?

**Example C — anonymous shitposter**

> 🐈 **industrial grade disappointment** · @sexual_taxpayer · 3h  
> Avatar brief: deeply fried orange-cat close-up.  
> does anyone else feel sexually attracted to the concept of affordable housing
>
> **Reply A:** Yeah but it's unrealistic beauty standards at this point.  
> **Reply B:** Landlords invented edging.

**Example D — religion parody**

> ⛪ **Sunday Service HQ ✓** · @sundayservicehq · 1h  
> Avatar brief: church exterior or generic stained-glass illustration.  
> What is stopping you from accepting Jesus into your life?
>
> **Reply A:** Already in three parasocial relationships.  
> **Reply B:** I don't want another man who comes once and disappears.

**Example E — wellness influencer**

> 🌿 **Emily** · @healing.with.emily · 2h  
> Avatar brief: fictional wellness avatar with flowers and pastel tones.  
> Finally removed all the toxic people from my life. Protect your energy. ✨
>
> **Reply A:** Court-ordered healing journey.  
> **Reply B:** The children are with their father now.

**Example F — relationship shitposting**

> 🗿 **divorced at birth** · @emotional_liability · 8h  
> Avatar brief: distorted public-domain painting of a gloomy aristocrat.  
> being someone's emergency contact while actively ruining their life is crazy
>
> **Reply A:** full stack relationship  
> **Reply B:** Creating your own job security.

**Example G — corporate oversharing**

> 💊 **Side Effects Inc. ✓** · @sideeffectsenjoyer · 1h  
> Avatar brief: generic blue healthcare icon.  
> If our antidepressants actually worked, you wouldn't need to buy more. Think about it. 💙
>
> **Reply A:** Finally a subscription service with emotional retention.  
> **Reply B:** customer lifetime value doing a lot of heavy lifting here

### 2.2 LEAKED DMs

*Anything you say can and will be used against you.*

Players answer an innocent question, then another player manufactures the incoming message that makes that unchanged answer embarrassing.

1. Each player receives one ordinary question and answers within 30 seconds.
2. The server distributes answers in a one-to-one derangement (nobody receives their own answer). Each context writer receives an assigned fictional sender, but not the original question.
3. Each writes a preceding message within 45 seconds. The original answer cannot be edited.
4. Show completed conversations before voting. Each player votes once for the funniest eligible conversation, excluding both entries they contributed to.
5. Reveal original questions and contributor identities; award 80% of points to the incoming-message writer and 20% to the source author.

**Example A — Dad**

> Original question: Why do you watch cooking tutorials?  
> Original answer: I wanted to see how the professionals do it.
>
> **Dad · 02:41:** Why did I find my credit card on OnlyFans?  
> **You · 02:42:** I wanted to see how the professionals do it. ✓✓

**Example B — therapist**

> Original question: Why haven't you cancelled your Netflix subscription?  
> Original answer: The free trial hasn't expired yet.
>
> **Therapist:** Why are you still texting your ex?  
> **You:** The free trial hasn't expired yet. ✓✓

**Example C — Mom**

> Original question: Why did you go to the cinema?  
> Original answer: It was free and I didn't want to go alone.
>
> **Mom:** Did you seriously bring your situationship to grandma's funeral?  
> **You:** It was free and I didn't want to go alone. ✓✓

**Example D — IKEA / relationships**

> Original question: What do you like about IKEA?  
> **Therapist:** Can you describe your approach to relationships?  
> **You:** You can replace whatever you break.

Other ordinary inputs: why you use incognito mode, what you like about public transport, why you shop online, how you choose a hotel. Sender roles: Mom, Dad, ex, HR, landlord, therapist, Tinder match, priest, customer support or an invented account from this session. Do not impersonate real people or expose actual messages.

### 2.3 EXPLAIN YOURSELF

*It's not what it looks like.*

Players receive a fictional accusation or scandal and compete to justify it. Mechanically reuses RATIO's head-to-head engine but changes the role from commentator to defendant/spokesperson.

1. Assign each scenario to two players, two scenarios per player.
2. Players write independently in 60 seconds.
3. Reveal one scenario and two explanations; other players vote for 15 seconds.
4. Reveal authors and points.

**Example A — HR email**

> **From:** Human Resources ❤️  
> **Subject:** Reference check  
> We've noticed that you have been listing your ex-girlfriend as a professional reference. Could you explain?
>
> **A:** She has extensive experience with my shortcomings.  
> **B:** You asked for someone who's seen me perform under pressure.

**Example B — public relations**

> BREAKING NEWS: Local orphanage introduces a battle pass.  
> Task: Write the official statement.
>
> **A:** We apologize to everyone affected by the Season 2 adoption nerf.  
> **B:** We remain committed to a free-to-orphan experience.

**Example C — relationship**

> Your girlfriend found out that you have her saved in your contacts as “Early Access.” Explain yourself.
>
> **A:** Marriage is the full release.  
> **B:** I'm still waiting for controller support.

**Example D — office investigation**

> Attachment brief: office desk buried under empty energy drink cans.  
> **HR:** We've noticed that your daily caffeine consumption exceeds your productivity. Please explain.
>
> **A:** I'm overclocking hardware that should've been discontinued.  
> **B:** The company doesn't provide cocaine as a benefit.

Other formats: fictional customer service, apology letters, absurd receipts, police interview parodies, suspicious photographs. If an optional attachment fails to resolve, the scenario must still make sense as text, or be replaced before play.

### 2.4 SABOTAGE

*Two brain cells working independently.*

Two players create separate fragments of a single meme or advertisement with different contextual tasks. Neither sees the other's fragment until the reveal.

1. Generate N two-slot templates. Each player receives two fragment tasks, from different templates.
2. Players submit both independently within 45 seconds.
3. Combine each pair deterministically according to its template; never use AI to rewrite answers.
4. Reveal all finished memes; each player casts one vote for an eligible entry they did not contribute to.
5. Split points equally between both contributors.

**Example A — motivational poster**

> A's task: Finish this motivational thought: “The best things in life…”  
> A: The best things in life are worth waiting for.  
> B's task: Name a source of passive income.  
> B: Grandma's inheritance.
>
> **Final poster:** The best things in life are worth waiting for. — Grandma's inheritance
>
> Background brief: sunrise over mountains, triumphant silhouette.

**Example B — inspirational career advice**

> A's task: Complete a piece of relationship advice: “Never give up on…”  
> A: Never give up on the people you love.  
> B's task: Name a profession.  
> B: Debt collector.
>
> **Final poster:** Never give up on the people you love. — Debt collector

**Example C — luxury ad**

> A's task: Name a ridiculous luxury bedroom item.  
> A: A $900 weighted blanket.  
> B's task: Write a slogan for a funeral home.  
> B: Finally, a reason to stay in bed forever.
>
> **Final ad:** Introducing the $900 weighted blanket. Finally, a reason to stay in bed forever.

Templates can also render headlines/subtitles, brands/slogans, dating bios or fictional awards. Use slot-specific grammar and example-free player inputs. All fragments must have a concrete instruction; no generic “write something funny.”

### 2.5 DOOMSCROLL

A playlist, not a fifth mechanic. Select an ordered mix of rounds from the four modes and generate the required content for all of them before the match. For a four-round example: RATIO → Leaked DMs → Sabotage → Explain Yourself. Keep cumulative likes. Later variants (Community Notes, This You?, Search History) are ideas, not MVP requirements.

## 3. Fresh fictional accounts per session

Generate display name, unique session handle, optional fictional verification, avatar image-group reference and posts. Personality and writing style should be evident in the posts; do not return separate biographies or personality metadata unless needed by gameplay. Approximately 10–18 accounts for a six-player session, depending on rounds; not a fixed constraint. The same account must keep its avatar and identity throughout the match. New game = new cast by default.

| Display name / handle | Avatar sourcing brief | Sample generated post |
| --- | --- | --- |
| weaponized unemployment / @government_problem | deep-fried orangutan close-up | just found out you can legally have a child without finishing the tutorial |
| Susan 😇 / @blessed.susan | stylized middle-aged boomer cartoon | My son is 34 and still hasn't found a woman good enough for him. Starting to think God has bigger plans. |
| Human Resources ❤️ / @weareafamily | generic colorful corporate icon | We're excited to announce that bereavement leave will now be a competitive team-based activity. |
| Kevin.exe / @kevin.exe | pixel-art gamer avatar | Just found out my therapist plays League. How am I supposed to take mental health advice from a support main? |
| unemployed philosopher / @industrial.revolution.hater | old painting, exaggerated colors | Being alive is technically a subscription you didn't consent to. |
| Capitalism Enjoyer / @monetizeeverything | cat with tie; illustration or permitted animal image | If your grandma isn't generating passive income from her pension, that's a conversation you need to have. |
| Michael / @passiveincome_mike | fictional realtor illustration | My tenant just died. Difficult day, but excited to finally adjust the rent to market rates. |
| Testosterone Daily / @primalmale | illustrated muscular gym avatar | Men used to die in wars. Now they ask their girlfriends if they can buy LEGO. |
| Emily 🌿 / @healing.with.emily | pastoral fictional avatar | Sometimes the most toxic person in your life is your own child. Normalize choosing yourself. |
| Peaceful Departures™ / @peacefuldepartures | generic coffin icon | Black Friday starts tomorrow. Don't wait until it's too late. |

These archetypes are examples of tone, not hardcoded accounts. Avoid identifiable real people in fabricated embarrassing posts and avoid implying that real brands published fictional content.

## 4. Session generation: one AI request, one image provider

**Design goal: minimal model tokens, minimal code, no permanent asset storage.** Use one text LLM and one image-search provider. Brave Image Search is the proposed provider for the prototype, subject to confirming that its terms and the underlying image permissions allow the intended use. Openverse is an alternative to choose instead if license filtering is more important; do not integrate both. No image-generation model, vision model, AI asset selection, avatar service, vector database, custom image-processing pipeline or permanent media library.

### 4.1 Initialization pipeline

1. Host configures lobby; server calculates needed prompt counts and freezes the roster.
2. Send exactly one structured model request for mode-specific content, fictional accounts, and short image search queries. Include the generation rules and a few concise tone examples rather than the entire design document. Do not include personal player data or images in the model request.
3. Validate the response (schema, counts, unique handles/IDs, references and length). Fill missing or invalid entries from a bundled text-only fallback. No model retry.
4. Resolve image queries concurrently using the single provider, with deduplication, a small request budget and an initialization deadline. Select distinct suitable results using source metadata and a simple seeded shuffle. Do not send images or search results back to the model.
5. Freeze session content, resolved image references and player assignments. Preload images where possible. Failed, unverified or unavailable media use a local colored initials circle (avatars) or a text-only card (attachments).
6. Start gameplay. No more AI calls or new image-search requests. All game logic remains deterministic.
7. Release the session manifest at room expiry. No permanent media storage. Prefer permitted remote image URLs; room-scoped temporary caching is optional only if provider terms and asset permissions allow it. A browser may still load/reload frozen URLs during gameplay; that is not a new search.

### 4.2 Grouped search = fewer API calls

The model can emit 4–6 short avatar group queries per session rather than a separate query for each fictional account. Accounts reference a group index. The backend makes one search per unique group and assigns distinct suitable results from the returned candidates. Example groups:

- `deep fried animal meme avatars`
- `funny medieval painting portraits`
- `cursed reaction meme avatars`
- `vintage animal illustrations`
- `pixel art fictional character avatars`
- `generic illustrated icons`

These are illustrative queries, not pretested search results. The model can invent new groups each session. Prefer animals, objects, artwork, abstract icons and fictional illustrations to photos of real people. Do not attach invented embarrassing statements to identifiable strangers. If there are too few suitable permitted results, use initials instead of additional searches. Grouping trades some avatar-to-character precision for lower cost and simpler code.

Optional image-based posts can specify a short attachment query. Count these against the same per-session search budget; avatars take priority. For MVP, optional attachments can be disabled entirely. All scenarios must work as text without an image.

Example: six players × three RATIO rounds = 18 posts, 36 replies. Generate 24 posts (six backups), around 12 fictional accounts, and six avatar groups. With no attachments and no retries, this is one LLM request plus at most six image-search API requests; subsequent image fetches are separate. Set a default search cap of six, configurable later. Provider charges, bandwidth and model usage are separate; actual prices, latency and result quality require verification. Do not promise that every session will return a suitable image for every account.

### 4.3 Single provider and image rights

Proposed integration: Brave Image Search — https://api-dashboard.search.brave.com/api-reference/images/image_search . Review API terms (including storage, display and content restrictions) before implementation or commercial release. Search results do not grant reuse rights. If suitable permissions cannot be established, use the local placeholder; alternatively select Openverse (https://api.openverse.org/v1/) as the **only** provider instead of Brave. No multi-provider fallback chain, scraping or unapproved hotlinking. Keep required credit/source/license metadata with session references; do not use unknown-license images as approved assets. Use a provider's permitted thumbnail URLs only when reuse/display is allowed. Restrict image types, size, URLs and redirects if downloading/proxying; block private-network targets, avoid untrusted SVG and keep API keys server-side. Use safe image-search settings. No image provider is required to play.

### 4.4 Compact model response (excerpt)

Keep only fields used by the game. The server creates IDs where array positions suffice, decorative timestamps/likes, assignments, timers and actual image URLs. No biographies, explanations, sample replies, score data or AI reasoning in runtime output. The accounts and their posts should demonstrate personality naturally.

```json
{
  "images": [
    "deep fried orangutan meme avatar",
    "cursed medieval painting portrait"
  ],
  "accounts": [
    {
      "name": "weaponized unemployment",
      "handle": "government_problem",
      "avatar": 0
    },
    {
      "name": "divorced at birth",
      "handle": "emotional_liability",
      "avatar": 1
    }
  ],
  "rounds": [
    {
      "mode": "ratio",
      "posts": [
        {
          "account": 0,
          "text": "just found out you can legally have a child without finishing the tutorial"
        },
        {
          "account": 1,
          "text": "being someone's emergency contact while actively ruining their life is crazy"
        }
      ]
    }
  ]
}
```

This is a partial schema illustration; a real response includes every required round and backup content. `avatar` is a zero-based image-group reference, `account` a zero-based account reference. Multiple accounts can reference one image group but receive different candidate images. Optional fields: `verified` and `media` (image-group/query reference for an attachment). Other mode payloads: Leaked DMs questions and sender roles; Explain scenarios; Sabotage slot instructions, template IDs and fallback fragments. These are suggestions for the coding agent, not a mandated wire schema.

### 4.5 Minimal backend interface

- `generateSession(config)` — the only LLM request.
- `validateSession(content, config)` — validate and fill from text fallback.
- `resolveImages(content)` — one provider, bounded grouped queries, local initials/text fallback.
- `startGame(session)` — freeze content and enter deterministic game state.

The MVP intentionally excludes custom deep-fry filters, generated logos, dedicated avatar renderers, multiple providers and persistent image storage. Deep-fried images can be sourced directly if permitted; otherwise the ordinary local placeholder is enough. Add visual processing only if playtesting proves it is valuable.

## 5. Editorial guidelines

The game supplies the setup, not the best punchline. Write as if a believable online persona posted it. Mix sincere stupidity, corporate dystopia, horny oversharing, dark absurdity, deadpan satire, ragebait and anti-humor. Vary capitals, grammar, length, punctuation, emoji and voice. Short posts with multiple reply angles are better than generic joke questions.

Bad: “What's the funniest thing to say at a funeral?”

Good: “Due to rising demand, we will no longer be accepting walk-ins.”

Better: “My husband's funeral is tomorrow. Does anyone know if the photographer can also do a few LinkedIn headshots while he's there?”

More tone references (post → example reply; never send these example replies to players):

| Post | Reply |
| --- | --- |
| My husband and I are trying for a baby! | Great to see people still playing co-op. |
| Pornography creates unrealistic expectations. | So does my LinkedIn. |
| Nobody wants to work anymore. | Historically, people weren't huge fans. |
| I refuse to work a 9–5. | Bro works a 0–0. |
| My body is a temple. | Historically significant. Structurally compromised. |
| Dating after 30 is so hard. | Transfer market is crazy this season. |
| Our generation needs to have more children. | Release the patch notes first. |
| I finally found my purpose in life. | Is it available on Steam? |
| My grandfather survived two world wars. | Ranked matchmaking used to be brutal. |
| My therapist told me to embrace my inner child. | Unfortunately, he's also unemployed. |
| What's the secret to a healthy marriage? | Separate Google calendars and a shared enemy. |

Host selects humor intensity (Casual / Unhinged / Digital Footprint), language and topic exclusions. Do not make shock value the sole joke. Use fictional identities, consent-based private rooms, a host hide/remove control, supported content boundaries and age-appropriate access. Keep sensitive real-life information out of prompts and avoid hate or harassment of real people.

## 6. Scoring and rewards

Universal score: **Likes**. Human votes decide humor; AI never judges. Display fiction-only engagement separately.

- RATIO / Explain: each contested matchup has a 1,000-like base pool, distributed in proportion to valid votes. Example 3:1 = 750:250. N matchups = N×1,000 total potential points per round. Ties split by votes; no votes = zero points. Integer rounding must conserve the pool (deterministic remainder handling). A single valid uncontested entry earns 500; no valid entries earn zero.
- Leaked DMs: each valid round-wide vote grants 1,000 likes, 800 context writer / 200 original author.
- Sabotage: each valid round-wide vote grants 1,000 likes, 500 to each contributor.
- A fallback or missing contributor receives no credit; do not transfer their share. No votes for entries you authored or coauthored. Abstentions allowed; no points for abstaining.
- This normalizes maximum base budgets across modes at full participation, not score variance. Final-round multiplier optional and disabled by default. All values are prototypes.

Special events are initially cosmetic (no score bonus): RATIO'D (unanimous win, at least 3 eligible votes cast), BRO FELL OFF (zero votes in a contested matchup with votes), SHARED BRAIN CELL (normalized identical submissions: skip duel, zero points), VIRAL (highest vote share among eligible entries of same kind in round, ties allowed), DIGITAL FOOTPRINT (your setup contributes to a winning entry), PARTNERS IN CRIME (winning shared entry), CHRONICALLY ONLINE (highest total score). No contradictory badges for skipped duels. Final ties yield joint winners. End-of-game favorites can be voted on separately without affecting the main score.

## 7. Screens, multiplayer and data

Host: room code/QR, roster, settings, initialization status, round intro, timers, progress, reveal, vote count, score animations, leaderboard and final gallery. Players: join with nickname, private tasks, text entry, submit, vote, own results. Mobile first; no sign-up for MVP. Support same-device browser play without a separate TV where practical.

State machine: LOBBY → GENERATING → ROUND_INTRO → WRITING (one or multiple phases) → REVEAL → VOTING → RESULTS → LEADERBOARD → NEXT_ROUND or GAME_OVER. Head-to-head modes repeat REVEAL/VOTING/RESULTS per matchup; collaborative modes reveal all entries before one vote. All clocks and transitions server authoritative. Private data never broadcast early. Assignments remain fixed on disconnect/rejoin; no late arrivals into active matches. Validate state, authorization, submission limits and votes; idempotent writes, one vote per eligible contest, reconnect via token, server-side host permissions, rate limits, host moderation/skip. Timers expire without blocking the whole room. If too few valid entries remain, skip. Keep active session state sufficient for reconnect and preserve already committed submissions. No AI/search dependency after initialization; client may retry loading the same frozen media reference or use placeholder.

Entities: Room, Player, GameConfig, SessionManifest, FictionalAccount, ImageGroup, ResolvedImage, Round, Prompt, Assignment, Submission, Entry, Vote, ScoreEvent, Result. Session content is temporary. Design runtime engine around reusable assignment/entry/vote mechanics, not one engine per mode. For head-to-head, rotate opponents; a cycle over roster is a simple valid assignment with two distinct opponents per player. For DMs use derangement; for Sabotage use two disjoint contributor slots per template. Randomize reveal order deterministically per session; no reliance on the AI to assign players.

## 8. Visual design

A billion-dollar interface populated by people with a combined three brain cells. Clean dark feed, strong typography, original branding, small avatars, fake timestamps, message bubbles, generic fictional account icons, animated votes, meme poster layouts and intentionally inconsistent avatar aesthetics. Do not clone a real service pixel-for-pixel. Distinguish game votes from decorative engagement. Make controls accessible and touch-friendly.

## 9. End of game

Winner, final leaderboard, funniest replies, best collaborative entry, optional setup award and a gallery of memorable fictional content. Shareable screenshots are an optional future feature; explicit export only, fiction watermark, asset credits as required, no private player info beyond what players agree to share. Gallery/exports must not imply a real person's statements. Avoid retaining images permanently or promise persistent gallery links without a separate retention decision.

## 10. MVP and acceptance criteria

1. Build RATIO first with rooms, reconnects, deterministic assignment, voting, score and text fallback; a colored initials avatar is sufficient for the first runnable prototype.
2. Add one-request structured session generation and single-provider grouped image resolver before investing in other games. No bundled media collection. Ensure provider-outage and bad-JSON paths still produce a playable text-only session.
3. Add Leaked DMs, Explain Yourself, Sabotage and Doomscroll using shared primitives.
4. Polish rewards, presentation and gallery; custom meme treatments are optional later.

Acceptance: six players receive two prompts and see six duels each RATIO round; no author self-votes; exactly one model request at initialization; one image provider and no more than the configured search budget; no model or new asset search calls once play starts; account identity/avatars consistent within match; bad assets never block play; fresh session generates new profiles; scores reproducible from ballots; file/asset lifecycle obeys no permanent media storage; players can reconnect; host can remove a submission; the game is playable without any image provider. User tests should track laughter, short downtime, creative anxiety, and willingness to replay. No public matchmaking, native apps, AI judging, runtime image-model generation or persistent media library required for MVP.
