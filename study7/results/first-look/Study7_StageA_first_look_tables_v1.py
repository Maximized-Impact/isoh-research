#!/usr/bin/env python3
"""Study 7 - Stage A, first look: recompute the published figures from the public dataset.

Registration: https://osf.io/8t473
Usage:  python3 Study7_StageA_first_look_tables_v1.py Study7_StageA_first_look_dataset_v1.csv [results.json]
Needs only the Python 3 standard library.
License: CC BY 4.0, Institute for The Study Of Humanity.

All definitions below are the registered ones (registration section "Indices"). Answers are stored as the position
of the chosen option counted from 0, so 3 and 4 are "Often" and "Always", and for c3 the value 0 is "Yes".
"""
import csv
import json
import math
import sys
from collections import Counter, OrderedDict

Z = 1.959963984540054  # two-sided 95 percent
ANSWERS = ['b1', 'b2', 'b3', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'h1', 'h2', 'e1',
           'asrs1', 'asrs2', 'asrs3', 'asrs4', 'asrs5', 'asrs6', 'a1', 'a2', 'a3', 'a4', 'g4']
STATUS = {0: 'diagnosed', 1: 'suspected', 2: 'suspected', 3: 'no'}
ORDER = ('diagnosed', 'suspected', 'no')
HYPOTHESIS = OrderedDict([('ADHD-only', ('diagnosed', 'no')), ('autism-only', ('no', 'diagnosed')),
                          ('AuDHD', ('diagnosed', 'diagnosed')), ('neither', ('no', 'no'))])
OUTCOMES = ('ta_broad', 'ta_strict', 'avoid')
# Share answering Often or Always; b3 uses 7 or more, c3 uses Yes.
ITEMS = OrderedDict([
    ('b1', lambda a: a['b1'] >= 3), ('b2', lambda a: a['b2'] >= 3), ('b3', lambda a: a['b3'] >= 7),
    ('c1', lambda a: a['c1'] >= 3), ('c2', lambda a: a['c2'] >= 3), ('c3', lambda a: a['c3'] == 0),
    ('c4', lambda a: a['c4'] >= 3), ('d1', lambda a: a['d1'] >= 3), ('d2', lambda a: a['d2'] >= 3),
    ('h1', lambda a: a['h1'] >= 3), ('h2', lambda a: a['h2'] >= 3), ('e1', lambda a: a['e1'] >= 3)])


def wilson(k, n):
    """Share in percent with the Wilson 95 percent interval."""
    if n == 0:
        return {'k': k, 'n': n, 'pct': None, 'lo': None, 'hi': None}
    p = k / n
    d = 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d
    h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return {'k': k, 'n': n, 'pct': 100 * p, 'lo': 100 * max(0.0, c - h), 'hi': 100 * min(1.0, c + h)}


def share(rows, test):
    return wilson(sum(1 for r in rows if test(r)), len(rows))


def load(path):
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        for rec in csv.DictReader(f):
            a = {k: int(rec[k]) for k in ANSWERS}
            asrs = [a['asrs%d' % i] for i in range(1, 7)]
            r = {
                'a': a, 'rec': rec,
                'adhd': STATUS[a['a1']], 'autism': STATUS[a['a3']], 'anxiety': STATUS[a['a4']],
                # Telephone anxiety, broad: b1 or b2 Often or Always, or b3 of 7 or more. Strict: both b1 and b2.
                'ta_broad': a['b1'] >= 3 or a['b2'] >= 3 or a['b3'] >= 7,
                'ta_strict': a['b1'] >= 3 and a['b2'] >= 3,
                # Call avoidance: c1 or c2 Often or Always, or c3 = Yes.
                'avoid': a['c1'] >= 3 or a['c2'] >= 3 or a['c3'] == 0,
                'asrs_total': sum(asrs),
                # ASRS primary rule: items 1 to 3 positive at Sometimes or above, items 4 to 6 at Often or above; four or more.
                'asrs_pos': sum(v >= 2 for v in asrs[:3]) + sum(v >= 3 for v in asrs[3:]) >= 4,
                'asrs_pos_2024': sum(asrs) >= 14,
            }
            # The derived columns in the file must agree with this recomputation.
            assert rec['adhd_status'] == r['adhd'] and rec['autism_status'] == r['autism'] and rec['anxiety_status'] == r['anxiety']
            assert rec['telephone_anxiety_broad'] == str(int(r['ta_broad'])) and rec['telephone_anxiety_strict'] == str(int(r['ta_strict']))
            assert rec['call_avoidance'] == str(int(r['avoid'])) and rec['asrs_total'] == str(r['asrs_total'])
            assert rec['asrs_screen_positive'] == str(int(r['asrs_pos'])) and rec['asrs_screen_positive_2024'] == str(int(r['asrs_pos_2024']))
            rows.append(r)
    return rows


