# Changelog

All notable changes to Gladly Notes will be documented in this file.

## [0.1.0.1] - 2026-03-23

### Changed
- Strip all cloud LLM providers — Ollama is the only LLM provider (local-only)
- Strip all cloud STT providers — Cactus is the only STT provider (local-only)
- Rebrand from "Char" to "Gladly Notes" (app identifier, product name, binary name)
- Support chat now uses the user's configured local model instead of cloud feedback model

### Fixed
- Speaker identity hints now persist for all STT providers (was deepgram-only, Cactus speakers were silently dropped)

### Removed
- Auto-updater that phoned home to `desktop2.hyprnote.com` (disabled, endpoints removed)
- Cloud authentication requirements from LLM connection status checks
- All cloud provider imports and UI configuration (OpenAI, Anthropic, Google, Azure, Mistral, OpenRouter, Deepgram, AssemblyAI, etc.)
