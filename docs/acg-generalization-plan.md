# ACG 通用化計畫

> 咖啡店是**範例**，不是產品。使用者會帶自己的領域進來：可能沒有前端、不用 AWS、
> 不寫 Java、用中文寫領域模型。這份計畫把「只有咖啡店能綠」的部分拆掉。
>
> 前置：`docs/acg-engine-development-plan.md`（切片 0–9，引擎本體）。
> 狀態：**G0–G6 全部落地，並且已用一次真實的端到端排演驗證過。**
> `bun run test` 74 個（領域中立，含整圈 conductor loop）、
> `bun run test:sample` 193 個（範例）、`doctor` 138/138。

---

## 0. 為什麼要做

引擎已經能擋住咖啡店的謊。問題是它**只**擋得住咖啡店的謊。實測：

| 量測 | 結果 |
|------|------|
| 空專案（無 AWS／無前端／無 Java）跑 blocking sensor | `region-fingerprint`、`actor-view-sourced-from-dst`、`cl-contract`、`spring-boot-matrix` **四個立刻 fail** → Phase 3／5／8 全部進不去 |
| 引擎測試引用真實咖啡店 `.arch/` | 41／179 |
| 中文領域模型 | `norm("飲料選擇") = ""`，而 `"x".includes("")` 為真 → **任兩個中文 actor 都「相符」**；`dst-storm` 的 actor 對核、`swimlane-is-story` 的讀模型比對變成空過 |
| 硬編路徑／生態假設 | 6 處，散在 4 個 sensor |

21 個 sensor 裡 12 個只讀 `.arch/`（領域中立），7 個綁生態，另有一個跨切面的 i18n 缺陷。

---

## 1. 原則（不可退讓）

1. **規則留在引擎，位置進 profile。** 「已鎖的決策不准被抄成字面量」是規則；
   `iac/config/staging.ts` 是位置。前者是引擎的，後者不是。
2. **「不適用」由已鎖的問卷答案推導，不由使用者改 graph。** 誰的 sensor 紅就把它從
   `phase-graph.yaml` 刪掉，整個「引擎決定、prompt 不決定」就崩了。適用性走
   assessment lock 那套現成的指紋 + 竄改偵測。
3. **評估不了要回 `n/a`，永遠不准回 `pass`。** 靜默通過比 fail 危險。
4. **n/a 必須寫進 quality report。** 「宣稱不適用」本身要可審計。
5. **引擎的測試不准依賴範例領域。** 而且要**刻意放兩個彼此不像的 fixture**，
   否則「可通用」只是假設。
6. **`acg init` 產出的板子要誠實地全部 `[ ]`。** 範例的 5 個示範紅燈只活在 fixture 裡。
7. **不做**：多 harness、swarm、學習迴圈改行為、把 CL-1..8 擴成 20 條。

---

## 2. 切片

### 切片 G0 — 本文件 ✅

### 切片 G1 — `n/a` 狀態與 i18n（P4）✅

**做：**

- `SensorFinding.status` 加 `"na"`，一律 `blocking: false`；`blockingFails` 不受影響；
  quality report 顯示 `na`；`acg-state.schema.json` / `quality-report.schema.yaml` 同步。
- 新 `src/text.ts`：Unicode-aware `normalizeKey()`（`toLocaleLowerCase` +
  只剝 `\p{P}\p{Z}`），**空字串回 `null`**。
- 所有用 `norm()` 的 sensor 改用它。key 為 null 時回 n/a 或明確 finding，
  **不得當萬用字元**。`actorsMatch` 禁止在空字串上做 substring。
- `gherkin-actor` 讀 feature 的 `# language:` 標頭；非英文且沒有對應關鍵字組時
  大聲回 n/a，不空過。

**完成定義：** 中文 fixture 下 `actorsMatch("服務生","咖啡師")` 為 false；
`swimlane-is-story` 對中文讀模型不再空過；有測試釘住「空 key 不是萬用字元」。

### 切片 G2 — 適用性條件（P1 + P5）✅

**做：**

- `phase-graph.yaml` 的 sensor 可寫成 `{ id, when }`；`produces` 可寫成
  `{ path, when }`。條件語言故意極小：
  `when: { assessment: assessment-8, key: frontend_framework, not: none }`
  （支援 `equals` / `not` / `in` / `not_in` / `present`）。
