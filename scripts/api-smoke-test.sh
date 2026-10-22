#!/usr/bin/env bash
# Smoke test script for the Catchup API.
# Usage: ./scripts/api-smoke-test.sh [base-url]
set -euo pipefail

BASE="${1:-http://localhost:5099}"
PASS=0
FAIL=0

c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_red()   { printf '\033[31m%s\033[0m\n' "$1"; }

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1)); c_green "PASS  $name"
  else
    FAIL=$((FAIL+1)); c_red "FAIL  $name (expected=$expected actual=$actual)"
  fi
}

contains() {
  local name="$1" needle="$2" haystack="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    PASS=$((PASS+1)); c_green "PASS  $name"
  else
    FAIL=$((FAIL+1)); c_red "FAIL  $name (missing '$needle' in: ${haystack:0:200})"
  fi
}

EMAIL="smoke_$(date +%s)@example.com"
PASSWORD="SmokeTest123!"

echo "== Catchup API smoke test against $BASE =="

# --- Registration ---
REG=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
REG_BODY=$(echo "$REG" | sed '$d')
REG_CODE=$(echo "$REG" | tail -1)
check "register returns 201" "201" "$REG_CODE"
contains "register returns accessToken" "accessToken" "$REG_BODY"

TOKEN=$(echo "$REG_BODY" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
USER_ID=$(echo "$REG_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && { PASS=$((PASS+1)); c_green "PASS  token extracted"; } || { FAIL=$((FAIL+1)); c_red "FAIL  token extracted"; }

AUTH="Authorization: Bearer $TOKEN"

# --- Duplicate registration ---
DUP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
check "duplicate register returns 409" "409" "$DUP"

# --- Login ---
LOGIN=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
LOGIN_BODY=$(echo "$LOGIN" | sed '$d')
LOGIN_CODE=$(echo "$LOGIN" | tail -1)
check "login returns 200" "200" "$LOGIN_CODE"
contains "login returns accessToken" "accessToken" "$LOGIN_BODY"

# --- Login with wrong password ---
BAD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"WrongPassword123!\"}")
check "login with wrong password returns 401" "401" "$BAD"

# --- Unauthenticated access ---
NOAUTH=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/items")
check "items without token returns 401" "401" "$NOAUTH"

# --- Create item ---
CREATE=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/items" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"originalUrl":"https://example.com/some/article?utm_source=twitter&utm_medium=social"}')
CREATE_BODY=$(echo "$CREATE" | sed '$d')
CREATE_CODE=$(echo "$CREATE" | tail -1)
check "create item returns 201" "201" "$CREATE_CODE"
contains "create item has normalizedUrl without utm" "example.com/some/article" "$CREATE_BODY"
ITEM_ID=$(echo "$CREATE_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

# --- Duplicate item is idempotent (200, not 201) ---
DUPITEM=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/items" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"originalUrl":"https://www.example.com/some/article"}')
DUPITEM_BODY=$(echo "$DUPITEM" | sed '$d')
DUPITEM_CODE=$(echo "$DUPITEM" | tail -1)
check "duplicate item returns 200" "200" "$DUPITEM_CODE"
DUPITEM_ID=$(echo "$DUPITEM_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
check "duplicate item returns same id" "$ITEM_ID" "$DUPITEM_ID"

# --- Invalid URL rejected ---
INVALID=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/items" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"originalUrl":"javascript:alert(1)"}')
check "javascript: URL returns 400" "400" "$INVALID"

SCHEME=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/items" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"originalUrl":"file:///etc/passwd"}')
check "file: URL returns 400" "400" "$SCHEME"

# --- List items ---
LIST=$(curl -s "$BASE/api/items" -H "$AUTH")
contains "list contains saved item" "$ITEM_ID" "$LIST"

# --- Search ---
SEARCH=$(curl -s "$BASE/api/items?q=article" -H "$AUTH")
contains "search by title/url finds item" "$ITEM_ID" "$SEARCH"

NOMATCH=$(curl -s "$BASE/api/items?q=zzzznotfoundzzzz" -H "$AUTH")
contains "search with no match returns empty items" '"items":[]' "$NOMATCH"

# --- Get by id ---
GET=$(curl -s -w '\n%{http_code}' "$BASE/api/items/$ITEM_ID" -H "$AUTH")
GET_CODE=$(echo "$GET" | tail -1)
check "get item by id returns 200" "200" "$GET_CODE"

# --- Archive ---
ARCH=$(curl -s -w '\n%{http_code}' -X PUT "$BASE/api/items/$ITEM_ID/archive" -H "$AUTH")
ARCH_BODY=$(echo "$ARCH" | sed '$d')
ARCH_CODE=$(echo "$ARCH" | tail -1)
check "archive returns 200" "200" "$ARCH_CODE"
contains "archived item has archivedAt" "archivedAt" "$ARCH_BODY"

INBOX=$(curl -s "$BASE/api/items" -H "$AUTH")
contains "archived item removed from inbox" '"items":[]' "$INBOX"

ARCHIVE_LIST=$(curl -s "$BASE/api/items?archived=true" -H "$AUTH")
contains "archived item appears in archive list" "$ITEM_ID" "$ARCHIVE_LIST"

# --- Restore ---
REST=$(curl -s -w '\n%{http_code}' -X PUT "$BASE/api/items/$ITEM_ID/restore" -H "$AUTH")
REST_CODE=$(echo "$REST" | tail -1)
check "restore returns 200" "200" "$REST_CODE"

INBOX2=$(curl -s "$BASE/api/items" -H "$AUTH")
contains "restored item back in inbox" "$ITEM_ID" "$INBOX2"

# --- Cross-user isolation ---
OTHER_EMAIL="other_$(date +%s)@example.com"
OTHER=$(curl -s -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$OTHER_EMAIL\",\"password\":\"$PASSWORD\"}")
OTHER_TOKEN=$(echo "$OTHER" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[ -n "$OTHER_TOKEN" ] && { PASS=$((PASS+1)); c_green "PASS  second user token extracted"; } \
  || { FAIL=$((FAIL+1)); c_red "FAIL  second user token extracted (body: ${OTHER:0:200})"; }

CROSS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/items/$ITEM_ID" -H "Authorization: Bearer $OTHER_TOKEN")
check "other user cannot read item (404)" "404" "$CROSS"

CROSS_LIST=$(curl -s "$BASE/api/items" -H "Authorization: Bearer $OTHER_TOKEN")
contains "other user list is empty" '"items":[]' "$CROSS_LIST"

CROSS_DEL=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/items/$ITEM_ID" -H "Authorization: Bearer $OTHER_TOKEN")
check "other user cannot delete item (404)" "404" "$CROSS_DEL"

# --- /api/user/me ---
ME=$(curl -s "$BASE/api/user/me" -H "$AUTH")
contains "user/me returns email" "$EMAIL" "$ME"

# --- Delete item ---
DEL=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/items/$ITEM_ID" -H "$AUTH")
check "delete item returns 204" "204" "$DEL"

GONE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/items/$ITEM_ID" -H "$AUTH")
check "deleted item returns 404" "404" "$GONE"

# --- Delete account cascades ---
ACC=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/user/me" -H "$AUTH")
check "delete account returns 204" "204" "$ACC"

AFTER=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/items" -H "$AUTH")
check "token invalid after account deletion (401)" "401" "$AFTER"

echo ""
echo "================================"
echo "Passed: $PASS   Failed: $FAIL"
echo "================================"
[ "$FAIL" -eq 0 ]
