# ACG Engine 開發計畫

> 從原始需求探索（Domain Storytelling）到雲上部署驗證，如何把約束鏈變成可執行的引擎。
>
> 狀態：**切片 0–9 全部落地**。引擎骨架、DST 契約、決策指紋、conductor 協議、
> hook（Write/Stop/PreCompact）、audit 分片、17 個 sensor、intent 隔離、`patch` scope、
> 學習迴圈、獨立 reviewer 子代理都已可執行並有測試。
> 對象：本 repo 的 ACG 技能本體（`.claude/commands/`、`knowledge-base/`、`.arch/`），不是咖啡店業務功能。
> 咖啡店系統是引擎的 **fixture**：已知謊言必須被擋下來——而且現在真的被擋下來了。

---

## 0. 為什麼要做

ACG 已經有 control plane 的內容：10 相方法論、YAML 產物、27 個反模式、CL-1～CL-8、DST + Event Storming 雙模型的意圖。缺的是 data plane：

**相位順序、完成與否、能不能進下一關，目前由 LLM 遵守 `architect.md` 來決定。**

後果（已在咖啡店示範上發生，不是假設）：

| 謊言 | 證據 | 現在攔它的 sensor | 現狀 |
|------|------|-------------------|------|
| DST 有放、沒鎖 | `01-discovery/domain-stories/` 是散文；後面相位不 consume 句子 | `schema-dst` | 已修：DS-01/02/03 是句子故事 |
| 點餐的人是誰 | Story Map = Waiter；`ordering.feature` = cashier places an order | `gherkin-actor-matches-dst` | **紅燈保留**（產品決策）。另外抓到 `inventory.feature` 的 manager、`ordering.feature` 的 server |
| Actor View 與實作路由 | `frontend-architecture.yaml` 有 `/waiter/orders/ready`；`router.tsx` 沒有 | `actor-view-sourced-from-dst`、`source-fingerprint` | **紅燈保留**（9 頁只實作 4 條路由） |
| 部署區域 | `assessment-2` / `deployment-strategy.yaml` = `ap-east-2`；`iac/config/*.ts` = `us-east-1` | `decision-not-restated` | **紅燈保留**；`deploy.sh` 已改讀 lock |
| 文件事件名 | 序列圖 `OrderPaid`；Storm = `PaymentProcessed` + `OrderSubmittedToBarista` | `docs-events-match-storm` | **紅燈保留**（14 處） |
| 品質閘門 | 規定寫 `quality-reports/`，目錄是空的 | `quality-report-written` | 已修：每次 gate 由引擎寫入 |
| 幽靈輸入 | Phase 4 要讀 `vertical-slices.yaml`，磁碟上沒有 | `files-exist` | 已修：graph 只宣告存在的輸入 |
| Glossary 污染 | 領域詞混進 Outbox、DLQ | `glossary-origin` | 已修：34 詞都標 `origin`，技術詞標 `technical` |
| 泳道先切 BC | `event-model.yaml` 泳道按 BC 命名，讀模型另立新名 | `swimlane-is-story` | 已修：泳道標 `story: DS-xx`，讀模型改用 UL 名稱 |
| MVP 故事沒煙霧 | Stage 8 是手寫步驟清單，不引用故事 ID | `e2e-story-coverage` | 已修：`smoke_test.stories` = DS-01/02/03 |
| 問卷與建置不合 | `assessment-8.md` 選 Spring Boot 4.x；`build.gradle.kts` 是 3.4.4 | `framework-version-matrix` | **紅燈保留**（需人決定 `_resolved`） |
| Reporting 沒故事 | US-19/US-20 沒有任何 DS 故事覆蓋 | `story-map-coverage` | 已修：新增 DS-03 |
| 測試工具鏈對不上 | `test-strategy.yaml` 寫「Jest (TypeScript) or pytest (Python)」，實作是 Java 21 + JUnit + Vitest | `test-stack-matrix` | 已修：改成 JUnit 5 / Vitest / Testing Library / Mockito / MSW。這是抄樣板的殘留，不是決策 |
| 幽靈輸出 | `01-discovery.md` 宣告產出 `vertical-slices.yaml`、`04-specification.md` 宣告要讀它，兩邊都是空話 | `files-exist`（graph 端）+ 指令檔改寫 | 已修：依 §2 Phase 1c 刪除，切片 = 故事 × 命令 |
| Hot spot 沒分類 | `event-storm.yaml` 的 hot_spots 只有 topic/question/resolution，沒有 `kind`，也不符自己的 schema | `hotspot-classified` | 已修：5 個都標 `kind` + `sourced_from`，1 個 open（fact-unknown，附分類理由） |
| US 沒有回指 | Story Map 的 `US-*` 沒有任何 `DS-xx` 反向連結（§2 Phase 0 的 `pending_story`） | `story-map-coverage`（雙向） | 已修：20 個 US 都標 `covered_by` |
| step 錨點斷掉 | graph 說 `step: dst`，`01-discovery.md` 只有「Step 1」，conductor 找不到該讀哪一段 | `doctor` 的 `skill/<id>/step` | 已修：三段都標 `engine step:`，doctor 檢查 |

「紅燈保留」不是缺陷，是驗收條件：引擎必須報得出來，修不修是產品決策（§10）。

社群常說 DST 與 Event Storming 擇一。ACG 兩個都用的唯一正當理由是：**它們鎖的是不同真相，並且後面相位都引用同一則故事 ID。** 沒有引擎對核，「都用」只是目錄裡多一個 YAML。

本計畫分兩件事，必須一起做：

1. **歷程調整**：DST 成為從需求到煙霧測試的旅程主檔。
2. **引擎**：學 AI-DLC Workflows 2.0 的 runtime（狀態機、sensor、audit、lock），不學它的 33 stage / 14 agent / 11 scope。

---

## 1. 原則（不可退讓）

1. **LLM 寫產物、問人、解釋。引擎決定下一關、完成標記、能否前進。**
2. **Phase 正文與 conductor 禁止手改完成狀態。** 只有 `engine/acg.ts report` 能改 checkbox。
3. **DST 是工作模型（誰、用什麼、依什麼順序合作）。Event Storm 是事實模型（領域必須記住什麼、什麼觸發下一動）。** 兩者對核，不准互相偽造。
4. **一則 to-be 故事一個 ID（`DS-xx`），從 1a 活到 Phase 9。** Storm 事件、Context Map 邊、Actor View、Gherkin 旅程、管線煙霧、序列圖、deploy 驗證都必須引用它。
5. **學 AI-DLC 的「誰有權改真相」，不把 ACG 拆成 33 個 SDLC stage。** 10 相保留；Phase 1 在引擎圖上拆成 `01a-dst` / `01b-storm` / `01c-model` 三道閘。
6. **咖啡店 `.arch/` 是回歸 fixture。** 每一刀結束，至少要擋下一件上面表格裡的已知謊言。
7. **第一期不做：** 14 agent、11 scope、swarm/worktree、學習迴圈、多 harness、把 DST 做成 AI-DLC 的 user-stories stage。
8. **決定性檢查 blocking；語意審查 advisory。** Schema、對核、fingerprint 擋完成。貧血模型、Smart UI 第二期再做。