- `src/applicability.ts`：對已鎖答案求值。問卷未鎖 → n/a 並說明原因，不 fail。
- `runSensors` 收適用性；被跳過的 sensor 產出 `n/a` finding（可審計，不是消失）。
- `importer`：`when` 不成立的 produces 不列入「必須存在」。
- `doctor`：每個 `when` 引用的 assessment key 必須真的在該問卷的 schema 裡。

**完成定義：** `frontend_framework: none` 的專案，`cl-contract` /
`actor-view-sourced-from-dst` 回 n/a 而非 fail，08 的 `frontend/` 不再是完成條件；
改這個答案會觸發 `redo`。

### 切片 G3 — Profile 化（P2 + P7）✅

**做：**

- `engine/data/profiles/*.yaml`：`aws-cdk-ts`、`terraform-aws`、`gcp-terraform`、
  `none`。profile 說「值住在哪」：檔案 + pattern。
- `region-fingerprint` → **`decision-not-restated`**：通用規則「已鎖答案不准在任何
  地方被抄成字面量」，來源清單來自 profile（`pinned_values`）。
- `spring-boot-matrix` → **`framework-version-matrix`**：每個生態一張建置檔表
  （gradle／maven／package.json／pyproject／go.mod）。
- `actor-view-sourced-from-dst`、`source-fingerprint`：router 位置、路徑語法、
  source root、副檔名都來自 profile。
- `cl-contract`：check **整組**可選（`http-json-jackson` 預設、`grpc-proto`、`none`）。
  CL-6 是 Java `is` 前綴的坑，對 gRPC 不是「路徑不同」而是「該檢查的八件事不同」。
- `glossary-origin` 的技術詞清單、`docs-events` 的事件字彙 → 移到
  `.arch/glossary-policy.yaml` / profile。領域本身就是基礎設施的團隊不該被逼把
  核心語言標成 `technical`。
- `messaging-matches-context-map`：messaging 檔位置來自 profile。

**完成定義：** 同一組 sensor 在 `terraform-aws` profile 下讀 `.tf` 而不是 `.ts`；
`profile: none` 的專案不會因為「沒有雲」而卡住。

### 切片 G4 — Fixture 分離（P3）✅

**做：**

- `engine/tests/fixtures/domains/parcel-locker/`：有前端 + 雲，證明完整鏈。
- `engine/tests/fixtures/domains/etl-batch/`：無前端、無雲、Python、**中文領域語言**，
  證明 n/a 路徑與 i18n。
- sensor 測試改跑 fixture，不跑 `.arch/`。
- 咖啡店的「5 個示範紅燈」搬成獨立的 `tests/sample-coffeeshop.test.ts`，
  它可以依賴範例，因為它就是關於範例的。

**完成定義：** 換掉 `.arch/` 之後 `bun test` 仍然全綠，只有
`sample-coffeeshop.test.ts` 會（且應該）失敗，並且它的檔名說明了原因。

### 切片 G5 — `acg init` 與採用路徑（P6 + P8）✅

**做：**

- `acg init [--profile <id>] [--project <name>] [--dir <path>]`：建 `.arch/` 骨架與
  `.arch/acg-project.yaml`（name / profile / language），需要時複製 schema，印下一步。
- `repoRoot()` 放寬：認 `.arch/acg-project.yaml`、再退到 `.arch/`、再退到 git root，
  不再硬要 `artifact-schemas/` + `.claude/` 同時存在。
- `project` 預設值不再是 `coffeeshop`，從 `acg-project.yaml` 讀。
- `docs/adopting-acg.md`：怎麼把 ACG 帶進既有專案，以及 fork 範例時要清掉什麼。

**完成定義：** 在一個空目錄跑 `acg init` 後 `status` 全部 `[ ]`，`doctor` 綠，
`next` 回 `run-phase 00-requirements`。

### 切片 G6 — 文件收斂 ✅

### 切片 G7 — 端到端排演（CLI，手動扮演 conductor）✅

**做：** 真的從 `acg init` 跑到 `done` 一次（見 §2.6），把它固化成
`tests/workflow-loop.test.ts`。

**完成定義：** `runToCompletion` 只做 conductor 協議允許的事
（`next` → 照 directive 做 → `report`／`review`），不得直接改狀態；
一個與範例形狀不同的專案能跑完；9 個 bug 全部有測試釘住。

