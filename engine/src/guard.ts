/**
 * Slice 6 write guard.
 *
 * `.arch/acg-state.yaml` has exactly one legitimate writer: this engine, invoked
 * through `acg.ts`. The CLI stamps ACG_ENGINE=1 into its own environment; the
 * PreToolUse hook (engine/hooks/guard-write.ts) denies Write/Edit on the state
 * file from any agent tool. Together they make "the conductor hand-edited the
 * checkbox" impossible rather than merely forbidden in prose.
 */
export const ENGINE_MARKER = "acg-engine";

export function markEngineWrite(): void {
  process.env.ACG_ENGINE = "1";
}

export function isEngineWrite(): boolean {
  return process.env.ACG_ENGINE === "1";
}

export function assertEngineWrite(target: string): void {
  if (isEngineWrite()) return;
  throw new Error(
    `Refusing to write ${target}: engine state is owned by acg.ts. ` +
      `Run the CLI (report/jump/redo/import) instead of writing the file.`,
  );
}
