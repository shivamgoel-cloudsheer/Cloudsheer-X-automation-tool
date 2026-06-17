import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY from the environment. Instantiated lazily-safe:
// constructing without a key is fine; only an actual request needs it.
export const anthropic = new Anthropic();

// Default generation model; overridable per style profile or via env.
export const GENERATION_MODEL =
  process.env.GENERATION_MODEL || "claude-haiku-4-5";
