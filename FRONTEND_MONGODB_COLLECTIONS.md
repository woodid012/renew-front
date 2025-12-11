# Frontend MongoDB Collections by Chart/Component

This document maps each frontend chart, component, and page to the MongoDB collections it uses.

## Database Name
- **Database**: `renew_assets` (from `process.env.MONGODB_DB`)

---

## 📊 Dashboard Page (`/pages/dashboard/page.jsx`)

### Collections Used:
1. **`ASSET_Output_Summary`** - Via `/api/dashboard/asset-output-summary`
   - **Used for:**
     - Asset Portfolio Summary Table (CAPEX, Debt, Equity, Gearing, IRR per asset)
     - Key Metrics KPIs (Total CAPEX, Total Debt, Total Equity, Portfolio Gearing, Portfolio IRR)
     - Portfolio/platform-level summary data

2. **`ASSET_cash_flows`** - Via `/api/all-assets-summary`
   - **Used for:**
     - Portfolio Revenue Chart (stacked bar chart by asset, yearly aggregation)
     - Portfolio Net Income Chart (stacked bar chart by asset, yearly aggregation)

### Charts/Components:
- **5 KPI Cards**: Total CAPEX, Total Debt, Total Equity, Portfolio Gearing, Portfolio IRR
- **Portfolio Revenue Chart**: Stacked bar chart showing revenue by asset over time
- **Portfolio Net Income Chart**: Stacked bar chart showing net income by asset over time
- **Asset Portfolio Summary Table**: Table with asset details (CAPEX, Debt, Equity, Gearing, IRR)

---

## 📈 Output Page (`/pages/output/page.jsx`)

### Collections Used:
1. **`ASSET_cash_flows`** - Via `/api/output-asset-data`
   - **Used for:**
     - All time-series charts (Revenue, OPEX, CAPEX, CFADS, Debt Service, Equity Cash Flow, Net Income, etc.)
     - Supports monthly, quarterly, yearly, and fiscal yearly periods
     - Individual asset views and portfolio aggregate views
     - Multiple chart types: Stacked Bar, Line Chart, Individual Bars

2. **`CONFIG_Inputs`** - Via `/api/output-asset-data`
   - **Used for:**
     - Hybrid asset detection and grouping
     - Asset name mapping

### Charts/Components:
- **Time-Series Charts** (15+ fields):
  - Revenue (Total, Contracted Green, Contracted Energy, Merchant Green, Merchant Energy)
  - Generation (Monthly Generation)
  - Pricing (Avg Green Price, Avg Energy Price)
  - Costs (OPEX, CAPEX, Equity CAPEX, Debt CAPEX)
  - Cash Flow (CFADS, Equity Cash Flow)
  - Finance (Debt Service)
  - Profitability (Net Income)
- **Asset Selector**: Dropdown to select individual assets or portfolio view
- **Period Selector**: Monthly, Quarterly, Yearly, Fiscal Yearly
- **Chart Type Selector**: Stacked Bar, Line Chart, Individual Bars

---

## 💰 Three-Way Forecast Page (`/pages/three-way-forecast/page.jsx`)

### Collections Used:
1. **`ASSET_cash_flows`** - Via `/api/three-way-forecast`
   - **Used for:**
     - Profit & Loss Statement (Revenue, OPEX, EBITDA, D&A, EBIT, Interest, EBT, Tax, Net Income)
     - Balance Sheet (Cash, Fixed Assets, Total Assets, Debt, Total Liabilities, Equity, Share Capital, Retained Earnings)
     - Cash Flow Statement (Operating, Investing, Financing activities, Equity Cash Flows)

2. **`CONFIG_Inputs`** - Via `/api/three-way-forecast`
   - **Used for:**
     - Portfolio asset ID validation
     - Asset name mapping

### Charts/Components:
- **Profit & Loss Statement**: Revenue through Net Income
- **Balance Sheet**: Assets, Liabilities, Equity
- **Cash Flow Statement**: Operating, Investing, Financing activities
- **Period Views**: Monthly, Quarterly, Yearly, Fiscal Yearly
- **Asset/Portfolio Selector**: Individual assets or portfolio aggregate

---

## 📉 Sensitivity Analysis Page (`/pages/output-sensitivity/page.jsx`)

### Collections Used:
1. **`SENS_Summary_Main`** - Via `/api/get-sensitivity-output`
   - **Used for:**
     - Tornado charts (showing sensitivity of IRR to various parameters)
     - Sensitivity tables
     - Asset-level and portfolio-level sensitivity analysis

2. **`CONFIG_Inputs`** - Via `/api/get-sensitivity-output`
   - **Used for:**
     - Asset name mapping
     - Portfolio validation

