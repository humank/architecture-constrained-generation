# Adopting ACG on your own project

The coffeeshop in this repo is a **sample**. It ships five known lies on purpose so the
engine has something to catch (see `docs/acg-engine-development-plan.md` §10). Do not
inherit it.

## Start a project

```bash
git clone <this repo> ~/tools/acg          # the toolkit lives here
cd ~/work/my-system
bun ~/tools/acg/engine/src/acg.ts init --project my-system --profile generic
```

`init` writes only what is yours to fill in:

```
.arch/acg-project.yaml     name, language — the engine reads `name` for its state
.arch/assessment-2.yaml    draft: architecture decisions, ui_kind, profile
.arch/assessment-8.yaml    draft: technology stack
artifact-schemas/          the schemas the sensors validate against
.claude/commands/          the phase skills the conductor loads
.claude/agents/            the independent reviewer subagent
.claude/settings.json      the Write / Stop / PreCompact hooks
```

It does **not** copy the domain stories, the requirements, or anything else from the
sample. The board it produces is honestly `[ ]` all the way down:

```bash
bun ~/tools/acg/engine/src/acg.ts status    # [ ] × 13
bun ~/tools/acg/engine/src/acg.ts doctor    # green before you write anything
bun ~/tools/acg/engine/src/acg.ts next      # run-phase 00-requirements
```

## Two answers decide what applies to you

Both live in `assessment-2` and are locked and fingerprinted like every other decision,
so switching them later cascades through `redo` rather than quietly changing the rules.

| Answer | Effect |
|---|---|
| `ui_kind: none \| api-only \| cli` | The actor-view and cross-layer type contract sensors report `na`; the whole UX phase is `[S]` skipped with the reason; Phase 8 no longer expects `frontend/` |
| `deployment_target: none \| on-prem` | The pinned-decision sensor reports `na`; Phase 5 no longer expects `iac/` or `k8s/` |

`na` is never silently a pass: it appears in `.arch/quality-reports/<phase>.yaml` with
the exact locked answer that excluded it, so "that check does not apply to us" is a
claim someone can disagree with.

**You cannot switch a sensor off by editing `engine/data/phase-graph.yaml`.** That is
deliberate. A graph users may edit is a graph where every red sensor gets deleted, and
then the engine no longer decides anything. Applicability comes from a locked answer or
not at all.

## Pick a profile

A profile says *where the values live* — which file holds the region, which file
declares routes, which build file holds the framework version.

```bash
bun ~/tools/acg/engine/src/acg.ts profile              # what is active, and why
bun ~/tools/acg/engine/src/acg.ts profile --id none    # inspect one
```

| Profile | For |
|---|---|
| `aws-cdk-ts` | AWS, CDK in TypeScript, React Router |
| `terraform-aws` | the same, provisioned with Terraform |
| `gcp-terraform` | Google Cloud with Terraform; JVM, Python or Go |
| `none` | no cloud and no UI — a library, a CLI, an on-prem appliance |
| `generic` | asserts nothing; ecosystem-bound sensors report `na` |

Set it explicitly with `profile:` in `assessment-2`, or let the engine infer it from
`iac` and `deployment_target`. To add your own, copy
`engine/data/profiles/generic.yaml`, `extends:` the closest one, and override only what
differs.

Two vocabularies are project inputs rather than engine constants:

- **Infrastructure words.** `glossary-origin` flags "Outbox" and "DLQ" as technical
  vocabulary because that is right for a coffee shop. If your domain *is*
  infrastructure, those are your ubiquitous language — override the list in
  `.arch/glossary-policy.yaml` and the engine will not overrule you.
- **Event-name suffixes.** `docs-events-match-storm` recognises past-participle English
  (`*Placed`, `*Processed`). Extend `vocabulary.event_suffixes` in your profile if your
  events are named otherwise.

## Non-English domain models

Write the stories in the language the domain experts speak. Actors, work objects, read
models and glossary terms are compared with Unicode-aware folding, so 服務生 and 咖啡師
are two different actors — the earlier normaliser mapped every CJK name to the empty
string, and an empty string is a substring of everything.

One limit, reported rather than hidden: `gherkin-actor-matches-dst` derives its step
phrases from English command names and only reads English Gherkin keywords. A feature
with a `# language:` header it does not know reports `na` naming the file, instead of
passing vacuously. `engine/tests/fixtures/domains/etl-batch` is a Chinese-language
fixture that keeps this honest.

## Keeping the copy current

`init` copies the schemas, phase skills, reviewer and hooks into your project, so they
drift as the toolkit moves on — and `doctor` will tell you they have. Refresh them
without touching your artifacts:

```bash
git -C ~/tools/acg pull
bun ~/tools/acg/engine/src/acg.ts init --upgrade
bun ~/tools/acg/engine/src/acg.ts doctor
```

`--upgrade` replaces only the toolkit. `.arch/` — your artifacts, your answers, your
state — is never touched.

## Tests

```bash
cd ~/tools/acg/engine
bun run test          # the engine — must be green for you
bun run test:sample   # the coffeeshop — expected to fail once .arch/ is yours
```

See `engine/tests/README.md`.

## If you forked this repo instead

Then you have the sample's `.arch/` and its deliberate reds. Clear them:

```bash
rm -rf .arch/0* .arch/acg-state.yaml .arch/audit .arch/quality-reports .arch/glossary.yaml
bun engine/src/acg.ts init --project my-system
rm engine/tests/sample-coffeeshop.test.ts    # or point it at your own artifacts
```

Keep `examples/` and `knowledge-base/` — the methodology reference is not domain
specific.
