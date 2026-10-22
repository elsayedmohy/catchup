#!/usr/bin/env bash
set -euo pipefail

# Send an Android ACTION_SEND intent to Catchup, for share-flow regression tests.
#
# Usage:
#   scripts/android-share-test.sh "https://example.com/page"
#   scripts/android-share-test.sh --cold "Look at https://example.com/page here"
#
# Options:
#   --cold              Force-stop the app first, to exercise a cold start.
#   CATCHUP_TOKEN=...   Also query the API and print the latest saved items.
#   CATCHUP_API=...     API base URL (default http://localhost:5099).
#   CATCHUP_WAIT=...    Seconds to wait before querying the API (default 5).
#   ADB=...             adb binary (default adb).

ADB=${ADB:-adb}
PKG=com.catchup.app
ACTIVITY="$PKG/.MainActivity"
COLD=0

if [[ "${1:-}" == "--cold" ]]; then
  COLD=1
  shift
fi

TEXT=${1:-}
if [[ -z "$TEXT" ]]; then
  echo "usage: $0 [--cold] '<text or URL>'" >&2
  exit 2
fi

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "No Android device or emulator is attached." >&2
  exit 1
fi

if [[ $COLD -eq 1 ]]; then
  "$ADB" shell am force-stop "$PKG"
  sleep 1
fi

# adb joins its arguments without quoting, so the whole remote command must be a
# single argument. Double quotes protect the text; escape the characters that
# still mean something to the device shell.
escape_remote() {
  printf '%s' "$1" | sed 's/[\\"$`]/\\&/g'
}

"$ADB" shell \
  "am start -n $ACTIVITY -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT \"$(escape_remote "$TEXT")\""

if [[ -n "${CATCHUP_TOKEN:-}" ]]; then
  sleep "${CATCHUP_WAIT:-5}"
  API=${CATCHUP_API:-http://localhost:5099}
  curl -s -H "Authorization: Bearer $CATCHUP_TOKEN" "$API/api/items" | python3 -c '
import json, sys
data = json.load(sys.stdin)
items = data.get("items", [])
print("%d item(s) in the current page:" % len(items))
for item in items[:5]:
    print("  - %s | %s" % (item.get("originalUrl"), item.get("metadataStatus")))
'
fi
