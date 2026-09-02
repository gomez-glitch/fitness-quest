# Move Quest — retrospective

Written 2026-09-02, after ~20 build sessions, with the app in daily use by a
7-year-old (and regular use by a 10-year-old).

This is the "what would we do differently if we started again" document. It
exists because the app is now mature enough that its shape is visible, and
several of its foundations were laid before we understood what we were
building. Nothing here is a criticism of shipping fast — shipping fast is why
we know any of it. But the lessons are worth writing down while they're sharp.

Cross-references to `BACKLOG.md` are marked (→ backlog).

---

## 1. The big one: we built a points tracker that grew a soul

Move Quest started as XP + streaks + badges, with Spark as decoration. Then we
added the tamagotchi layer — and *that* turned out to be what the 7-year-old
actually engages with. She feeds him, boops him, hunts his secret favourite
food, dresses him in a bear suit. The exercise is the price of admission to the
relationship.

**If we started again: Spark is the spine, not the mascot.** He's hungry, he's
low on energy, he wants to play, he needs you today. Exercise is how you care
for him. XP becomes a quiet side effect rather than the headline, and quests,
adventures and badges hang off the care loop instead of the reverse.

We arrived here by accident and late, and the architecture still shows it: the
pet is a bolt-on module reading from a `stats` object that was designed for
badge predicates. Nothing is broken, but the emotional core of the app is
wired in as an afterthought.

## 2. Streaks are the wrong motivational spine for a young child

Daily streaks punish illness, holidays and ordinary family chaos. We have
already backlogged a "streak shield" — which is a patch on a mechanic that
shouldn't hurt in the first place.

**If we started again:** design for a *weekly rhythm* (3–5 active days, child
picks which) and reward effort over outcome. Same encouragement, no anxiety, no
guilt when a kid gets sick on day 19 of a 20-day run.

This is a genuinely reversible decision — the day-based data is already stored
— but it gets harder the longer a real streak number means something to a real
child.

## 3. We have two users and no data about either of them

Every design decision in this project has been made by guessing, then relaying
guesses through a parent. We still cannot answer:

- Are the foam roller moves ever used?
- Does she abandon 30-second holds, and at what second?
- Is the Mystery Spinner a daily ritual or ignored?
- Which adventures get replayed, and which are one-and-done?
- What time of day does she actually play?

**If we started again:** a local-only event log from day one — exercise
started / completed / abandoned, session length, time of day, panel visited —
kept in localStorage, never sent anywhere, exportable as CSV for the parent.
Costs an afternoon. Would have redirected a meaningful fraction of the work
we've done. Privacy cost: zero, because it never leaves the device.

## 4. The parent is an unserved user

The app is 100% kid surface. There is no grown-up view: no activity log, no
"turn off Spicy for the 7-year-old", no safety notes, no export button, no
content toggles. The parent is the deployer, the QA team and the feedback
channel — but not a user of their own app.

**If we started again:** a parent area behind the (still unbuilt) grown-up gate
would be a first-class surface, shipped alongside the kid experience rather
than imagined as an admin afterthought. (→ backlog: protection pack.)

## 5. The economy should have been simulated, not discovered

The worst moment in this project: a child earned **850 XP in a single session**,
and we retrofitted a quadratic curve, an energy taper and a no-demotion
migration under pressure. It was fixable only because nothing had shipped to
strangers.

**If we started again:** `economy.js` as pure, DOM-free math with a simulation
harness on day one —

> "Simulate a 7-year-old playing 20 minutes a day for 90 days. What level are
> they? What do rep targets look like? Is it still fun in month three?"

Ten seconds to run. Catches the entire class of bug before a child ever sees
it. We *still* have no answer for what level 30 feels like, and the 10-year-old
is heading there.

## 6. Content is code, and that's friction

Exercises, badges, adventures, facts, foods and spinner modifiers are all
inline arrays in `app.js`. Adding content means editing code and redeploying.

**If we started again:** content as validated JSON in a `content/` directory,
loaded and schema-checked at boot. Benefits compound: seasonal drops without
code changes, a parent adding their own moves, and — the fun one — the girls
inventing exercises and seeing them appear in the app.

## 7. Architecture: modules and a state store, not `renderAll()`

`src/app.js` is ~3,300 lines. That is the compound interest on not splitting it
at ~800. (→ backlog: split app.js.)

Two specific symptoms worth naming:

