# TODOS

## Gladly Notes — Phase 1

### ~~[P1] Disable auto-updater that phones home~~
- **Completed:** v0.1.0.1 (2026-03-23) — Updater endpoints removed from tauri.conf.stable.json, `active` set to false, plugin initialization commented out in lib.rs.

### [P2] Investigate plugins/local-llm/ before building Ollama wizard
- **What:** The repo has an existing `plugins/local-llm/` with download/server infrastructure. Check if it handles model detection, download progress, and management before building the Ollama setup wizard from scratch.
- **Why:** Could save 1-2 days of wizard development if the infrastructure already exists and can be adapted for Ollama model management.
- **How:** Read `plugins/local-llm/src/lib.rs` and related files. Assess: does it detect installed models? Does it handle downloads with progress? Can it be adapted for Ollama?
- **Files:** `plugins/local-llm/`
- **Blocked by:** Nothing. Should investigate before starting wizard implementation.
- **Found by:** Codex outside voice review, 2026-03-23.

### [P3] Verify tray recording indicator already works
- **What:** Codex found that `plugins/tray/src/ext.rs` already has recording state animation. The plan's "recording indicator" step (0.5 day) may be unnecessary.
- **Why:** If the tray already shows recording state, we save half a day and can focus on other work.
- **How:** Check `plugins/tray/src/ext.rs:130` and `plugins/listener/src/runtime.rs:27`. Test: does the tray icon already change when recording starts?
- **Files:** `plugins/tray/`, `plugins/listener/`
- **Blocked by:** Nothing.
- **Found by:** Codex outside voice review, 2026-03-23.
