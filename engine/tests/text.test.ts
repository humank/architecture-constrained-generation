import { describe, expect, test } from "bun:test";
import { nameAppearsIn, namesMatch, normalizeKey, splitIdentifier, stripParenthetical } from "../src/text.ts";

describe("normalizeKey", () => {
  test("folds punctuation, separators and case into one key", () => {
    const keys = ["SalesReport", "Sales Report", "sales_report", "Sales-Report", "sales report"];
    expect(new Set(keys.map(normalizeKey)).size).toBe(1);
  });

  test("keeps CJK instead of erasing it", () => {
    // The old normaliser stripped everything outside [a-z0-9], mapping every CJK
    // string to "" — and "" is a substring of everything.
    expect(normalizeKey("飲料選擇")).toBe("飲料選擇");
    expect(normalizeKey("低庫存 警示")).toBe("低庫存警示");
    expect(normalizeKey("注文")).toBe("注文");
  });

  test("returns null rather than an empty key", () => {
    for (const raw of ["", "   ", "---", "()", "。、！", undefined, null]) {
      expect(normalizeKey(raw)).toBeNull();
    }
  });

  test("normalises full-width and composed forms", () => {
    expect(normalizeKey("ＯＲＤＥＲ")).toBe(normalizeKey("order"));
  });
});

describe("namesMatch", () => {
  test("two different CJK actor names must not match", () => {
    // This is the regression: both used to normalise to "" and match everything.
    expect(namesMatch("服務生", "咖啡師")).toBe(false);
    expect(namesMatch("注文係", "在庫係")).toBe(false);
  });

  test("the same CJK actor matches itself", () => {
    expect(namesMatch("服務生", "服務生")).toBe(true);
    expect(namesMatch("櫃檯人員（收銀）", "櫃檯人員")).toBe(true);
  });

  test("a parenthetical qualifier does not break identity", () => {
    expect(namesMatch("Counter Staff (Cashier)", "Counter Staff")).toBe(true);
  });

  test("an unusable name matches nothing, not everything", () => {
    expect(namesMatch("", "Waiter")).toBe(false);
    expect(namesMatch("  ", "服務生")).toBe(false);
    expect(namesMatch(undefined, "Waiter")).toBe(false);
  });

  test("a single character does not swallow every name containing it", () => {
    expect(namesMatch("生", "服務生")).toBe(false);
    expect(namesMatch("a", "Barista")).toBe(false);
  });

  test("unrelated English names do not match", () => {
    expect(namesMatch("Waiter", "Barista")).toBe(false);
  });
});

describe("nameAppearsIn", () => {
  test("finds a work object inside a longer read-model name", () => {
    expect(nameAppearsIn("ReadyOrders (table number, grouped per table)", "ReadyOrders")).toBe(true);
    expect(nameAppearsIn("庫存（各材料現量）", "庫存")).toBe(true);
  });

  test("an unusable needle never appears", () => {
    expect(nameAppearsIn("anything at all", "")).toBe(false);
    expect(nameAppearsIn("anything at all", "、")).toBe(false);
  });
});

describe("splitIdentifier", () => {
  test("splits camelCase and PascalCase into words", () => {
    expect(splitIdentifier("CompleteCoffeePreparation")).toEqual(["complete", "coffee", "preparation"]);
    expect(splitIdentifier("PlaceOrder")).toEqual(["place", "order"]);
    expect(splitIdentifier("CreatePOForSupplier")).toEqual(["create", "po", "for", "supplier"]);
  });

  test("returns nothing for a name with no Latin letters, so callers can say n/a", () => {
    expect(splitIdentifier("下單")).toEqual([]);
    expect(splitIdentifier("注文する")).toEqual([]);
  });
});

describe("stripParenthetical", () => {
  test("handles both ASCII and full-width parentheses", () => {
    expect(stripParenthetical("Counter Staff (Cashier)")).toBe("Counter Staff");
    expect(stripParenthetical("櫃檯人員（收銀）")).toBe("櫃檯人員");
  });
});
