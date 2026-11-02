"""Check rendered Android navigation bounds from a fictional-data UIAutomator dump.

Supply the emulator's actual density/font scale and expected row count. This is
a geometry check, not TalkBack, physical-device or end-to-end route validation.
"""
import argparse
import json
import re
from xml.etree import ElementTree as ET

LABELS = ("Calendar", "Your history", "Medications", "Your data")


def bounds(node):
    return tuple(map(int, re.findall(r"-?\d+", node.get("bounds", ""))))


def audit(args):
    root = ET.parse(args.xml).getroot()
    tabs = []
    density = args.dpi / 160
    for label in LABELS:
        matches = [n for n in root.iter("node") if n.get("content-desc") == label]
        assert len(matches) == 1, f"Expected one {label} tab"
        tab = matches[0]
        assert tab.get("clickable") == "true" and tab.get("enabled") == "true", label
        x1, y1, x2, y2 = bounds(tab)
        assert x2 - x1 >= 48 * density - 1 and y2 - y1 >= 48 * density - 1, f"Small target: {label}"
        texts = [n for n in tab.iter("node") if n.get("text") == label]
        assert len(texts) == 1, f"Missing full label: {label}"
        tx1, ty1, tx2, ty2 = bounds(texts[0])
        assert x1 <= tx1 < tx2 <= x2 and y1 <= ty1 < ty2 <= y2, f"Clipped label: {label}"
        # A normal Android 10sp line occupies about 1.35 em; two lines exceed
        # this deliberately tolerant bound, including bold selected labels.
        assert ty2 - ty1 <= 16 * density * max(1, args.font_scale), f"Wrapped label: {label}"
        tabs.append({"label": label, "bounds": bounds(tab), "textBounds": bounds(texts[0]), "selected": tab.get("selected") == "true"})
    assert sum(t["selected"] for t in tabs) == 1, "Expected one selected tab"
    rows = len({t["bounds"][1] for t in tabs})
    assert rows == args.rows, f"Expected {args.rows} rows, got {rows}"
    assert [t["bounds"] for t in tabs] == sorted([t["bounds"] for t in tabs], key=lambda b: (b[1], b[0])), "Tab reading order changed"
    for index, tab in enumerate(tabs):
        x1, y1, x2, y2 = tab["bounds"]
        for other in tabs[index + 1:]:
            ox1, oy1, ox2, oy2 = other["bounds"]
            assert min(x2, ox2) <= max(x1, ox1) or min(y2, oy2) <= max(y1, oy1), "Tabs overlap"
    return {"dpi": args.dpi, "fontScale": args.font_scale, "rows": rows, "tabs": tabs, "result": "pass"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml")
    parser.add_argument("--dpi", type=int, required=True)
    parser.add_argument("--font-scale", type=float, required=True)
    parser.add_argument("--rows", type=int, required=True)
    print(json.dumps(audit(parser.parse_args()), indent=2))
