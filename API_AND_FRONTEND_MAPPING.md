# API Routes → MongoDB Collections & Frontend Charts → APIs Mapping

This document provides a complete mapping of:
1. **API Routes → MongoDB Collections** (what tables each API uses)
2. **Frontend Charts/Components → API Routes** (what APIs each chart uses)

---

## 📡 PART 1: API Routes → MongoDB Collections

### Dashboard APIs

#### `/api/dashboard/asset-output-summary`
**Collections Used:**
- `ASSET_Output_Summary` (primary)
- `CONFIG_Inputs` (via `getPortfolioAssetIds` helper)

**Purpose:** Get asset summary metrics (CAPEX, Debt, Equity, IRR, etc.)

---

#### `/api/dashboard/portfolio-metrics`
**Collections Used:**
- `ASSET_cash_flows` (primary - for CAPEX, debt, equity totals)
- `ASSET_inputs_summary` (for IRR and capacity data)

**Purpose:** Calculate portfolio-level metrics (total CAPEX, debt, equity, gearing, IRR, capacity)

---

#### `/api/dashboard/asset-inputs`
**Collections Used:**
- `ASSET_inputs_summary` (primary - tries multiple name variants)
- Falls back to: `asset_inputs_summary`, `asset_inputs`

**Purpose:** Get asset input configuration summaries

---

#### `/api/dashboard/asset-count`
**Collections Used:**
- `ASSET_inputs_summary` (primary)
- `ASSET_cash_flows` (fallback)

**Purpose:** Get asset counts by type and region

---

### Output & Time-Series APIs

#### `/api/output-asset-data`
**Collections Used:**
- `ASSET_cash_flows` (primary - all time-series data)
- `CONFIG_Inputs` (for hybrid asset detection and asset names)

**Purpose:** Get time-series data for individual assets or portfolio (revenue, OPEX, CAPEX, CFADS, etc.)

**Supports:** Monthly, quarterly, yearly, fiscal yearly periods

---

#### `/api/all-assets-summary`
**Collections Used:**
- `ASSET_cash_flows` (primary - aggregated time-series)
- `CONFIG_Inputs` (for portfolio asset validation)
- `ASSET_Output_Summary` (for asset verification)

**Purpose:** Get aggregated time-series data across all assets in portfolio (revenue, net_income, etc.)

**Supports:** Monthly, quarterly, yearly, fiscal yearly periods

---

#### `/api/three-way-forecast`
**Collections Used:**
- `ASSET_cash_flows` (primary - P&L, Balance Sheet, Cash Flow data)
- `CONFIG_Inputs` (for portfolio asset validation)

**Purpose:** Get three-way financial statements (P&L, Balance Sheet, Cash Flow)

**Supports:** Monthly, quarterly, yearly, fiscal yearly periods

---

### Sensitivity Analysis APIs

#### `/api/get-sensitivity-output`
**Collections Used:**
- `SENS_Summary_Main` (primary - sensitivity analysis results)
- `CONFIG_Inputs` (for asset name mapping)

**Purpose:** Get sensitivity analysis results (tornado charts data)

---

#### `/api/get-sensitivity-config`
**Collections Used:**
- `CONFIG_Inputs` (likely - configuration for sensitivity analysis)

**Purpose:** Get sensitivity analysis configuration

---

### Asset Management APIs

#### `/api/get-asset-data`
**Collections Used:**
- `CONFIG_Inputs` (primary - asset configuration)

**Purpose:** Get asset configuration data for a portfolio

---

#### `/api/save-asset-data`
**Collections Used:**
- `CONFIG_Inputs` (write - update asset configuration)

**Purpose:** Save/update asset configuration

---

#### `/api/create-portfolio`
**Collections Used:**
- `CONFIG_Inputs` (write - create new portfolio document)

**Purpose:** Create a new portfolio

---

#### `/api/delete-portfolio`
**Collections Used:**
- `CONFIG_Inputs` (write - delete portfolio document)

**Purpose:** Delete a portfolio

---

#### `/api/list-portfolios`
**Collections Used:**
- `CONFIG_Inputs` (read - get all portfolios)

**Purpose:** List all available portfolios

---

#### `/api/hybrid-assets`
**Collections Used:**
- `ASSET_cash_flows` (for hybrid asset cash flow data)
- `CONFIG_Inputs` (for hybrid group configuration)

**Purpose:** Get hybrid asset data and configuration

---

### Configuration APIs

#### `/api/asset-defaults`
**Collections Used:**
- `CONFIG_Asset_Inputs` (or similar - asset default configurations)

**Purpose:** Get/save asset default configurations

---

#### `/api/asset-input-summary`
**Collections Used:**
- `ASSET_inputs_summary` (read asset input summaries)

**Purpose:** Get asset input summaries

---

#### `/api/asset-cashflows`
**Collections Used:**
- `ASSET_cash_flows` (read cash flow data)

**Purpose:** Get cash flow data for assets

---

### Export & Utility APIs

