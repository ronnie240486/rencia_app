from pathlib import Path
import re

root = Path(__file__).parent
raw = (root / "route_inventory_raw.txt").read_text(encoding="utf-8")
http_lines = []
trpc_lines = []
section = None
for line in raw.splitlines():
    if "=== HTTP ROUTES ===" in line:
        section = "http"
        continue
    if "=== TRPC ROUTER KEYS ===" in line:
        section = "trpc"
        continue
    if not line.strip():
        continue
    if section == "http":
        match = re.search(r'app\.(get|post|put|patch|delete)\((.*)', line)
        if match:
            method = match.group(1).upper()
            expression = match.group(2).strip()
            http_lines.append(f"{method} {expression}")
    elif section == "trpc":
        clean = re.sub(r'^\d+\s+', '', line).strip()
        if clean and not clean.startswith("(Content truncated"):
            trpc_lines.append(clean)

(root / "http_routes.txt").write_text("\n".join(dict.fromkeys(http_lines)) + "\n", encoding="utf-8")
(root / "trpc_routes.txt").write_text("\n".join(dict.fromkeys(trpc_lines)) + "\n", encoding="utf-8")
print(f"HTTP={len(dict.fromkeys(http_lines))} tRPC={len(dict.fromkeys(trpc_lines))}")