### 切片 G8 — 真的用 `/architect` 跑（LLM 當 conductor）✅

**做：** 見 §2.7。三次驗證的形狀刻意互不相同：

| | 形狀 | 誰驅動 | 抓到 |
|---|---|---|---|
| G7 | CLI、自架、Python、無 UI | 我手動跑 CLI | 9 個 |
| G8 | SPA、AWS/CDK、三個 actor | `/architect` 真跑，LLM 照協議 | 5 個（含 2 個致命） |
| 範例 | SPA、AWS/EKS、Java | `import` 既有產物 | 0（產物早就存在） |

最後一列正是為什麼前面那些 bug 藏得住：**`import` 一個做完的專案，永遠不會發現
「相位 N 的 sensor 要求相位 N+k 的產物」。**

`README.md`、`engine/README.md`、`architect.md`、`quality-gate.md`、
`docs/acg-engine-development-plan.md` 同步 profile／n/a／init 的存在。

---

## 2.5 實際成果

| 量測 | 之前 | 之後 |
|------|------|------|
| 空專案（無 UI／無雲／非 JVM）的 blocking sensor | 4 個立刻 fail，Phase 3／5／8 進不去 | 全部回 `na` 並附上是哪個已鎖答案排除它；03c 標 `[S]` 並記原因 |
| 中文 actor 比對 | `namesMatch("服務生","咖啡師")` = **true** | false；空 key 一律拒絕，不當萬用字元 |
| 引擎測試對範例的依賴 | 41／179 | `bun run test` 66 個完全不讀 `.arch/`；範例相關的 191 個獨立成 `test:sample` |
| 硬編路徑 | 6 處散在 4 個 sensor | 0；全部進 5 個 profile |
| 新專案第一次跑 | 只能在本 repo 的 clone 裡跑 | `acg init` 後 `status` 全 `[ ]`、`doctor` 139/139 綠 |

新增 CLI：`init`、`profile`。改名：`region-fingerprint` → `decision-not-restated`、
`spring-boot-matrix` → `framework-version-matrix`（規則不再叫得像它只認 AWS 和 Spring）。

## 2.6 端到端排演（G7）✅

前面每一片都只驗證了「零件」。狀態機、單一 sensor、單一 directive 都有測試，
但**從來沒有人把一個相位從 `[ ]` 開到 `[x]`** —— 咖啡店的產物全是既有的，引擎只是
`import` 它們。

所以做了一次真實排演：一個 CLI 形狀、自架、Python 的縮網址服務，
從 `acg init` 開到 `done`。**單元測試全綠的情況下，這次排演抓出 9 個 bug：**

| # | Bug | 為什麼單元測試看不到 |
|---|-----|---------------------|
| 1 | `test-stack-matrix` 在 Phase 4 就擋，但它讀的是 Phase 8 才該鎖的問卷 | 只有依序跑完 0→4 才會遇到 |
| 2 | 沒有任何相位 produce `.arch/glossary.yaml`，但 `glossary-origin` 在 06 擋 | import 進來的專案已經有 glossary |
| 3 | §2 Phase 0 的 `covered_by: pending_story` 永遠填不了 —— intent 隔離禁止 01a 寫 story-map | 需要真的在 01a 想去改它才會撞到 |
| 4 | `quality-report-written` 在每個相位第一次 gate 都誤警（報告是 gate 之後才寫的） | 單測直接刪掉報告來斷言 warn，剛好符合錯的行為 |
| 5 | `source-fingerprint` 對「沒有 UI」的專案把「缺 frontend-architecture」報成 fail | 咖啡店有 UI |
| 6 | test 檔案命名慣例是 JS 形狀的，`tests/test_DS-01_x.py` 完全對不到 | 咖啡店是 TS |
| 7 | `init` 複製 skills，之後引擎的圖前進，使用者的副本就過期，而且沒有辦法更新 | 只有真的用 `init` 開一個專案才會遇到 |
| 8 | `doctor` 對 `[S]` 跳過的相位仍要求它的輸入存在 | 需要一個真的會被跳過的相位 |
| 9 | **review 被 reject 後重新送審，舊的 rejected verdict 沒清掉** —— 相位永遠無法核准，而 `next` 卻回報 `await-gate` | 需要走完「拒絕 → 修正 → 重送 → 再審」整圈 |

