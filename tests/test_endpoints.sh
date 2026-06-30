#!/usr/bin/env bash
# CincoDeBio Endpoint Tests (Bash)
#
# Usage:
#   ./test_endpoints.sh
#
# Requires port-forwards:
#   kubectl port-forward svc/sib-manager 8081:80 &
#   kubectl port-forward svc/execution-api 8082:80 &
#   kubectl port-forward svc/service-api 8084:80 &

set -euo pipefail

SIB_MANAGER="${SIB_MANAGER_URL:-http://localhost:8081}"
EXECUTION_API="${EXECUTION_API_URL:-http://localhost:8082}"
SERVICE_API="${SERVICE_API_URL:-http://localhost:8084}"

PASSED=0
FAILED=0

pass() { PASSED=$((PASSED + 1)); echo "  PASS: $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1 — $2"; }

# ---- sib-manager ----
echo "=== sib-manager tests ==="

# health
RESP=$(curl -sf "$SIB_MANAGER/health" 2>/dev/null) && {
  echo "$RESP" | grep -q '"healthy"' && pass "health" || fail "health" "$RESP"
} || fail "health" "request failed"

# get-sib-map
RESP=$(curl -sf "$SIB_MANAGER/get-sib-map" 2>/dev/null) && {
  echo "$RESP" | grep -q '"concepts"' && {
    pass "get-sib-map"
    CONCEPTS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('concepts',{})))" 2>/dev/null || echo "?")
    INPUTS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('inputs',{})))" 2>/dev/null || echo "?")
    OUTPUTS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('outputs',{})))" 2>/dev/null || echo "?")
    echo "         SIB map: $CONCEPTS concepts, $INPUTS input definitions, $OUTPUTS output definitions"
    echo "$RESP" | python3 -c "
import json,sys
d = json.load(sys.stdin)
for name in sorted(d.get('concepts',{}).keys()):
    ins = d.get('inputs',{}).get(name,{})
    outs = d.get('outputs',{}).get(name,{})
    in_types = [t.split(':')[1] if ':' in t else t for t in ins] if isinstance(ins,list) else list(ins.keys())
    out_types = [t.split(':')[1] if ':' in t else t for t in outs] if isinstance(outs,list) else list(outs.keys())
    print(f'           {name:40s} in=[{\", \".join(in_types)}]  out=[{\", \".join(out_types)}]')
" 2>/dev/null || true
  } || fail "get-sib-map" "missing concepts"
} || fail "get-sib-map" "request failed"

# get-installed-sibs
RESP=$(curl -sf "$SIB_MANAGER/ext/get-installed-sibs" 2>/dev/null) && {
  echo "$RESP" | grep -q '"image"' && {
    pass "get-installed-sibs"
    echo "$RESP" | python3 -c "
import json,sys
sibs = json.load(sys.stdin)
print(f'         {len(sibs)} installed SIBs:')
for s in sibs:
    schema = s.get('cincodebio.schema',{})
    name = schema.get('service_name','?')
    stype = schema.get('service_type','?')
    concept = schema.get('abstract_concept','?')
    print(f'           {name:40s} type={stype:12s} concept={concept}')
" 2>/dev/null || true
  } || fail "get-installed-sibs" "missing image field"
} || fail "get-installed-sibs" "request failed"

# get-uninstalled-sibs
RESP=$(curl -sf "$SIB_MANAGER/ext/get-uninstalled-sibs" 2>/dev/null) && {
  pass "get-uninstalled-sibs"
  COUNT=$(echo "$RESP" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  echo "         $COUNT uninstalled SIBs"
} || fail "get-uninstalled-sibs" "request failed"

# get-utd-sib-file
RESP=$(curl -sf "$SIB_MANAGER/ext/get-utd-sib-file" 2>/dev/null) && {
  echo "$RESP" | grep -q '"file"' && {
    pass "get-utd-sib-file"
    LEN=$(echo "$RESP" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['file']))" 2>/dev/null || echo "?")
    echo "         UTD sib file: $LEN characters"
  } || fail "get-utd-sib-file" "missing file key"
} || fail "get-utd-sib-file" "request failed"

