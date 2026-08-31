#!/usr/bin/env python3
"""Fix the corrupted branch filters in the CI workflow."""
path = "/home/z/my-project/.github/workflows/verification.yml"
src = open(path).read()
before = src.count("branches: ain, master]")
src = src.replace("branches: ain, master]", "branches: [main, master]")
open(path, "w").write(src)
print(f"replaced {before} occurrences")

import yaml
doc = yaml.safe_load(open(path))
triggers = doc.get(True, doc.get("on", {}))
print("push branches:", triggers.get("push", {}).get("branches"))
print("pr branches:", triggers.get("pull_request", {}).get("branches"))
print("YAML VALID ✓")
