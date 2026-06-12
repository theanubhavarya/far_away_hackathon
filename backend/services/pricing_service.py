from app.schemas.route_schemas import RouteOption, CostBreakdown

def calculate_total_fare(fare_per_person: int, travellers: int) -> int:
    return fare_per_person * travellers

def get_travellers_count(travelers) -> int:
    if not travelers:
        return 1
    
    if hasattr(travelers, 'adults'):
        adults = getattr(travelers, 'adults', 1)
        children = getattr(travelers, 'children', 0)
        seniors = getattr(travelers, 'seniors', 0)
        pwd = getattr(travelers, 'pwd', 0)
    elif isinstance(travelers, dict):
        adults = travelers.get('adults', 1)
        children = travelers.get('children', 0)
        seniors = travelers.get('seniors', 0)
        pwd = travelers.get('pwd', 0)
    else:
        return 1

    try:
        adults = int(adults)
    except (ValueError, TypeError):
        adults = 1
        
    try:
        children = int(children)
    except (ValueError, TypeError):
        children = 0
        
    try:
        seniors = int(seniors)
    except (ValueError, TypeError):
        seniors = 0
        
    try:
        pwd = int(pwd)
    except (ValueError, TypeError):
        pwd = 0

    count = adults + children + seniors + pwd
    return max(1, count)

def calculate_segment_fare(mode: str, fare_per_person: int, travellers: int) -> int:
    mode_lower = str(mode).lower()
    # taxi/cab/private vehicle -> vehicle-level pricing (unchanged by traveler count)
    if mode_lower in ['cab', 'taxi', 'private_vehicle', 'private']:
        return fare_per_person
    # train, bus, flight -> per traveler pricing
    return fare_per_person * travellers

def apply_pricing_to_route(route: RouteOption, travelers_config) -> RouteOption:
    travellers = get_travellers_count(travelers_config)
    
    # Store per person fare as the base total cost of the route
    base_total_cost = route.total_cost_inr
    
    # Compute segments with mode-based pricing
    new_segments = []
    for segment in route.segments:
        new_segment = segment.model_copy()
        new_segment.fare_inr = calculate_segment_fare(segment.mode, segment.fare_inr, travellers)
        new_segments.append(new_segment)
        
    # Recalculate cost breakdown
    transport_total = sum(s.fare_inr for s in new_segments)
    
    # Cab is vehicle-level, so it's constant
    local_cab = route.cost_breakdown.estimated_local_cab_inr
    
    # Food is per person
    food = route.cost_breakdown.estimated_food_inr * travellers
    
    # Optional fees (bags fees) - this is already based on bags config which is absolute in travelers_config,
    # so we don't scale it.
    fees = route.cost_breakdown.optional_fees_inr
    
    total_min = transport_total + local_cab + food + fees
    total_max = total_min + max(300, int(transport_total * 0.08))
    
    new_breakdown = CostBreakdown(
        transport_total_inr=transport_total,
        estimated_local_cab_inr=local_cab,
        estimated_food_inr=food,
        optional_fees_inr=fees,
        total_min_inr=total_min,
        total_max_inr=total_max,
        segment_breakdown={s.segment_id: s.fare_inr for s in new_segments}
    )
    
    # Update route with the adjusted pricing
    route.segments = new_segments
    route.cost_breakdown = new_breakdown
    route.total_cost_inr = total_min
    
    # Set the required attributes
    route.travellers = travellers
    route.total_fare = total_min
    route.fare_per_person = round(total_min / travellers, 2)
    
    return route