# get-missing-sib-files
MISSING_SIBS_JSON="/tmp/cdb_missing_sibs.json"
HAVE_SIB_FILES=false
RESP=$(curl -sf -X POST "$SIB_MANAGER/ext/get-missing-sib-files" \
  -H "Content-Type: application/json" \
  -d '{"file_ids":[]}' 2>/dev/null) && {
  echo "$RESP" > "$MISSING_SIBS_JSON"
  COUNT=$(python3 -c "import json,sys; print(len(json.load(open('$MISSING_SIBS_JSON')).get('files',{})))" 2>/dev/null || echo "0")
  if [ "$COUNT" -gt 0 ]; then
    HAVE_SIB_FILES=true
    pass "get-missing-sib-files"
    echo "         Missing request returned $COUNT SIB files"
  else
    fail "get-missing-sib-files" "no SIB files returned"
  fi
} || fail "get-missing-sib-files" "request failed"

# check-sib-files-hashes (valid)
HASH_PAYLOAD_JSON="/tmp/cdb_hash_payload.json"
if [ "$HAVE_SIB_FILES" = true ]; then
python3 - <<PY
import hashlib, json
with open('$MISSING_SIBS_JSON') as f:
    files = json.load(f).get('files', {})
payload = {name: hashlib.sha256(content.encode('utf-8')).hexdigest() for name, content in files.items()}
with open('$HASH_PAYLOAD_JSON', 'w') as f:
    json.dump({'fileHashes': payload}, f)
PY
RESP=$(curl -sf -X POST "$SIB_MANAGER/ext/check-sib-files-hashes" \
  -H "Content-Type: application/json" \
  -d "@$HASH_PAYLOAD_JSON" 2>/dev/null) && {
  python3 - <<PY
import json, sys
data = json.loads('''$RESP''')
hashes = data.get('hashesValid', {})
invalid = [name for name, status in hashes.items() if status != 'VALID']
if not hashes or invalid:
    print('invalid=' + ','.join(invalid))
    sys.exit(1)
print(len(hashes))
PY
  VALID_COUNT=$(python3 -c "import json; print(len(json.loads('''$RESP''').get('hashesValid', {})))" 2>/dev/null || echo "?")
  pass "check-sib-files-hashes (valid)"
  echo "         Validated hashes for $VALID_COUNT SIB files"
} || fail "check-sib-files-hashes (valid)" "$RESP"
else
  fail "check-sib-files-hashes (valid)" "skipped because get-missing-sib-files failed"
fi

# get-utd-sib-files
REQUEST_PAYLOAD_JSON="/tmp/cdb_requested_sibs.json"
if [ "$HAVE_SIB_FILES" = true ]; then
python3 - <<PY
import json
with open('$MISSING_SIBS_JSON') as f:
    files = json.load(f).get('files', {})
requested = sorted(files.keys())[:3]
with open('$REQUEST_PAYLOAD_JSON', 'w') as f:
    json.dump({'file_ids': requested}, f)
PY
RESP=$(curl -sf -X POST "$SIB_MANAGER/ext/get-utd-sib-files" \
  -H "Content-Type: application/json" \
  -d "@$REQUEST_PAYLOAD_JSON" 2>/dev/null) && {
  COUNT=$(echo "$RESP" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('files',{})))" 2>/dev/null || echo "0")
  if [ "$COUNT" -gt 0 ]; then
    pass "get-utd-sib-files"
    echo "         Retrieved $COUNT requested SIB files"
  else
    fail "get-utd-sib-files" "no files returned"
  fi
} || fail "get-utd-sib-files" "request failed"
else
  fail "get-utd-sib-files" "skipped because get-missing-sib-files failed"
fi

# check-sib-file-hash (invalid)
RESP=$(curl -sf -X POST "$SIB_MANAGER/ext/check-sib-file-hash" \
  -H "Content-Type: application/json" \
  -d '{"fileHash":"fakehash123"}' 2>/dev/null) && {
  echo "$RESP" | grep -q 'INVALID' && {
    pass "check-sib-file-hash (invalid)"
    echo "         Sent fake hash → correctly returned INVALID"
  } || fail "check-sib-file-hash" "$RESP"
} || fail "check-sib-file-hash" "request failed"

