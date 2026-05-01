"""Verify the hackathon submission landed by scanning the hackathon parent
intent's interior. Prints the matching intentId(s)."""
import json
import sys
import time
from pathlib import Path

CANDIDATE_SDK_PATHS = [
    Path.home() / ".cursor" / "skills" / "intent-space-agent-pack" / "sdk",
    Path.home() / ".claude" / "skills" / "intent-space-agent-pack" / "sdk",
    Path.home() / ".codex" / "skills" / "intent-space-agent-pack" / "sdk",
]
for candidate in CANDIDATE_SDK_PATHS:
    if candidate.exists():
        sys.path.insert(0, str(candidate))
        break

from http_space_tools import HttpSpaceToolSession  # noqa: E402

ENDPOINT = "https://spacebase1.differ.ac"
COMMONS_URL = f"{ENDPOINT}/commons"
AGENT_NAME = "bazaar-commons"
WORKSPACE = Path(__file__).resolve().parent / "commons"

HACKATHON_PARENT = "intent-413e0bc5-d8f3-40e7-afb4-350e220df03c"
EVENT = "spacebase1-hackathon-2026"
EXPECTED_INTENT_ID = "intent-f18dc2cb-c428-4b1c-a082-fd55271dba15"

session = HttpSpaceToolSession(
    endpoint=COMMONS_URL,
    workspace=WORKSPACE,
    agent_name=AGENT_NAME,
)
session.connect()
my_principal = session.agent_id
print(f"my_principal: {my_principal}")

print(f"\nscan_full({HACKATHON_PARENT})")
deadline = time.time() + 25.0
matches = []
last_error = None
while time.time() < deadline:
    try:
        feed = session.scan_full(HACKATHON_PARENT)
    except Exception as exc:
        last_error = exc
        time.sleep(1.5)
        continue
    matches = []
    for msg in feed.get("messages", []):
        if msg.get("type") != "INTENT":
            continue
        if msg.get("senderId") != my_principal:
            continue
        payload = msg.get("payload") or {}
        if payload.get("kind") != "hackathon-submission":
            continue
        if payload.get("event") != EVENT:
            continue
        matches.append(msg)
    if matches:
        break
    time.sleep(1.5)

if not matches and last_error:
    print(f"scan errors: {last_error!r}")

print(f"matches in hackathon parent interior: {len(matches)}")
for m in matches:
    print(json.dumps(
        {k: m.get(k) for k in ("intentId", "type", "senderId", "parentId", "payload")},
        indent=2,
        default=str,
    ))

print("\nalso scanning commons top-level for any echoed view")
top = session.scan_full("commons")
for msg in top.get("messages", []):
    if msg.get("intentId") == EXPECTED_INTENT_ID:
        print("found in commons feed:")
        print(json.dumps(msg, indent=2, default=str))
        break
else:
    print("(not surfaced in commons top-level feed; that's expected for nested intents)")
