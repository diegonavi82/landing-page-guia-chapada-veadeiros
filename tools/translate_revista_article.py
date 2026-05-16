#!/usr/bin/env python3
"""Generate en/ or es/ revista HTML from Portuguese source."""

from __future__ import annotations

import json
import re
import sys
import time
from copy import deepcopy
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup, NavigableString, Tag
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]


def safe_translate(translator: GoogleTranslator, text: str) -> str:
    time.sleep(0.06)
    if not text or not text.strip():
        return text
    if len(text) < 4900:
        try:
            return translator.translate(text) or text
        except Exception:
            return text
    out = []
    for i in range(0, len(text), 4500):
        part = text[i : i + 4500]
        try:
            out.append(translator.translate(part) or part)
        except Exception:
            out.append(part)
        time.sleep(0.08)
    return "".join(out)


ATTR_KEYS = frozenset({"alt", "aria-label", "title", "content"})


def translate_fragment(translator: GoogleTranslator, node: Tag | NavigableString | None):
    if node is None:
        return
    if isinstance(node, NavigableString):
        s = str(node)
        if not s.strip():
            return
        node.replace_with(NavigableString(safe_translate(translator, s)))
        return
    assert isinstance(node, Tag)
    if node.name in ("script", "style"):
        return
    for k in list(node.attrs):
        if k not in ATTR_KEYS:
            continue
        val = node.attrs[k]
        if isinstance(val, str) and val.strip():
            node.attrs[k] = safe_translate(translator, val)
    for child in list(node.contents):
        if isinstance(child, NavigableString):
            translate_fragment(translator, child)
        elif isinstance(child, Tag):
            translate_fragment(translator, child)


def translate_scripts_json_ld(tag: Tag, translator: GoogleTranslator):
    if not tag.string or not tag.string.strip():
        return
    try:
        data = json.loads(tag.string)
    except json.JSONDecodeError:
        return

    def walk(o, skip_strings: bool = False):
        if isinstance(o, dict):
            return {k: walk(v, skip_strings or k == "@type") for k, v in o.items()}
        if isinstance(o, list):
            return [walk(x, skip_strings) for x in o]
        # Schema.org @type values use English vocabulary — never machine-translate
        if isinstance(o, str) and o.strip() and not skip_strings:
            time.sleep(0.04)
            return safe_translate(translator, o)
        return o

    try:
        tag.string = json.dumps(walk(data), ensure_ascii=False, separators=(",", ":"))
    except Exception:
        pass


def fix_asset_refs(soup: BeautifulSoup):
    for tag in soup.find_all(True):
        for ak, av in list(tag.attrs.items()):
            if ak in ("href", "src", "srcset") and isinstance(av, str):
                if av.startswith("../assets/"):
                    tag[ak] = "../../assets/" + av.split("../assets/", 1)[-1]


