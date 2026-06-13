import pandas as pd
from pathlib import Path

datasets_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend/datasets")

def check_file(filename):
    path = datasets_dir / filename
    print(f"\nChecking file: {filename}")
    if not path.exists():
        print("File does not exist!")
        return
    df = pd.read_csv(path)
    print(f"Total rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    
    # Booking Value / Booking Amt zeros
    val_col = 'Booking Value' if 'Booking Value' in df.columns else 'Booking Amt'
    dist_col = 'Ride Distance' if 'Ride Distance' in df.columns else 'Ride Distance' # wait, check columns
    if val_col in df.columns:
        zeros_val = (df[val_col] == 0).sum()
        print(f"Rows with {val_col} == 0: {zeros_val} ({zeros_val/len(df)*100:.2f}%)")
    else:
        print(f"Column {val_col} NOT found!")
        
    if dist_col in df.columns:
        zeros_dist = (df[dist_col] == 0).sum()
        print(f"Rows with {dist_col} == 0: {zeros_dist} ({zeros_dist/len(df)*100:.2f}%)")
    else:
        print(f"Column {dist_col} NOT found!")

    # Check some sample rows where booking value is 0
    if val_col in df.columns and dist_col in df.columns:
        zeros_df = df[(df[val_col] == 0) | (df[dist_col] == 0)]
        print(f"Sample zero rows:")
        print(zeros_df.head(5).to_string())

if __name__ == "__main__":
    check_file("finaldelhiroadways.csv")
    check_file("finalbangloreroadways.csv")
