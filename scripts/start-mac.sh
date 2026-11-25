#!/bin/bash
# The brainstorm page on a Mac: API keys from the Keychain (never typed or
# stored in a file), then the page opens in the browser. Ctrl-C stops it and any run.
#   bash scripts/start-mac.sh                 start
#   bash scripts/start-mac.sh --gemini-key    give Gemini an API key instead of its own sign-in
#   bash scripts/start-mac.sh --write codex   first have Codex write its own set of instructions
# Keychain items it looks for (store one with: security add-generic-password -s <name> -a "$USER" -w):
#   mistral-key (BRAINSTORM_KEYCHAIN_MISTRAL to use another name), gemini-key (BRAINSTORM_KEYCHAIN_GEMINI).
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
if k=$(security find-generic-password -s "${BRAINSTORM_KEYCHAIN_MISTRAL:-mistral-key}" -w 2>/dev/null); then export MISTRAL_API_KEY="$k"; fi
writer=""
while [ $# -gt 0 ]; do
  case "$1" in
    --gemini-key) if k=$(security find-generic-password -s "${BRAINSTORM_KEYCHAIN_GEMINI:-gemini-key}" -w 2>/dev/null); then export GEMINI_API_KEY="$k"; fi ;;
    --write) writer="$2"; shift ;;
  esac
  shift
done
unset k
if [ -n "$writer" ]; then node app/write-prompts.js "$writer"; fi
export BRAINSTORM_OPEN=1
exec node app/server.js
