
import json
from backend.services import portfolio_cashflow

def main():
    # Load the portfolio data from the template file
    with open("backend/data/portfolio_template.json", 'r') as f:
        portfolio_data = json.load(f)
        
    # Calculate the portfolio cashflow
    total_cashflow = portfolio_cashflow.calculate_portfolio_cashflow(portfolio_data)
    
    # Print the result (in a real application, you would return this as a JSON response)
    print(f"Total Portfolio Cashflow: {total_cashflow}")

if __name__ == "__main__":
    main()