---

## 2. 目標歷程（方法論層）

以下是人與 AI 實際該走的路。引擎圖是這條路的機器版。

### Phase 0 — 需求（Why / What，不是 How）

**產出：** `impact-map.yaml`、`story-map.yaml`、`parsed-requirements.yaml`、更新 `glossary.yaml`。

**調整：**

- Actors 清單是 DST 主詞名冊，不是裝飾。
- Story Map backbone 活動 = DST 故事候選。不要在 Phase 0 把步驟寫成偽流程。
- 每個 US-* 標 `pending_story`，等 01a 填 `DS-xx`。
- Customer 的 Impact 若寫「View menu」，不得直接推成顧客 App。等 DST 標 `system_visible`。

**人閘：** 商業目標、MVP backbone。

### Phase 1a — Domain Storytelling（旅程主檔）

**產出：** `.arch/01-discovery/domain-stories/*.yaml`，符合 `artifact-schemas/domain-story.schema.json`。

每則故事必須是 **句子**，不是 narrative：

```
Actor → [activity + 序號] → Work Object
```

必填：`id`（DS-xx）、`purity`（as-is | to-be | to-be-only）、`backbone`、`covers`（US-*）、`steps[]`。

每個 step 必填：

| 欄位 | 用途 |
|------|------|
| `id` | `DS-01.4`，後面所有引用的錨 |
| `actor` | 主詞，必須在 Phase 0 actor 名冊或 System / External |
| `activity` | 領域動詞，不是 Submit/OK |
| `work_object` | 名詞 |
| `medium` | spoken / paper / digital / cash / physical / n/a |
| `class` | `collaboration` \| `medium-change` \| `state-change` \| `handoff` \| `read` |
| `system_visible` | 系統看不看得見這一步 |

`class` 決定後面允許變成什麼：

| class | 後面允許 |
|-------|----------|
| `collaboration` | **禁止** command / API / 畫面控件 / 領域事件 |
| `medium-change` | 同一 work object 兩次出現；事件只在「系統接住」那一步 |
| `state-change` | 必須有 Storm 事件與 command 或 policy |
| `handoff` | 必須有 Context Map 邊 + pivotal event 或 policy |
| `read` | 必須有 Event Model read model 或 Actor View 的 GET；不必有事件 |

一則故事一個情境。例外另開 `DS-01b`。DST **不准**畫 if/then、平行、迴圈——那是 Storm 政策與聚合不變量。

沒有 as-is 時必須顯式 `purity: to-be-only` 並寫理由。不准假裝做過 as-is。

**人閘：** 主詞、換手、哪些步驟不該進系統。沒過不准開 Event Storm。

### Phase 1b — Event Storming（只從可見步驟爆發）

**產出：** `event-storm.yaml`。

**調整：**

- 輸入是 stories，不是把需求 md 再讀一次當主來源。
- 每個事件有 `sourced_from: [DS-01.5, …]`。
- Actor-triggered command 的 actor = 該 DST step 的 actor。
- `collaboration` 步驟禁止對應事件。
- Hotspot 分類：`work-unknown` → 退回 01a；`fact-unknown` 留在 Storm。
- 政策（WHEN/THEN）標 `origin: policy`，對應 DST 不准表達的因果。

**對核閘（決定性）：**

```
DST.system_visible ∧ class ∈ {state-change, handoff}  ⊆  Storm.(command|policy)
Storm.actor_command                                  ⊆  某則 DST 句子
```

### Phase 1c — Event Modeling

**產出：** `event-model.yaml`。

**調整：**

- 泳道用 DST 故事切（或故事 × BC），不要先用 BC 切再回頭證明 BC。
- Read model 名稱來自 DST `class: read` 的 work object。
- Automation 切片 = DST `handoff`。
- GWT 服務單條命令（單元測試）。DST 故事服務整段合作（E2E）。
- **刪除**對不存在的 `vertical-slices.yaml` 的依賴。切片 = 故事 × 命令，不必第三套檔。

### Assessment-2 — 架構決策鎖（進 Phase 2 之前）

結構化 YAML，`status: locked` 只能由引擎寫入。

問卷必須附上 DST 換手表。人選微服務對抗「全部是店內角色換手」時，必須進 ADR，fingerprint 咬住 region、風格、通訊、資料庫、IaC。

### Phase 2 — 戰略設計

**調整：**

- BC 候選必須同時通過：語言邊界、pivotal event、**DST 換手**。
- 同一人在同一故事裡的兩步（確認又收款）不得切成兩個服務。
- Context Map 每一邊 = 一個 DST handoff。
- Published Language 欄位 = 換手當下 work object 帶的資料。

### Phase 3 — 戰術設計

**調整：**

- `persisted` work object → 實體／聚合；`ephemeral`（口頭 DrinkChoice）禁止成表。
- `command.actor` = DST step.actor。
- Actor View 從 DST 主詞來，不從 BC 推。Ordering 裡有 Waiter 與 Cashier 兩種工作 = 兩個 view。
- 每個 page / submit_action 有 `sourced_from: DS-xx.y`。
- `system_visible: false` 禁止出現在任何 path。
- CL-1～CL-8 維持（這是契約層，DST 不管序列化）。

### Phase 3c — UX

頁面集合不得超出 Actor View。Microcopy 用 `origin: dst` 的動詞。Customer 沒有可見步驟 → 沒有顧客 App。

### Phase 4 — 規格（兩層，不要用 Gherkin 身兼二職）

| 層 | 來源 | 產物 |
|----|------|------|
| 規則／不變量 | Aggregate + Event Model GWT | `*.feature` 的 Rule 場景 |
| 旅程 | **一則 DST to-be 一個 Feature** | `features/journeys/DS-01-*.feature` |
| 跨 BC | Context Map（handoff） | `contracts/*.yaml` |
| 跨層 | Actor View DTO | `cross-layer-integrity.feature` |

「As a cashier I want to place an order」在 DST 說 Waiter 時必須 fail。

