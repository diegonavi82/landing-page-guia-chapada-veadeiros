#!/usr/bin/env python3
"""Remove inline 'Compre seu passeio' CTA from gcv-detail-content on atrativos pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

P1 = re.compile(
    r'<a\s+class="button"\s+href="[^"]*"(?:\s+rel="[^"]*")?\s*>'
    r"(?:Compre seu passeio!|Buy your tour!|\u00a1Compra tu recorrido!)"
    r"</a>",
    re.IGNORECASE,
)
P2 = re.compile(
    r'<a\s+href="[^"]*"\s+class="button"\s*>'
    r"(?:Compre seu passeio!|Buy your tour!|\u00a1Compra tu recorrido!)"
    r"</a>",
    re.IGNORECASE,
)
ORPHAN = re.compile(
    r'[ \t]*(?:Compre seu passeio!|Buy your tour!|\u00a1Compra tu recorrido!)\s*(?=\s*</div>)',
    re.IGNORECASE | re.MULTILINE,
)


def main() -> None:
    changed: list[str] = []
    for folder in ("atrativos", "en/atrativos", "es/atrativos"):
        d = ROOT / folder
        if not d.is_dir():
            continue
        for f in sorted(d.glob("*.html")):
            text = f.read_text(encoding="utf-8")
            orig = text
            text = P1.sub("", text)
            text = P2.sub("", text)
            text = ORPHAN.sub("", text)
            if text != orig:
                f.write_text(text, encoding="utf-8")
                changed.append(str(f.relative_to(ROOT)))

    print(f"Updated {len(changed)} file(s)")
    for p in changed:
        print(" ", p)


if __name__ == "__main__":
    main()
