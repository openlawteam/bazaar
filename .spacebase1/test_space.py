"""Quick smoke test of the Bazaar space: reconnect, scan, post an intent, snapshot."""
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


session.connect()
binding = session.confirm_current_space()
space_id = binding.get("currentSpaceId") or binding.get("spaceId")
heading("confirm_current_space")
print(json.dumps(binding, indent=2, default=str))

heading(f"scan_full({space_id})")
top = session.scan_full(space_id)
print(f"latestSeq: {top.get('latestSeq')}")
print(f"messages: {len(top.get('messages', []))}")
for msg in top.get("messages", []):
    print(
        f"  - {msg.get('type'):8s} from={msg.get('senderId')} "
        f"intentId={msg.get('intentId')}  promiseId={msg.get('promiseId')}"
    )
    content = (msg.get("payload") or {}).get("content")
    if content:
        print(f"        content: {content!r}")

steward_intents = [m for m in top.get("messages", []) if m.get("type") == "INTENT"]
steward_intent = steward_intents[0] if steward_intents else None
steward_id = steward_intent.get("senderId") if steward_intent else None
service_intent_id = steward_intent.get("intentId") if steward_intent else None

if service_intent_id:
    heading(f"scan_full({service_intent_id})  (steward presence interior)")
    inner = session.scan_full(service_intent_id)
    print(f"latestSeq: {inner.get('latestSeq')}")
    for msg in inner.get("messages", []):
        print(
            f"  - {msg.get('type'):8s} from={msg.get('senderId')}  "
            f"intentId={msg.get('intentId')}"
        )
    if steward_intent:
        print("\nsteward presence payload:")
        print(json.dumps(steward_intent.get("payload"), indent=2, default=str))

heading("post: hello intent into the space")
hello = session.post_and_confirm(
    session.intent(
        "Hello from Bazaar. Acknowledging the steward and verifying round-trip.",
        parent_id=space_id,
        payload={"kind": "smoke-test", "agent": AGENT_NAME},
    ),
    step="intent.smoke-test",
    confirm_space_id=space_id,
)
hello_intent_id = hello.get("intentId")
print(f"posted intentId: {hello_intent_id}")

heading("wait briefly for any steward reply (PROMISE or INTENT)")
deadline = time.time() + 6.0
saw_reply = False
while time.time() < deadline:
    fresh = session.scan_full(hello_intent_id)
    msgs = fresh.get("messages", [])
    if msgs:
        for msg in msgs:
            if msg.get("senderId") == AGENT_NAME:
                continue
            print(f"  reply: {msg.get('type')} from {msg.get('senderId')}")
            content = (msg.get("payload") or {}).get("content")
            if content:
                print(f"          content: {content!r}")
            saw_reply = True
        if saw_reply:
            break
    time.sleep(1.0)
if not saw_reply:
    print("  (no reply yet — expected for an open-ended hello; steward only acts on shapes it advertises)")

heading("post-test scan_full(space)")
final = session.scan_full(space_id)
print(f"latestSeq: {final.get('latestSeq')}  messages: {len(final.get('messages', []))}")
for msg in final.get("messages", []):
    print(
        f"  - {msg.get('type'):8s} from={msg.get('senderId')}  "
        f"intentId={msg.get('intentId')}  promiseId={msg.get('promiseId')}"
    )

heading("snapshot()")
snap = session.snapshot(transcript_limit=6, step_limit=6)
print(json.dumps(snap, indent=2, default=str))

heading("OK")
print(f"space_id   : {space_id}")
print(f"agent_id   : {session.agent_id}")
print(f"steward_id : {steward_id}")
print(f"hello id   : {hello_intent_id}")