### Charts/Components:
- **Tornado Charts**: Visual representation of parameter sensitivity
- **Sensitivity Tables**: Tabular data showing sensitivity metrics
- **Asset Selector**: View sensitivity for individual assets or portfolio
- **Tabs**: Different views of sensitivity data

---

## ⚙️ Asset Inputs Page (`/pages/asset-inputs/`)

### Collections Used:
1. **`CONFIG_Inputs`** - Via `/api/get-asset-data`
   - **Used for:**
     - Asset configuration data
     - Portfolio settings
     - Asset inputs (all asset parameters)

2. **`ASSET_inputs_summary`** - Via `/api/asset-input-summary`
   - **Used for:**
     - Asset input summary data
     - Asset-level configuration summaries

### Components:
- **Asset Form**: Input forms for asset parameters
- **Asset Cards**: Display of asset configurations
- **Bulk Edit**: Bulk editing of asset parameters
- **Portfolio Settings**: Portfolio-level configuration

---

## 📋 Other API Routes & Collections

### Asset Management APIs:
- **`CONFIG_Inputs`**: Used by most asset management routes
  - `/api/get-asset-data` - Get asset configuration
  - `/api/save-asset-data` - Save asset configuration
  - `/api/create-portfolio` - Create new portfolio
  - `/api/delete-portfolio` - Delete portfolio
  - `/api/list-portfolios` - List all portfolios
  - `/api/hybrid-assets` - Hybrid asset management

### Data Export APIs:
- **`ASSET_cash_flows`** - Via `/api/export-data`
  - Export cash flow data to Excel/CSV
- **`SENS_Asset_Outputs`** - Via `/api/export-data`
  - Export sensitivity analysis data

### Revenue Summary API:
- **`ASSET_cash_flows`** - Via `/api/revenue-summary`
  - Revenue summary data

### Price Curves API:
- **`PRICE_Curves_2`** - Via `/api/price-curves2`
  - Price curve data

### Dashboard Helper APIs:
- **`ASSET_cash_flows`** - Via `/api/dashboard/portfolio-metrics`
  - Portfolio metrics calculation
- **`ASSET_inputs_summary`** - Via `/api/dashboard/asset-inputs`
  - Asset input summary for dashboard
- **`ASSET_cash_flows`** - Via `/api/dashboard/asset-count`
  - Asset count and validation
- **`ASSET_inputs_summary`** - Via `/api/dashboard/asset-count`
  - Asset count from inputs

---

## 📊 Summary by Collection

### `ASSET_cash_flows`
**Most heavily used collection** - Contains all time-series financial data
- Dashboard: Revenue & Net Income charts
- Output Page: All time-series charts (15+ fields)
- Three-Way Forecast: P&L, Balance Sheet, Cash Flow
- Revenue Summary
- Portfolio Metrics
- Asset Count validation
- Export functionality

### `ASSET_Output_Summary`
**Summary metrics collection** - Contains aggregated asset-level metrics
- Dashboard: Asset Portfolio Summary Table, KPI cards
- Asset validation and verification

### `ASSET_inputs_summary`
**Asset input summaries** - Contains asset configuration summaries
- Dashboard: Asset input summaries
- Asset Inputs Page: Asset summaries
- Asset count validation

### `CONFIG_Inputs`
**Configuration collection** - Contains portfolio and asset configurations
- All asset management operations
- Portfolio management
- Asset name mapping
- Hybrid asset detection
- Portfolio validation

### `SENS_Summary_Main`
**Sensitivity analysis results** - Contains sensitivity analysis output
- Sensitivity Analysis Page: Tornado charts and tables

### `SENS_Asset_Outputs`
**Sensitivity asset outputs** - Contains detailed sensitivity results
- Export functionality for sensitivity data

### `PRICE_Curves_2`
**Price curve data** - Contains price curve information
- Price Curves Page: Price curve visualization

---

## 🔍 Portfolio Filtering

**All collections now support portfolio filtering via the `portfolio` field:**
- All queries filter by `portfolio` field to ensure data isolation between portfolios
- Frontend passes `portfolio` parameter in all API calls
- Backend ensures portfolio-scoped data operations

---

## 📝 Notes

1. **Primary Collections**: `ASSET_cash_flows` and `ASSET_Output_Summary` are the most critical for visualization
2. **Configuration Collection**: `CONFIG_Inputs` is used for all portfolio/asset management
3. **Portfolio Isolation**: All data operations are now portfolio-scoped
4. **Hybrid Assets**: Special handling in `ASSET_cash_flows` for hybrid asset groups
5. **Sensitivity Data**: Separate collections (`SENS_*`) for sensitivity analysis results





