#!/usr/bin/env python3
"""Create a Postiz DRAFT (never scheduled, never published) for one reel.

Runs on the Postiz host (sosyal.veriteknik.com). The API key is read from a
root-only file and never printed, so callers never handle it.

  postiz-draft.py --list                 # show channel ids/identifiers
  postiz-draft.py <spec.json>            # create the draft

spec.json (in this repo, next to the video):
  {
    "video":       "videos/2026/10/x.mp4",      # repo path
    "text":        "post text (FB / IG / YT description)",
    "threadsText": "<= 500 chars for Threads",
    "title":       "YouTube / Facebook video title",
    "channels":    ["facebook", "instagram", "threads", "youtube"],   # optional
    "channelName": "VeriTeknik"                  # optional, filters by account name
  }
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE = os.environ.get("POSTIZ_BASE", "http://127.0.0.1:4007/api/public/v1")
KEY_FILE = os.environ.get("POSTIZ_API_KEY_FILE", "/opt/postiz/api-key")
RAW = "https://raw.githubusercontent.com/VeriTeknik/reels/main/"
THREADS_MAX = 500


def key():
    with open(KEY_FILE, encoding="utf-8") as f:
        k = f.read().strip()
    if not k:
        sys.exit(f"empty key file {KEY_FILE}")
    return k


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Authorization", key())
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> HTTP {e.code}: {e.read()[:800].decode(errors='replace')}")


def integrations():
    out = []
    for i in call("GET", "/integrations"):
        out.append({
            "id": i.get("id"),
            "name": i.get("name"),
            "identifier": i.get("identifier") or i.get("providerIdentifier"),
            "disabled": i.get("disabled", False),
        })
    return out


def settings_for(identifier, spec):
    if identifier == "youtube":
        return {"__type": "youtube", "title": spec["title"][:100], "type": "public",
                "selfDeclaredMadeForKids": "no", "tags": []}
    if identifier in ("instagram", "instagram-standalone"):
        return {"__type": identifier, "post_type": "post", "collaborators": []}
    if identifier == "facebook":
        return {"__type": "facebook"}
    if identifier == "threads":
        return {"__type": "threads"}
    return {"__type": identifier}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    if sys.argv[1] == "--list":
        print(json.dumps(integrations(), ensure_ascii=False, indent=2))
        return

    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    for f in ("video", "text", "threadsText", "title"):
        if not spec.get(f):
            sys.exit(f"spec missing {f}")
    if len(spec["threadsText"]) > THREADS_MAX:
        sys.exit(f"threadsText is {len(spec['threadsText'])} chars, max {THREADS_MAX}")

    wanted = spec.get("channels") or ["facebook", "instagram", "threads", "youtube"]
    name = spec.get("channelName", "VeriTeknik").lower()
    chans = [i for i in integrations()
             if not i["disabled"] and i["identifier"] in wanted and (i["name"] or "").lower() == name]
    found = {c["identifier"] for c in chans}
    missing = [w for w in wanted if w not in found]
    if not chans:
        sys.exit("no matching channels")

    media = call("POST", "/upload-from-url", {"url": RAW + spec["video"]})
    image = [{"id": media["id"], "path": media["path"]}]

    posts = []
    for c in chans:
        content = spec["threadsText"] if c["identifier"] == "threads" else spec["text"]
        posts.append({
            "integration": {"id": c["id"]},
            "value": [{"content": content, "image": image}],
            "settings": settings_for(c["identifier"], spec),
        })

    res = call("POST", "/posts", {
        "type": "draft",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "shortLink": False,
        "tags": [],
        "posts": posts,
    })
    print(json.dumps({"draft": res, "channels": sorted(found), "missing": missing,
                      "media": media.get("path")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
