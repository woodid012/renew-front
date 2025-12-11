# renewable_cashflow_model.py

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

class RenewableProjectModel:
    def __init__(self, model_start_date, capex_total, contracted_revenue_annual, 
                 merchant_revenue_annual, opex_annual, tax_rate=0.25, 
                 target_dscr=1.30, debt_term_years=18, debt_rate=0.055,
                 max_gearing=0.70, terminal_value=None):
        """
        Initialize renewable project cashflow model
        
        Parameters:
        model_start_date: datetime - project model start date
        capex_total: float - total capital expenditure
        contracted_revenue_annual: float - annual contracted revenue (years 1-10 of operations)
        merchant_revenue_annual: float - annual merchant revenue (years 11-20 of operations)  
        opex_annual: float - annual operating expenses
        tax_rate: float - corporate tax rate
        target_dscr: float - target debt service coverage ratio for debt sizing
        debt_term_years: int - debt term in years
        debt_rate: float - debt interest rate
        max_gearing: float - maximum debt as % of total project cost (default 70%)
        terminal_value: float - terminal value at end of operations (default 10% of CAPEX)
        """
        self.model_start = model_start_date
        self.construction_start = model_start_date + relativedelta(months=12)
        self.operations_start = self.construction_start + relativedelta(months=18)
        
        # Financial parameters
        self.capex_total = capex_total
        self.contracted_revenue_annual = contracted_revenue_annual
        self.merchant_revenue_annual = merchant_revenue_annual
        self.opex_annual = opex_annual
        self.tax_rate = tax_rate
        self.target_dscr = target_dscr
        self.debt_term_years = debt_term_years
        self.debt_rate = debt_rate
        self.max_gearing = max_gearing
        self.terminal_value = terminal_value if terminal_value is not None else capex_total * 0.10
        
        # Create time series (7 years total for first 5 years of operations)
        self.create_time_series()
        self.calculate_cashflows()
        self.size_debt()
        self.calculate_financing_cashflows()
        self.calculate_debt_schedule()
        self.calculate_equity_irr()
        
    def create_time_series(self):
        """Create monthly time series for the project"""
        # 7 years total: 1 dev + 1.5 construction + 5 operations (first 5 years)
        periods = 7 * 12
        date_range = pd.date_range(start=self.model_start, periods=periods, freq='MS')
        
        self.df = pd.DataFrame({
            'date': date_range,
            'period': range(1, periods + 1),
            'phase': '',
            'revenue': 0.0,
            'opex': 0.0,
            'capex': 0.0,
            'ebitda': 0.0,
            'depreciation': 0.0,
            'ebit': 0.0,
            'tax': 0.0,
            'net_income': 0.0,
            'operating_cashflow': 0.0,
            'free_cashflow': 0.0,
            'debt_drawdown': 0.0,
            'equity_contribution': 0.0,
            'debt_service': 0.0,
            'cashflow_after_financing': 0.0,
            'terminal_value': 0.0
        })
        
        # Set phases
        construction_end = self.operations_start
        operations_end = self.operations_start + relativedelta(years=5)  # First 5 years only
        
        self.df.loc[self.df['date'] < self.construction_start, 'phase'] = 'Development'
        self.df.loc[(self.df['date'] >= self.construction_start) & 
                   (self.df['date'] < construction_end), 'phase'] = 'Construction'
        self.df.loc[(self.df['date'] >= construction_end) & 
                   (self.df['date'] < operations_end), 'phase'] = 'Operations'
        
    def calculate_cashflows(self):
        """Calculate project cashflows"""
        # CAPEX during construction (18 months, evenly distributed)
        construction_mask = self.df['phase'] == 'Construction'
        construction_months = construction_mask.sum()
        self.df.loc[construction_mask, 'capex'] = self.capex_total / construction_months
        
        # Revenue during operations (first 5 years are contracted)
        operations_mask = self.df['phase'] == 'Operations'
        self.df.loc[operations_mask, 'revenue'] = self.contracted_revenue_annual / 12
        
        # OPEX during operations
        operations_mask = self.df['phase'] == 'Operations'
        self.df.loc[operations_mask, 'opex'] = self.opex_annual / 12
        
        # EBITDA
        self.df['ebitda'] = self.df['revenue'] - self.df['opex']
        
        # Depreciation (straight-line over 20 years starting at operations)
        depreciation_annual = self.capex_total / 20
        depreciation_start = self.operations_start
        
        depreciation_mask = self.df['date'] >= depreciation_start
        self.df.loc[depreciation_mask, 'depreciation'] = depreciation_annual / 12
        
        # EBIT
        self.df['ebit'] = self.df['ebitda'] - self.df['depreciation']
        
        # Tax (only on positive EBIT)
        self.df['tax'] = np.where(self.df['ebit'] > 0, 
                                self.df['ebit'] * self.tax_rate, 0)
        
        # Net Income
        self.df['net_income'] = self.df['ebit'] - self.df['tax']
        
        # Operating Cash Flow (Net Income + Depreciation)
        self.df['operating_cashflow'] = self.df['net_income'] + self.df['depreciation']
        
        # Free Cash Flow (Operating CF - CAPEX)
        self.df['free_cashflow'] = self.df['operating_cashflow'] - self.df['capex']
        
        # Add terminal value at end of period
        self.df.iloc[-1, self.df.columns.get_loc('terminal_value')] = self.terminal_value
        
    def size_debt(self):
        """Size debt based on DSCR during operations"""
        # Calculate average annual debt service capacity during operations (first 5 years)
        operations_cf = self.df[self.df['phase'] == 'Operations']['operating_cashflow']
        annual_cf_average = operations_cf.sum() / 5  # 5 years of operations
        
        # Maximum annual debt service based on target DSCR
        max_annual_debt_service = annual_cf_average / self.target_dscr
        
        # Calculate debt capacity using PMT formula
        monthly_rate = self.debt_rate / 12
        total_payments = self.debt_term_years * 12
        
        if monthly_rate > 0:
            debt_capacity = (max_annual_debt_service / 12) * \
                          ((1 + monthly_rate) ** total_payments - 1) / \
                          (monthly_rate * (1 + monthly_rate) ** total_payments)
        else:
            debt_capacity = (max_annual_debt_service / 12) * total_payments
            
        # Apply maximum gearing constraint
        max_debt_by_gearing = self.capex_total * self.max_gearing
        self.debt_amount = min(debt_capacity, max_debt_by_gearing)
        
        # Calculate actual annual debt service
        if self.debt_amount > 0 and monthly_rate > 0:
            monthly_payment = self.debt_amount * monthly_rate * (1 + monthly_rate) ** total_payments / \
                            ((1 + monthly_rate) ** total_payments - 1)
            self.annual_debt_service = monthly_payment * 12
        else:
            self.annual_debt_service = 0
            
        # Equity requirement
        self.equity_amount = self.capex_total - self.debt_amount
        
        # Store debt sizing results
        self.debt_sizing_results = {
            'debt_amount': self.debt_amount,
            'equity_amount': self.equity_amount,
            'annual_debt_service': self.annual_debt_service,
            'avg_annual_operating_cf': annual_cf_average,
            'actual_dscr': annual_cf_average / self.annual_debt_service if self.annual_debt_service > 0 else None,
            'debt_to_capex_ratio': self.debt_amount / self.capex_total,
            'equity_to_capex_ratio': self.equity_amount / self.capex_total,
            'gearing_ratio': self.debt_amount / self.capex_total
        }
        
    def calculate_financing_cashflows(self):
        """Calculate debt and equity financing cashflows"""
        # Debt and equity contributions during construction (proportional to CAPEX spend)
        construction_mask = self.df['phase'] == 'Construction'
        total_construction_capex = self.df.loc[construction_mask, 'capex'].sum()
        
        if total_construction_capex > 0:
            for idx in self.df[construction_mask].index:
                capex_portion = self.df.loc[idx, 'capex'] / total_construction_capex
                self.df.loc[idx, 'debt_drawdown'] = self.debt_amount * capex_portion
                self.df.loc[idx, 'equity_contribution'] = self.equity_amount * capex_portion
        
        # Debt service during operations
        monthly_debt_service = self.annual_debt_service / 12 if self.annual_debt_service > 0 else 0
        operations_mask = self.df['phase'] == 'Operations'
        
        # Only apply debt service if debt exists and operations have started
        if self.debt_amount > 0:
            # Find start of debt service (first month of operations)
            first_operations_idx = self.df[operations_mask].index[0] if operations_mask.any() else None
            if first_operations_idx is not None:
                # Apply debt service from operations start until debt term ends or model ends
                debt_service_months = min(self.debt_term_years * 12, 
                                        len(self.df) - first_operations_idx)
                end_idx = first_operations_idx + debt_service_months
                
                service_mask = (self.df.index >= first_operations_idx) & (self.df.index < end_idx)
                self.df.loc[service_mask, 'debt_service'] = monthly_debt_service
        
        # Calculate cashflow after financing
        self.df['cashflow_after_financing'] = (self.df['free_cashflow'] + 
                                             self.df['debt_drawdown'] + 
                                             self.df['equity_contribution'] - 
                                             self.df['debt_service'] +
                                             self.df['terminal_value'])
    
    def calculate_debt_schedule(self):
        """Calculate detailed debt schedule with interest and principal breakdown"""
        if self.debt_amount <= 0:
            self.debt_schedule = pd.DataFrame()
            return
            
        # Create debt schedule starting from construction
        construction_start_idx = self.df[self.df['phase'] == 'Construction'].index[0]
        debt_periods = self.df.loc[construction_start_idx:].copy()
        
        monthly_rate = self.debt_rate / 12
        monthly_payment = self.annual_debt_service / 12 if self.annual_debt_service > 0 else 0
        
        # Initialize debt schedule
        self.debt_schedule = pd.DataFrame({
            'date': debt_periods['date'],
            'period': debt_periods['period'],
            'phase': debt_periods['phase'],
            'beginning_balance': 0.0,
            'drawdown': debt_periods['debt_drawdown'],
            'interest_payment': 0.0,
            'principal_payment': 0.0,
            'total_payment': 0.0,
            'ending_balance': 0.0
        })
        
        # Calculate debt schedule
        outstanding_balance = 0.0
        payment_start = False
        
        for idx in range(len(self.debt_schedule)):
            self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('beginning_balance')] = outstanding_balance
            
            # Add drawdowns
            drawdown = self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('drawdown')]
            outstanding_balance += drawdown
            
            # Start payments when operations begin
            if self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('phase')] == 'Operations':
                payment_start = True
            
            if payment_start and outstanding_balance > 0:
                # Calculate interest
                interest_payment = outstanding_balance * monthly_rate
                
                # Calculate principal (total payment minus interest)
                principal_payment = max(0, monthly_payment - interest_payment)
                
                # Don't pay more principal than outstanding
                principal_payment = min(principal_payment, outstanding_balance)
                
                # Update schedule
                self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('interest_payment')] = interest_payment
                self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('principal_payment')] = principal_payment
                self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('total_payment')] = interest_payment + principal_payment
                
                # Update outstanding balance
                outstanding_balance -= principal_payment
            
            self.debt_schedule.iloc[idx, self.debt_schedule.columns.get_loc('ending_balance')] = outstanding_balance
    
    def calculate_equity_irr(self):
        """Calculate equity IRR and related metrics"""
        # Create equity cashflow series (negative for contributions, positive for distributions)
        equity_cashflows = []
        
        # Equity contributions (negative cashflows)
        equity_contributions = -self.df['equity_contribution']
        
        # Equity distributions = Free cashflow + Terminal Value - Debt service
        equity_distributions = self.df['free_cashflow'] + self.df['terminal_value'] - self.df['debt_service']
        
        # Combined equity cashflow
        equity_cashflow = equity_contributions + equity_distributions
        
        # Convert to list for IRR calculation
        equity_cashflows = equity_cashflow.tolist()
        
        # Calculate IRR using numpy financial function approximation
        self.equity_irr = self.calculate_irr(equity_cashflows)
        
        # Calculate equity multiple (total distributions / total contributions)
        total_contributions = self.df['equity_contribution'].sum()
        total_distributions = (self.df['free_cashflow'] + self.df['terminal_value'] - self.df['debt_service']).sum()
        
        self.equity_multiple = total_distributions / total_contributions if total_contributions > 0 else 0
        
        # Store equity analysis results
        self.equity_analysis = {
            'total_equity_contribution': total_contributions,
            'total_equity_distributions': total_distributions,
            'equity_multiple': self.equity_multiple,
            'equity_irr': self.equity_irr,
            'equity_cashflows': equity_cashflows
        }
    
    def calculate_irr(self, cashflows, guess=0.1, tolerance=1e-6, max_iterations=100):
        """Calculate IRR using Newton-Raphson method"""
        if not cashflows or all(cf == 0 for cf in cashflows):
            return None
            
        # Check if we have both positive and negative cashflows
        has_negative = any(cf < 0 for cf in cashflows)
        has_positive = any(cf > 0 for cf in cashflows)
        
        if not (has_negative and has_positive):
            return None
            
        rate = guess
        
        for _ in range(max_iterations):
            # Calculate NPV and its derivative
            npv = sum(cf / (1 + rate) ** i for i, cf in enumerate(cashflows))
            npv_derivative = sum(-i * cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cashflows))
            
            if abs(npv) < tolerance:
                return rate
                
            if abs(npv_derivative) < tolerance:
                break
                
            # Newton-Raphson iteration
            rate = rate - npv / npv_derivative
            
            # Prevent negative rates that would cause calculation issues
            if rate < -0.99:
                rate = -0.99
                
        return rate if abs(npv) < tolerance else None
        
    def print_results(self):
        """Print model results"""
        print("="*60)
        print("RENEWABLE PROJECT CASHFLOW MODEL RESULTS")
        print("="*60)
        
        print(f"\nPROJECT TIMELINE:")
        print(f"Model Start Date: {self.model_start.strftime('%Y-%m-%d')}")
        print(f"Construction Start: {self.construction_start.strftime('%Y-%m-%d')}")
        print(f"Operations Start: {self.operations_start.strftime('%Y-%m-%d')}")
        
        print(f"\nPROJECT PARAMETERS:")
        print(f"Total CAPEX: ${self.capex_total:,.0f}")
        print(f"Contracted Revenue (Annual): ${self.contracted_revenue_annual:,.0f}")
        print(f"Merchant Revenue (Annual): ${self.merchant_revenue_annual:,.0f}")
        print(f"Annual OPEX: ${self.opex_annual:,.0f}")
        print(f"Tax Rate: {self.tax_rate:.1%}")
        print(f"Terminal Value: ${self.terminal_value:,.0f}")
        
        print(f"\nFINANCING STRUCTURE:")
        print(f"Maximum Gearing: {self.max_gearing:.1%}")
        print(f"Debt Amount: ${self.debt_sizing_results['debt_amount']:,.0f}")
        print(f"Equity Amount: ${self.debt_sizing_results['equity_amount']:,.0f}")
        print(f"Actual Gearing: {self.debt_sizing_results['gearing_ratio']:.1%}")
        
        print(f"\nDEBT SIZING RESULTS:")
        print(f"Target DSCR: {self.target_dscr:.2f}x")
        print(f"Annual Debt Service: ${self.debt_sizing_results['annual_debt_service']:,.0f}")
        print(f"Average Annual Operating CF: ${self.debt_sizing_results['avg_annual_operating_cf']:,.0f}")
        if self.debt_sizing_results['actual_dscr']:
            print(f"Actual DSCR: {self.debt_sizing_results['actual_dscr']:.2f}x")
        
        print(f"\nEQUITY IRR ANALYSIS:")
        print(f"Total Equity Contribution: ${self.equity_analysis['total_equity_contribution']:,.0f}")
        print(f"Total Equity Distributions: ${self.equity_analysis['total_equity_distributions']:,.0f}")
        print(f"Equity Multiple: {self.equity_analysis['equity_multiple']:.2f}x")
        if self.equity_analysis['equity_irr'] is not None:
            print(f"Equity IRR: {self.equity_analysis['equity_irr']:.2%}")
        else:
            print("Equity IRR: Unable to calculate (insufficient cashflow variation)")
        
        print(f"\nCASHFLOW SUMMARY BY PHASE:")
        phase_summary = self.df.groupby('phase').agg({
            'revenue': 'sum',
            'opex': 'sum', 
            'capex': 'sum',
            'ebitda': 'sum',
            'operating_cashflow': 'sum',
            'free_cashflow': 'sum',
            'debt_drawdown': 'sum',
            'equity_contribution': 'sum',
            'debt_service': 'sum',
            'cashflow_after_financing': 'sum'
        }).round(0)
        
        for phase in phase_summary.index:
            print(f"\n{phase}:")
            for col in phase_summary.columns:
                print(f"  {col.replace('_', ' ').title()}: ${phase_summary.loc[phase, col]:,.0f}")
        
        print(f"\nMONTHLY CASHFLOW DETAIL (First 5 Years):")
        display_columns = ['date', 'phase', 'revenue', 'opex', 'capex', 'ebitda', 
                          'operating_cashflow', 'free_cashflow', 'debt_drawdown', 
                          'equity_contribution', 'debt_service', 'cashflow_after_financing']
        print(self.df[display_columns].to_string(index=False))
    
    def print_equity_analysis(self):
        """Print detailed equity analysis"""
        print("\n" + "="*80)
        print("EQUITY IRR ANALYSIS DETAIL")
        print("="*80)
        
        print(f"\nEQUITY INVESTMENT SUMMARY:")
        print(f"Total Equity Contribution: ${self.equity_analysis['total_equity_contribution']:,.0f}")
        print(f"Total Equity Distributions: ${self.equity_analysis['total_equity_distributions']:,.0f}")
        print(f"Net Equity Return: ${self.equity_analysis['total_equity_distributions'] - self.equity_analysis['total_equity_contribution']:,.0f}")
        print(f"Equity Multiple: {self.equity_analysis['equity_multiple']:.2f}x")
        
        if self.equity_analysis['equity_irr'] is not None:
            print(f"Equity IRR: {self.equity_analysis['equity_irr']:.2%}")
        else:
            print("Equity IRR: Unable to calculate")
        
        # Create equity cashflow detail
        equity_detail = self.df[['date', 'phase', 'equity_contribution', 'free_cashflow', 
                               'debt_service', 'terminal_value']].copy()
        
        # Calculate net equity cashflow
        equity_detail['equity_distributions'] = (equity_detail['free_cashflow'] + 
                                               equity_detail['terminal_value'] - 
                                               equity_detail['debt_service'])
        equity_detail['net_equity_cashflow'] = (-equity_detail['equity_contribution'] + 
                                              equity_detail['equity_distributions'])
        
        # Format for display
        display_cols = ['date', 'phase', 'equity_contribution', 'equity_distributions', 'net_equity_cashflow']
        equity_display = equity_detail[display_cols].copy()
        
        for col in ['equity_contribution', 'equity_distributions', 'net_equity_cashflow']:
            equity_display[col] = equity_display[col].apply(lambda x: f"${x:,.0f}")
        
        print(f"\nMONTHLY EQUITY CASHFLOW DETAIL:")
        print(equity_display.to_string(index=False))
        
        # Annual summary
        equity_detail['year'] = equity_detail['date'].dt.year
        annual_summary = equity_detail.groupby('year').agg({
            'equity_contribution': 'sum',
            'equity_distributions': 'sum', 
            'net_equity_cashflow': 'sum'
        }).round(0)
        
        print(f"\nANNUAL EQUITY CASHFLOW SUMMARY:")
        for col in annual_summary.columns:
            annual_summary[col] = annual_summary[col].apply(lambda x: f"${x:,.0f}")
        print(annual_summary.to_string())
    
    def print_debt_schedule(self):
        """Print detailed debt schedule from construction start"""
        print("\n" + "="*80)
        print("DEBT SCHEDULE DETAIL (From Construction Start)")
        print("="*80)
        
        if self.debt_amount <= 0:
            print("No debt in this project.")
            return
            
        print(f"\nDebt Amount: ${self.debt_amount:,.0f}")
        print(f"Interest Rate: {self.debt_rate:.2%}")
        print(f"Term: {self.debt_term_years} years")
        print(f"Monthly Payment: ${self.annual_debt_service/12:,.0f}")
        
        print(f"\nDETAILED DEBT SCHEDULE:")
        debt_display_columns = ['date', 'phase', 'beginning_balance', 'drawdown', 
                               'interest_payment', 'principal_payment', 'total_payment', 'ending_balance']
        
        # Format the debt schedule for display
        debt_display = self.debt_schedule[debt_display_columns].copy()
        for col in ['beginning_balance', 'drawdown', 'interest_payment', 'principal_payment', 'total_payment', 'ending_balance']:
            debt_display[col] = debt_display[col].apply(lambda x: f"${x:,.0f}")
        
        print(debt_display.to_string(index=False))

# Example usage
if __name__ == "__main__":
    # Initialize model with example parameters
    model = RenewableProjectModel(
        model_start_date=datetime(2025, 1, 1),
        capex_total=100_000_000,  # $100M
        contracted_revenue_annual=15_000_000,  # $15M/year contracted
        merchant_revenue_annual=12_000_000,   # $12M/year merchant  
        opex_annual=3_000_000,    # $3M/year OPEX
        tax_rate=0.25,
        target_dscr=1.30,
        debt_term_years=18,
        debt_rate=0.055,
        max_gearing=0.70,  # 70% max gearing
        terminal_value=10_000_000  # $10M terminal value (10% of CAPEX)
    )
    
    # Print results
    model.print_results()
    
    # Print debt schedule
    model.print_debt_schedule()
    
    # Print equity analysis
    model.print_equity_analysis()