#!/usr/bin/env bash
# Sync values from a local env file into the linked Vercel project.
# Adds each key to development + preview + production via the --value/--force flags.
# Usage: scripts/sync-env-to-vercel.sh [path-to-env]
# Defaults to .env in the repo root.

set -uo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not installed" >&2
  exit 1
fi

push_var() {
  local key="$1"
  local value="$2"
  for target in development preview production; do
    vercel env rm "$key" "$target" --yes </dev/null >/dev/null 2>&1 || true
    if vercel env add "$key" "$target" --value "$value" --force --yes </dev/null >/dev/null 2>&1; then
      echo "ok   $key  $target"
    else
      echo "fail $key  $target"
    fi
  done
}

while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  line="${raw_line%%$'\r'}"
  [[ -z "${line// /}" ]] && continue
  [[ "${line:0:1}" == "#" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  key="${key// /}"
  if [[ -z "$key" || "$key" == "$line" ]]; then
    continue
  fi
  if [[ ${#value} -ge 2 && "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
    value="${value:1:${#value}-2}"
  fi
  if [[ -z "$value" ]]; then
    continue
  fi
  push_var "$key" "$value"
done < "$ENV_FILE"

echo "done"
