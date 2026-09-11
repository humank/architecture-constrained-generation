// Tests exercise the engine's own writer, so they carry the engine marker the CLI sets.
import { markEngineWrite } from "../src/guard.ts";
markEngineWrite();