修法：1 改成 na 並補掛到 08（訊息承諾的「08 會再查」現在是真的）；
2 由 01a produce；3 新增 `also_writes`（**所有權**與**貢獻**是兩件事）；
4 首次 gate 回 na；5、8 回 na；6 profile 的 test_patterns 補上
Python/Go/Ruby 慣例；7 新增 `init --upgrade`（只換工具，不碰 `.arch/`）；
9 重送時清掉舊 verdict。

排演本身變成 `tests/workflow-loop.test.ts`：8 個測試，驅動整圈並斷言
「12 相完成 + 1 相跳過」、「兩份問卷各在該問的時候被問」、
「reviewer 只在該審的兩相要求審查」、「沒有 sensor 靜默通過」、
「拒絕後能復原」。**這是整個測試套件裡最有價值的一個檔案** ——
它抓到的 bug 比其他 11 個檔加起來還多。

## 2.7 用真的 `/architect` 跑一次（G8）✅

§2.6 的排演是我用 CLI 手動扮演 conductor。這一次是**真的在 Claude Code 裡 `/architect`**，
載入 `architect.md` 當指令、由 LLM 照協議驅動，跑一個
**SPA + AWS/CDK + 三個 actor** 的研討會投稿審稿系統（形狀刻意跟前兩次都不同）。

### 先驗證了 hook 真的會觸發

前面 hook 只用合成 stdin payload 測過。這次在真實 session 裡用 Write 工具去寫兩個
禁止路徑，**兩次都被擋下來**，訊息就是設計時寫的那句：

```
ACG engine: services/hook-probe.txt is produced by 08-implementation,
            not by the active phase 03-tactical.
ACG engine: .arch/acg-state.yaml is engine-owned — use acg.ts
            (report/gate/jump/redo), never a file write.
```

「conductor 不能手改 checkbox」從單元測試的斷言變成了實際做不到。

### 抓出 7 個 bug（其中 2 個是致命的）

| # | Bug | 嚴重性 |
|---|-----|--------|
| 10 | `handoff-equals-context-map` 檢查了 **0 個** handoff 卻回報 `pass`（「0 cross-BC DST handoff(s) appear on the context map」）| 違反我自己訂的「評估不了要回 na」原則 |
| 11 | `actor-view-sourced-from-dst` 在 **Phase 3** 要求 `frontend/src/router.tsx` —— 那是 **Phase 8 的產物** | **致命：任何 greenfield 的 UI 專案都過不了 Phase 3** |
| 12 | `cl-contract` 在 Phase 3 要求 Phase 4 的場景 | **致命：同一類，Phase 3 一樣過不去** |
| 13 | `e2e-story-coverage` 聲稱檢查了「pipeline smoke entries」，但當時 `pipeline.yaml` 還不存在 | 訊息誇大它做過的事 |
| 14 | `messaging-matches-context-map` 對「modulith + in-process events」要求 `iac/lib/messaging-stack.ts` —— 先載入基礎設施檔，才問這個設計有沒有 channel | 正確的設計被擋 |
| 15 | `docs-events-match-storm` 掛在 06 與 07，卻只掃 `.arch/07-documentation/`（**reviewer 抓到的**） | 06 的五份散文一個都沒掃，卻回報綠燈 |
| 16 | phase graph 把 `framework-version-matrix` 的條件寫死成 `equals: jvm`，**比 sensor 本身窄** | Node／Python／Go 專案一律靜默跳過，理由聽起來還很正當 |

**16 是另一種病：條件比 sensor 窄。** G3 已經把版本矩陣通用化成「讀 profile 為該生態
宣告的建置檔」，但 graph 的 `when:` 還停在 `equals: jvm`。結果它對 Node 專案回報
`na`，理由寫得像「這不適用」，真相是「我被叫去不要看」。修成 `not: none`，
讓 sensor 自己決定 —— profile 不認識那個生態時由它回 `na` 並說明，
決定就會出現在 quality report 裡，而不是藏在一行 `when:` 裡。

咖啡店（jvm）與第一次排演（python + `none` profile，本來就沒有建置檔）都碰不到這個 ——
需要一個「非 JVM、但 profile 認識它的建置檔」的專案才會暴露。

