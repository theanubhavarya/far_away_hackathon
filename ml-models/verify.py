from recommend import RouteRecommender
r = RouteRecommender()
prefs = ['Cheapest', 'Fastest', 'Economical', 'Balanced', 'Luxury', 'Comfort optimized']
print("Delhi -> Bangalore | Rohini -> Whitefield\n")
print(f"{'Preference':<22} {'Mode':<10} {'Cost':>10} {'Time':>10}")
print("-" * 58)
for p in prefs:
    res = r.get_best_route('Delhi', 'Bangalore', 'Rohini', 'Whitefield', '2026-06-10', p)
    primary = next((leg['Transport_Type'] for leg in res['Route Details'] if leg['Transport_Type'] != 'Cab'), 'N/A')
    print(f"{p:<22} {primary:<10} {res['Total Cost']:>10} {res['Estimated Time']:>10}")