- `renderAll()` re-renders fourteen things on every action. It works at this
  size, but it is *why* the XP count-up animation needed a `WeakSet` guard and
  the daily-briefing ring needed a first-paint transition hack — both are
  workarounds for re-rendering things that didn't change.
- State mutation is scattered. `awardCompletion()` is a good central pipeline,
  but plenty of code pokes at `activeProfile()` directly and then calls a
  render function by hand.

**If we started again:** `state.js` (load / save / migrate / normalize),
`economy.js` (pure math), `content/*.json`, then feature modules that subscribe
to state changes via a ~30-line pub/sub. Not a framework — just a seam.

## 8. A test pyramid, not just its top

75 Playwright checks and a CI gate are genuinely good, and they have caught
real regressions. But they are slow and integration-only, and they were added
after the app existed.

The cost showed up concretely: the daily quest picker was handing out **two
30-second holds in one day** for weeks, because nothing asserted the shape of a
day's quests. A millisecond-fast unit test would have caught it immediately.

**If we started again:**

| Layer | What it covers | Speed |
|---|---|---|
| Unit | economy math, quest picker, tummy decay, normalization/migration | ms |
| Property | "for any date: never two holds, never two same-group" | ms |
| E2E (Playwright) | real user flows, exactly what we have now | ~90s |
| Visual regression | baseline screenshot diffs per screen | seconds |

That last row matters more than it sounds: every alignment bug fixed this month
(spinner hub 30px low, tile icons drifting on wrapped titles, off-centre glyphs
in round buttons) was caught by a human looking at a screenshot. That does not
scale, and it only works when someone thinks to look.

## 9. Design system first, dark mode included

We spent three polish rounds retrofitting tokens, spacing, type ramp and motion
onto styling that had grown organically. Doing it up front costs roughly the
same and avoids the retrofit.

Dark mode deserves special mention: this app contains a **bedtime feature**
(Sunset Stretch, calm music, breathing cues) and still blazes full white at
8pm. Light-first was the wrong default for the actual use case. (→ backlog.)

## 10. Tooling we should have built for ourselves

- **A pose-authoring page for the mascot.** Joint angles were hand-tuned and
  re-screenshotted one at a time. That process is why the foam-roller set
  initially had arms in impossible positions — world-space vs torso-relative
  angle confusion that a slider-based authoring tool would have made
  structurally impossible. 59 exercises would also have been much faster.
- **Audio buses from day one.** We just retrofitted a bus architecture,
  compressor and voice ducking. Starting that way costs nothing extra.

## 11. Physical and social reality

Two smaller things the design never really addressed:

- **Rest and form.** Difficulty scales purely off level maths. There is no
  "how did that feel?" check-in (too easy / just right / too hard) feeding back
  into targets — which would be both kinder and more accurate than a curve.
- **Two sisters, one device, zero co-op.** The setup is inherently social and
  the app is strictly single-player. Co-op quests, a shared family goal,
  turn-taking challenges and "beat dad's plank hold" should have been designed
  in rather than left on the ideas shelf.

---

## What we'd keep without hesitation

Worth recording, because a retrospective that only lists regrets is misleading.

- **Zero dependencies, static, offline-first.** Still correct. Loads instantly,
  costs nothing to host, sends no child's data anywhere, works on a plane.
- **The FK mascot engine.** The single best decision in the project and the
  reason the app doesn't look like a template. It has paid for itself many
  times: 59 exercises, pet moods, boop reactions, costumes, dance, adventures,
  library cards, empty states — one engine.
- **Screenshot-verified development.** Rendering the thing and *looking* at it
  caught bugs no test would have.
- **Staged content drops.** Holding zones 7–19 back so the app can feel new
  again later was the right instinct.
- **Direct-to-main with a CI gate.** Fast iteration without the ability to ship
  something broken to a child's iPad.
- **Kid road-testing.** The 7-year-old's "make us do more for the easy ones"
  produced a better change than any spec written for her.

---

## If we adopt only three things

1. **Un-pause the protection pack.** (→ backlog #1.) Everything else on this
   list is upside. This is the only item whose downside is losing something
   irreplaceable: months of two children's progress currently live in one
   browser profile with no export.
2. **Add the local activity log.** An afternoon of work that makes the next
   twenty sessions informed rather than guessed.
3. **Write the economy simulator.** Find out what level 30 feels like before a
   child gets there — not after.