11 與 12 是同一個病：**相位 N 的 sensor 要求相位 N+k 的產物**。咖啡店完全看不到，
因為它的產物全都已經存在（是 `import` 進來的）。這是整個練習最重要的發現 ——
引擎照原樣出貨，**一個全新的 UI 專案根本走不到 Phase 4**。

修法：把每個 sensor 切到**擁有那份產物的相位**。

- `actor-view-sourced-from-dst`（03）只查出處：每頁引用一個 `system_visible` 的 DST 步驟。
- 路由對核搬到 `source-fingerprint`（08），而且現在查**雙向**：router 有的路由必須是
  宣告過的頁面，宣告過的頁面也必須真的被路由。咖啡店那 7 頁缺路由的謊沒有消失，
  只是改在 08 報。
- `cl-contract` 拆成 `cl-contract-declared`（03：八項都宣告且有 rule、query param 都分類）
  與 `cl-contract-specified`（04、08：每項都有場景或明說不適用）。
- 13、14 都是「先問設計、再問檔案」的順序修正。

### 順手做了一次 vacuous-pass 全面稽核

10 暴露的是一整類問題，所以把 21 個 sensor 全部掃過：
`handoff-equals-context-map`、`messaging-matches-context-map`、`ephemeral-not-persisted`、
`story-map-coverage`、`files-exist`、`e2e-story-coverage`、`docs-events-match-storm`
七個都可能在「什麼都沒檢查」的情況下回 `pass`，全部改成 `na` 並附上一句
**對讀者有意義的理由**，例如：

```
[na] handoff-equals-context-map: every DST handoff is between actors who share
     a bounded context, so none of them needs a context map edge (3 handoff(s) examined)
```

並加了一條測試：**每個 `pass` 訊息都必須包含數字** —— 說不出檢查了多少的 pass，
沒有人能審。這條測試立刻又抓到 `dst-storm-correspondence` 的 pass 訊息沒有計數。

## 2.8 獨立 reviewer 的價值，用實測講（G9）

`acg-reviewer` 是切片 9 做的，但**從來沒被真的叫起來過**。這次在 `/architect` 跑到
06-review 時第一次執行，連續三輪。

### 它抓到 sensor 結構上抓不到的東西

第一輪 **rejected**，四個 blocking，我逐條對檔案驗證後全部成立：

| 它說的 | 事實 |
|---|---|
| ADR-001 誇大了自己的證據 | 我寫「三個換手都在同一個委員會內」，但我自己的 `assessment-2.md` 第 11 行記錄 DS-03.3 Chair→Speaker 是「**Yes**, but outward」。Phase 2 謹慎地寫了「in-system」，我的 ADR 把那個限定詞丟掉了 —— 而那句話正是 modulith 的主論據 |
| 接縫清單宣稱完整，但漏了真正的問題 | `comment` 由 Reviewing 的 `ReviewRound.Review` 擁有；`OutcomePublished{comments}` 由 **Submissions** 產生；而**沒有任何 context map 邊或 contract 載它**。投稿者的通知沒有路徑拿到它承諾的資料 |
| 主席讀分數的路徑是憑空發明的 | 任何產物裡都沒有那條路徑 |
| SLO 視窗自相矛盾 | 我寫「最後 48 小時」，`sli-slo.yaml` 寫「deadline 前兩週」 |

**這四條裡有三條是任何 sensor 結構上都抓不到的**：散文與散文矛盾、payload 沒有落地
的儲存、發明出來的讀取路徑。第四條（SLO 視窗）也一樣 —— 兩份 md 互相矛盾，沒有
schema 能表達那個約束。

reviewer 自己點出了這個邊界：

> `docs-events-match-storm` cannot see this, because `ReviewRecorded` is a legal storm name.

同一相位的兩份產物對同一個投影說不同的話，而兩邊用的都是合法的事件名 ——
決定性層看不見，這正是語意審查存在的理由。

### 它還抓到一個引擎 bug（#15）

`docs-events-match-storm` 掛在 06 與 07，但**只掃 `.arch/07-documentation/`**。
在 06 它回報 `na`「還沒有文件」，而那一相位剛剛產出五份滿是事件名的檔案。
一個什麼都沒掃的綠燈 sensor，比沒有 sensor 更糟，因為閘門會把它當證據。

