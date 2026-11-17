"""매일 1회, 7개 브랜드의 YouTube 구독자 수를 기록한다 (GitHub Actions에서 실행).

data/subscriber-history.json 에 날짜별(KST) 구독자 수를 쌓아 두면,
대시보드가 7일 전 기록과 비교해 실제 증감을 보여준다.

API 키: 저장소 Secret YT_API_KEY가 있으면 그것을, 없으면 js/config.js 의 기본 키를 쓴다.
키를 사이트 주소로 제한해도 동작하도록 요청에 사이트 주소를 Referer로 보낸다.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HISTORY = ROOT / "data" / "subscriber-history.json"
API = os.environ.get("YT_API_BASE", "https://www.googleapis.com/youtube/v3")
SITE = "https://mangmangryu.github.io/ToolSNSstatus/"
KEEP_DAYS = 400
KST = timezone(timedelta(hours=9))
NOTE = "매일 09:05(KST) GitHub Actions가 자동으로 기록합니다. 직접 수정하지 마세요."


def api_key():
    key = os.environ.get("YT_API_KEY", "").strip()
    if key:
        return key
    m = re.search(r"DEFAULT_API_KEY\s*=\s*'([^']+)'", (ROOT / "js" / "config.js").read_text(encoding="utf-8"))
    if not m:
        sys.exit("API key not found (set YT_API_KEY secret or DEFAULT_API_KEY in js/config.js)")
    return m.group(1)


def subscribers(handle, key):
    query = urllib.parse.urlencode({"part": "statistics", "forHandle": handle.lstrip("@"), "key": key})
    req = urllib.request.Request(f"{API}/channels?{query}", headers={"Referer": SITE})
    with urllib.request.urlopen(req, timeout=30) as res:
        items = json.load(res).get("items") or []
    if not items:
        raise ValueError("channel not found")
    return int(items[0]["statistics"]["subscriberCount"])


def main():
    key = api_key()
    brands = json.loads((ROOT / "data" / "brands.json").read_text(encoding="utf-8"))
    counts, failed = {}, []
    for b in brands:
        try:
            counts[b["id"]] = subscribers(b["youtube"]["handle"], key)
        except Exception as e:  # 한 브랜드가 실패해도 나머지는 기록
            failed.append(f"{b['id']} ({b['youtube']['handle']}): {e}")
    for f in failed:
        print("FAILED", f, file=sys.stderr)
    if not counts:
        sys.exit("no subscriber data fetched")

    today = datetime.now(KST).date()
    history = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {}
    snaps = [s for s in history.get("snapshots", []) if s.get("date") != today.isoformat()]
    snaps.append({"date": today.isoformat(), "counts": counts})
    cutoff = (today - timedelta(days=KEEP_DAYS)).isoformat()
    snaps = sorted((s for s in snaps if s["date"] >= cutoff), key=lambda s: s["date"])
    HISTORY.write_text(json.dumps({"note": NOTE, "snapshots": snaps}, ensure_ascii=False, indent=2) + "\n",
                       encoding="utf-8")
    print(f"{today} KST: {counts}")


if __name__ == "__main__":
    main()
