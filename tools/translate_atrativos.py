#!/usr/bin/env python3
"""
Populate en/ and es/ attraction detail HTML from Portuguese sources,
keeping existing layout/URLs/footer shell and translating body copy.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from copy import deepcopy

from bs4 import BeautifulSoup, NavigableString, Tag
from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
PT_DIR = ROOT / "atrativos"
EN_DIR = ROOT / "en" / "atrativos"
ES_DIR = ROOT / "es" / "atrativos"


def safe_translate(translator: GoogleTranslator, text: str) -> str:
    """Google free API has limits; strip and chunk long strings."""
    time.sleep(0.08)
    t = text
    if not t or not t.strip():
        return t
    if len(t) < 4900:
        try:
            result = translator.translate(t)
            if result is None:
                return t
            return result
        except Exception as e:
            print("translate error:", e, file=sys.stderr)
            return t
    chunks = []
    start = 0
    step = 4500
    while start < len(t):
        part = t[start : start + step]
        try:
            chunks.append(translator.translate(part) or part)
        except Exception as e:
            print("translate chunk error:", e, file=sys.stderr)
            chunks.append(part)
        start += step
    return "".join(chunks)


ATTR_KEYS = frozenset(
    {
        "alt",
        "aria-label",
        "title",
        "data-gcv-alt",
        "data-gcv-caption",
        "content",
    }
)


def fix_en_es_asset_paths(soup: BeautifulSoup):
    """PT pages use ../assets from /atrativos; en/es need ../../assets."""
    for tag in soup.find_all(True):
        for attr in ("src", "href", "data-gcv-src"):
            v = tag.get(attr)
            if isinstance(v, str) and v.startswith("../assets/") and not v.startswith(
                "../../assets/"
            ):
                tag[attr] = "../" + v


def translate_fragment(translator: GoogleTranslator, node: Tag | NavigableString | None):
    """In-place mutate tree: translate text and selected attributes."""
    if node is None:
        return
    if isinstance(node, NavigableString):
        s = str(node)
        if not s.strip():
            return
        repl = safe_translate(translator, s)
        node.replace_with(NavigableString(repl))
        return

    assert isinstance(node, Tag)
    for k in list(node.attrs):
        if k in ATTR_KEYS:
            val = node.attrs[k]
            if isinstance(val, str) and val.strip():
                node.attrs[k] = safe_translate(translator, val)

    for child in list(node.contents):
        if isinstance(child, NavigableString):
            translate_fragment(translator, child)
        elif isinstance(child, Tag):
            if child.name in ("script", "style"):
                continue
            translate_fragment(translator, child)


def transplant_translated_sidebar_content(
    pt_soup: BeautifulSoup, lng_soup: BeautifulSoup, translator: GoogleTranslator
):
    pt_aside = pt_soup.select_one("aside.gcv-detail-sidebar")
    lng_aside = lng_soup.select_one("aside.gcv-detail-sidebar")
    if not pt_aside or not lng_aside:
        return
    pt_inner = BeautifulSoup(str(pt_aside.decode_contents()), "html.parser")
    translate_fragment(translator, pt_inner)
    lng_img = lng_aside.find("img", class_="gcv-detail-main-image")
    lng_cta = lng_aside.find("div", class_="gcv-detail-cta")
    lng_info = lng_aside.find("div", class_="gcv-detail-info")

    pi_img = pt_inner.find("img", class_="gcv-detail-main-image")
    pi_cta = pt_inner.find("div", class_="gcv-detail-cta")
    pi_info = pt_inner.find("div", class_="gcv-detail-info")

    if lng_img and pi_img:
        lng_img.attrs = deepcopy(pi_img.attrs)
        if pi_img.alt:
            lng_img["alt"] = pi_img["alt"]
    if lng_cta and pi_cta:
        lng_cta.clear()
        for c in pi_cta.contents:
            lng_cta.append(deepcopy(c))
    if lng_info and pi_info:
        lng_info.clear()
        for child in pi_info.contents:
            lng_info.append(deepcopy(child))


def transplant_translated_main_content(
    pt_soup: BeautifulSoup, lng_soup: BeautifulSoup, translator: GoogleTranslator
):
    pt_div = pt_soup.select_one("div.gcv-detail-content")
    lng_div = lng_soup.select_one("div.gcv-detail-content")
    if not pt_div or not lng_div:
        return
    cloned = BeautifulSoup(str(pt_div.decode_contents()), "html.parser")
    translate_fragment(translator, cloned)
    lng_div.clear()
    # decode_contents wraps fragment; cloned may be implicit body with multiple roots
    for el in cloned.contents[:]:
        lng_div.append(deepcopy(el))


def transplant_title_h1_ldjson(
    pt_soup: BeautifulSoup, lng_soup: BeautifulSoup, translator: GoogleTranslator
):
    h1_pt = pt_soup.select_one("h1")
    h1_ln = lng_soup.select_one("h1")
    if h1_pt and h1_ln:
        fg = BeautifulSoup(h1_pt.decode_contents(), "html.parser")
        translate_fragment(translator, fg)
        h1_ln.clear()
        for c in fg.contents:
            h1_ln.append(deepcopy(c))
    title_pt = pt_soup.find("title")
    title_ln = lng_soup.find("title")
    if title_pt and title_ln and title_pt.string:
        t = safe_translate(translator, title_pt.string.strip())
        title_ln.string = t
    desc_pt = pt_soup.find("meta", attrs={"name": "description"})
    desc_ln = lng_soup.find("meta", attrs={"name": "description"})
    if desc_pt and desc_ln and desc_pt.get("content"):
        desc_ln["content"] = safe_translate(translator, desc_pt["content"])
    ogt_pt = pt_soup.find("meta", attrs={"property": "og:title"})
    ogt_ln = lng_soup.find("meta", attrs={"property": "og:title"})
    if ogt_pt and ogt_ln and ogt_pt.get("content"):
        ogt_ln["content"] = safe_translate(translator, ogt_pt["content"])
    ogd_pt = pt_soup.find("meta", attrs={"property": "og:description"})
    ogd_ln = lng_soup.find("meta", attrs={"property": "og:description"})
    if ogd_pt and ogd_ln and ogd_pt.get("content"):
        ogd_ln["content"] = safe_translate(translator, ogd_pt["content"])

    ld = lng_soup.find("script", attrs={"type": "application/ld+json"})
    if ld and ld.string:
        try:
            data = json.loads(ld.string)
        except json.JSONDecodeError:
            return
        if isinstance(data.get("description"), str):
            data["description"] = safe_translate(translator, data["description"])
        if isinstance(data.get("name"), str):
            data["name"] = safe_translate(translator, data["name"])
        ld.string = json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def transplant_gallery(
    pt_soup: BeautifulSoup, lng_soup: BeautifulSoup, translator: GoogleTranslator
):
    sec_pt = pt_soup.select_one("section.gcv-attract-gallery")
    sec_ln = lng_soup.select_one("section.gcv-attract-gallery")
    if not sec_pt or not sec_ln:
        return

    title_pt = sec_pt.select_one(".gcv-attract-gallery__title")
    title_ln = sec_ln.select_one(".gcv-attract-gallery__title")
    if title_pt and title_ln:
        fg = BeautifulSoup(title_pt.decode_contents(), "html.parser")
        translate_fragment(translator, fg)
        title_ln.clear()
        for c in fg.contents:
            title_ln.append(deepcopy(c))

    grid_ln = sec_ln.select_one(".gcv-attract-gallery__grid")
    grid_pt = sec_pt.select_one(".gcv-attract-gallery__grid")
    if not grid_ln or not grid_pt:
        return

    cloned_grid = BeautifulSoup(grid_pt.decode_contents(), "html.parser")
    translate_fragment(translator, cloned_grid)
    grid_ln.clear()
    for c in cloned_grid.contents:
        grid_ln.append(deepcopy(c))


def sanitize_translated_html(en_text: str) -> str:
    """Fix stray spaces before punctuation / obvious Google glitches."""
    t = en_text
    t = re.sub(r"\(\s*", "(", t)
    t = re.sub(r"\s+\)", ")", t)
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    t = re.sub(r"Chapados Veadeiros", "Chapada dos Veadeiros", t, flags=re.I)
    t = re.sub(r"</span>([^\s<])", r"</span> \1", t)
    return t


def finalize_file(path: Path):
    txt = path.read_text(encoding="utf-8")
    # Re-translate if needed by reading — here we normalize common issues
    out = sanitize_translated_html(txt)
    if out != txt:
        path.write_text(out, encoding="utf-8")


def process_page(basename: str, target: str):
    slug = basename
    pt_path = PT_DIR / slug
    if target == "en":
        lng_path = EN_DIR / slug
        translator = GoogleTranslator(source="pt", target="en")
        brand_title_suffix = "| Chapada Veadeiros Guide"
    else:
        lng_path = ES_DIR / slug
        translator = GoogleTranslator(source="pt", target="es")
        brand_title_suffix = "| Guía Chapada Veadeiros"

    if not pt_path.is_file():
        print("missing PT:", pt_path, file=sys.stderr)
        return
    if not lng_path.is_file():
        print("missing LNG:", lng_path, file=sys.stderr)
        return

    pt_html = pt_path.read_text(encoding="utf-8")
    lng_html = lng_path.read_text(encoding="utf-8")
    pt_soup = BeautifulSoup(pt_html, "lxml")
    lng_soup = BeautifulSoup(lng_html, "lxml")

    transplant_title_h1_ldjson(pt_soup, lng_soup, translator)
    transplant_translated_sidebar_content(pt_soup, lng_soup, translator)
    transplant_translated_main_content(pt_soup, lng_soup, translator)
    transplant_gallery(pt_soup, lng_soup, translator)

    # Harmonize brand suffix in visible title/meta if Google mangled trailing brand
    t = lng_soup.find("title")
    if t and t.string and "|" in t.string:
        left = t.string.rsplit("|", 1)[0].strip()
        t.string = f"{left} {brand_title_suffix}"
    ogt = lng_soup.find("meta", attrs={"property": "og:title"})
    if ogt and ogt.get("content") and "|" in ogt["content"]:
        left = ogt["content"].rsplit("|", 1)[0].strip()
        ogt["content"] = f"{left} {brand_title_suffix}"

    fix_en_es_asset_paths(lng_soup)

    lng_path.write_text(str(lng_soup), encoding="utf-8")
    finalize_file(lng_path)
    print("OK", target, slug)


def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else ""
    tgt = sys.argv[2] if len(sys.argv) > 2 else "both"

    pt_files = sorted(f.name for f in PT_DIR.glob("*.html"))
    targets = []
    if tgt in ("both", "en"):
        targets.append("en")
    if tgt in ("both", "es"):
        targets.append("es")

    if slug:
        if slug not in pt_files:
            print("unknown slug", slug, file=sys.stderr)
            return 1
        for t in targets:
            process_page(slug, t)
        return 0

    for s in pt_files:
        for t in targets:
            try:
                process_page(s, t)
            except Exception as e:
                print("FAILED", s, t, e, file=sys.stderr)
                raise
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