修成「掃這個相位自己產出的散文」之後，對咖啡店找出的不是 14 個而是 **44 個**
發明事件名 —— `OrderPaid` / `PreparationCompleted` 也長在它的 Phase 6 viewpoints 裡，
那裡從來沒有被掃過。

### 而且它抓到我的修法只做了一半

第二輪我把 reviews 放上 `TalkReadyForDecision` 的 payload（storm、context map、
contract 三個檔），reviewer 第二次 **rejected**，理由是：

> the fix landed on the wire and in the prose, but never in the receiving aggregate or
> its store … That is the original gap relocated rather than closed.

完全正確。`Talk` 聚合沒有 reviews 欄位，`bounded-contexts.yaml` 給 Submissions 的是
`tables: [talks, decisions]` —— **收到的 reviews 沒有地方放**，所以
`OutcomePublished.comments` 依然無源。它同時指出 `information_flow` 那張表沒跟著改、
`functional-viewpoint.md` 還在說單一觸發的投影、storm 的 `aggregate: Talk` 與
「`comment` 由 ReviewRound 擁有」的前提互相矛盾。

第三輪才補完：`Talk` 增加 `receivedReviews` / `ReceivedReview`，Submissions 增加
`received_reviews` 表，並且**明說哪一份是 record of truth、哪一份是 copy**。

### 順帶驗證了 feedback loop 是真的

設計缺口在 Phase 1b/2，不在 06。正確的反應是 `redo` 而不是改 review 的散文：

```
redo --phase 01b-storm
reset to pending: 01b-storm, 01c-model, 02-strategic, 03-tactical,
                  03c-ux-design, 04-specification, 05-delivery, 06-review
```

00 與 01a 保持 `[x]`，下游全部重開，改完再一路重新過閘。
這就是計畫 §2 寫的 feedback loop，第一次真的跑起來。

### 第五輪：approved —— 閘門會終止

| 輪次 | blocking | 內容 |
|------|----------|------|
| 1 | 4 | 散文與輸入矛盾 + 引擎 bug #15 |
| 2 | 3 | 修法只做了一半（payload 上了線，沒有落地的儲存） |
| 3 | 2 | 邊界改動的另一半沒跟上（`UnderReview` 不可達） |
| 4 | 1 | 實體的誕生時機從來沒被定下來 |
| 5 | **0** | **approved**，三條 concern 全是命名與紀錄，不是行為 |

它自己的結論：

> The three concerns are wording and record-keeping; none of them makes an artifact
> assert something an input denies.

這很重要 —— **這個閘門不是無法滿足的**。它在收斂，而且會停。一個永遠不批准的
reviewer 等於沒有 reviewer；一個第五輪說「這次對了」並且說得出為什麼的 reviewer，
它前四次的拒絕才有份量。

三條 carried concern（照 advisory 的規則帶著走，不因為它們而 redo）：

1. `submittable_talks` 應該叫 `submitted_talks` —— 它由 `TalkSubmitted` 餵養，
   裡面裝的是**已投稿**的 talk；「submittable」指的是投稿前的狀態，而那是唯一
   不在表裡的狀態。而且 glossary 沒有收這個新詞。
2. `GET /api/review-rounds?state=unassigned` —— 拿 review-rounds 這個資源去查
   「沒有 review round 的列」，回傳的卻是 talk。
3. `AwaitingReviewCount` 的擁有權只記在 Phase 6 的產物裡，沒進到
   `bounded-contexts.yaml` 的 `read_models`。

第 1、2 條是 ubiquitous language 的問題，正是這整套東西存在的理由 ——
但它們是 **concern 不是 blocking**，而我自己設計的規則是「advisory 要提，不要停」。
為了措辭一直 redo，就是把 advisory 當 blocking 用，那會毀掉這個區分。
要不要改是產品決策（§10），不是引擎決策。

### 它讓一條檢查從語意層升級到決定性層

第三輪之後我自己發現：`shared_enums.TalkStatus` 還在對前端提供 `UnderReview`，
而聚合已經把它刪掉了。這正是 **CL-2 自己的規則**（「enum 值必須跨層完全一致」），
但 `cl-contract-declared` 當時只檢查「shared enum 有沒有值」，沒有跟擁有它的聚合對核。

而那是**可以決定性判斷的**，所以它不該留在 reviewer 的工作裡：

