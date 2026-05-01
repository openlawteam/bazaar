"""Post the Bazaar hackathon submission INTENT into commons.

Re-uses the existing `.spacebase1/commons/` enrollment (principal:
prn_spacebase1_commons_wkncnjsnnws3bqtakjjqjqfi) and posts a single INTENT
under the canonical hackathon parent intent. Uses post_and_confirm so we can
verify it landed, then prints the intentId.

Idempotency: scans commons first for any prior INTENT we already posted with
payload.kind == "hackathon-submission" + event == "spacebase1-hackathon-2026"
under the hackathon parent. If found, prints that intentId and exits.
"""
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
from intent_space_sdk import (  # noqa: E402
    build_dpop_signup_proof,
    fetch_json,
)

ENDPOINT = "https://spacebase1.differ.ac"
COMMONS_URL = f"{ENDPOINT}/commons"
AGENT_NAME = "bazaar-commons"
WORKSPACE = Path(__file__).resolve().parent / "commons"

HACKATHON_PARENT = "intent-413e0bc5-d8f3-40e7-afb4-350e220df03c"
EVENT = "spacebase1-hackathon-2026"
TEAM_NAME = "Bazaar"
REPO_URL = "https://github.com/openlawteam/bazaar"
ONE_LINER = (
    "Demand-first personal shopping on the web where every buyer want is an "
    "intent and specialist agents self-select to find, score, and coordinate "
    "local or shippable options."
)
CONTENT = f"Submission: {TEAM_NAME} — {ONE_LINER}"


def heading(text):
    print(f"\n{'=' * 6} {text} {'=' * 6}")


def continue_station(session_obj):
    """Refresh the station token via the published continue endpoint."""
    enrollment = session_obj.local_state.load_enrollment() or {}
    continue_url = enrollment.get("continue_endpoint")
    if not isinstance(continue_url, str) or not continue_url:
        raise RuntimeError("no continue_endpoint in enrollment; cannot renew")
    proof = build_dpop_signup_proof(
        session_obj.local_state, signup_url=continue_url
    )
    response = fetch_json(continue_url, method="POST", headers={"DPoP": proof})
    merged = {**enrollment, **response}
    if "station_endpoint" not in merged and isinstance(
        merged.get("itp_endpoint"), str
    ):
        merged["station_endpoint"] = merged["itp_endpoint"]
    session_obj.local_state.save_enrollment(merged)
    session_obj.local_state.remember_station(
        endpoint=merged.get("station_endpoint"),
        audience=merged.get("station_audience"),
        station_token=merged.get("station_token"),
        handle=merged.get("handle", session_obj.agent_name),
        principal_id=merged.get("principal_id"),
        source="continue",
        space_id=merged.get("space_id") or merged.get("commons_space_id"),
    )
    return response


session = HttpSpaceToolSession(
    endpoint=COMMONS_URL,
    workspace=WORKSPACE,
    agent_name=AGENT_NAME,
)

heading("connect with existing commons enrollment")
try:
    session.connect()
    binding = session.confirm_current_space()
except Exception as exc:
    print(f"[connect] stale token ({exc!r}); calling continue endpoint to renew")
    refreshed = continue_station(session)
    print(f"[continue] new token issued: token_type={refreshed.get('token_type')}")
    session.connect()
    binding = session.confirm_current_space()

commons_id = binding["spaceId"]
my_principal = session.agent_id
print(f"bound space  : {commons_id}")
print(f"my_principal : {my_principal}")

heading("idempotency check — scan hackathon parent for prior submission from us")
# A nested INTENT with parent_id=HACKATHON_PARENT lives in that parent's
# interior, not in the commons top-level feed. So we must scan the parent.
parent_feed = session.scan_full(HACKATHON_PARENT)
existing_intent_id = None
for msg in parent_feed.get("messages", []):
    if msg.get("type") != "INTENT":
        continue
    if msg.get("senderId") != my_principal:
        continue
    payload = msg.get("payload") or {}
    if payload.get("kind") != "hackathon-submission":
        continue
    if payload.get("event") != EVENT:
        continue
    if msg.get("parentId") != HACKATHON_PARENT:
        continue
    existing_intent_id = msg.get("intentId")
    break

if existing_intent_id:
    heading("ALREADY SUBMITTED — not posting again")
    print(f"existing intentId: {existing_intent_id}")
    print(
        "observatory: "
        f"{ENDPOINT}/observatory#origin=https%3A%2F%2Fspacebase1.differ.ac"
        f"&space={HACKATHON_PARENT}"
    )
    raise SystemExit(0)

heading("post_and_confirm: hackathon submission INTENT")
payload = {
    "kind": "hackathon-submission",
    "event": EVENT,
    "repo_url": REPO_URL,
    "team_name": TEAM_NAME,
    "agent_principal": my_principal,
    "one_liner": ONE_LINER,
}
print(json.dumps(payload, indent=2))

# Confirm against the hackathon parent space — that's where the message lands
# when parent_id=HACKATHON_PARENT. Confirming against commons would always
# time out because the post is nested in the parent's interior.
confirmation = session.post_and_confirm(
    session.intent(
        CONTENT,
        parent_id=HACKATHON_PARENT,
        payload=payload,
    ),
    step="intent.hackathon-submission",
    confirm_space_id=HACKATHON_PARENT,
)

intent_id = confirmation.get("intentId") or confirmation.get("messageId")
heading("OK — submitted")
print(f"intentId: {intent_id}")
print(
    "hackathon parent: "
    f"{ENDPOINT}/observatory#origin=https%3A%2F%2Fspacebase1.differ.ac"
    f"&space={HACKATHON_PARENT}"
)
print(
    "submission interior (judge reasoning will appear here): "
    f"{ENDPOINT}/observatory#origin=https%3A%2F%2Fspacebase1.differ.ac"
    f"&space={intent_id}"
)
