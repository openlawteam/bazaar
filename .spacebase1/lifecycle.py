"""Drive the steward through a PROMISE/ACCEPT/COMPLETE cycle.

Strategy: from the bound home-style space, ask the steward to provision a
shared space with Bazaar (us) as a participant. We accept the steward's
PROMISE and wait for COMPLETE. Then ASSESS.
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


def continue_station(session_obj):
    """Refresh the station token via the published continue endpoint.

    Same-key continuation: build a fresh DPoP proof bound to POST + continue_url,
    POST it with no body, persist the returned current credential.
    """
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


def heading(text):
    print(f"\n{'=' * 6} {text} {'=' * 6}")


try:
    session.connect()
    binding = session.confirm_current_space()
except Exception as exc:
    print(f"[connect] stale token ({exc!r}); calling continue endpoint to renew")
    refreshed = continue_station(session)
    print(f"[continue] new token issued: token_type={refreshed.get('token_type')}")
    session.connect()
    binding = session.confirm_current_space()
home_space_id = binding["spaceId"]
my_principal = session.agent_id
print(f"home_space_id: {home_space_id}")
print(f"my_principal : {my_principal}")

participant_principals = [my_principal]

heading("post: requestedSpace=shared INTENT")
request = session.post_and_confirm(
    session.intent(
        "Please provision one shared space for this peer set.",
        parent_id=home_space_id,
        payload={
            "requestedSpace": {
                "kind": "shared",
                "participant_principals": participant_principals,
            },
        },
    ),
    step="intent.provision-shared-space",
    confirm_space_id=home_space_id,
)
request_space = request["intentId"]
print(f"request intent: {request_space}")

heading("wait_for_promise (or decline) on the request subspace")
deadline = time.time() + 12.0
promise = None
decline = None
while time.time() < deadline:
    fresh = session.scan_full(request_space)
    for msg in fresh.get("messages", []):
        if msg.get("type") == "PROMISE" and msg.get("senderId") != my_principal:
            promise = msg
            break
        if msg.get("type") == "DECLINE" and msg.get("senderId") != my_principal:
            decline = msg
            break
    if promise or decline:
        break
    time.sleep(1.0)

if decline:
    heading("steward DECLINEd")
    print(json.dumps(decline, indent=2, default=str))
    raise SystemExit(0)

if not promise:
    heading("no PROMISE within timeout — dumping subspace state")
    print(json.dumps(session.scan_full(request_space), indent=2, default=str))
    raise SystemExit(2)

heading("PROMISE received")
print(json.dumps(promise, indent=2, default=str))

heading("post: ACCEPT")
session.post_and_confirm(
    session.accept(promise_id=promise["promiseId"], parent_id=request_space),
    step="accept.provision-shared-space",
    confirm_space_id=request_space,
)
print("accepted")

heading("wait_for_complete on the request subspace")
complete = session.wait_for_complete(
    request_space,
    promise_id=promise["promiseId"],
    wait_seconds=25.0,
)
print(json.dumps(complete, indent=2, default=str))

heading("post: ASSESS=FULFILLED")
session.post_and_confirm(
    session.assess(
        promise_id=promise["promiseId"],
        parent_id=request_space,
        assessment="FULFILLED",
    ),
    step="assess.provision-shared-space",
    confirm_space_id=request_space,
)
print("assessed FULFILLED")

heading("final scan_full(request subspace)")
final = session.scan_full(request_space)
print(f"latestSeq: {final.get('latestSeq')}  messages: {len(final.get('messages', []))}")
for msg in final.get("messages", []):
    print(
        f"  - {msg.get('type'):8s} from={msg.get('senderId')}  "
        f"intentId={msg.get('intentId')}  promiseId={msg.get('promiseId')}"
    )

heading("OK — payload summary")
payload = complete.get("payload", {}) if isinstance(complete, dict) else {}
print(json.dumps(payload, indent=2, default=str))
