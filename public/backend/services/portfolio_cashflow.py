
from . import asset_cashflow
import pandas as pd

def calculate_portfolio_cashflow(portfolio_data):
    # This function will iterate through the assets and calculate the total cashflow
    
    assets = portfolio_data['assets']
    constants = portfolio_data['constants']
    
    total_cashflow = 0
    
    for asset_id, asset_data in assets.items():
        asset_cashflow_result = asset_cashflow.calculate_asset_cashflow(asset_data, constants)
        total_cashflow += asset_cashflow_result
        
    return total_cashflow
