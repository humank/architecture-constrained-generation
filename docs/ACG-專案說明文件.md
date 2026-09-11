# Architecture Constrained Generation (ACG) — 專案說明文件

> 從需求到上線運行的程式碼，每一行都可追溯到一個架構決策。

---

## 這個專案是什麼？

Architecture Constrained Generation（ACG）是一個基於 [Claude Code](https://claude.com/claude-code) 的 AI 輔助軟體架構技能（Skill），加上一個 **確定性引擎（deterministic engine）**。它將商業需求透過一條 **10 階段的流水線**，轉化為完整設計、實作、部署並驗證過的系統。

專案由兩個半邊組成，缺一不可：

| | 方法論（控制平面） | 引擎（資料平面） |
|---|---|---|
| 是什麼 | `.claude/commands/` 裡的階段技能、知識庫、品質檢查清單 | `engine/` 裡的 TypeScript 執行期 |
| 負責 | 說明「什麼才算對」 | 決定「現在能不能往前走」 |
| 誰執行 | LLM 寫產物、問人、解釋 | 相位圖、六態機、23 個感測器、決策鎖、hooks |
| 能不能用話術繞過 | 能 | 不能 |

**LLM 不決定階段是否完成。** 一個階段要變成 `[x]`，必須「所有阻斷型感測器綠燈」+「人類核准」+（審查階段）「獨立審查者給出判定」三者同時成立。

傳統的 AI 程式碼生成問的是：「我該寫什麼程式碼？」

ACG 問的是：「在這些限界上下文（Bounded Context）、這些聚合不變量（Aggregate Invariants）、這些 BDD 場景、這些 API 契約、這些部署目標的約束下——唯一正確的程式碼是什麼？」

核心差異在於 **約束鏈（Constraint Chain）**：每個階段產出的設計產物會約束下一個階段，形成一條從商業需求到可運行程式碼的完整可追溯路徑。

---

## 專案的價值

### 1. 消除「知識斷崖」

傳統軟體開發中，需求用中文/英文寫、架構在會議中討論、程式碼用 Java/TypeScript 實作——三者之間的連結往往在過程中遺失。當 bug 出現時，幾乎不可能追溯回原始需求。

ACG 讓每一份產物都是機器可讀的，每一行程式碼都可追溯到設計決策，徹底消除這個斷崖。

### 2. 提示詞不能當自己的閘門

這是本專案最重要、也是最晚才學到的一課。

ACG 早期只有方法論：階段順序寫在 `architect.md` 這份提示詞裡，由 LLM 讀完描述後自己判斷「我現在在第幾階段」、「這階段做完了沒」。品質閘門則是一段請模型「仔細檢查」的文字——而寫產物的模型和檢查產物的模型是同一個。

那不是閘門。證據就在本專案自帶的咖啡店範例裡，它曾經「通過」所有品質閘門並帶著以下矛盾出貨：

| 產物聲稱 | 實際互相矛盾的地方 |
|---|---|
| `ordering.feature`：收銀員下單、「server」送餐 | DS-01 明確寫的是服務生下單、咖啡師製作 |
| `inventory.feature`：「manager」補貨 | 任何 domain story 裡都沒有 manager 這個角色 |
| C4 圖與序列圖發佈 `OrderPaid` 事件 | Event Storm 裡沒有任何事件叫這個名字 |
| `frontend-architecture.yaml` 宣告 7 個 actor view 頁面 | `router.tsx` 一個都沒有掛上 |
| `assessment-2` 鎖定 `region: ap-east-2` | `iac/config/*.ts` 寫死 `us-east-1` |
| `assessment-8` 要求 Spring Boot 4.x | `build.gradle.kts` 釘在 3.4.4 |

每一項都會變成線上事故或整段重寫。沒有一項被人讀文件讀出來——因為單看每一項都很合理：「server」看起來就是服務生的同義詞，`OrderPaid` 看起來本來就該存在，region 字串單獨看永遠是對的。

引擎就是為了這件事存在：把**可判定**的檢查從提示詞搬到程式碼裡，讓紅燈是計算出來的，而不是模型願不願意承認的。

### 3. 整合 20+ 軟體工程方法論

ACG 不是一個通用的程式碼產生器，而是忠實地實作每一種方法論：

| 類別 | 方法論 |
|------|--------|
| 探索 | Impact Mapping、User Story Mapping、Domain Storytelling |
| 領域建模 | DDD（Evans）、Event Storming（Brandolini）、Event Modeling（Dymitruk） |
| 架構 | Clean Architecture（Martin）、Hexagonal Architecture、C4 Model（Brown） |
| 品質 | BDD（North）、TDD（Beck）、XP（Beck）、SOLID、GRASP |
| 審查 | Rozanski & Woods（7 Viewpoints、10 Perspectives）、STRIDE 威脅建模 |
| 維運 | 可觀測性三支柱、SLI/SLO、AWS Well-Architected Framework |

### 4. 人在迴路中（Human-in-the-Loop）

AI 不會替你做關鍵決策。在 Phase 2（架構決策）和 Phase 8（技術棧選擇）設有強制性的評估關卡（Assessment Gate），由人類填寫問卷決定：
- 微服務 vs 模組化單體？
- SNS/SQS vs 同步 HTTP？
- Java vs Kotlin vs TypeScript？
- React vs Vue vs Svelte？
- AWS CDK vs Terraform？

**關鍵在於「鎖」，不是 Markdown 裡的「COMPLETED」字樣。** 模型可以自己寫下 `Status: COMPLETED`，但沒辦法偽造一份它沒寫過的答案的雜湊值。所以引擎只認鎖：

```bash
bun engine/src/acg.ts assess-lock --id assessment-2
```

`assess-lock` 會先確認每一題必填都有答案，然後把整份答案的 canonical sha256 指紋寫進 `.arch/assessment-2.yaml`。鎖成立之前，`next` 一律回傳 `ask-assessment`，任何階段都不會往前走。事後改答案會讓指紋對不上——引擎視為篡改，不是更新。

由此推出三件事：

1. **基礎設施「讀」決策，而不是「重述」決策。** `scripts/deploy.sh` 呼叫 `locked-answer --id assessment-2 --key region` 取值，而不是寫死一個 region。一個決策存兩份，就是一個決策加一個等著發生的謊言。
2. **只有鎖定的答案能讓檢查失效。** 相位圖裡的 `when:` 條件可以依據鎖定答案讓某個感測器或整個階段不適用——但**不能靠手改相位圖**。使用者可以編輯的相位圖，就是所有紅燈都會被刪掉的相位圖。條件預設為「開」：未鎖定、未作答、被篡改，檢查都繼續跑。
3. **核准會記住它核准的是什麼。** 階段核准時記錄 `approved_with_lock`；之後若答案改變，引擎會在做任何事之前先偵測到漂移。在一個已不成立的決策下核准的階段，等於沒核准。

### 5. 跨層型別安全（Cross-Layer Type Safety）

前後端不一致是全端系統最常見的 bug 來源。ACG 透過 8 項強制檢查（CL-1 到 CL-8）在架構層級預防：

| 檢查 | 預防的問題 |
|------|-----------|
| CL-1 | 語意篩選 vs 列舉值混淆（`?status=active` 不是 enum） |
| CL-2 | 列舉大小寫不一致（Java `PLACED` vs 前端 `Placed`） |
| CL-3 | 金額表示方式不一致（120 是元還是分？） |
| CL-4 | 日期格式不一致（Jackson 預設輸出陣列，前端期望 ISO-8601 字串） |
| CL-5 | Null vs 空集合（`items: null` 會讓前端 `.filter()` 崩潰） |
| CL-6 | Boolean 序列化（Java `isActive` → JSON `active`，Jackson 會去掉 `is`） |
| CL-7 | 分頁封裝格式不一致 |
| CL-8 | 錯誤回應格式（JSON vs HTML Whitelabel） |

### 6. 測試黃金三角

ACG 強制執行分層測試策略，任何一層都不能跳過：

```
單元測試（領域邏輯）
  └→ 整合測試（跨層 curl 驗證）
       └→ E2E 測試（Playwright 關鍵使用者旅程）
            └→ 部署後驗證（對已部署的 URL 執行相同檢查）
```

### 7. 可恢復執行

所有狀態都保存在 `.arch/` 目錄中的檔案裡，沒有任何記憶體內狀態。中斷後再次執行 `/architect`，它會先問引擎 `next --json`，從引擎所記錄的游標繼續。

這裡有個重要的區別：恢復**不是**「掃一下目錄、猜哪些階段看起來做完了」。目錄只能說明什麼東西存在，只有引擎能說什麼東西被**接受**了。若你手上有一份舊版 ACG 產生的 `.arch/`（沒有引擎狀態），用 `acg.ts import` 推導一次即可。

另外，PreCompact hook 會在上下文被壓縮前把整塊看板寫進 `.arch/audit/breadcrumb.md`，壓縮後由 breadcrumb 加 `next` 接手，而不是靠模型回憶。

### 8. 活文件（Living Documentation）

所有圖表使用 Mermaid + Markdown 格式，可直接在 VS Code 和 GitHub 中預覽，不需要額外工具。包含：C4 架構圖、領域模型圖、序列圖、狀態機圖。

---

## 它可以做什麼？

### 十個階段的完整流水線

引擎把 Phase 1 拆成三個各自獨立把關的階段，所以相位圖實際上有 13 個節點：

```
Phase 0: 需求分析      → Impact Map、Story Map、統一語言（Ubiquitous Language）
Phase 1: 探索          → 三個階段，順序有意義：
         01a-dst       → Domain Storytelling（必須先核准）
         01b-storm     → Event Storming（從 system_visible 的故事步驟長出來）
         01c-model     → Event Modeling
Phase 2: 戰略設計      → 限界上下文、Context Map、子領域分類
Phase 3: 戰術設計      → 聚合（Vernon 四規則）、API 契約、Actor Views
Phase 3c: UX 設計      → 設計系統、狀態→顏色映射、無障礙設計
Phase 4: 規格          → BDD 場景（Gherkin）、測試策略、威脅模型、契約測試
Phase 5: 交付          → CI/CD Pipeline、IaC（CDK/Terraform）、可觀測性、SLI/SLO
Phase 6: 審查          → 7 個觀點、10 個視角、反模式偵測、ADR
Phase 7: 文件          → C4 圖、領域模型圖、序列圖、狀態機圖（全部 Mermaid）
Phase 8: 實作          → 受架構約束的程式碼生成 + TDD
Phase 9: 部署與驗證    → 部署到目標環境 + 部署後驗證
```

`01b-storm` 一定要等 `01a-dst` 核准，是因為 Event Storming 必須從**已核准的、系統看得見的**故事步驟爆發（每個角色觸發的事件都宣告 `sourced_from: [DS-xx.y]`），而不是第二次重讀需求文件。兩邊各讀一次，就一定會漂移，而且事後沒人說得出哪一份才是紀錄。

### 產出物一覽

執行完成後，`.arch/` 目錄會包含完整的設計產物：

```
.arch/
├── acg-project.yaml              # 專案名稱與語言
├── acg-state.yaml                # 引擎所有：六態看板
├── glossary.yaml                 # 統一語言（每個階段持續更新，每個詞都有 origin）
├── assessment-2.md / .yaml       # 架構決策問卷 + 鎖與指紋
├── assessment-8.md / .yaml       # 技術棧問卷 + 鎖與指紋
├── 00-requirements/              # Impact Map、Story Map、解析後的需求
├── 01-discovery/                 # Domain Stories、Event Storm、Event Model
├── 02-strategic/                 # 限界上下文、Context Map
├── 03-tactical/                  # 聚合、領域模型、前端架構（含 CL-1..CL-8）
├── 03c-ux-design/                # 設計系統報告
├── 04-specification/
│   ├── features/                 # BDD 場景（含 journeys/ 每個 to-be 故事一支 E2E）
│   └── contracts/                # 消費者驅動契約
├── 05-delivery/                  # Pipeline、可觀測性、Runbooks
├── 06-review/                    # 7 觀點、10 視角、ADR、跨階段一致性
├── 07-documentation/             # C4 圖、領域模型、序列圖、狀態機圖
├── 08-implementation/            # 實作報告
├── quality-reports/              # 引擎所有：每個階段一份，由 gate 寫入
└── audit/                        # 引擎所有：append-only，按月分片
```

同時在專案根目錄生成可執行的程式碼（`iac/`、`services/`、`frontend/`、`e2e/` 等）。

標記「引擎所有」的三個路徑，PreToolUse hook 會拒絕任何 agent 的寫入——一個能編輯自己成績單的流程，等於沒有成績單。

### 品質保障機制

分成兩層，只有下面那層能擋住階段：

**確定性層（23 個感測器）**——`engine/src/sensors/` 裡的 TypeScript，沒有模型、沒有提示詞、不能被說服。阻斷型感測器紅燈就拒絕 `[x]`。無法評估的感測器回報 `na`（**永遠不是 `pass`**），並且在理由裡指名是哪個鎖定答案或哪個缺少的 profile 項目把它排除的。

| 感測器 | 拒絕什麼 |
|---|---|
| `schema-dst` | 用散文寫的 domain story；步驟缺 `class` 或 `system_visible` |
| `story-map-coverage` | 沒有任何故事涵蓋的 MVP `US-*`；單向的 `covered_by` 宣告 |
| `dst-storm-correspondence` | 系統看得見的 state-change 卻沒有事件；角色命令找不到對應的故事句子 |
| `hotspot-classified` | 未分類的 hot spot；還開著的 `work-unknown`（那該回 01a 問領域專家，不是往後帶） |
| `swimlane-is-story` | 用限界上下文切泳道（用自己的切法證明自己的 BC 是循環論證） |
| `gherkin-actor-matches-dst` | 把命令給錯角色的場景 |
| `decision-not-restated` | 基礎設施把鎖定的決策重述成一個對不上的字面值 |
| `docs-events-match-storm` | 圖表發明事件名稱 |
| `source-fingerprint` | 沒有 actor view 宣告的路由；宣告了卻沒人掛上的頁面；以故事命名卻沒有任何測試的 E2E 檔 |
| `commands-implemented` | 聚合宣告的命令在任何原始碼裡都不存在（會先剝掉註解才搜尋） |

完整清單見 [`engine/README.md`](../engine/README.md)。

**語意層（判斷）**——27 個反模式守衛、6 條一致性線程、29 個回饋迴路，加上一個獨立審查者 subagent。這層負責感測器碰不到的四類缺陷：散文與散文互相矛盾；一個 payload 沒有任何地方接收它；一份文件引用了從未設計過的元件；一個抽象只有名字沒有實質。

Phase 6 與 Phase 8 標記 `reviewer: true`：審查者 subagent 只有 `Read`、`Grep`、`Glob` 三個工具，**結構上**無法改檔案、無法移動狀態機、也無法核准自己。這不是政策，是工具權限。

實際跑起來的時候，Phase 6 被退了四次（阻斷型發現數 4 → 3 → 2 → 1），第五輪才通過；Phase 8 被退兩次後通過。每一次退件都是對的，而且都是上一次修正造成的。閘門會收斂，也會終止。

七輪審查下來約十五個發現裡，只有一個是感測器本來就該抓到的（而那個感測器當時是壞的）。若某個語意發現其實是可判定的，它就該被**升級**成感測器——已經升級過兩個：CL-2 共用列舉比對，以及 `commands-implemented`。

---

## 如何使用？

### 前置條件

- [Claude Code](https://claude.com/claude-code) CLI
- [Bun](https://bun.sh)（引擎跑在上面）：`curl -fsSL https://bun.sh/install | bash`

### 快速開始（看範例）

```bash
git clone https://github.com/humank/architecture-constrained-generation.git
cd architecture-constrained-generation
cd engine && bun install && cd ..

bun engine/src/acg.ts doctor      # 139 項漂移檢查
bun engine/src/acg.ts status      # 咖啡店範例的真實看板

claude
> /architect
```

### 用在自己的專案上（重要）

**咖啡店是「範例」，而且它故意帶著五個缺陷，好讓引擎有東西可以抓。不要繼承它。** 工具鏈放一邊，專案放另一邊：

```bash
git clone https://github.com/humank/architecture-constrained-generation.git ~/tools/acg
cd ~/tools/acg/engine && bun install

cd ~/work/my-system
bun ~/tools/acg/engine/src/acg.ts init --project my-system --profile generic
```

`init` 只寫「該由你填的東西」：schemas、階段技能、審查者 subagent、三個 hooks，以及兩份問卷草稿。它**不會**複製任何 domain story、需求或範例產物，產生的看板誠實地從頭到尾都是 `[ ]`。

完整說明（包含決定哪些檢查適用於你的兩個鎖定答案、以及如何用 `init --upgrade` 保持工具鏈更新）見 [`docs/adopting-acg.md`](./adopting-acg.md)。

需求可以是檔案路徑，也可以直接描述：

```bash
> /architect path/to/your-requirements.md
> /architect 建立一個餐廳訂位系統，包含桌位管理、候位名單和簡訊通知
```

### 執行流程

每一輪都從同一件事開始——**問引擎**，而不是問模型自己的記憶：

```bash
bun engine/src/acg.ts next --json
```

`next` 會回傳六種指令之一，orchestrator 照做：

| `action` | 該做什麼 |
|---|---|
| `run-phase` | 讀 `skill`、讀完所有 `must_read`、寫出所有 `must_write`，然後 `report --result awaiting-approval` |
| `await-gate` | 呈現產物與感測器發現，等人類核准或退件 |
| `await-review` | 跑 `acg-reviewer` subagent，再用 `review` 記錄判定。不准審查自己的東西 |
| `ask-assessment` | 跑評估技能、寫 YAML 答案，然後 `assess-lock`。鎖成立前停住 |
| `blocked` | 原封不動顯示 blockers 然後停。去修產物，不要辯 |
| `done` | 結束 |

指令裡還會帶 `intent.allowed_writes` / `forbidden_writes`（這個階段唯一能寫的路徑，由 PreToolUse hook 強制執行）、`advisories`（含 `na`）、以及 `lessons`（已經退過同一階段兩次以上的感測器——在第三次寫出一樣的東西之前先讀它）。

### 引擎指令

所有跟「狀態」有關的事都走引擎，不走技能：

```bash
bun engine/src/acg.ts init [--upgrade]            # 在這裡開一個新專案 / 更新工具鏈
bun engine/src/acg.ts import                      # 從既有 .arch/ 推導狀態
bun engine/src/acg.ts status                       # 六態看板
bun engine/src/acg.ts next --json                  # 唯一合法的「現在該做什麼」
bun engine/src/acg.ts gate --phase 05-delivery [--dry-run]
bun engine/src/acg.ts report --phase 01a-dst --result approved
bun engine/src/acg.ts review --phase 06-review --verdict rejected --note "..."
bun engine/src/acg.ts assess-lock --id assessment-2
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
bun engine/src/acg.ts jump --phase 08-implementation --reason "spike"
bun engine/src/acg.ts redo --phase 03-tactical      # 連帶後面所有階段
bun engine/src/acg.ts scope --set patch             # 相位圖的具名子集
bun engine/src/acg.ts doctor                        # 139 項漂移檢查
bun engine/src/acg.ts lessons                       # 哪個感測器一直在退哪個階段
bun engine/src/acg.ts audit --limit 20
bun engine/src/acg.ts profile                       # 生態系相關的感測器去哪裡找檔案
```

離開碼：`0` 正常、`1` 呼叫方式錯、`2` 閘門拒絕。

引擎嚴格但不是動不了——只是每次繞道都會留下紀錄。`jump` 會把跳過的階段標成 `[S]` 並附上你的理由；`redo` 把階段退回 `[ ]`、連帶清掉下游與 `approved_with_lock`；`scope` 換成具名子集（`system` / `implement` / `patch`），改一個 bug 不必重跑 Event Storming。

**感測器紅燈時，答案是去修產物，或是透過 `redo` 改決策並記錄原因。永遠不是把同一句話講得更有信心一次。**

### 六個狀態

```
[ ] pending → [-] in_progress → [?] awaiting_approval → [x] completed
                                          ↓
                                   [R] revising → 回到 [?]
任何未完成的 → [S] skipped        （jump，附理由）
[x] → redo → [ ]                  （連帶後面每一個階段）
```

非法轉移會直接丟錯。

### 三個 Hooks

在 `.claude/settings.json` 裡接好，不是提示詞裡的建議：

| Hook | 事件 | 作用 |
|---|---|---|
| `guard-write.ts` | PreToolUse | 拒絕越出當前階段 intent 的寫入，以及任何對引擎所有紀錄的寫入 |
| `stop-next.ts` | Stop | 拒絕在還有階段停在 `[-]` 的情況下結束這一輪 |
| `precompact-breadcrumb.ts` | PreCompact | 上下文被壓縮前先把看板寫進 `.arch/audit/breadcrumb.md` |

不屬於任何階段的路徑（`docs/`、`engine/`、`README.md`）維持可寫——這條規則是為了防止 Phase 3 生出 Java，不是為了冷凍整個 repo。要對引擎本身動工時用 `ACG_GUARD=off`；hook 本身也是 fail-open，壞掉的守衛不會把 session 卡死。

### 輔助指令

| 指令 | 用途 |
|------|------|
| `/architect [需求]` | 主流程——但它問引擎，不自己決定順序 |
| `/assessment [階段]` | 手動觸發某個階段的評估關卡 |
| `/quality-gate [階段\|all]` | 語意層檢查（27 反模式、6 線程、29 迴路） |
| `/glossary show\|add\|search\|validate` | 管理統一語言 |
| `/refactoring-advisor` | 分析程式碼異味並提供重構建議 |

---

## 內建範例：咖啡店管理系統

本專案附帶一個完整的範例——小型咖啡店 POS 系統：

- 4 個限界上下文：點餐（Ordering, Core）、製備（Preparation, Core）、庫存（Inventory, Supporting）、報表（Reporting, Generic）
- 微服務架構 + SNS/SQS 非同步通訊
- Java 21 + Spring Boot + React + TypeScript
- PostgreSQL（schema-per-BC）+ Flyway 遷移
- AWS EKS 部署 + CDK 基礎設施即程式碼
- 3 個 domain story（DS-01 點餐到送達、DS-02 補貨、DS-03 日結報表），每個都有對應的 E2E journey
- 8 項跨層型別契約（CL-1..CL-8）宣告完整

### 它的看板不是全綠的，而且是故意的

範例是在引擎存在**之前**建起來的。當 23 個感測器對著同一批產物跑過去，找出了本文件前面列出的那六個矛盾。那六個現在仍然是紅的——它們是回歸測試的固定樣本，`bun run test:sample` 斷言每一個感測器都在它們身上**失敗**。修掉它們就等於拿掉引擎有效的唯一證明。

所以範例誠實的看板是：

```
[x] 00-requirements … [x] 03c-ux-design
[R] 04-specification   gherkin-actor-matches-dst×8
[R] 05-delivery        decision-not-restated
[R] 06-review          docs-events-match-storm×7
[R] 07-documentation   docs-events-match-storm×14
[R] 08-implementation  framework-version-matrix  source-fingerprint×14  commands-implemented×12
[R] 09-deploy          decision-not-restated
```

這裡有一個值得帶走的教訓：**已匯入的專案會藏住最嚴重的引擎 bug。** 第一次拿引擎跑這份 `.arch/` 時，引擎本身的缺陷是 0 個——因為所有產物早就都在，一個「在 Phase 3 就要求 Phase 8 檔案」的感測器永遠不會發現自己在要求不可能的事。同一個迴圈跑在兩個從零開始的專案上，找出了 19 個。要擴充 ACG 的話，請在「還不存在的東西」上測試。

### 測試

```bash
cd engine
bun run test          # 97 個：引擎本身，跑在「不是範例」的兩個 fixture 領域上
bun run test:sample   # 201 個：咖啡店，含它故意的紅燈
bun run test:all      # 298
bunx tsc --noEmit
```

兩個 fixture 領域刻意跟範例不一樣：一個包裹櫃系統（有 UI、有雲、英文），一個 ETL 批次管線（沒有 UI、沒有雲、Python、**中文領域語彙**）。只在咖啡店上會過的東西，就是咖啡店形狀的假設。

最有價值的單一測試檔是 `tests/workflow-loop.test.ts`，它從 `init` 一路驅動 `next → do → report → review` 到 `done`——它抓到 9 個任何單元測試都沒抓到的缺陷，因為那些缺陷在**順序**裡，不在零件裡。

---

## 適合誰使用？

- 想要用 AI 輔助但又不想失去架構控制權的軟體架構師
- 想要快速從需求到可運行系統的開發團隊
- 想要學習 DDD、Event Storming、BDD 等方法論如何實際串接的工程師
- 需要完整可追溯性和文件化的企業專案

---

## 總結

ACG 不只是「讓 AI 寫程式碼」，而是讓 AI 在嚴格的架構約束下生成唯一正確的程式碼。

方法論一直都是有價值的那一半：它把 20+ 年的軟體工程智慧編碼成一條流水線，同時保留人類對關鍵決策的控制權。引擎是讓那條流水線不再只是「建議」的另一半。

| 方法論說 | 引擎讓它成真 |
|---|---|
| 階段依序執行 | 相位圖，而 `next` 是唯一合法的「現在該做什麼」 |
| 每個階段消費上一個階段的產出 | `consumes` + `files-exist`，`doctor` 會連狀態一起看 |
| 品質閘門會抓到違規 | 23 個確定性感測器，沒有模型在裡面 |
| 人類做戰略決策 | 決策鎖 + canonical 指紋 |
| 階段「做好了」就算完成 | 感測器綠燈 **且** 人類核准 **且** 獨立審查通過 |
| 回饋迴路會往回送 | `[R] revising`、`redo` 連帶下游、`lessons` |
| 一切可追溯 | append-only 的稽核軌跡，而且 orchestrator 寫不進去 |

## 延伸閱讀

| 文件 | 內容 |
|---|---|
| [`engine/README.md`](../engine/README.md) | 引擎參考：指令、六態、指令集、完整感測器目錄 |
| [`docs/adopting-acg.md`](./adopting-acg.md) | 用在自己專案上：`init`、兩個鎖定答案、profile、非英文領域模型 |
| [`docs/acg-engine-development-plan.md`](./acg-engine-development-plan.md) | 引擎的設計與理由 |
| [`docs/acg-generalization-plan.md`](./acg-generalization-plan.md) | 從「只能跑咖啡店」到「任意領域」的泛化計畫 |
| [`tutorials/18-the-engine.md`](../tutorials/18-the-engine.md) | 教學版的引擎章節（英文） |
| [`engine/tests/README.md`](../engine/tests/README.md) | 測試策略與 fixture 領域 |
