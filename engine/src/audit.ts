import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { auditDir, repoRoot } from "./paths.ts";
import { now } from "./state.ts";

/** Slice 6: audit is append-only and sharded per month so a long project keeps it readable. */
export function shardName(iso = now()): string {
  return `${iso.slice(0, 7)}.md`;
}

export function audit(event: string, details: Record<string, unknown>, root?: string): void {
  const dir = auditDir(root ?? repoRoot());
  mkdirSync(dir, { recursive: true });
  const stamp = now();
  const shard = join(dir, shardName(stamp));
  if (!existsSync(shard)) {
    appendFileSync(shard, `# ACG Engine Audit — ${shardName(stamp).replace(".md", "")}\n\n`, "utf8");
    indexShard(dir, shardName(stamp));
  }
  appendFileSync(shard, `- ${stamp} **${event}** ${JSON.stringify(details)}\n`, "utf8");
}

/** `local.md` is the index of shards, never the log itself. */
function indexShard(dir: string, shard: string): void {
  const index = join(dir, "local.md");
  if (!existsSync(index)) {
    appendFileSync(
      index,
      "# ACG Engine Audit Index\n\nAppend-only. One shard per month; the engine is the only writer.\n\n",
      "utf8",
    );
  }
  const body = readFileSync(index, "utf8");
  if (!body.includes(shard)) {
    appendFileSync(index, `- [${shard.replace(".md", "")}](${shard})\n`, "utf8");
  }
}

export function readAudit(root?: string, limit = 40): string[] {
  const dir = auditDir(root ?? repoRoot());
  const shard = join(dir, shardName());
  if (!existsSync(shard)) return [];
  return readFileSync(shard, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .slice(-limit);
}
