import pandas as pd
import numpy as np
import os
import pickle
import re
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from datetime import datetime

def parse_bus_duration(duration_str):
    try:
        hours = int(re.search(r'(\d+)hrs', duration_str).group(1))
        mins = int(re.search(r'(\d+)mins', duration_str).group(1))
        return hours * 60 + mins
    except:
        return 0

def clean_city_name(city):
    if not isinstance(city, str):
        return city
    city = city.strip()
    if city.lower() in ['banglore', 'bangalore']:
        return 'Bangalore'
    if city.lower() in ['new delhi', 'delhi']:
        return 'Delhi'
    return city

def load_and_preprocess(data_dir="d:/far away data set"):
    print("Loading datasets...")
    
    # 1. Flights
    flights_df = pd.read_csv(os.path.join(data_dir, "finalairways.csv"))
    flights_df.dropna(inplace=True)
    flights_df['Source'] = flights_df['Source'].apply(clean_city_name)
    flights_df['Destination'] = flights_df['Destination'].apply(clean_city_name)
    flights_df['Transport_Type'] = 'Flight'
    # Synthesize Distance and Duration (approx)
    flights_df['Distance'] = np.random.uniform(1000, 2000, size=len(flights_df))
    flights_df['Duration'] = flights_df['Distance'] / 10 + np.random.uniform(-10, 10, size=len(flights_df)) # approx 10km/min
    # Standardize column names
    flights_df = flights_df.rename(columns={'Airline': 'Mode', 'Price': 'Price', 'Date_of_Journey': 'Date'})
    flights_df = flights_df[['Transport_Type', 'Mode', 'Source', 'Destination', 'Date', 'Price', 'Distance', 'Duration']]
    
    # 2. Bangalore Roadways
    blr_cabs = pd.read_csv(os.path.join(data_dir, "finalbangloreroadways.csv"))
    blr_cabs.dropna(inplace=True)
    blr_cabs = blr_cabs[blr_cabs['Booking Value'] > 0]
    blr_cabs['Transport_Type'] = 'Cab'
    blr_cabs['Date'] = '24/03/2019' # Defaulting to a common date format for consistency
    blr_cabs['Duration'] = blr_cabs['Ride Distance'] * 4 # roughly 4 mins per km in city
    blr_cabs = blr_cabs.rename(columns={'Vehicle Type': 'Mode', 'Pickup Location': 'Source', 'Drop Location': 'Destination', 'Booking Value': 'Price', 'Ride Distance': 'Distance'})
    # Append 'Bangalore' to areas if we want to differentiate, but they are intra-city.
    blr_cabs['Source'] = blr_cabs['Source'] + ' (Bangalore)'
    blr_cabs['Destination'] = blr_cabs['Destination'] + ' (Bangalore)'
    blr_cabs = blr_cabs[['Transport_Type', 'Mode', 'Source', 'Destination', 'Date', 'Price', 'Distance', 'Duration']]
    
    # 3. Delhi Roadways
    del_cabs = pd.read_csv(os.path.join(data_dir, "finaldelhiroadways.csv"))
    del_cabs.dropna(inplace=True)
    del_cabs = del_cabs[del_cabs['Booking Value'] > 0]
    del_cabs['Transport_Type'] = 'Cab'
    del_cabs['Date'] = '24/03/2019'
    del_cabs['Duration'] = del_cabs['Ride Distance'] * 4
    del_cabs = del_cabs.rename(columns={'Vehicle Type': 'Mode', 'Pickup Location': 'Source', 'Drop Location': 'Destination', 'Booking Value': 'Price', 'Ride Distance': 'Distance'})
    del_cabs['Source'] = del_cabs['Source'] + ' (Delhi)'
    del_cabs['Destination'] = del_cabs['Destination'] + ' (Delhi)'
    del_cabs = del_cabs[['Transport_Type', 'Mode', 'Source', 'Destination', 'Date', 'Price', 'Distance', 'Duration']]
    
    # 4. Railways
    rail_df = pd.read_csv(os.path.join(data_dir, "finalrailways.csv"))
    rail_df.dropna(inplace=True)
    rail_df['Transport_Type'] = 'Train'
    rail_df['Date'] = pd.to_datetime(rail_df['timeStamp']).dt.strftime('%d/%m/%Y')
    rail_df = rail_df.rename(columns={'trainNumber': 'Mode', 'fromStnCode': 'Source', 'toStnCode': 'Destination', 'totalFare': 'Price', 'distance': 'Distance', 'duration': 'Duration'})
    rail_df['Mode'] = rail_df['Mode'].astype(str)
    # Simple mapping for station codes to city names if they match Delhi/Bangalore (optional, but keep it simple)
    # E.g. NDLS -> Delhi, SBC -> Bangalore
    stn_map = {'NDLS': 'Delhi', 'SZM': 'Delhi', 'NZM': 'Delhi', 'SBC': 'Bangalore', 'YPR': 'Bangalore'}
    rail_df['Source'] = rail_df['Source'].map(lambda x: stn_map.get(x, x))
    rail_df['Destination'] = rail_df['Destination'].map(lambda x: stn_map.get(x, x))
    rail_df = rail_df[['Transport_Type', 'Mode', 'Source', 'Destination', 'Date', 'Price', 'Distance', 'Duration']]
    
    # 5. Intercity Buses
    bus_df = pd.read_csv(os.path.join(data_dir, "intercitybuses.csv"))
    bus_df.dropna(inplace=True)
    bus_df['Transport_Type'] = 'Bus'
    bus_df['Mode'] = 'Intercity Bus'
    bus_df['Date'] = '24/03/2019'
    bus_df['Duration'] = bus_df['Travel Duration'].apply(parse_bus_duration)
    bus_df = bus_df.rename(columns={'price': 'Price', 'distance': 'Distance'})
    bus_df['Source'] = bus_df['Source'].apply(clean_city_name)
    bus_df['Destination'] = bus_df['Destination'].apply(clean_city_name)
    bus_df = bus_df[['Transport_Type', 'Mode', 'Source', 'Destination', 'Date', 'Price', 'Distance', 'Duration']]
    
    # Merge all
    df = pd.concat([flights_df, blr_cabs, del_cabs, rail_df, bus_df], ignore_index=True)
    
    print(f"Total merged records: {len(df)}")
    
    # Date Features
    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
    # For dates that failed to parse, forward fill or use a default
    df['Date'] = df['Date'].fillna(pd.to_datetime('24/03/2019', format='%d/%m/%Y'))
    
    df['Day'] = df['Date'].dt.day
    df['Month'] = df['Date'].dt.month
    df['Weekday'] = df['Date'].dt.weekday
    df['Is_Weekend'] = df['Weekday'].apply(lambda x: 1 if x >= 5 else 0)
    
    # Categorical Encoding
    print("Encoding categorical features...")
    cat_cols = ['Transport_Type', 'Mode', 'Source', 'Destination']
    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        df[col+'_encoded'] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        
    # Numerical Scaling
    print("Scaling numerical features...")
    num_cols = ['Distance', 'Duration', 'Price']
    scaler = MinMaxScaler()
    df[num_cols] = scaler.fit_transform(df[num_cols])
    
    # Save artifacts
    artifacts_dir = os.path.join(data_dir, "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)
    
    with open(os.path.join(artifacts_dir, 'encoders.pkl'), 'wb') as f:
        pickle.dump(encoders, f)
        
    with open(os.path.join(artifacts_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)
        
    df.to_csv(os.path.join(artifacts_dir, 'processed_data.csv'), index=False)

    # Save REAL (unscaled) stats per transport type for the recommendation engine
    # We need to reload the raw merged data before scaling to get real stats
    raw_df = pd.concat([flights_df, blr_cabs, del_cabs, rail_df, bus_df], ignore_index=True)
    # re-apply date features before computing stats
    raw_df['Date'] = pd.to_datetime(raw_df['Date'], format='%d/%m/%Y', errors='coerce')
    raw_df['Date'] = raw_df['Date'].fillna(pd.to_datetime('24/03/2019', format='%d/%m/%Y'))

    transport_stats = raw_df.groupby('Transport_Type').agg(
        avg_price=('Price', 'mean'),
        median_price=('Price', 'median'),
        min_price=('Price', 'min'),
        avg_duration=('Duration', 'mean'),
        median_duration=('Duration', 'median'),
        min_duration=('Duration', 'min'),
        avg_distance=('Distance', 'mean'),
    ).reset_index()

    transport_stats.to_csv(os.path.join(artifacts_dir, 'transport_stats.csv'), index=False)
    print("Transport stats saved.")
    print(transport_stats.to_string())
    print("Preprocessing complete. Data and artifacts saved in", artifacts_dir)

if __name__ == "__main__":
    load_and_preprocess()