Test strategy 的工具鏈必須來自 assessment-8，禁止寫 Jest 而實作是 JUnit。

### Phase 5 — 交付

- SNS/SQS 對 Context Map 邊。每個 topic 與 queue 都要在 Context Map 上找得到那條邊，
  訂閱的 filter allowlist 要等於那條邊宣告的事件。
- **IAM 角色不對 DST actors。** 本文件早先版本要求「IAM 角色對 DST actors」，那是分類
  錯誤，已撤回：IAM role 是 workload identity（哪個 pod 能 publish 到哪個 topic），
  DST actor 是「誰在店裡做什麼工作」。硬對照會推著人去建 per-human IAM role，
  那是把應用層授權塞進雲端 IAM。人的授權屬於 Actor View 與 API authz
  （`actor-view-sourced-from-dst` 已經在管），不屬於這一相。
- Pipeline Stage 8 煙霧步驟 = MVP 故事 ID。
- Region 只信 assessment-2 fingerprint。`staging.ts`、`production.ts`、`deploy.sh`、`deployment-strategy.yaml` 必須同值（或顯式記錄「示範部署覆蓋」並經 redo 流程），否則 05 不能 `[x]`。

### Phase 6 — 審查

端到端場景 = 重放 `DS-*`。與 Storm 事件名不一致的圖 = fail。

### Phase 7 — 文件

圖是渲染不是新真相。C4 Person = DST actors。Sequence 訊息名 = Storm 事件。禁止發明 `OrderPaid`。

### Phase 8 — 實作

MUST READ 包含 `domain-stories/`。類名／角色跟 DST；事件型別跟 Storm；路由跟 Actor View；E2E 檔名跟 `DS-xx`。結束跑 source fingerprint。

### Phase 9 — 部署驗證

```
for story in mvp_stories:
  replay(story) against CloudFront/ALB
```

任一 MVP 故事失敗 → rollback。錯誤韌性：scale to 0 該故事依賴的服務，檢查該 DST actor 的 `error_state`。

---

## 3. 引擎架構（學 AI-DLC runtime）

### 3.1 三層

```
Conductor   .claude/commands/architect.md     薄：next → 執行 skill → report
Engine      engine/                           狀態機、圖、sensor、audit、lock、intent
Artifacts   .arch/                            產物 + acg-state.yaml + audit/ + quality-reports/
Harness     .claude/settings.json + agents/   hook 與獨立 reviewer：把「禁止」變成「做不到」
Methodology phase/*.md + knowledge-base/      人寫；frontmatter 當資料
```

Control plane 在 workflow 開始時 compile 一次（phase-graph + scopes）。Data plane 只查表。
Management plane：`status`、`doctor`、`lessons`、`audit`。

### 3.2 目錄

```
engine/
  package.json                 # name: acg-engine；用 bun 跑
  bunfig.toml                  # test preload：讓測試帶 ACG_ENGINE 標記
  tsconfig.json                # bun 型別；bun run typecheck 可用
  README.md
  src/
    acg.ts                     # CLI 入口；自己蓋上 ACG_ENGINE=1
    types.ts                   # PhaseDef / Directive / Intent / Lesson / AcgState
    guard.ts                   # 引擎寫入標記
    paths.ts                   # 解析 repo root / .arch / audit
    load.ts                    # 讀 stories / storm，缺檔就回空而不丟錯
    graph.ts                   # 載入 phase-graph + scopes，並正規化 when 條件
    applicability.ts           # 適用性：從已鎖答案決定哪些檢查與產物適用
    profile.ts                 # 技術 profile：值住在哪（見 acg-generalization-plan）
    init.ts                    # acg init：在別的專案裡開始
    text.ts                    # Unicode-aware 比對鍵；空 key 不是萬用字元
    state.ts                   # 六態轉移，唯一寫手
    intent.ts                  # 寫入隔離：本相位能碰什麼
    orchestrate.ts             # next / report / review / gate / jump / redo / scope / doctor
    audit.ts                   # append-only，按月分片
    assess.ts                  # lock + canonical fingerprint + 竄改偵測 + lockedAnswer
    importer.ts                # 從現有 .arch 目錄推狀態
    lessons.ts                 # 學習迴圈
    sensors/
      registry.ts  util.ts
      files-exist.ts            schema-dst.ts           story-map-coverage.ts
      dst-storm.ts              swimlane-story.ts       handoff-context-map.ts
      actor-view-sourced.ts     cl-contract.ts          gherkin-actor.ts
      e2e-story.ts              decision-not-restated.ts  docs-events.ts
      framework-version-matrix.ts  source-fingerprint.ts  glossary-origin.ts
      messaging-context-map.ts  hotspot-classified.ts   test-stack-matrix.ts
      ephemeral-not-persisted.ts
      quality-report-written.ts god-aggregate.ts
  hooks/
    guard-write.ts             # PreToolUse：引擎記錄 + intent 隔離
    stop-next.ts               # Stop：相位停在 [-] 就要求先 report
    precompact-breadcrumb.ts   # PreCompact：壓縮前把六態板寫下來
  data/
    phase-graph.yaml  scopes.yaml
    profiles/         generic  aws-cdk-ts  terraform-aws  gcp-terraform  none
  tests/
    README.md   helpers.ts  preload.ts
    fixtures/domains/parcel-locker/   fixtures/domains/etl-batch/
    # bun run test（領域中立）
    text  state  fixture-domains  intent  init
    # bun run test:sample（讀範例 .arch/）
    sample-coffeeshop  orchestrate  cli  assess  applicability  profile
artifact-schemas/
  domain-story.schema.json  assessment-2.schema.json
  assessment-8.schema.json  acg-state.schema.json
.claude/
  settings.json                # 三個 hook
  agents/acg-reviewer.md       # 獨立 reviewer，工具只有 Read/Grep/Glob
.arch/
  acg-state.yaml               # 引擎擁有
  assessment-2.yaml  assessment-8.yaml
  audit/2026-09.md  audit/local.md  audit/breadcrumb.md  audit/lessons.yaml
  quality-reports/             # gate 寫入
```

### 3.3 CLI

在 repo 根目錄。exit code：`0` 正常、`1` 呼叫錯誤、`2` 閘門拒絕。

