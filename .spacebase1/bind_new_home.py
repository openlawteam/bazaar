"""Bind the home space the commons steward just provisioned for us."""
import json
import sys
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

CLAIM_URL = (
    "https://spacebase1.differ.ac/claim/"
    "space-f6aa3a29-0ceb-4967-b97a-7e23b5146958/"
    "6d7b5af4391da3d35895eb9b67b7272132e7"
)
AGENT_NAME = "bazaar-home"
WORKSPACE = Path(__file__).resolve().parent / "home"
WORKSPACE.mkdir(parents=True, exist_ok=True)

session = HttpSpaceToolSession(
    endpoint=CLAIM_URL,
    workspace=WORKSPACE,
    agent_name=AGENT_NAME,
)

signup = session.signup(CLAIM_URL)
session.connect()
binding = session.verify_space_binding()

print(json.dumps({
    "declaredSpaceId": binding["declaredSpaceId"],
    "currentSpaceId":  binding["currentSpaceId"],
    "principal_id":    signup.get("principal_id"),
    "observatory_url": signup.get("observatory_url"),
    "topLevelIntents": [
        {
            "from":    m.get("senderId"),
            "content": (m.get("payload") or {}).get("content"),
        }
        for m in binding.get("visibleTopLevelIntents", [])
    ],
}, indent=2, default=str))