def process(pt_path: Path, target: str):
    slug = pt_path.name
    slug_base = slug.replace(".html", "")
    if target == "en":
        out_dir = ROOT / "en" / "revista"
        translator = GoogleTranslator(source="pt", target="en")
        suffix = "| Chapada Veadeiros Guide"
        lang_code = "en"
    else:
        out_dir = ROOT / "es" / "revista"
        translator = GoogleTranslator(source="pt", target="es")
        suffix = "| Guía Chapada Veadeiros"
        lang_code = "es"

    out_path = out_dir / slug
    soup = BeautifulSoup(pt_path.read_text(encoding="utf-8"), "lxml")

    soup.html["lang"] = lang_code

    locale = "en_US" if target == "en" else "es_ES"
    og_loc = soup.find("meta", attrs={"property": "og:locale"})
    if og_loc:
        og_loc["content"] = locale

    prefix = "/en/" if target == "en" else "/es/"
    root_url = f"https://www.guiachapadaveadeiros.com{prefix}revista/{slug_base}"

    for link in soup.find_all("link", rel="canonical"):
        link["href"] = root_url
    for meta in soup.find_all("meta", property="og:url"):
        meta["content"] = root_url

    for link in soup.find_all("link", rel=lambda x: x and "alternate" in x):
        if "hreflang" not in link.attrs:
            continue
        hl = link["hreflang"]
        if hl == "en":
            link["href"] = (
                f"https://www.guiachapadaveadeiros.com/en/revista/{slug_base}"
            )
        elif hl == "es":
            link["href"] = (
                f"https://www.guiachapadaveadeiros.com/es/revista/{slug_base}"
            )

    for lk in soup.find_all("link", href=re.compile(r"\.css")):
        if lk["href"].startswith("../assets"):
            lk["href"] = "../../assets/" + lk["href"].split("../assets/", 1)[-1]
    for sc in soup.find_all("script", src=re.compile(r"site\.js")):
        if sc.get("src", "").startswith("../"):
            sc["src"] = "../../assets/js/site.js"

    fix_asset_refs(soup)

    switch = soup.find("div", class_="lang-switch")
    if switch:
        for a in switch.find_all("a", hreflang=True):
            hl = a.get("hreflang", "")
            a.attrs.pop("aria-current", None)
            if hl == "pt-BR":
                a["href"] = f"../../revista/{slug}"
            elif hl == "en":
                if target == "es":
                    a["href"] = f"../../en/revista/{slug}"
                else:
                    a["href"] = "#"
                    a["aria-current"] = "true"
            elif hl == "es":
                if target == "en":
                    a["href"] = f"../../es/revista/{slug}"
                else:
                    a["href"] = "#"
                    a["aria-current"] = "true"

    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        meta_desc["content"] = safe_translate(translator, meta_desc["content"])
    og_desc = soup.find("meta", attrs={"property": "og:description"})
    if og_desc and og_desc.get("content"):
        og_desc["content"] = safe_translate(translator, og_desc["content"])

    ttl = soup.find("title")
    if ttl and ttl.string:
        ttl.string = safe_translate(translator, ttl.string.strip())

    og_title = soup.find("meta", attrs={"property": "og:title"})
    if og_title and og_title.get("content"):
        og_title["content"] = safe_translate(translator, og_title["content"])

    if ttl and ttl.string:
        ttl.string = f"{ttl.string.split('|')[0].strip()} {suffix}"
    if og_title and og_title.get("content") and "|" in og_title["content"]:
        left = og_title["content"].rsplit("|", 1)[0].strip()
        og_title["content"] = f"{left} {suffix}"

    for scr in soup.find_all("script", attrs={"type": "application/ld+json"}):
        translate_scripts_json_ld(scr, translator)
        if not scr.string:
            continue
        scr.string = (
            scr.string.replace(
                f'"@id":"https://www.guiachapadaveadeiros.com/revista/{slug_base}"',
                f'"@id":"{root_url}"',
            )
            .replace(
                f'"url":"https://www.guiachapadaveadeiros.com/revista/{slug_base}"',
                f'"url":"{root_url}"',
            )
            .replace(
                f'"mainEntityOfPage":{{"@type":"WebPage","@id":"https://www.guiachapadaveadeiros.com/revista/{slug_base}"}}',
                f'"mainEntityOfPage":{{"@type":"WebPage","@id":"{root_url}"}}',
            )
        )

    main = soup.find("main")
    if main:
        inner = BeautifulSoup(main.decode_contents(), "html.parser")
        translate_fragment(translator, inner)
        main.clear()
        for c in inner.contents:
            main.append(deepcopy(c))

    share_u = quote(root_url, safe="")
    for a in soup.find_all("a", href=re.compile(r"facebook.com/sharer")):
        a["href"] = "https://www.facebook.com/sharer.php?u=" + share_u
    ttl_short = ttl.string.split("|")[0].strip() if ttl and ttl.string else ""
    for a in soup.find_all("a", class_=lambda c: c and "wa" in c):
        a["href"] = "https://api.whatsapp.com/send?text=" + quote(
            f"{ttl_short} {root_url}"
        )
    for a in soup.find_all("a", href=re.compile(r"^mailto:\?subject=")):
        a["href"] = (
            f"mailto:?subject={quote(ttl_short)}&body="
            + quote(f"{ttl_short}\n\n{root_url}")
        )

    sk = soup.find("a", class_="skip-link")
    if sk and sk.string:
        sk.string = safe_translate(translator, sk.string)
    nt = soup.find("nav", class_="nav-main")
    if nt and nt.get("aria-label"):
        nt["aria-label"] = "Primary" if target == "en" else safe_translate(translator, "Principal")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(str(soup), encoding="utf-8")
    print("OK", out_path)


def main():
    slug = sys.argv[1]
    tgt = sys.argv[2]
    process(ROOT / "revista" / slug, tgt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
