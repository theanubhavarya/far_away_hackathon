import warnings
warnings.filterwarnings('ignore')
from recommend import RouteRecommender
r = RouteRecommender()

test_cases = [
    ('Delhi',     'Bangalore', 'Rohini',    'Whitefield'),
    ('Mumbai',    'Pune',      '',          ''),
    ('Delhi',     'Mumbai',    '',          ''),
    ('Delhi',     'Jaipur',    '',          ''),
    ('Mumbai',    'Goa',       '',          ''),
    ('Bangalore', 'Chennai',   'Whitefield',''),
    ('Delhi',     'Agra',      '',          ''),
    ('Hyderabad', 'Bangalore', '',          'Whitefield'),
]

for src, dst, pu, dr in test_cases:
    print(f"\n{src} -> {dst}")
    print(f"  {'Pref':<22} {'Mode':<10} {'Cost':>8} {'Time':>10}")
    print(f"  {'-'*52}")
    for pref in ['Cheapest', 'Fastest']:
        res = r.get_best_route(src, dst, pu, dr, '2026-06-10', pref)
        mode = next((l['Transport_Type'] for l in res['Route Details'] if l['Transport_Type'] != 'Cab'), 'Cab')
        print(f"  {pref:<22} {mode:<10} {res['Total Cost']:>8} {res['Estimated Time']:>10}")
