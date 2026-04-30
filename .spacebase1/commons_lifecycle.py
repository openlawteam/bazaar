"""Drive a full PROMISE/ACCEPT/COMPLETE cycle against the commons steward.

This uses a fresh local identity in `.spacebase1/commons/` (separate keypair),
enrolls into the public commons, and asks the commons steward to provision a
home space. We accept the steward's PROMISE, wait for COMPLETE, and assess.
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

ENDPOINT = "https://spacebase1.differ.ac"
COMMONS_URL = f"{ENDPOINT}/commons"
AGENT_NAME = "bazaar-commons"
WORKSPACE = Path(__file__).resolve().parent / "commons"
WORKSPACE.mkdir(parents=True, exist_ok=True)


def heading(text):
    print(f"\n{'=' * 6} {text} {'=' * 6}")


session = HttpSpaceToolSession(
    endpoint=COMMONS_URL,
    workspace=WORKSPACE,
    agent_name=AGENT_NAME,
)

heading("signup -> commons")
signup = session.signup(COMMONS_URL)
print(f"principal_id      : {signup.get('principal_id')}")
print(f"commons_space_id  : {signup.get('commons_space_id') or signup.get('space_id')}")
print(f"steward_id        : {signup.get('steward_id')}")
session.connect()
binding = session.confirm_current_space()
commons_id = binding["spaceId"]
print(f"bound space       : {commons_id}")

heading(f"scan_full({commons_id}) — observe steward presence")
top = session.scan_full(commons_id)
print(f"latestSeq: {top.get('latestSeq')}, messages: {len(top.get('messages', []))}")
for msg in top.get("messages", [])[:5]:
    payload = msg.get("payload") or {}
    print(
        f"  - {msg.get('type'):8s} from={msg.get('senderId')}  "
        f"intentId={msg.get('intentId')}"
    )
    if payload.get("content"):
        print(f"        content: {payload['content']!r}")
    if payload.get("offeredSpaces"):
        print(f"        offeredSpaces: {payload['offeredSpaces']}")
    if payload.get("lifecycle"):
        print(f"        lifecycle: {payload['lifecycle']}")

heading("post: provision-home INTENT")
request = session.post_and_confirm(
    session.intent(
        "Please provision one home space for me.",
        parent_id="commons",
        payload={
            "requestedSpace": {"kind": "home"},
            "spacePolicy": {"visibility": "private"},
        },
    ),
    step="intent.provision-home-space",
    confirm_space_id="commons",
)
request_space = request["intentId"]
print(f"request intent: {request_space}")

heading("wait_for_promise on request subspace")
promise = session.wait_for_promise(request_space, wait_seconds=20.0)
print(json.dumps(promise, indent=2, default=str))

heading("post: ACCEPT")
session.post_and_confirm(
    session.accept(promise_id=promise["promiseId"], parent_id=request_space),
    step="accept.provision-home-space",
    confirm_space_id=request_space,
)
print("accepted")

heading("wait_for_complete on request subspace")
complete = session.wait_for_complete(
    request_space,
    promise_id=promise["promiseId"],
    wait_seconds=30.0,
)
print(json.dumps(complete, indent=2, default=str))

heading("post: ASSESS=FULFILLED")
session.post_and_confirm(
    session.assess(
        promise_id=promise["promiseId"],
        parent_id=request_space,
        assessment="FULFILLED",
    ),
    step="assess.provision-home-space",
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

payload = complete.get("payload", {}) if isinstance(complete, dict) else {}
home_space_id = payload.get("home_space_id") or payload.get("spaceId")
claim_url = payload.get("claim_url")

heading("OK — provisioned home space summary")
print(f"home_space_id: {home_space_id}")
print(f"claim_url    : {claim_url}")
print(f"summary      : {complete.get('payload', {}).get('summary') if isinstance(complete, dict) else None}")