# check-sib-files-hashes (empty)
RESP=$(curl -sf -X POST "$SIB_MANAGER/ext/check-sib-files-hashes" \
  -H "Content-Type: application/json" \
  -d '{"fileHashes":{}}' 2>/dev/null) && {
  echo "$RESP" | grep -q 'hashesValid' && {
    pass "check-sib-files-hashes (empty)"
    echo "         Sent empty hashes → response contains hashesValid"
  } || fail "check-sib-files-hashes" "$RESP"
} || fail "check-sib-files-hashes" "request failed"

# sib-manager-state
RESP=$(curl -sf "$SIB_MANAGER/sib-manager-state" 2>/dev/null) && {
  pass "sib-manager-state"
  echo "$RESP" | python3 -c "
import json,sys
d = json.load(sys.stdin)
latest = d.get('latest',[])
installed = d.get('installed',[])
rest = d.get('rest',[])
print(f'         State: {len(latest)} latest, {len(installed)} installed, {len(rest)} pending')
if rest:
    print(f'         Pending: {\", \".join(rest)}')
" 2>/dev/null || true
} || fail "sib-manager-state" "request failed"

# ---- execution-api ----
echo ""
echo "=== execution-api tests ==="

# health
RESP=$(curl -sf "$EXECUTION_API/health" 2>/dev/null) && {
  echo "$RESP" | grep -q '"healthy"' && pass "health" || fail "health" "$RESP"
} || fail "health" "request failed"

# get-workflows
RESP=$(curl -sf "$EXECUTION_API/ext/get-workflows" 2>/dev/null) && {
  pass "get-workflows"
  echo "$RESP" | python3 -c "
import json,sys
wfs = json.load(sys.stdin)
print(f'         {len(wfs)} workflows found')
if wfs:
    from collections import Counter
    statuses = Counter(w.get('status','unknown') for w in wfs)
    status_str = ', '.join(f'{v} {k}' for k,v in statuses.items())
    print(f'         Statuses: {status_str}')
    for w in wfs[:5]:
        print(f'           id={w[\"id\"]}  owner={w.get(\"owner\",\"?\")}  status={w.get(\"status\",\"?\")}')
    if len(wfs) > 5:
        print(f'           ... and {len(wfs)-5} more')
" 2>/dev/null || true
} || fail "get-workflows" "request failed"

# submit-workflow (compose InitTMA -> SegArrayTMA)
HTTP_CODE=$(curl -s -o /tmp/cdb_submit_resp.json -w "%{http_code}" -X POST "$EXECUTION_API/ext/model/submit" \
  -F "model=@-;filename=test.sibs;type=text/plain" <<< "InitTMA -> SegArrayTMA" 2>/dev/null)
if [ "$HTTP_CODE" = "202" ]; then
  pass "submit-workflow (HTTP 202)"
  echo "         Submitted: InitTMA -> SegArrayTMA"
  python3 -c "
import json
with open('/tmp/cdb_submit_resp.json') as f:
    d = json.load(f)
url = d.get('url','')
print(f'         Workflow URL: {url}')
" 2>/dev/null || true
else
  fail "submit-workflow" "HTTP $HTTP_CODE"
fi

# ---- service-api ----
echo ""
echo "=== service-api tests ==="

# health
RESP=$(curl -sf "$SERVICE_API/health" 2>/dev/null) && {
  echo "$RESP" | grep -qE '"ok"|"healthy"' && pass "health" || fail "health" "$RESP"
} || fail "health" "request failed"

# openapi spec
RESP=$(curl -sf "$SERVICE_API/openapi.json" 2>/dev/null) && {
  echo "$RESP" | grep -q '"paths"' && {
    pass "openapi spec"
    echo "$RESP" | python3 -c "
import json,sys
d = json.load(sys.stdin)
paths = d.get('paths',{})
print(f'         {len(paths)} endpoints registered:')
for path, methods in sorted(paths.items()):
    method_list = ', '.join(m.upper() for m in methods.keys())
    print(f'           {method_list:6s} {path}')
" 2>/dev/null || true
  } || fail "openapi spec" "missing paths"
} || fail "openapi spec" "request failed"

# ---- summary ----
echo ""
echo "========================================"
echo "Results: $PASSED passed, $FAILED failed, $((PASSED + FAILED)) total"
[ "$FAILED" -eq 0 ] && exit 0 || exit 1