```
[fail] cl-contract-declared: CL-2: shared enum TalkStatus offers [UnderReview]
       to the frontend, but Talk does not define them — a value the domain
       cannot produce
```

反向也查：聚合定義了但 shared enum 不給前端的值，同樣報紅。
**語意審查的產出之一，是找出哪些檢查本來就該是決定性的。**

### 結論

「決定性檢查 blocking、語意審查 advisory」（計畫 §1 原則 8）這條分工是對的，
但**語意審查不是可選的裝飾**。這次 12 條 finding 裡只有 1 條是 sensor 本來就該抓
（而且那個 sensor 壞了），其餘 11 條全部需要一個會讀檔案、會比對、而且不怕說
「你這句話跟你自己的輸入矛盾」的東西。

`acg-reviewer` 的工具只有 `Read/Grep/Glob` —— 它不能改檔、不能改狀態、不能批准自己。
這個限制是它可信的原因。

### 收斂的過程

| 輪次 | blocking | 內容 |
|------|----------|------|
| 1 | 4 | 散文與輸入矛盾（ADR 誇大、接縫清單、發明的讀取路徑、SLO 視窗）+ 一個引擎 bug |
| 2 | 3 | 「修法只做了一半」—— payload 上了線但沒有落地的儲存 |
| 3 | 2 | 「同一個邊界改動的另一半沒跟上」—— `UnderReview` 變成不可達狀態 |
| 4 | 1 | 「實體的誕生時機從來沒被定下來」—— contract 說投稿時建立 ReviewRound，而「未指派」的定義是沒有 ReviewRound |

每一輪都是**新的、真的、而且是前一輪修法造成的**。這不是 reviewer 在挑刺 ——
第三輪它明確說原本那條路徑「closed and traced link by link」，然後指出鏡像方向的缺口。
一個只會說「還是不行」的 reviewer 沒有用；一個能說「你修的那條好了，但你的修法弄壞了
對稱的另一條」的 reviewer，是設計審查本身。

第四輪的診斷最銳利：我在不同輪次寫的兩份產物直接互相矛盾，而它說
「**這兩份產物只能有一份成立**」，並且指出該由哪一份決定 —— 聚合的
`assignedReviewers: exactly 2` 與全部都是指派後狀態的 `RoundStatus`，
早就把答案寫在那裡了，只是沒有人去對。

**教訓一：跨邊界的改動要成對檢查。** 把 `ReviewersAssigned` 移到 `ReviewRound` 同時
做了兩件事：讓 comment 的擁有權說得通，也切斷了 Submissions 對「已指派」的知情。
只看前者就會留下後者。

**教訓二：實體的誕生時機是一個必須明寫的決定。** 「什麼時候 ReviewRound 存在」
沒有任何一份產物負責回答，於是 contract 隨手寫了一句，讀模型的定義隨手寫了另一句，
兩邊各自都看起來合理。這類問題不會出現在任何單一檔案裡。

### 還沒做成 sensor 的候選（誠實記錄）

第三、四輪的缺口都跟**讀模型**有關。一條可決定性的檢查是：
**Actor View 的每個 `data_source.endpoint` 都必須對應到某個 BC 宣告的讀模型。**
它會抓到第三輪那個「主席查一個分不出已指派／未指派的狀態」的畫面。
沒有現在做，因為咖啡店的 BC 並沒有統一宣告 `read_models`，硬上會讓範例變紅 ——
要做就得先補齊範例，那是另一刀。

## 3. 刻意不做

- CL-1..8 只做「整組可選」，不擴充成每個序列化生態一組。第二期。
- Gherkin 多語只做「認得出來就用、認不出來回 n/a」，不內建所有語言的關鍵字表。
- `docs-events` 仍用字彙比對，仍會低報。寧可低報，不要跟每份文件的普通名詞吵架。
- 不動咖啡店的 5 個示範紅燈。它們是 §10 的驗收條件。
- `orchestrate` / `cli` / `assess` / `applicability` / `profile` 五個測試檔仍讀範例
  `.arch/`（它們斷言的是引擎行為，但用範例當輸入資料）。已歸到 `test:sample`
  並在 `engine/tests/README.md` 說明。要完全解耦得把六態、CLI、鎖的測試也搬到
  fixture 上，那會重寫大部分斷言，收益不如成本。
