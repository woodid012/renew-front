# scripts/load_price_data.py

import pandas as pd
import json
import os
from datetime import datetime
from pymongo import MongoClient
from dateutil.relativedelta import relativedelta

# Function to load environment variables from .env.local
def load_env_from_file(filepath='.env.local'):
    env_vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('\'"') # Remove quotes
    except FileNotFoundError:
        print(f"Warning: .env.local file not found at {filepath}")
    return env_vars

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env.local')
env_vars = load_env_from_file(env_path)

# MongoDB connection details
MONGO_URI = env_vars.get('MONGODB_URI', os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'))
MONGO_DB_NAME = env_vars.get('MONGODB_DB', os.environ.get('MONGODB_DB', 'renew')) # Default to 'renew' if not set

# Function to insert/update DataFrame records to MongoDB using bulk operations
def upsert_dataframe_to_mongodb(df, collection_name):
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[collection_name]

        # Prepare bulk operations
        from pymongo import ReplaceOne
        bulk_operations = []
        
        for record in df.to_dict(orient='records'):
            # Define a query filter to uniquely identify the document
            query_filter = {
                "TIME": record["TIME"],
                "REGION": record["REGION"],
                "PROFILE": record["PROFILE"],
                "TYPE": record["TYPE"]
            }
            # Create bulk replace operation
            bulk_operations.append(ReplaceOne(query_filter, record, upsert=True))

        # Execute bulk operations in batches for better performance
        batch_size = 1000
        records_processed = 0
        
        for i in range(0, len(bulk_operations), batch_size):
            batch = bulk_operations[i:i + batch_size]
            result = collection.bulk_write(batch, ordered=False)
            records_processed += len(batch)
            print(f"Processed batch {i//batch_size + 1}: {len(batch)} operations")

        print(f"Successfully processed {records_processed} records into {collection_name}")

    except Exception as e:
        print(f"Error processing data into MongoDB: {e}")
    finally:
        if client:
            client.close()

def clear_storage_data(collection_name):
    """Clear all storage profile data from the collection"""
    client = None
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[collection_name]
        
        result = collection.delete_many({"PROFILE": "storage"})
        print(f"Cleared {result.deleted_count} storage records from {collection_name}")
        
    except Exception as e:
        print(f"Error clearing storage data: {e}")
    finally:
        if client:
            client.close()

def load_and_process_price_data(overwrite_storage=False):
    """
    Reads monthly merchant prices and yearly spreads, combines them, and inserts
    the structured time-series data directly into MongoDB.
    
    Args:
        overwrite_storage (bool): If True, clears all existing storage data before inserting new data
    """
    print("=== Starting Price Data Processing ===")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    monthly_prices_path = os.path.join(script_dir, 'merchant_price_monthly.csv')
    yearly_spreads_path = os.path.join(script_dir, 'merchant_yearly_spreads.csv')

    print(f"Reading monthly prices from: {monthly_prices_path}")
    print(f"Reading yearly spreads from: {yearly_spreads_path}")

    try:
        monthly_df = pd.read_csv(monthly_prices_path)
        spreads_df = pd.read_csv(yearly_spreads_path)
        print(f"Monthly prices loaded: {len(monthly_df)} rows")
        print(f"Yearly spreads loaded: {len(spreads_df)} rows")
        print(f"Monthly price profiles: {monthly_df['profile'].unique().tolist()}")
        print(f"Spread regions: {spreads_df['REGION'].unique().tolist()}")
        print(f"Spread years: {spreads_df['YEAR'].unique().tolist()}")
    except FileNotFoundError as e:
        print(f"Error: Input file not found. {e}")
        return

    final_data = []
    
    # Clear storage data if requested
    if overwrite_storage:
        print("Clearing existing storage data...")
        clear_storage_data('PRICE_Curves_2')
    
    # Process PRICE data
    print("\n=== Processing Monthly Price Data ===")
    for profile_type in ['baseload', 'solar', 'wind']:
        print(f"Processing profile: {profile_type}")
        profile_df = monthly_df[monthly_df['profile'] == profile_type].copy()
        print(f"  Found {len(profile_df)} records for {profile_type}")
        
        monthly_pivot = profile_df.pivot_table(index=['time', 'REGION'], columns='type', values='price').reset_index()
        monthly_pivot.rename(columns={'time': 'TIME', 'green': 'GREEN', 'Energy': 'ENERGY'}, inplace=True)
        monthly_pivot['TIME'] = pd.to_datetime(monthly_pivot['TIME'], format='%d/%m/%Y')
        print(f"  Pivoted to {len(monthly_pivot)} time-region combinations")

        id_vars = ['TIME', 'REGION']
        value_vars = ['ENERGY', 'GREEN']
        prices_melted = monthly_pivot.melt(
            id_vars=id_vars,
            value_vars=value_vars,
            var_name='TYPE',
            value_name='PRICE'
        )
        print(f"  Melted to {len(prices_melted)} records")

        records_added = 0
        for _, row in prices_melted.iterrows():
            record = {
                'PROFILE': profile_type,
                'TIME': row['TIME'],
                'REGION': row['REGION'],
                'TYPE': row['TYPE'],
                'PRICE': row['PRICE'],
            }
            final_data.append(record)
            records_added += 1
        print(f"  Added {records_added} records to final dataset")

    # Process SPREAD data - generate monthly records from yearly spreads
    print("\n=== Processing Yearly Spread Data ===")
    fiscal_year_start_month = 7 # July
    
    # Check the structure of spreads_df
    print(f"Spread data columns: {spreads_df.columns.tolist()}")
    print(f"First few rows of spread data:")
    print(spreads_df.head())
    
    # Handle different CSV formats
    if 'DURATION' in spreads_df.columns and 'SPREAD' in spreads_df.columns:
        # Long format: REGION, DURATION, YEAR, SPREAD
        print("Detected long format spread data")
        
        total_spread_records = 0
        for idx, spread_row in spreads_df.iterrows():
            fy_end_calendar_year = spread_row['YEAR']
            region = spread_row['REGION']
            duration = spread_row['DURATION']
            spread_value = spread_row['SPREAD']
            
            if idx < 5:  # Show first few for debugging
                print(f"Processing FY{fy_end_calendar_year} for region {region}, duration {duration}HR, value {spread_value}")

            # Determine the fiscal year for this spread data point
            fy_start_calendar_year = fy_end_calendar_year - 1 if fiscal_year_start_month > 1 else fy_end_calendar_year

            # Generate monthly dates for this fiscal year (July of start_year to June of end_year)
            current_date = datetime(fy_start_calendar_year, fiscal_year_start_month, 1)
            
            monthly_records = 0
            for month in range(12): # 12 months in a fiscal year
                spread_record = {
                    'PROFILE': 'storage',
                    'TIME': current_date,
                    'REGION': region,
                    'TYPE': f'SPREAD_{str(duration).replace(".", "_")}HR',
                    'PRICE': spread_value,
                }
                final_data.append(spread_record)
                monthly_records += 1
                current_date += relativedelta(months=1) # Move to the next month
            
            total_spread_records += monthly_records
            if idx < 5:  # Show first few for debugging
                print(f"  Generated {monthly_records} monthly records")
    
    else:
        # Wide format: REGION, YEAR, 0.5, 1, 2, 4, etc.
        print("Detected wide format spread data")
        duration_columns = [col for col in spreads_df.columns if col not in ['REGION', 'YEAR']]
        print(f"Found duration columns: {duration_columns}")

        total_spread_records = 0
        for idx, spread_row in spreads_df.iterrows():
            fy_end_calendar_year = spread_row['YEAR']
            region = spread_row['REGION']
            print(f"Processing FY{fy_end_calendar_year} for region {region}")

            # Determine the fiscal year for this spread data point
            fy_start_calendar_year = fy_end_calendar_year - 1 if fiscal_year_start_month > 1 else fy_end_calendar_year

            # Generate monthly dates for this fiscal year (July of start_year to June of end_year)
            current_date = datetime(fy_start_calendar_year, fiscal_year_start_month, 1)
            
            monthly_records = 0
            for month in range(12): # 12 months in a fiscal year
                # Process each duration column
                for col in duration_columns:
                    if pd.notna(spread_row[col]):
                        try:
                            duration = float(col)
                            spread_value = spread_row[col]
                            
                            spread_record = {
                                'PROFILE': 'storage',
                                'TIME': current_date,
                                'REGION': region,
                                'TYPE': f'SPREAD_{col.replace(".", "_")}HR',
                                'PRICE': spread_value,
                            }
                            final_data.append(spread_record)
                            monthly_records += 1
                        except ValueError:
                            print(f"  Warning: Skipping non-numeric column '{col}'")
                            continue
                
                current_date += relativedelta(months=1) # Move to the next month
            
            total_spread_records += monthly_records
            print(f"  Generated {monthly_records} monthly records")
    
    print(f"Total spread records generated: {total_spread_records}")

    # Convert the list of dictionaries to a DataFrame for upsertion
    print(f"\n=== Preparing Data for MongoDB ===")
    df_to_upsert = pd.DataFrame(final_data)
    print(f"Total records to upsert: {len(df_to_upsert)}")
    
    # Show breakdown by profile
    profile_counts = df_to_upsert['PROFILE'].value_counts()
    print("Records by profile:")
    for profile, count in profile_counts.items():
        print(f"  {profile}: {count}")
    
    # Upsert into MongoDB
    print(f"\n=== Upserting to MongoDB ===")
    upsert_dataframe_to_mongodb(df_to_upsert, 'PRICE_Curves_2')
    print("=== Data processing and MongoDB upsertion complete ===")

if __name__ == '__main__':
    # Set overwrite_storage=True to clear existing storage data before inserting
    print("Starting with overwrite_storage=True")
    load_and_process_price_data(overwrite_storage=True)