```bash
bun engine/src/acg.ts status
bun engine/src/acg.ts next [--json]
bun engine/src/acg.ts gate   --phase 05-delivery
bun engine/src/acg.ts report --phase 01a-dst --result awaiting-approval|approved|rejected [--note "..."]
bun engine/src/acg.ts review --phase 06-review --verdict approved|rejected [--note "..."]
bun engine/src/acg.ts import [--scope patch]
bun engine/src/acg.ts scope  [--set patch]
bun engine/src/acg.ts assess-lock   --id assessment-2
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
bun engine/src/acg.ts lock-check    --id assessment-2
bun engine/src/acg.ts check-write   --path services/x/Y.java
bun engine/src/acg.ts jump   --phase 08-implementation --reason "spike"
bun engine/src/acg.ts redo   --phase 03-tactical [--only]
bun engine/src/acg.ts doctor
bun engine/src/acg.ts lessons
bun engine/src/acg.ts audit [--limit 20]
bun engine/src/acg.ts sensors
```

`next --json` 回傳：

```json
{
  "action": "run-phase | blocked | await-gate | await-review | ask-assessment | done",
  "phase": "03-tactical",
  "scope": "system",
  "skill": ".claude/commands/phase/03-tactical.md",
  "step": "all",
  "must_read": ["..."],
  "must_write": ["..."],
  "intent": {
    "phase": "03-tactical",
    "allowed_writes": [".arch/03-tactical/aggregates/", ".arch/glossary.yaml"],
    "forbidden_writes": [".arch/acg-state.yaml", "services/", "..."]
  },
  "reviewer": false,
  "blockers": [{ "sensor": "actor-view-sourced-from-dst", "status": "fail", "blocking": true, "message": "..." }],
  "advisories": [{ "sensor": "god-aggregate", "status": "warn", "blocking": false, "message": "..." }],
  "lessons": ["actor-view-sourced-from-dst has rejected 03-tactical 3× — last: ..."]
}
```

### 3.4 六態

```
[ ] 未開始 → [-] 進行中 → [?] 等批 → [x] 完成
                              ↓
                             [R] 退回修改 → 再回 [?]
未完成 → [S] skip（jump，並記下 reason）
[x] → redo 回到 [ ]（串聯到後面所有相位）
```

非法轉移丟錯。`saveState` 要求 `ACG_ENGINE=1`（CLI 自己蓋），
PreToolUse hook 則拒絕任何 agent 工具寫 `.arch/acg-state.yaml`——
兩層合起來，「conductor 手改 checkbox」不是被禁止，是做不到。

### 3.5 Conductor 迴圈

```
loop:
  directive = acg.ts next --json
  switch action:
    blocked         → 列出 blockers，停
    ask-assessment  → 跑 assessment skill，寫 YAML，停等 assess-lock
    run-phase       → 讀 skill 的指定 step，只寫 intent.allowed_writes，結束 report awaiting-approval
    await-review    → 跑 acg-reviewer 子代理，再 review --verdict
    await-gate      → 只呈現產物路徑 + sensor，等人
    done            → 結束
  禁止：自己標 complete、自己選下一相、手改 acg-state.yaml、寫別的相位的產物
```

三個 hook 讓這些「禁止」有牙齒：`guard-write` 擋越界寫入、`stop-next` 擋
「相位停在 `[-]` 就結束回合」、`precompact-breadcrumb` 擋「壓縮後靠 `ls` 猜相位」。
換 harness 時 hook 失效，但 `check-write` 與 `status` 仍可用——文件與 CLI 就位，
強制是 harness 的事。

### 3.6 Assessment lock

`.arch/assessment-2.yaml`：

```yaml
id: assessment-2
status: locked          # draft | awaiting | locked；locked 僅引擎可寫
answers:
  architecture_style: microservices
  region: ap-east-2
  ...
locked_at: 2026-09-06T...
fingerprint: 50d9226745f0a588...   # sha256(canonical(answers))
```

Markdown 問卷是給人看的渲染；引擎只信 YAML。指紋是 canonical 序列化
（key 排序、遞迴），所以重排欄位不會改指紋、改值一定會。

`next` 與 `doctor` 每次重算指紋：鎖後改答案 → 該相位 `blocked`，訊息說
「answers changed after lock」。要改就走 `redo` 從第一個消費該鎖的相位開始，
再 `assess-lock`。

基礎設施不准把鎖裡的值抄成字面量，要讀：
`acg.ts locked-answer --id assessment-2 --key region`。未鎖或被改過時它拒絕回答，
`scripts/deploy.sh` 就是靠這個。

`assessment-8` 另有一條規則：問卷寫什麼就記什麼
（`backend_framework_requested: spring-boot-4.x`），不因為建置檔做不到就偷偷改。
`backend_framework_resolved` 空著，讓 `framework-version-matrix` 把衝突報出來，
由人決定怎麼收。

### 3.7 從 AI-DLC 抄／不抄

**抄了：** 決定性 next/report/review/jump/redo；sensor 與規則分離；append-only
audit（按月分片）；assessment／決策指紋；Stop hook；PreCompact breadcrumb；
學習迴圈（只計數，不改行為）；intent 隔離；具名 scope（3 個，不是 11 個）。

**沒抄：** 11 scope、14 agent、Units/Bolt/swarm、Domain Design = component
catalogue、把 DST 稀釋成 user stories。

---

## 4. Phase graph

`engine/data/phase-graph.yaml` 是真相；`phase/*.md` frontmatter 是它的可讀孿生，
`acg.ts doctor` 對核兩邊（produces / sensors / requires_lock / reviewer），漂移就 exit 2。

