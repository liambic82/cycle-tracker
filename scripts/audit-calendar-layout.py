"""Check native calendar weekday alignment from a fictional-data UI Automator dump.

No device access or writes. Keep input XML under ignored artifacts/, never in Git.
Example: python scripts/audit-calendar-layout.py artifacts/calendar.xml --month 2026-10
"""
import argparse
import calendar
import datetime
import json
import re
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('xml')
parser.add_argument('--month', required=True, help='YYYY-MM')
parser.add_argument('--picker', choices=['Start', 'Finish'])
parser.add_argument('--all-days', action='store_true')
parser.add_argument('--header-xml', help='Earlier dump at the same width, if the header has scrolled away')
args = parser.parse_args()
year, month = map(int, args.month.split('-'))
count = calendar.monthrange(year, month)[1]
nodes = list(ET.parse(args.xml).getroot().iter('node'))
header_nodes = list(ET.parse(args.header_xml).getroot().iter('node')) if args.header_xml else nodes

def bounds(node):
    return list(map(int, re.findall(r'\d+', node.get('bounds', ''))))

headers = {}
for node in header_nodes:
    if node.get('text') in ['S', 'M', 'T', 'W', 'F']:
        x1, y1, x2, y2 = bounds(node)
        if y2 > y1:
            headers.setdefault(y1, []).append(node)
rows = [sorted(row, key=lambda n: bounds(n)[0]) for row in headers.values()]
rows = [row for row in rows if [n.get('text') for n in row] == list('SMTWTFS')]
assert len(rows) == 1, f'Expected one visible weekday header, got {len(rows)}'
centers = [(bounds(n)[0] + bounds(n)[2]) / 2 for n in rows[0]]
dates = {}
for day in range(1, count + 1):
    prefix = (f'{args.picker} {calendar.month_abbr[month]} {day}, {year}' if args.picker
              else f'{calendar.month_name[month]} {day}, {year}')
    hits = [n for n in nodes if n.get('content-desc', '') == prefix or
            n.get('content-desc', '').startswith(prefix + ',')]
    assert len(hits) <= 1, f'Duplicate date: {day}'
    if not hits:
        continue
    x1, y1, x2, y2 = bounds(hits[0])
    if x2 <= x1 or y2 <= y1:
        continue
    column = (datetime.date(year, month, day).weekday() + 1) % 7
    assert abs((x1 + x2) / 2 - centers[column]) <= 3, f'Day {day} is under the wrong weekday'
    dates[day] = (x1, y1, x2, y2)
assert len(dates) >= 7, 'Too few visible dates to verify a week'
if args.all_days:
    assert len(dates) == count, f'Only {len(dates)} / {count} dates visible'
for day, box in dates.items():
    if day + 1 in dates:
        next_box = dates[day + 1]
        next_sunday = datetime.date(year, month, day + 1).weekday() == 6
        assert (next_box[1] > box[1]) if next_sunday else abs(next_box[1] - box[1]) <= 3, \
            f'Incorrect week wrapping after day {day}'
print(json.dumps({'month': args.month, 'picker': args.picker, 'visibleDates': len(dates),
                  'firstDay': min(dates), 'lastDay': max(dates),
                  'weekdayAlignment': 'pass', 'weekWrapping': 'pass'}))
