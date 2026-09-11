# Engine tests

Two groups, because they answer two different questions.

```bash
bun run test          # does the ENGINE work?   — domain-neutral, incl. the full loop
bun run test:sample   # does the SAMPLE hold?   — reads the coffeeshop .arch/
bun run test:all      # both
```

## `bun run test` — the engine

`text`, `state`, `fixture-domains`, `intent`, `init`, `workflow-loop`.

These never read the repo's `.arch/`. The sensor coverage runs against
`tests/fixtures/domains/*`, two domains chosen to be unlike each other:

| Fixture | Shape | What it proves |
|---|---|---|
| `parcel-locker` | UI + cloud, English | the constraint chain works on a second domain |
| `etl-batch` | no UI, no cloud, Python, **Chinese** domain language | the `na` paths, and that CJK names no longer match everything |

**If you have replaced `.arch/` with your own domain, this is the suite that must stay
green.** A failure here means the engine is broken, not that your artifacts differ.

## `bun run test:sample` — the coffeeshop

`sample-coffeeshop`, `orchestrate`, `cli`, `assess`, `applicability`, `profile`.

These read the repo's own `.arch/`, and several of them assert that a sensor **fails** —
the sample deliberately ships the lies the engine exists to catch (see plan §10:
cashier vs Waiter, `ap-east-2` vs `us-east-1`, `OrderPaid`, seven unrouted actor-view
pages, Spring Boot 4.x vs Gradle 3.4.4).

**If you have replaced `.arch/`, this suite is expected to fail.** Point it at your own
artifacts or delete it; it is a test of the example, not of the engine.

## `workflow-loop.test.ts` — the one that finds things

It drives the conductor protocol end to end on a CLI-shaped, self-hosted, Python
project: `next` → do what the directive says → `report` / `review`, and nothing else.
No test in it touches the state machine directly.

Every other suite tests a part. This one caught nine bugs that all of them had missed —
a sensor blocking Phase 4 on a Phase 8 questionnaire, a glossary nothing was told to
write, a reverse link write isolation forbade, JS-shaped test-file names, and a rejected
review that left a phase permanently unapprovable. **If you add a phase, a sensor, or a
directive, extend this file.** A part that works in isolation is not a process that works.

## Writing a new sensor test

Put the domain-neutral behaviour in `fixture-domains.test.ts` against a fixture, and
only the sample-specific demonstration in `sample-coffeeshop.test.ts`. A sensor whose
red path is only ever proven on the coffeeshop is a sensor nobody has shown to work
anywhere else.