| id | skill | consumes（節錄） | produces（節錄） | blocking sensors | 其他 |
|----|-------|------------------|------------------|------------------|------|
| 00-requirements | 00-requirements.md | 使用者需求 | impact-map, story-map, parsed-requirements | — | advisory: `quality-report-written` |
| 01a-dst | 01-discovery.md#dst | Phase 0 | domain-stories/ | `files-exist`, `schema-dst`, `story-map-coverage` | advisory: `glossary-origin` |
| 01b-storm | 01-discovery.md#storm | stories | event-storm.yaml | `files-exist`, `dst-storm-correspondence`, `hotspot-classified` | |
| 01c-model | 01-discovery.md#model | storm + stories | event-model.yaml | `files-exist`, `swimlane-is-story` | |
| 02-strategic | 02-strategic.md | storm, stories, **assessment-2 locked** | bounded-contexts, context-map | `files-exist`, `handoff-equals-context-map` | `requires_lock: assessment-2` |
| 03-tactical | 03-tactical.md | 02 + storm + stories | aggregates/, domain-model/, frontend-architecture | `files-exist`, `actor-view-sourced-from-dst`, `cl-contract`, `ephemeral-not-persisted` | advisory: `god-aggregate` |
| 03c-ux-design | 03c-ux-design.md | actor views | ux-design-report | `files-exist` | |
| 04-specification | 04-specification.md | aggregates, frontend-arch, stories | features/, journeys/, contracts/, test-strategy, threat-model | `files-exist`, `gherkin-actor-matches-dst`, `e2e-story-coverage`, `cl-contract`, `test-stack-matrix` | |
| 05-delivery | 05-delivery.md | 02, 04, assessment-2 lock | pipeline, deployment-strategy, observability/, runbooks/, iac/, k8s/ | `files-exist`, `decision-not-restated`, `e2e-story-coverage` | `requires_lock: assessment-2` |
| 06-review | 06-review.md | 00–05 | viewpoints/, adrs/, perspectives | `files-exist`, `docs-events-match-storm`, `glossary-origin` | **`reviewer: true`** |
| 07-documentation | 07-documentation.md | 06 + storm | c4/, sequence/, state/, domain/ | `files-exist`, `docs-events-match-storm` | |
| 08-implementation | 08-implementation.md | 全部 + assessment-8 lock | services/, frontend/, shared-kernel/ | `files-exist`, `framework-version-matrix`, `source-fingerprint`, `cl-contract` | **`reviewer: true`**、`requires_lock: assessment-8` |
| 09-deploy | 09-deploy.md | 08 + iac + MVP stories | implementation-report | `files-exist`, `decision-not-restated`, `e2e-story-coverage` | `requires_lock: assessment-2` |

進 02 前若 assessment-2 未 lock → `ask-assessment`；已 lock 但答案被改過 → `blocked`。
進 08 前 assessment-8 同理。

### Scope

`engine/data/scopes.yaml` 是 graph 的具名子集，`scope --set` 切換：

| scope | 相位 | 用途 |
|-------|------|------|
| `system` | 全部 | 需求到部署的完整約束鏈 |
| `patch` | 03、04、08 | 改既有 BC，不重新探索整間店 |
| `implement` | 08、09 | 設計已完成，只生成與部署 |

## 5. Sensor 目錄

全部 22 個都已實作並註冊（另見 `docs/acg-generalization-plan.md`：適用性條件與 profile）（`bun engine/src/acg.ts sensors`）。決定性檢查 blocking；
`quality-report-written` 與 `god-aggregate` 是 advisory（報但不擋）。

| id | blocking | 掛在 | 失敗條件（咖啡店必須能演示） |
|----|----------|------|------------------------------|
| `files-exist` | 是 | 全部 | consumes 宣告的輸入不在磁碟上，或是空目錄 |
| `schema-dst` | 是 | 01a | 散文 DST、缺 `steps`/`class`/`system_visible` |
| `story-map-coverage` | 是 | 01a | MVP `US-*` 沒有任何 `DS-*` 覆蓋；故事 backbone 不是 Story Map 活動；`covered_by` 指向不存在的故事，或該故事的 `covers` 沒回指這個 US（單向宣稱） |
| `dst-storm-correspondence` | 是 | 01b | 可見 state-change/handoff 無 `sourced_from`；Storm actor-command 無 DST 句子；事件 actor 與 DST 主詞矛盾 |
| `hotspot-classified` | 是 | 01b | hot spot 沒標 `kind`；**open 的 `work-unknown`**（工作模型不完整，要退回 01a）；resolved 卻沒寫 resolution；`location` 不是本 storm 的事件或命令 |
| `swimlane-is-story` | 是 | 01c | 泳道沒有 `story:`；DST `class: read` 步驟沒有對應讀模型 |
| `handoff-equals-context-map` | 是 | 02 | 跨 BC 的 DST handoff 不在 Context Map 邊上。actor→BC 由 BC `commands` × Storm actor **推導**，不是硬編表 |
| `actor-view-sourced-from-dst` | 是 | 03 | 頁面沒有 `sourced_from`；引用不存在或 `system_visible: false` 的步驟。**路由對核在 08**（router 是 08 的產物，在 03 要求它會讓 greenfield UI 專案永遠過不了 03）|
| `ephemeral-not-persisted` | 是 | 03 | 只在 `medium: spoken` 且不可見步驟出現的 work object（口頭 DrinkChoice）變成實體、值物件或表。Table／Cash／Material 這類物理但不可見的東西不算——那是東西，不是話 |
| `cl-contract-declared` | 是 | 03 | CL-1..CL-8 沒宣告或沒有 rule；query param 沒標 `semantic_filter`/`enum_literal` |
| `cl-contract-specified` | 是 | 04、08 | 某項檢查在 Phase 4 沒有對應場景，也沒寫 `current_status: Not applicable` |
| `test-stack-matrix` | 是 | 04 | `test-strategy.yaml` 寫 Jest／pytest，而 `assessment-8` 鎖的是 `vitest-…`、`backend_language: java-21`（計畫 §2 Phase 4 原話：「禁止寫 Jest 而實作是 JUnit」）。Pact／k6／Lighthouse 這類契約與負載工具不受問卷約束 |
| `gherkin-actor-matches-dst` | 是 | 04 | `ordering.feature` 用 cashier 下單，DST/Storm 是 Waiter。命令片語由 Storm command 名稱推導（`RequestReplenishment` → 「requests replenishment」），actor 同義詞由 glossary `aliases` 解析（cashier → Counter Staff），engine 裡沒有咖啡店字典 |
| `e2e-story-coverage` | 是 | 04、05、09 | to-be 故事沒有 `features/journeys/DS-xx-*.feature`，或沒進 pipeline 煙霧清單 |
| `decision-not-restated`（原 `decision-not-restated`）| 是 | 05、09 | 已鎖答案被抄成字面量且不一致。要查哪些檔案由 profile 決定（CDK 讀 `.ts`、Terraform 讀 `.tf`、無雲回 `na`）。讀 lock 而非寫字面量的來源標為 `<derived>`，不參與比對 |
| `docs-events-match-storm` | 是 | 06、07 | 圖裡出現 `OrderPaid` 這種 Storm 沒有的事件名 |
| `framework-version-matrix`（原 `framework-version-matrix`）| 是 | 08 | 問卷選 4.x、建置檔是 3.4.4，且 `backend_framework_resolved` 空白。建置檔位置依 `backend_ecosystem` 從 profile 取（gradle／maven／package.json／pyproject／go.mod）|
| `source-fingerprint` | 是 | 08 | Storm 事件沒有對應型別；`router.tsx` 有 Actor View 沒宣告的路由；沒有以 `DS-xx` 命名的 E2E 檔 |
| `glossary-origin` | 是 | 06（01a advisory） | 詞條沒有 `origin`；Outbox/DLQ 這類基礎設施詞沒標 `origin: technical`；DST `discovered_terms` 不在 glossary |
| `quality-report-written` | 否 | 00 | `gate` 跑完沒寫 report 檔（代表有人在引擎外面跑閘門） |
| `god-aggregate` | 否 | 03 | 聚合 command > 7、entity > 5，或完全沒有 invariant |