def groups(rows):
    """All respondents, the nine groups (ADHD status by autism status) and the two margins."""
    out = OrderedDict([('All respondents', rows)])
    for x in ORDER:
        for y in ORDER:
            name = 'ADHD %s / autism %s' % (x, y)
            for h, key in HYPOTHESIS.items():
                if key == (x, y):
                    name += ' [%s]' % h
            out[name] = [r for r in rows if (r['adhd'], r['autism']) == (x, y)]
    out['Margin: all with diagnosed ADHD'] = [r for r in rows if r['adhd'] == 'diagnosed']
    out['Margin: all with diagnosed autism'] = [r for r in rows if r['autism'] == 'diagnosed']
    return out


def outcomes(rows):
    return {o: share(rows, lambda r, o=o: r[o]) for o in OUTCOMES}


def analyse(rows):
    g = groups(rows)
    res = OrderedDict()
    res['n'] = len(rows)
    res['outcomes'] = OrderedDict((name, outcomes(sub)) for name, sub in g.items())
    res['item_shares_all_groups'] = OrderedDict(
        (it, OrderedDict((name, share(sub, lambda r, f=f: f(r['a']))) for name, sub in g.items())) for it, f in ITEMS.items())
    # Registered analysis variants
    passed = [r for r in rows if r['rec']['bot_check'] == 'passed']
    res['variant_without_bot_check_unavailable'] = {'n': len(passed), 'outcomes_all': outcomes(passed)}
    first_time = [r for r in rows if r['a']['g4'] == 0]
    res['check_without_answered_before'] = {'n': len(first_time), 'outcomes_all': outcomes(first_time)}
    wide = lambda r, c: r[c] in ('diagnosed', 'suspected')
    res['variant_suspected_with_diagnosed'] = {'outcomes': OrderedDict([
        ('ADHD-only', outcomes([r for r in rows if wide(r, 'adhd') and r['autism'] == 'no'])),
        ('autism-only', outcomes([r for r in rows if wide(r, 'autism') and r['adhd'] == 'no'])),
        ('AuDHD', outcomes([r for r in rows if wide(r, 'adhd') and wide(r, 'autism')])),
        ('neither', outcomes([r for r in rows if r['adhd'] == 'no' and r['autism'] == 'no']))])}
    res['variant_neither_asrs_negative'] = {'outcomes': {'neither, ASRS screen-negative': outcomes(
        [r for r in rows if r['adhd'] == 'no' and r['autism'] == 'no' and not r['asrs_pos']])}}
    res['asrs'] = OrderedDict((name, {'screen_positive': share(sub, lambda r: r['asrs_pos']),
                                      'screen_positive_2024_rule': share(sub, lambda r: r['asrs_pos_2024']),
                                      'mean_total': sum(r['asrs_total'] for r in sub) / len(sub) if sub else None})
                              for name, sub in g.items())
    res['anxiety_dx_or_suspected'] = OrderedDict((name, share(sub, lambda r: r['anxiety'] != 'no')) for name, sub in g.items())
    # Facts used in the method notes
    count = lambda key: dict(sorted(Counter(r['rec'][key] if r['rec'][key] != '' else '(withheld)' for r in rows).items()))
    res['facts'] = {
        'shortest_active_time_s': min(int(r['rec']['active_time_s']) for r in rows),
        'bot_check': count('bot_check'), 'answered_before_yes': sum(1 for r in rows if r['a']['g4'] == 1),
        'adhd': dict(Counter(r['adhd'] for r in rows)), 'autism': dict(Counter(r['autism'] for r in rows)),
        'anxiety': dict(Counter(r['anxiety'] for r in rows)),
        'published_age_band_g1': count('g1'), 'published_gender_g2': count('g2'), 'published_region_g3': count('g3'),
        'published_language': count('language'), 'preset': count('preset'),
        'focus_sound_ever': sum(1 for r in rows if r['rec']['focus_sound_ever'] == '1'),
        'time_signal_ever': sum(1 for r in rows if r['rec']['time_signal_ever'] == '1')}
    return res


def cell(d):
    return '   n/a' if d['pct'] is None else '%3d/%-3d %5.1f%% (%4.1f-%4.1f)' % (d['k'], d['n'], d['pct'], d['lo'], d['hi'])


if __name__ == '__main__':
    result = analyse(load(sys.argv[1]))
    print('Responses analysed: %d' % result['n'])
    print('\nRegistered outcomes: telephone anxiety, broad | telephone anxiety, strict | call avoidance')
    for name, o in result['outcomes'].items():
        print('  %-48s %s | %s | %s' % (name, cell(o['ta_broad']), cell(o['ta_strict']), cell(o['avoid'])))
    print('\nEvery item, all respondents: share answering Often or Always (b3: 7 or more; c3: Yes)')
    for it, d in result['item_shares_all_groups'].items():
        print('  %-3s %s' % (it, cell(d['All respondents'])))
    print('\nFacts: %s' % json.dumps(result['facts'], ensure_ascii=False))
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=1, ensure_ascii=False)
