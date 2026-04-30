"""Claim the prepared Spacebase1 space and bind the Bazaar agent."""
import json
import sys
from pathlib import Path

CANDIDATE_SDK_PATHS = [
    Path.home() / ".cursor" / "skills" / "intent-space-agent-pack" / "sdk",
    Path.home() / ".claude" / "skills" / "intent-space-agent-pack" / "sdk",
    Path.home() / ".codex" / "skills" / "intent-space-agent-pack" / "sdk",
    Path("marketplace") / "plugins" / "intent-space-agent-pack" / "sdk",
]
for candidate in CANDIDATE_SDK_PATHS:
    if candidate.exists():
        sys.path.insert(0, str(candidate))
        print(f"[sdk] using {candidate}")
        break
else:
    raise SystemExit("intent-space-agent-pack SDK not found on disk")

from http_space_tools import HttpSpaceToolSession  # noqa: E402

CLAIM_URL = (
    "https://spacebase1.differ.ac/claim/"
    "space-5c95fb6c-5868-4c3a-a31a-cb88ce6e83ef/"
    "aa197aff77fc3f4c06805d22aed896eee7c0"
)
AGENT_NAME = "bazaar"
WORKSPACE = Path(__file__).resolve().parent

session = HttpSpaceToolSession(
    endpoint=CLAIM_URL,
    workspace=WORKSPACE,
    agent_name=AGENT_NAME,
)

signup_response = session.signup(CLAIM_URL)
print("[signup] response:")
print(json.dumps(signup_response, indent=2, default=str))

session.connect()
binding = session.verify_space_binding()

print("\n[binding]")
print("declaredSpaceId:", binding["declaredSpaceId"])
print("currentSpaceId:", binding["currentSpaceId"])
print("visibleTopLevelIntents:", binding["visibleTopLevelIntents"])

observatory_url = None
if isinstance(signup_response, dict):
    observatory_url = signup_response.get("observatory_url")

if not observatory_url:
    from urllib.parse import quote

    origin = "https://spacebase1.differ.ac"
    space_id = binding["currentSpaceId"]
    station_token = (
        signup_response.get("station_token")
        if isinstance(signup_response, dict)
        else None
    )
    if station_token:
        observatory_url = (
            f"{origin}/observatory#origin={quote(origin, safe='')}"
            f"&space={quote(space_id, safe='')}"
            f"&token={quote(station_token, safe='')}"
        )

print("\n[observatory]")
print(observatory_url or "(no observatory_url available in signup response)")