Sensor **不准 throw**：檔案不存在或 YAML 壞掉都是 finding。registry 也接住例外，
免得一個壞檔讓整個閘門下線。

Sensor 也**不准靜默通過**：評估不了要回 `na` 並說明原因（哪個已鎖答案排除它、
profile 缺哪一項），永遠不准回 `pass`。

第二期的語意 advisory（貧血模型、Smart UI、Big Ball of Mud）留給人與
`acg-reviewer` 子代理；God Aggregate 的決定性部分（command/entity 計數）已先做。

每次 `gate` / `report` 把結果寫入 `.arch/quality-reports/{phase}.yaml`，
符合 `artifact-schemas/quality-report.schema.yaml`（v1.1 新增 `advisory` category）。

## 6. 實作切片與完成定義

### 切片 0 — 本文件 ✅

- [x] 寫下歷程、引擎、sensor、切片、不做清單。

### 切片 1 — 圖 + 狀態機 + CLI ✅

**做：** `phase-graph.yaml`、`acg-state.yaml` schema、`next/report/status/import/gate`。

**完成定義：**

- `status` 讀得到咖啡店各相六態。
- `next --json` 在有 blockers 時 `action=blocked`，不讓 conductor 猜下一相。
- 手改 checkbox 的唯一正途是 CLI；測試覆蓋非法轉移。

### 切片 2 — DST 契約 + 咖啡店故事重寫 ✅

**做：** JSON Schema；把 `01-order-to-serve.yaml` 拆成句子故事（至少 DS-01 點餐到完成、DS-02 補貨）；event-storm 補 `sourced_from`。

**完成定義：** `schema-dst` 對新故事綠；對舊散文紅（fixture 可留一份舊檔在 `engine/tests/fixtures/`）。

### 切片 3 — 對核 sensor（dst-storm + gherkin-actor）✅

**完成定義：**

- 刪 `OrderPlaced.sourced_from` → `dst-storm` 紅。
- 現有 `ordering.feature`（cashier places）→ `gherkin-actor` **必須紅**。

### 切片 4 — Assessment YAML + region fingerprint ✅

**做：** 從 `assessment-2.md` 抽出 `assessment-2.yaml`（region=`ap-east-2`）；sensor 比對 `iac/config/staging.ts`、`scripts/deploy.sh`、`deployment-strategy.yaml`。

**完成定義：** 對當前咖啡店 **必須紅**。這是「引擎是否接上約束鏈」的試金石。

### 切片 5 — Phase frontmatter + conductor 協議 + 09-deploy.md ✅

**做：** 各 `phase/*.md` 加機器 frontmatter（id/consumes/produces/sensors）；`architect.md` 加上引擎迴圈，保留方法論說明但完成權交引擎；補 `09-deploy.md`。

### 切片 6 — Write/Stop hook、PreCompact、audit 分片 ✅

**做：**

- `engine/hooks/guard-write.ts`（PreToolUse）：`.arch/acg-state.yaml`、`.arch/audit/`、
  `.arch/quality-reports/` 對任何 agent 工具一律 deny；同時執行 intent 隔離。
- `engine/hooks/stop-next.ts`（Stop）：相位還停在 `[-]` 就 block，要求先 `report`。
  `stop_hook_active` 時閉嘴，不迴圈。
- `engine/hooks/precompact-breadcrumb.ts`（PreCompact）：把六態板與 cursor 寫進
  `.arch/audit/breadcrumb.md`，壓縮後的 conductor 讀它，不靠 `ls` 猜。
- `src/guard.ts`：`ACG_ENGINE=1` 標記。`saveState` 沒有標記直接丟錯，
  所以連函式庫誤用都擋。
- audit 依月分片（`.arch/audit/2026-09.md`），`local.md` 退成索引。
- 三個 hook 都 **fail open**：自己壞掉不准中斷使用者的 session（狀態檔那條除外，
  那條 deny 本身就是目的）。

**完成定義：** hook 以真實 stdin payload 測試；`ACG_GUARD=off` 是文件化的逃生門，
給「正在改引擎本身」用。

### 切片 7 — `docs-events`、`actor-view-sourced`、相容矩陣 ✅

**做：** 三個 sensor 接上 phase graph（06/07、03、08）；新增
`.arch/assessment-8.yaml` 與 `artifact-schemas/assessment-8.schema.json`；
`assess-lock` 改成 per-assessment 必填欄位；`lockIntegrity` 偵測鎖後改答案。

**完成定義：**

- `docs-events` 對真實 `07-documentation/` **紅**（`OrderPaid` × 5、
  `PreparationCompleted`、`InventoryDeducted`、`ReplenishmentDelivered`，共 14 處）。
- `actor-view-sourced` 對真實 `router.tsx` **紅**（9 頁 declared、4 條路由 implemented）。
- `framework-version-matrix` 對「問卷 4.x vs gradle 3.4.4」**紅**；填了
  `backend_framework_resolved: spring-boot-3.4.4` 才綠。這是「問卷不准偷偷同意建置檔」。
- importer 不再把「有產物但 lock 沒鎖」的相位標成 `[x]`。

### 切片 8 — 煙霧 = MVP 故事 ID；`deploy.sh` 讀 fingerprint ✅

**做：**

- `pipeline.yaml` 的 `smoke_test` 從手寫步驟清單改成 `stories: [DS-01, DS-02, DS-03]`，
  每筆帶 journey 檔路徑與 actor；`error_resilience.per_story` 指定
  「scale 哪個服務到 0、檢查哪個 DST actor 的哪句 `error_state`」。
- 新增 `features/journeys/DS-01|DS-02|DS-03-*.feature`——Phase 4 的旅程層，
  每個 step 註明它重放哪個 DST 步驟。規則層留在原本的 `*.feature`。
- 新增 DS-03（US-19/US-20 原本沒有任何故事覆蓋）。
- `scripts/deploy.sh` 不再寫 `AWS_REGION="us-east-1"`，改成
  `bun engine/src/acg.ts locked-answer --id assessment-2 --key region`。
  `locked-answer` 在未鎖或被改過時拒絕回答。
- `decision-not-restated` 認得「讀 lock」的來源，標為 `<derived from lock>` 不參與比對。

