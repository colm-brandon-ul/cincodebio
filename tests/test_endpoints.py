#!/usr/bin/env python3
"""
CincoDeBio Endpoint Tests
Tests sib-manager, execution-api, and service-api endpoints.

Usage:
    python3 test_endpoints.py [--base-url http://localhost]

Requires port-forwards:
    kubectl port-forward svc/sib-manager 8081:80 &
    kubectl port-forward svc/execution-api 8082:80 &
    kubectl port-forward svc/service-api 8084:80 &
"""

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
import requests

SIB_MANAGER = None
EXECUTION_API = None
SERVICE_API = None

PASSED = 0
FAILED = 0
SIB_FILES_CACHE = None


def test(name, fn):
    global PASSED, FAILED
    try:
        fn()
        PASSED += 1
        print(f"  PASS: {name}")
    except Exception as e:
        FAILED += 1
        print(f"  FAIL: {name} — {e}")


# ---------- sib-manager ----------

def test_sib_manager_health():
    r = requests.get(f"{SIB_MANAGER}/health", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert data.get("status") == "healthy", f"unexpected: {data}"


def test_get_sib_map():
    r = requests.get(f"{SIB_MANAGER}/get-sib-map", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert "concepts" in data, "missing 'concepts' key"
    assert "inputs" in data, "missing 'inputs' key"
    assert "outputs" in data, "missing 'outputs' key"
    concepts = data["concepts"]
    assert len(concepts) > 0, "no SIBs in concepts map"
    print(f"         SIB map: {len(concepts)} concepts, {len(data['inputs'])} input defs, {len(data['outputs'])} output defs")
    for name in sorted(concepts.keys()):
        ins = data["inputs"].get(name, {})
        outs = data["outputs"].get(name, {})
        in_types = [t.split(":")[1] if ":" in t else t for t in ins] if isinstance(ins, list) else list(ins.keys())
        out_types = [t.split(":")[1] if ":" in t else t for t in outs] if isinstance(outs, list) else list(outs.keys())
        print(f"           {name:40s} in=[{', '.join(in_types)}]  out=[{', '.join(out_types)}]")


def test_get_installed_sibs():
    r = requests.get(f"{SIB_MANAGER}/ext/get-installed-sibs", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "expected list"
    assert len(data) > 0, "no installed SIBs"
    first = data[0]
    assert "image" in first, "SIB missing 'image' field"
    assert "cincodebio.schema" in first, "SIB missing schema"
    print(f"         {len(data)} installed SIBs:")
    for s in data:
        schema = s.get("cincodebio.schema", {})
        name = schema.get("service_name", "?")
        stype = schema.get("service_type", "?")
        concept = schema.get("abstract_concept", "?")
        print(f"           {name:40s} type={stype:12s} concept={concept}")


def test_get_uninstalled_sibs():
    r = requests.get(f"{SIB_MANAGER}/ext/get-uninstalled-sibs", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "expected list"
    print(f"         {len(data)} uninstalled SIBs")


def test_get_utd_sib_file():
    r = requests.get(f"{SIB_MANAGER}/ext/get-utd-sib-file", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert "file" in data, "missing 'file' key"
    assert len(data["file"]) > 0, "sib file content is empty"
    print(f"         UTD sib file: {len(data['file'])} characters")


def fetch_missing_sib_files():
    global SIB_FILES_CACHE
    if SIB_FILES_CACHE is None:
        r = requests.post(
            f"{SIB_MANAGER}/ext/get-missing-sib-files",
            json={"file_ids": []},
            timeout=20,
        )
        assert r.status_code == 200, f"status {r.status_code}, body: {r.text}"
        data = r.json()
        assert "files" in data, f"missing 'files' key: {data}"
        assert len(data["files"]) > 0, "no SIB files returned"
        SIB_FILES_CACHE = data["files"]
    return SIB_FILES_CACHE


def test_get_missing_sib_files():
    files = fetch_missing_sib_files()
    print(f"         Missing request returned {len(files)} SIB files")


def test_check_sib_files_hashes_valid():
    files = fetch_missing_sib_files()
    payload = {
        name: hashlib.sha256(content.encode("utf-8")).hexdigest()
        for name, content in files.items()
    }
    r = requests.post(
        f"{SIB_MANAGER}/ext/check-sib-files-hashes",
        json={"fileHashes": payload},
        timeout=20,
    )
    assert r.status_code == 200, f"status {r.status_code}, body: {r.text}"
    data = r.json()
    hashes = data.get("hashesValid", {})
    assert set(hashes.keys()) == set(payload.keys()), f"hash response keys differ: {hashes.keys()}"
    invalid = [name for name, status in hashes.items() if status != "VALID"]
    assert not invalid, f"expected all hashes VALID, got invalid: {invalid}"
    print(f"         Validated hashes for {len(hashes)} SIB files")


def test_get_utd_sib_files():
    files = fetch_missing_sib_files()
    requested = sorted(files.keys())[:3]
    r = requests.post(
        f"{SIB_MANAGER}/ext/get-utd-sib-files",
        json={"file_ids": requested},
        timeout=20,
    )
    assert r.status_code == 200, f"status {r.status_code}, body: {r.text}"
    data = r.json()
    returned = data.get("files", {})
    assert set(returned.keys()) == set(requested), f"expected {requested}, got {list(returned.keys())}"
    assert all(returned[name] for name in requested), "one or more returned SIB files are empty"
    print(f"         Retrieved {len(returned)} requested SIB files")


def test_check_sib_file_hash_invalid():
    r = requests.post(
        f"{SIB_MANAGER}/ext/check-sib-file-hash",
        json={"fileHash": "fakehash123"},
        timeout=10,
    )
    assert r.status_code == 200, f"status {r.status_code}"
    assert r.json() == "INVALID", f"unexpected: {r.json()}"
    print("         Sent fake hash → correctly returned INVALID")


def test_check_sib_files_hashes_empty():
    r = requests.post(
        f"{SIB_MANAGER}/ext/check-sib-files-hashes",
        json={"fileHashes": {}},
        timeout=10,
    )
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert "hashesValid" in data, f"missing key: {data}"
    print("         Sent empty hashes → response contains hashesValid")


def test_sib_manager_state():
    r = requests.get(f"{SIB_MANAGER}/sib-manager-state", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    latest = data.get("latest", [])
    installed = data.get("installed", [])
    rest = data.get("rest", [])
    print(f"         State: {len(latest)} latest, {len(installed)} installed, {len(rest)} pending")
    if rest:
        print(f"         Pending: {', '.join(rest)}")


# ---------- execution-api ----------

def test_execution_api_health():
    r = requests.get(f"{EXECUTION_API}/health", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert data.get("status") == "healthy", f"unexpected: {data}"


def test_get_workflows():
    r = requests.get(f"{EXECUTION_API}/ext/get-workflows", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "expected list"
    print(f"         {len(data)} workflows found")
    if data:
        statuses = Counter(w.get("status", "unknown") for w in data)
        status_str = ", ".join(f"{v} {k}" for k, v in statuses.items())
        print(f"         Statuses: {status_str}")
        for w in data[:5]:
            print(f"           id={w['id']}  owner={w.get('owner','?')}  status={w.get('status','?')}")
        if len(data) > 5:
            print(f"           ... and {len(data)-5} more")


def test_submit_workflow():
    """Submit a minimal composed workflow model to execution-api."""
    model_content = "InitTMA -> SegArrayTMA"

    r = requests.post(
        f"{EXECUTION_API}/ext/model/submit",
        files={"model": ("test.sibs", model_content, "text/plain")},
        params={"v2": False},
        timeout=30,
    )
    assert r.status_code == 202, f"status {r.status_code}, body: {r.text}"
    data = r.json()
    assert "url" in data, f"missing 'url' in response: {data}"
    print(f"         Submitted: InitTMA -> SegArrayTMA")
    print(f"         Workflow URL: {data['url']}")


# ---------- service-api ----------

def test_service_api_health():
    r = requests.get(f"{SERVICE_API}/health", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert data.get("status") in ("ok", "healthy"), f"unexpected: {data}"


def test_service_api_openapi():
    r = requests.get(f"{SERVICE_API}/openapi.json", timeout=10)
    assert r.status_code == 200, f"status {r.status_code}"
    data = r.json()
    assert "paths" in data, "missing 'paths' in OpenAPI spec"
    paths = data["paths"]
    assert len(paths) > 0, "no paths in OpenAPI spec"
    print(f"         {len(paths)} endpoints registered:")
    for path in sorted(paths.keys()):
        methods = ", ".join(m.upper() for m in paths[path].keys())
        print(f"           {methods:6s} {path}")


# ---------- main ----------

def main():
    global SIB_MANAGER, EXECUTION_API, SERVICE_API

    parser = argparse.ArgumentParser(description="CincoDeBio endpoint tests")
    parser.add_argument("--sib-manager", default=os.environ.get("SIB_MANAGER_URL", "http://localhost:8081"))
    parser.add_argument("--execution-api", default=os.environ.get("EXECUTION_API_URL", "http://localhost:8082"))
    parser.add_argument("--service-api", default=os.environ.get("SERVICE_API_URL", "http://localhost:8084"))
    args = parser.parse_args()

    SIB_MANAGER = args.sib_manager
    EXECUTION_API = args.execution_api
    SERVICE_API = args.service_api

    print("=== sib-manager tests ===")
    test("health", test_sib_manager_health)
    test("get-sib-map", test_get_sib_map)
    test("get-installed-sibs", test_get_installed_sibs)
    test("get-uninstalled-sibs", test_get_uninstalled_sibs)
    test("get-utd-sib-file", test_get_utd_sib_file)
    test("get-missing-sib-files", test_get_missing_sib_files)
    test("check-sib-files-hashes (valid)", test_check_sib_files_hashes_valid)
    test("get-utd-sib-files", test_get_utd_sib_files)
    test("check-sib-file-hash (invalid)", test_check_sib_file_hash_invalid)
    test("check-sib-files-hashes (empty)", test_check_sib_files_hashes_empty)
    test("sib-manager-state", test_sib_manager_state)

    print("\n=== execution-api tests ===")
    test("health", test_execution_api_health)
    test("get-workflows", test_get_workflows)
    test("submit-workflow", test_submit_workflow)

    print("\n=== service-api tests ===")
    test("health", test_service_api_health)
    test("openapi spec", test_service_api_openapi)

    print(f"\n{'='*40}")
    print(f"Results: {PASSED} passed, {FAILED} failed, {PASSED + FAILED} total")
    sys.exit(1 if FAILED else 0)


if __name__ == "__main__":
    main()