#### `/api/export-data`
**Collections Used:**
- `ASSET_cash_flows` (for base case export)
- `SENS_Asset_Outputs` (for sensitivity export)

**Purpose:** Export data to Excel/CSV

---

#### `/api/revenue-summary`
**Collections Used:**
- `ASSET_cash_flows` (revenue data aggregation)

**Purpose:** Get revenue summary data

---

#### `/api/price-curves2`
**Collections Used:**
- `PRICE_Curves_2` (price curve data)

**Purpose:** Get price curve data

---

#### `/api/check-base-results`
**Collections Used:**
- `ASSET_cash_flows` (check if base case results exist)

**Purpose:** Check if base case model results exist

---

#### `/api/run-model`
**Collections Used:**
- Proxies to Python backend (doesn't directly use MongoDB)

**Purpose:** Trigger model run on backend

---

#### `/api/run-sensitivity`
**Collections Used:**
- Proxies to Python backend (doesn't directly use MongoDB)

**Purpose:** Trigger sensitivity analysis on backend

---

## 🎨 PART 2: Frontend Charts/Components → API Routes

### Dashboard Page (`/pages/dashboard/page.jsx`)

#### Charts/Components:
1. **5 KPI Cards** (Total CAPEX, Total Debt, Total Equity, Portfolio Gearing, Portfolio IRR)
   - **API:** `/api/dashboard/asset-output-summary`
   - **Data Source:** `ASSET_Output_Summary`

2. **Portfolio Revenue Chart** (Stacked bar chart by asset, yearly)
   - **API:** `/api/all-assets-summary?period=yearly&field=revenue&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`

3. **Portfolio Net Income Chart** (Stacked bar chart by asset, yearly)
   - **API:** `/api/all-assets-summary?period=yearly&field=net_income&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`

4. **Asset Portfolio Summary Table** (Asset details: CAPEX, Debt, Equity, Gearing, IRR)
   - **API:** `/api/dashboard/asset-output-summary`
   - **Data Source:** `ASSET_Output_Summary`

---

### Output Page (`/pages/output/page.jsx`)

#### Charts/Components:
1. **Time-Series Charts** (15+ fields: Revenue, OPEX, CAPEX, CFADS, Debt Service, Equity Cash Flow, Net Income, etc.)
   - **API:** `/api/output-asset-data?asset_id={id}&period={period}&field={field}&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`
   - **Chart Types:** Stacked Bar, Line Chart, Individual Bars
   - **Periods:** Monthly, Quarterly, Yearly, Fiscal Yearly

2. **Asset Selector Dropdown**
   - **API:** `/api/output-asset-data?portfolio={portfolio}` (no asset_id - gets list of assets)
   - **Data Source:** `ASSET_cash_flows` + `CONFIG_Inputs`

3. **Portfolio Aggregate View**
   - **API:** `/api/output-asset-data?portfolio={portfolio}` (no asset_id)
   - **Data Source:** `ASSET_cash_flows`

---

### Three-Way Forecast Page (`/pages/three-way-forecast/page.jsx`)

#### Charts/Components:
1. **Profit & Loss Statement** (Revenue → Net Income)
   - **API:** `/api/three-way-forecast?asset_id={id}&period={period}&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`
   - **Fields:** revenue, opex, ebitda, d_and_a, ebit, interest, ebt, tax_expense, net_income

2. **Balance Sheet** (Assets, Liabilities, Equity)
   - **API:** `/api/three-way-forecast?asset_id={id}&period={period}&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`
   - **Fields:** cash, fixed_assets, total_assets, debt, total_liabilities, equity, share_capital, retained_earnings

3. **Cash Flow Statement** (Operating, Investing, Financing)
   - **API:** `/api/three-way-forecast?asset_id={id}&period={period}&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`
   - **Fields:** cfads, operating_cash_flow, capex, investing_cash_flow, drawdowns, principal, equity_injection, distributions, financing_cash_flow, equity_cash_flow

4. **Period Selector** (Monthly, Quarterly, Yearly, Fiscal Yearly)
   - **API:** Same as above with different `period` parameter

5. **Asset/Portfolio Selector**
   - **API:** `/api/three-way-forecast?portfolio={portfolio}` (no asset_id - gets list)

---

### Sensitivity Analysis Page (`/pages/output-sensitivity/page.jsx`)

#### Charts/Components:
1. **Tornado Charts** (Parameter sensitivity visualization)
   - **API:** `/api/get-sensitivity-output?portfolio={portfolio}&scenario_id={id}`
   - **Data Source:** `SENS_Summary_Main`

2. **Sensitivity Tables** (Tabular sensitivity data)
   - **API:** `/api/get-sensitivity-output?portfolio={portfolio}&scenario_id={id}`
   - **Data Source:** `SENS_Summary_Main`

3. **Asset Selector** (Portfolio or individual assets)
   - **API:** `/api/get-sensitivity-output?portfolio={portfolio}`
   - **Data Source:** `SENS_Summary_Main` + `CONFIG_Inputs` (for asset names)

4. **Scenario Selector**
   - **API:** `/api/get-sensitivity-output?portfolio={portfolio}`
   - **Data Source:** `SENS_Summary_Main` (returns `uniqueScenarioIds`)

---

### Asset Inputs Page (`/pages/asset_3/page.jsx`)

#### Components:
1. **Asset Form** (Input forms for asset parameters)
   - **API:** `/api/get-asset-data?portfolio={portfolio}`
   - **Data Source:** `CONFIG_Inputs`

2. **Asset Cards** (Display asset configurations)
   - **API:** `/api/get-asset-data?portfolio={portfolio}`
   - **Data Source:** `CONFIG_Inputs`

3. **Bulk Edit** (Bulk editing of assets)
   - **API:** `/api/save-asset-data` (POST)
   - **Data Source:** `CONFIG_Inputs` (write)

4. **Asset Defaults**
   - **API:** `/api/asset-defaults` (GET/POST)
   - **Data Source:** `CONFIG_Asset_Inputs`

---

### Export Data Page (`/pages/export-data/page.jsx`)

#### Components:
1. **Asset Data Export**
   - **API:** `/api/output-asset-data?portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`

2. **Portfolio Export**
   - **API:** `/api/all-assets-summary?period={period}&field={field}&portfolio={portfolio}`
   - **Data Source:** `ASSET_cash_flows`

3. **Sensitivity Export**
   - **API:** `/api/get-sensitivity-output?portfolio={portfolio}`
   - **Data Source:** `SENS_Summary_Main`

4. **Export to Excel/CSV**
   - **API:** `/api/export-data?collection={collection}&granularity={granularity}`
   - **Data Source:** `ASSET_cash_flows` or `SENS_Asset_Outputs`

---

### Settings Pages

#### Administrator Settings (`/pages/settings/administrator/page.jsx`)
1. **Portfolio List**
   - **API:** `/api/list-portfolios`
   - **Data Source:** `CONFIG_Inputs`

2. **Delete Portfolio**
   - **API:** `/api/delete-portfolio` (POST)
   - **Data Source:** `CONFIG_Inputs` (write)

#### Asset Defaults Settings (`/pages/settings/asset-defaults/page.jsx`)
1. **Default Configurations**
   - **API:** `/api/asset-defaults` (GET/POST)
   - **Data Source:** `CONFIG_Asset_Inputs`

---

### Other Pages

#### Upload ZEBRE Data (`/pages/upload-zebre/page.jsx`)
1. **Upload Configuration**
   - **API:** `/api/upload-zebre-data` (POST)
   - **Data Source:** `CONFIG_Inputs` (write)

#### Price Curves (`/pages/price-curves2/page.jsx`)
1. **Price Curve Visualization**
   - **API:** `/api/price-curves2?period={period}`
   - **Data Source:** `PRICE_Curves_2`

#### WIP Pages
1. **Assets List**
   - **API:** `/api/assets`
   - **Data Source:** `ASSET_inputs_summary`

2. **Sensitivity Data**
   - **API:** `/api/get-sensitivity-output`
   - **Data Source:** `SENS_Summary_Main`

---

## 📊 Summary: Most Used Collections

### By API Usage:
1. **`ASSET_cash_flows`** - Used by 10+ APIs
   - Dashboard revenue/net income charts
   - All output page charts
   - Three-way forecast
   - Portfolio metrics
   - Export functionality

2. **`CONFIG_Inputs`** - Used by 15+ APIs
   - All asset management
   - Portfolio management
   - Asset validation
   - Hybrid asset detection

3. **`ASSET_Output_Summary`** - Used by 3 APIs
   - Dashboard summary table
   - Asset verification

4. **`ASSET_inputs_summary`** - Used by 4 APIs
   - Dashboard asset inputs
   - Asset count
   - Portfolio metrics

5. **`SENS_Summary_Main`** - Used by 2 APIs
   - Sensitivity analysis
   - Sensitivity export

---

## 🔄 Data Flow Summary

### Typical Flow:
1. **User selects portfolio** → Frontend calls `/api/get-asset-data` → `CONFIG_Inputs`
2. **User views dashboard** → Frontend calls `/api/dashboard/asset-output-summary` → `ASSET_Output_Summary`
3. **User views charts** → Frontend calls `/api/output-asset-data` → `ASSET_cash_flows`
4. **User runs model** → Frontend calls `/api/run-model` → Backend writes to `ASSET_cash_flows`, `ASSET_Output_Summary`, etc.

---

## 📝 Notes

- **All APIs now filter by `portfolio` field** for data isolation
- **Hybrid assets** require special handling in `ASSET_cash_flows` and `CONFIG_Inputs`
- **Sensitivity data** uses separate collections (`SENS_*`)
- **Most time-series data** comes from `ASSET_cash_flows`
- **Configuration data** comes from `CONFIG_Inputs`

