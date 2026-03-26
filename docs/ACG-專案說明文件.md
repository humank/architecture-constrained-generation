# Architecture Constrained Generation (ACG) — 專案說明文件

> 從需求到上線運行的程式碼，每一行都可追溯到一個架構決策。

---

## 這個專案是什麼？

Architecture Constrained Generation（ACG）是一個基於 [Claude Code](https://claude.com/claude-code) 的 AI 輔助軟體架構技能（Skill）。它將商業需求透過一條 **10 階段的流水線**，自動轉化為完整設計、實作、部署並驗證過的系統。

傳統的 AI 程式碼生成問的是：「我該寫什麼程式碼？」

ACG 問的是：「在這些限界上下文（Bounded Context）、這些聚合不變量（Aggregate Invariants）、這些 BDD 場景、這些 API 契約、這些部署目標的約束下——唯一正確的程式碼是什麼？」

核心差異在於 **約束鏈（Constraint Chain）**：每個階段產出的設計產物會約束下一個階段，形成一條從商業需求到可運行程式碼的完整可追溯路徑。

---

## 專案的價值

### 1. 消除「知識斷崖」

傳統軟體開發中，需求用中文/英文寫、架構在會議中討論、程式碼用 Java/TypeScript 實作——三者之間的連結往往在過程中遺失。當 bug 出現時，幾乎不可能追溯回原始需求。

ACG 讓每一份產物都是機器可讀的，每一行程式碼都可追溯到設計決策，徹底消除這個斷崖。

### 2. 整合 20+ 軟體工程方法論

ACG 不是一個通用的程式碼產生器，而是忠實地實作每一種方法論：

| 類別 | 方法論 |
|------|--------|
| 探索 | Impact Mapping、User Story Mapping、Domain Storytelling |
| 領域建模 | DDD（Evans）、Event Storming（Brandolini）、Event Modeling（Dymitruk） |
| 架構 | Clean Architecture（Martin）、Hexagonal Architecture、C4 Model（Brown） |
| 品質 | BDD（North）、TDD（Beck）、XP（Beck）、SOLID、GRASP |
| 審查 | Rozanski & Woods（7 Viewpoints、10 Perspectives）、STRIDE 威脅建模 |
| 維運 | 可觀測性三支柱、SLI/SLO、AWS Well-Architected Framework |

### 3. 人在迴路中（Human-in-the-Loop）

AI 不會替你做關鍵決策。在 Phase 2（架構決策）和 Phase 8（技術棧選擇）設有強制性的評估關卡（Assessment Gate），由人類填寫問卷決定：
- 微服務 vs 模組化單體？
- SNS/SQS vs 同步 HTTP？
- Java vs Kotlin vs TypeScript？
- React vs Vue vs Svelte？
- AWS CDK vs Terraform？

### 4. 跨層型別安全（Cross-Layer Type Safety）

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

### 5. 測試黃金三角

ACG 強制執行分層測試策略，任何一層都不能跳過：

```
單元測試（領域邏輯）
  └→ 整合測試（跨層 curl 驗證）
       └→ E2E 測試（Playwright 關鍵使用者旅程）
            └→ 部署後驗證（對已部署的 URL 執行相同檢查）
```

### 6. 可恢復執行

所有狀態都保存在 `.arch/` 目錄中的 YAML/Markdown 檔案裡。中斷後再次執行 `/architect`，系統會自動偵測已完成的階段並從中斷處繼續。

### 7. 活文件（Living Documentation）

所有圖表使用 Mermaid + Markdown 格式，可直接在 VS Code 和 GitHub 中預覽，不需要額外工具。包含：C4 架構圖、領域模型圖、序列圖、狀態機圖。

---

## 它可以做什麼？

### 十個階段的完整流水線

```
Phase 0: 需求分析      → Impact Map、Story Map、統一語言（Ubiquitous Language）
Phase 1: 探索          → Domain Storytelling、Event Storming、Event Modeling
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

### 產出物一覽

執行完成後，`.arch/` 目錄會包含完整的設計產物：

```
.arch/
├── glossary.yaml                 # 統一語言（每個階段持續更新）
├── assessment-2.md               # 架構決策問卷（人類填寫）
├── assessment-8.md               # 技術棧問卷（人類填寫）
├── 00-requirements/              # Impact Map、Story Map、解析後的需求
├── 01-discovery/                 # Event Storm、Event Model
├── 02-strategic/                 # 限界上下文、Context Map
├── 03-tactical/                  # 聚合、領域模型、API 契約
├── 04-specification/
│   ├── features/                 # BDD 場景（含跨層完整性測試）
│   └── contracts/                # 消費者驅動契約
├── 05-delivery/                  # Pipeline、可觀測性、Runbooks
├── 06-review/                    # 觀點、視角、ADR
├── 07-documentation/             # C4 圖、領域模型、序列圖
└── 08-implementation/            # 實作報告 + 部署後驗證結果
```

同時在專案根目錄生成可執行的程式碼（`iac/`、`services/` 等）。

### 品質保障機制

- 27 個反模式守衛（如：貧血領域模型、God Aggregate、靜默前端失敗）
- 6 條一致性線程（語言、事件、不變量、知識演進、設計品質、前端韌性）
- 29 個回饋迴路（自動偵測並修正問題）
- 階段間品質閘門（Quality Gate）

---

## 如何使用？

### 前置條件

- 安裝 [Claude Code](https://claude.com/claude-code) CLI

### 快速開始

```bash
# 1. 複製專案
git clone https://github.com/anthropics/architecture-constrained-generation.git
cd architecture-constrained-generation

# 2. 啟動 Claude Code
claude

# 3. 用內建範例執行（咖啡店管理系統）
> /architect examples/coffeeshop-requirements.md
```

### 使用自己的需求

可以指定需求文件：

```bash
> /architect path/to/your-requirements.md
```

或直接用文字描述：

```bash
> /architect 建立一個餐廳訂位系統，包含桌位管理、候位名單和簡訊通知
```

### 執行流程

1. 系統解析你的需求
2. 依序走過每個階段，在 `.arch/` 中產出結構化產物
3. 在評估關卡暫停，等待你的決策（架構風格、技術棧等）
4. 階段間執行品質閘門檢查
5. 生成受約束的、經過測試的程式碼
6. 部署到目標環境並執行部署後驗證

### 輔助指令

| 指令 | 用途 |
|------|------|
| `/architect [需求]` | 主流程——執行完整的 10 階段流水線 |
| `/assessment [階段]` | 手動觸發某個階段的評估關卡 |
| `/quality-gate [階段\|all]` | 對階段產出執行品質檢查 |
| `/glossary show\|add\|search\|validate` | 管理統一語言 |
| `/refactoring-advisor` | 分析程式碼異味並提供重構建議 |

---

## 內建範例：咖啡店管理系統

本專案附帶一個完整的範例——小型咖啡店 POS 系統，展示了 ACG 的完整能力：

- 4 個限界上下文：點餐（Ordering）、製備（Preparation）、庫存（Inventory）、報表（Reporting）
- 微服務架構 + SNS/SQS 非同步通訊
- Java 21 + Spring Boot + React + TypeScript
- PostgreSQL（schema-per-BC）+ Flyway 遷移
- AWS EKS 部署 + CDK 基礎設施即程式碼
- 80 個後端測試 + 9 個前端整合測試全部通過
- 8 項跨層型別契約全部驗證通過
- 完整生命週期煙霧測試通過（下單 → 確認 → 付款 → 製備 → 送達 → 完成）

---

## 適合誰使用？

- 想要用 AI 輔助但又不想失去架構控制權的軟體架構師
- 想要快速從需求到可運行系統的開發團隊
- 想要學習 DDD、Event Storming、BDD 等方法論如何實際串接的工程師
- 需要完整可追溯性和文件化的企業專案

---

## 總結

ACG 不只是「讓 AI 寫程式碼」，而是讓 AI 在嚴格的架構約束下生成唯一正確的程式碼。它把 20+ 年的軟體工程智慧編碼成一條自動化流水線，同時保留人類對關鍵決策的控制權。最終產出的不只是程式碼，而是一套完整的、可追溯的、活的架構文件和經過驗證的系統。
