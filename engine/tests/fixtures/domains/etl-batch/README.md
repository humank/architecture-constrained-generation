# etl-batch — engine test fixture

Deliberately unlike both the coffeeshop and parcel-locker:

- **no user interface** (`ui_kind: none`) — the frontend sensors must report n/a
- **no cloud** (`deployment_target: none`, `profile: none`) — the region check must
  report n/a
- **Python** (`backend_ecosystem: python`) — the JVM matrix must report n/a
- **the domain language is Chinese** — the normalisation that used to map every CJK
  string to `""` (and therefore match everything) must not come back

Its job is to prove the n/a paths and the i18n fix. If this fixture ever goes green by
*skipping* something it should have checked, a test here should catch it.