**完成定義：** `e2e-story-coverage` 綠；`decision-not-restated` 仍紅，
但紅的原因只剩 `iac/config/*.ts`——`deploy.sh` 已經不可能漂移。

### 切片 9 — intent 隔離、`patch` scope、學習迴圈、獨立 reviewer ✅

**做：**

- **intent 隔離**（`src/intent.ts`）：`next` 的 directive 帶
  `intent.allowed_writes` / `forbidden_writes`。跑 03-tactical 時寫
  `services/**` 會被 hook 拒絕，理由是「那是 08-implementation 的產物」。
  沒有任何相位宣告的路徑（`docs/`、`engine/`、`README.md`）照常可寫——
  這條規則是為了擋「設計相位偷偷產 Java」，不是為了凍結 repo。
- **scope**：`scopes.yaml` 真正接上 `orderedPhases`。`scope --set patch` 只留
  03/04/08，`implement` 只留 08/09，切換時保留共用相位的既有狀態。
- **學習迴圈**（`src/lessons.ts`）：`.arch/audit/lessons.yaml` 累計
  「哪個 sensor 擋了哪個相位幾次」，`next` 把重複 ≥2 次的交回 conductor，
  `acg.ts lessons` 給人看。不是訓練模型，是不讓同一個謊被寫第三遍。
- **獨立 reviewer**：`.claude/agents/acg-reviewer.md`，工具只有 `Read/Grep/Glob`——
  結構上不可能自己批自己。`reviewer: true` 的相位（06、08）在
  `awaiting_approval` 時 `next` 回 `await-review`；沒有 `review --verdict approved`
  就拒絕 `report --result approved`。
- 另外補上計畫 §3.3 列了但先前沒實作的 `jump`，以及 §3.1 的 `doctor`：
  `doctor` 對核 phase graph、`phase/*.md` frontmatter（produces / sensors /
  requires_lock / reviewer）、consumes 是否在磁碟上、每個 lock 的指紋。
  128 項檢查，一項不合就 exit 2。

**完成定義：** 全綠 `doctor`（128 項）；`bun test` 174 個測試涵蓋六態非法轉移、
intent 判定、鎖竄改、hook payload、以及六個「必須紅」的謊言。

## 7. 實際改了哪些檔

**引擎（全新）**

- `engine/src/`：`acg.ts`、`orchestrate.ts`、`state.ts`、`graph.ts`、`intent.ts`、
  `assess.ts`、`importer.ts`、`lessons.ts`、`audit.ts`、`guard.ts`、`paths.ts`、
  `load.ts`、`types.ts`
- `engine/src/sensors/`：20 個 sensor + `registry.ts` + `util.ts`
- `engine/hooks/`：`guard-write.ts`、`stop-next.ts`、`precompact-breadcrumb.ts`
- `engine/data/`：`phase-graph.yaml`、`scopes.yaml`
- `engine/tests/`：`state`、`sensors`、`orchestrate`、`intent`、`assess`、`cli` +
  `helpers.ts`、`preload.ts`、`fixtures/prose-story.yaml`
- `engine/README.md`、`bunfig.toml`、`tsconfig.json`（`bun run typecheck` 可用）

**Schema（全新）**

- `artifact-schemas/domain-story.schema.json`
- `artifact-schemas/assessment-2.schema.json`、`assessment-8.schema.json`
- `artifact-schemas/acg-state.schema.json`（引擎輸出有測試對核）

**Harness（全新）**

- `.claude/settings.json`：三個 hook
- `.claude/agents/acg-reviewer.md`：獨立 reviewer 子代理
- `.claude/commands/phase/09-deploy.md`

**產物（全新）**

- `.arch/acg-state.yaml`（import 生成，引擎獨佔）
- `.arch/assessment-2.yaml`、`.arch/assessment-8.yaml`
- `.arch/audit/`（月分片 + `local.md` 索引 + `breadcrumb.md` + `lessons.yaml`）
- `.arch/quality-reports/*.yaml`（13 相）
- `.arch/01-discovery/domain-stories/01-order-to-serve.yaml`（改寫成句子）
- `.arch/01-discovery/domain-stories/02-replenishment.yaml`（從原檔拆出）
- `.arch/01-discovery/domain-stories/03-daily-reporting.yaml`（US-19/20 原本沒人覆蓋）
- `.arch/04-specification/features/journeys/DS-0{1,2,3}-*.feature`

**產物（修改）**

- `.arch/01-discovery/event-storm.yaml`：每個事件 `sourced_from`
- `.arch/01-discovery/event-model.yaml`：泳道標 `story:`；讀模型改用 UL 名稱
  （`Ready for Pickup` → `ReadyOrders`、`Current Stock Levels` → `Inventory`、
  `Active Alerts` → `Low-Stock Alert`）
- `.arch/03-tactical/frontend-architecture.yaml`：9 頁全部 `sourced_from`；
  修掉 `ordersByHour` 那行讓整份檔案無法解析的 YAML 錯誤
- `.arch/04-specification/features/query-endpoints.feature`：標記 CL-1 場景
- `.arch/05-delivery/pipeline.yaml`：煙霧 = 故事 ID；錯誤韌性 per story per actor
- `.arch/glossary.yaml`：34 詞標 `origin`；補 5 個 DST 發現但沒記的詞
- `scripts/deploy.sh`：region 改讀 `locked-answer`
- `.claude/commands/architect.md`：conductor 協議（含 `await-review`、intent、never 清單）
- `.claude/commands/phase/*.md`：frontmatter 與 graph 對核
- `.claude/commands/util/quality-gate.md`：哪些檢查已決定性、哪些還是人的工作
- `.claude/commands/util/assessment.md`：YAML lock、指紋竄改、`locked-answer`
- `artifact-schemas/quality-report.schema.yaml`：v1.1，新增 `advisory` category

**故意不改（紅燈 fixture）**

- `ordering.feature` 的 cashier
- `iac/config/staging.ts` / `production.ts` 的 `us-east-1`
- `sequence-order-lifecycle.md` 等 14 處 `OrderPaid` / `PreparationCompleted`
- `frontend/src/router.tsx` 只有 4 條路由
- `build.gradle.kts` 的 Spring Boot 3.4.4（問卷寫 4.x）
- 業務 Java/React（這不是咖啡店功能開發）

## 8. 測試策略（引擎）

全部 `bun test`，不打網路、不打 AWS。174 個測試、6 個檔。

寫入型測試用 `.arch/` 的暫存複本（`tests/helpers.ts` 的 `scratchRoot`），
所以 `bun test` **不會**改到本專案自己的 `acg-state.yaml`——原本的第一刀測試會。

| 測試 | 期望 |
|------|------|
| 六態轉移表 | 非法 `[x]→[-]`、`[ ]→[x]`、`[ ]→[?]` 都丟錯；`[?]→approved→[x]` 合法 |
| `saveState` 無 `ACG_ENGINE` | 丟錯，且檔案沒被建立 |
| import 咖啡店 | 有產物且 sensor 綠的相位是 `[x]`；紅的是 `[R]` 並帶 blockers；空目錄不算產物 |
| import + lock 未鎖 | 有產物也不給 `[x]` |
| `next` | 停在第一個 `[R]`，不越過；`run-phase` 帶 intent；`pending→in_progress` 只發生一次 |
| `next` + 鎖被改過 | `blocked`，訊息說 answers changed after lock |
| `report --result approved` 對紅相位 | 拒絕，相位退回 `[R]` |
| reviewer 相位無 verdict | 拒絕 approved；`next` 回 `await-review` |
| `jump` | 目標之前未完成的相位變 `[S]` 並記 reason；已完成的不動 |
| `redo` | 串聯到後面所有相位；`--only` 只動一個 |
| scope | `patch` 只有 3 相；切換保留既有狀態；未知 scope 列出真的有哪些 |
| intent | 設計相位寫 `services/**` 被拒；08 可以；`docs/`、`engine/` 永遠可寫 |
| 學習迴圈 | 同一 sensor 擋兩次後 `next` 把 lesson 交回 |
| `doctor` 對真實 repo | 128/128 全綠 |
| acg-state.yaml | 引擎輸出通過 `acg-state.schema.json` |
| hook payload | 狀態檔 deny、本相位產物 allow、壞 JSON fail open、`[-]` 相位 Stop block |
| `hotspot-classified` | 沒標 `kind`、open 的 `work-unknown`、resolved 沒 resolution、location 不存在、`sourced_from` 不存在 → fail |
| `story-map-coverage` 雙向 | `covered_by: DS-99` → fail；US-01 宣稱 DS-02 但 DS-02 沒回指 → fail；`pending_story` 不算錯 |
| `ephemeral-not-persisted` | DrinkChoice 變成 entity 或 `drink_choice` 表 → fail；Table／Cash／Material 不誤報 |
| `test-stack-matrix` | Jest／pytest／Cypress 不在鎖裡 → fail；Pact／k6 不受約束 |
| `schema-dst` 散文 fixture / 句子故事 | fail / pass |
| `dst-storm` 去掉 `sourced_from` | **fail**（雙向：步驟沒事件、命令沒句子） |
| `gherkin-actor` 對真實 `ordering.feature` | **fail** |
| `decision-not-restated` 對真實 repo | **fail**，同時列出 `ap-east-2` 與 `us-east-1`，並顯示 `deploy.sh=<derived from lock>` |
| `docs-events` 對真實 `07-documentation/` | **fail**（`OrderPaid`）；目錄不存在時不算 fail |
| `framework-version-matrix` | **fail**；填 `_resolved` 後 pass |
| `source-fingerprint` | **fail**（`OrderDelivered` 無型別、`cashier` 路由無 Actor View、無 DS 命名 E2E） |
| `actor-view-sourced` | **fail**（router 缺 7 頁）；引用 `system_visible: false` 步驟也 fail |
| `cl-contract` | 少一個 CL 宣告、query param 沒分類、Phase 4 沒場景 → fail；`CL-7` 寫 Not applicable 不算 |
| `glossary-origin` | 技術詞沒標 `technical`、詞條沒 `origin`、DST 詞沒進 glossary → fail |

## 9. Conductor 與人怎麼用

```bash
bun engine/src/acg.ts import          # 一次，從現有 .arch 建狀態
bun engine/src/acg.ts status
bun engine/src/acg.ts next --json
bun engine/src/acg.ts gate --phase 05-delivery
bun engine/src/acg.ts doctor          # 圖／frontmatter／輸入／鎖有沒有漂
bun engine/src/acg.ts lessons         # 哪個 sensor 一直在擋
```

在 Claude / Grok 裡跑 `/architect`：每回合先讀 `next`，照 directive 做，再 `report`。
人批關卡後 `report --result approved`。sensor 紅，引擎拒絕 approved。
`reviewer: true` 的相位要先跑 `acg-reviewer` 子代理再 `review --verdict`。

hook 已裝在 `.claude/settings.json`：手改 `.arch/acg-state.yaml` 會被拒絕，
相位停在 `[-]` 就結束回合會被要求先 `report`，壓縮前會留下 breadcrumb。
改引擎本身時用 `ACG_GUARD=off`。

## 10. 風險與刻意的不完美

- **紅燈是驗收條件，不是待辦。** cashier／region／`OrderPaid`／router／Spring Boot
  仍然紅。修它們是產品決策（改 Gherkin、改部署區、或正式記錄「示範覆蓋」並走
  `redo`）。引擎的工作是報得出來，不是替人決定。
- Phase 1 三閘仍共用 `01-discovery.md`，靠 `step` 與 frontmatter `stages:` 區分，
  避免一次拆爆指令檔。
- `handoff-equals-context-map` 的 actor→BC 是從 BC `commands` × Storm actor 推導的。
  BC 沒列命令的 actor 會得到 warn（「無法把這個 actor 放進任何 BC」），不是靜默通過。
- `docs-events` 用命名樣式（`*Placed`、`*Processed`…）認事件，會漏掉不照慣例命名的
  發明事件。這是刻意的：寧可漏報，不要每份文件都在吵普通名詞。
- `gherkin-actor` 同理會低報：句子寫成 "marks the order delivered" 不會對到
  `DeliverOrder` 推導出的「delivers order」。漏一種改寫，勝過跟測試套件裡每個英文句子吵架。
- `source-fingerprint` 只認型別名存在，不驗欄位。欄位層的對核是 CL 契約的工作。
- hook 只在 Claude Code harness 生效。換 harness 時，`check-write` 與 `status`
  仍可用，但沒有東西替你強制執行——文件與 CLI 就位，強制是 harness 的事。
- 學習迴圈只計數，不改行為。它不會自動放寬任何 sensor。

## 11. 對「DST + Storm 都用」的計畫內結論

Event Storming 回答系統必須記得什麼。Domain Storytelling 回答人怎麼合作、什麼換手、哪步不該進系統。擇一夠開工作坊。兩個都用且互相 `sourced_from`，才夠從需求生成不能亂寫的 code，並在雲上用同一則 `DS-01` 做煙霧。

引擎的工作不是發明第 21 種方法論，是拒絕任何不引用故事 ID 的完成標記。
