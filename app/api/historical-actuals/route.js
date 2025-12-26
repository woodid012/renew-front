import { NextResponse } from 'next/server'
import { OpenElectricityClient, makeAware, OpenElectricityError, NoDataFound } from 'openelectricity'

// Open Electricity API proxy route
// This avoids CORS issues when calling the external API from the frontend
//
// API Reference Documentation:
// - Overview: https://docs.openelectricity.org.au/api-reference/overview
// - Data Limits: https://docs.openelectricity.org.au/api-reference/data-limits
// - Generation Data: https://docs.openelectricity.org.au/api-reference/generation-data
// - Market Data: https://docs.openelectricity.org.au/api-reference/market-data
// - Facilities: https://docs.openelectricity.org.au/api-reference/facilities
//
// If the API/code is getting confused, refer to the above documentation to see what options are available.

export async function GET(request) {
    const { searchParams } = new URL(request.url)

    // Get data type parameter (default to 'market' for market prices)
    // 'market' = market prices, 'fueltech' = solar/wind average prices, 'generator' = facility-specific data
    const dataType = searchParams.get('type') || 'market'

    // Get facility codes for generator data (comma-separated)
    const facilityCodesParam = searchParams.get('facility_codes')
    const facilityCodes = facilityCodesParam ? facilityCodesParam.split(',').map(code => code.trim()).filter(Boolean) : []

    // Get interval parameter from query string (default to '1M' for monthly)
    // Supported intervals: "5m" | "1h" | "1d" | "7d" | "1M" | "3M" | "season" | "1y" | "fy"
    // Reference: https://docs.openelectricity.org.au/api-reference/data-limits for valid intervals and limits
    const intervalParam = searchParams.get('interval')
    const validIntervals = ['5m', '1h', '1d', '7d', '1M', '3M', 'season', '1y', 'fy']
    const interval = intervalParam && validIntervals.includes(intervalParam) ? intervalParam : '1M'

    // Get months parameter from query string (default to 12 months)
    const monthsParam = searchParams.get('months')
    let months = monthsParam ? parseInt(monthsParam, 10) : 12

    // API limits for date ranges based on interval (in days)
    // Reference: https://docs.openelectricity.org.au/api-reference/data-limits
    // 
    // If the API/code is getting confused about limits or available options, refer to:
    // - Data Limits: https://docs.openelectricity.org.au/api-reference/data-limits
    // - API Overview: https://docs.openelectricity.org.au/api-reference/overview
    //
    // FUTURE REFERENCE: To get more data beyond these limits, OpenElectricity suggests
    // implementing chunked fetching by looping through date ranges that respect the API constraints.
    // Example: For 60 days of hourly data (limit is 32 days), make 2 requests:
    //   - Request 1: days 1-32
    //   - Request 2: days 33-60
    // Then merge the results. See the API documentation for chunked fetch examples:
    // https://docs.openelectricity.org.au/api-reference/data-limits#handling-range-limits-fetching-60-days-of-hourly-data
    const maxDaysForInterval = {
        '5m': 8,      // 8 days maximum for 5-minute intervals
        '1h': 32,     // 32 days maximum for hourly intervals
        '1d': 366,    // 366 days maximum for daily intervals
        '7d': 366,    // 366 days maximum for weekly intervals
        '1M': 732,    // 732 days (~2 years) maximum for monthly intervals
        '3M': 1830,   // 1830 days (~5 years) maximum for quarterly intervals
        'season': 1830, // 1830 days (~5 years) maximum for seasonal intervals
        '1y': 3700,   // 3700 days (~10 years) maximum for yearly intervals
        'fy': 3700    // 3700 days (~10 years) maximum for financial year intervals
    }

    // Calculate date range based on months parameter
    const now = new Date()
    const endDate = new Date(now) // Use today's date as the end date
    let startDate = new Date(endDate)

    // Special handling for 5m interval when months is 0 (means 8 days)
    if (interval === '5m' && months === 0) {
        startDate.setDate(startDate.getDate() - 8)
    } else {
        startDate.setMonth(startDate.getMonth() - months)
    }

    // Check API limits and adjust date range if necessary
    const maxDays = maxDaysForInterval[interval]
    if (maxDays) {
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))

        if (daysDiff > maxDays) {
            // Adjust start date to fit within the limit
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - maxDays)

            // Recalculate months based on actual date range
            const actualDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            months = Math.floor(actualDays / 30)

            console.warn(`Date range too large for ${interval} interval. Adjusted from ${daysDiff} days to ${actualDays} days (${months} months)`)
        }
    }

    // Format dates as ISO strings (YYYY-MM-DD)
    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    const apiKey = process.env.OPEN_ELECTRICITY_API_KEY || 'oe_3ZMYh2P6b93uKsZV3tMETp6w'

    if (!apiKey) {
        return NextResponse.json(
            { error: 'Open Electricity API key not configured' },
            { status: 500 }
        )
    }

    try {
        // Initialize the OpenElectricity client
        const client = new OpenElectricityClient({
            apiKey: apiKey,
            baseUrl: 'https://api.openelectricity.org.au/v4'
        })

        // Make date strings timezone-aware for NEM (AEST/UTC+10)
        const dateStartAware = makeAware(`${dateStart}T00:00:00`, 'NEM')
        const dateEndAware = makeAware(`${dateEnd}T00:00:00`, 'NEM')

        let response, datatable

        let baseloadPrices = null // Store baseload prices for percentage calculation

        if (dataType === 'generator') {
            // Fetch facility-specific data
            if (!facilityCodes || facilityCodes.length === 0) {
                return NextResponse.json(
                    { error: 'facility_codes parameter is required for generator data type' },
                    { status: 400 }
                )
            }

            // Log request parameters
            console.log('=== Facility Data API Request ===')
            console.log('Facility codes:', facilityCodes)
            console.log('Network:', 'NEM')
            console.log('Metrics:', ['energy', 'market_value'])
            console.log('Interval:', interval)
            console.log('Date start:', dateStartAware)
            console.log('Date end:', dateEndAware)
            console.log('Date range (days):', Math.ceil((new Date(dateEndAware) - new Date(dateStartAware)) / (1000 * 60 * 60 * 24)))

            try {
                // Fetch facility data for energy, market_value, power, and emissions metrics
                // According to SDK docs: facilityCodes can be string | string[]
                // For single facility, pass as string; for multiple, pass as array
                const facilityCodeParam = facilityCodes.length === 1 ? facilityCodes[0] : facilityCodes

                // Format dates as ISO strings (the SDK expects date-time strings)
                // dateStartAware and dateEndAware are already timezone-aware strings from makeAware
                const dateStartStr = typeof dateStartAware === 'string' ? dateStartAware : dateStartAware.toISOString()
                const dateEndStr = typeof dateEndAware === 'string' ? dateEndAware : dateEndAware.toISOString()

                // Metrics to fetch: energy, market_value, power, emissions
                const metrics = ['energy', 'market_value', 'power', 'emissions']

                console.log('Calling getFacilityData with:', {
                    network: 'NEM',
                    facilityCode: facilityCodeParam,
                    metrics: metrics,
                    params: {
                        interval: interval,
                        dateStart: dateStartStr,
                        dateEnd: dateEndStr
                    }
                })

                const { response: facilityResponse, datatable: facilityDatatable } = await client.getFacilityData(
                    'NEM',
                    facilityCodeParam,
                    metrics,
                    {
                        interval: interval,
                        dateStart: dateStartStr,
                        dateEnd: dateEndStr
                    }
                )

                // Log response structure
                console.log('=== Facility Data API Response (WAUBRAWF) ===')
                console.log('API Call Format:', {
                    network: 'NEM',
                    facilityCode: facilityCodeParam,
                    metrics: metrics,
                    params: {
                        interval: interval,
                        dateStart: dateStartStr,
                        dateEnd: dateEndStr
                    }
                })
                console.log('Response keys:', Object.keys(facilityResponse || {}))
                console.log('Response success:', facilityResponse?.success)
                console.log('Response data type:', Array.isArray(facilityResponse?.data) ? 'array' : typeof facilityResponse?.data)
                console.log('Response data length:', Array.isArray(facilityResponse?.data) ? facilityResponse?.data.length : 'N/A')
                console.log('Response total_records:', facilityResponse?.total_records)
                if (facilityResponse?.data) {
                    console.log('Response.data sample (first item):', Array.isArray(facilityResponse.data) ? facilityResponse.data[0] : facilityResponse.data)
                }

                // Log datatable structure
                console.log('=== Facility DataTable Structure ===')
                console.log('Datatable exists:', !!facilityDatatable)
                if (facilityDatatable) {
                    console.log('Datatable type:', typeof facilityDatatable)
                    console.log('Datatable constructor:', facilityDatatable.constructor?.name)
                    console.log('Datatable prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(facilityDatatable)))
                    console.log('Datatable own properties:', Object.keys(facilityDatatable))

                    // Try to get rows
                    if (typeof facilityDatatable.getRows === 'function') {
                        try {
                            const rows = facilityDatatable.getRows()
                            console.log('Number of rows:', rows?.length || 0)

                            if (rows && rows.length > 0) {
                                console.log('=== Row Structure Analysis ===')
                                const firstRow = rows[0]
                                console.log('First row keys:', Object.keys(firstRow))
                                console.log('First row full structure:', JSON.stringify(firstRow, null, 2))

                                // Log first 5 rows for analysis
                                console.log('First 5 rows:', rows.slice(0, 5).map(row => ({
                                    keys: Object.keys(row),
                                    interval: row.interval,
                                    energy: row.energy,
                                    market_value: row.market_value,
                                    facility_code: row.facility_code || row.code,
                                    unit: row.unit || row.unit_code,
                                    region: row.region || row.network_region
                                })))

                                // Analyze column types and values
                                console.log('=== Column Analysis ===')
                                const sampleRow = rows[0]
                                Object.keys(sampleRow).forEach(key => {
                                    const value = sampleRow[key]
                                    console.log(`Column "${key}":`, {
                                        type: typeof value,
                                        isDate: value instanceof Date,
                                        sampleValue: value,
                                        sampleValueType: Array.isArray(value) ? 'array' : typeof value
                                    })
                                })

                                // Check for facility_code column
                                const hasFacilityCode = rows.some(row => row.facility_code || row.code)
                                console.log('Has facility_code column:', hasFacilityCode)

                                // Check for unit column (facility data is grouped by unit)
                                const hasUnit = rows.some(row => row.unit || row.unit_code)
                                console.log('Has unit column:', hasUnit)

                                // Log unique facility codes found
                                const uniqueFacilities = [...new Set(rows.map(row => row.facility_code || row.code).filter(Boolean))]
                                console.log('Unique facility codes in data:', uniqueFacilities)

                                // Log unique units if present
                                if (hasUnit) {
                                    const uniqueUnits = [...new Set(rows.map(row => row.unit || row.unit_code).filter(Boolean))]
                                    console.log('Unique units in data:', uniqueUnits)
                                }

                                // Analyze data grouping
                                console.log('=== Data Grouping Analysis ===')
                                const groupingAnalysis = {}
                                rows.forEach(row => {
                                    const facilityCode = row.facility_code || row.code || 'UNKNOWN'
                                    const unit = row.unit || row.unit_code || 'NO_UNIT'
                                    const interval = row.interval

                                    if (!groupingAnalysis[facilityCode]) {
                                        groupingAnalysis[facilityCode] = {}
                                    }
                                    if (!groupingAnalysis[facilityCode][unit]) {
                                        groupingAnalysis[facilityCode][unit] = new Set()
                                    }
                                    groupingAnalysis[facilityCode][unit].add(interval instanceof Date ? interval.toISOString() : String(interval))
                                })

                                Object.keys(groupingAnalysis).forEach(facilityCode => {
                                    const units = groupingAnalysis[facilityCode]
                                    console.log(`Facility ${facilityCode}:`)
                                    Object.keys(units).forEach(unit => {
                                        console.log(`  Unit ${unit}: ${units[unit].size} unique intervals`)
                                    })
                                })

                                // Check data types and ranges
                                console.log('=== Data Value Analysis ===')
                                const energyValues = rows.map(r => r.energy).filter(v => v != null)
                                const marketValueValues = rows.map(r => r.market_value).filter(v => v != null)
                                console.log('Energy values:', {
                                    count: energyValues.length,
                                    min: energyValues.length > 0 ? Math.min(...energyValues) : 'N/A',
                                    max: energyValues.length > 0 ? Math.max(...energyValues) : 'N/A',
                                    avg: energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 'N/A'
                                })
                                console.log('Market value values:', {
                                    count: marketValueValues.length,
                                    min: marketValueValues.length > 0 ? Math.min(...marketValueValues) : 'N/A',
                                    max: marketValueValues.length > 0 ? Math.max(...marketValueValues) : 'N/A',
                                    avg: marketValueValues.length > 0 ? marketValueValues.reduce((a, b) => a + b, 0) / marketValueValues.length : 'N/A'
                                })
                            } else {
                                console.warn('No rows returned from datatable')
                            }
                        } catch (rowsError) {
                            console.error('Error getting rows from datatable:', rowsError)
                            console.error('Error stack:', rowsError.stack)
                        }
                    } else {
                        console.warn('Datatable does not have getRows method')
                        // Try alternative methods
                        if (typeof facilityDatatable.toArray === 'function') {
                            try {
                                const arr = facilityDatatable.toArray()
                                console.log('toArray() result:', arr?.length || 0, 'items')
                            } catch (e) {
                                console.log('toArray() error:', e.message)
                            }
                        }
                        if (typeof facilityDatatable.toJSON === 'function') {
                            try {
                                const json = facilityDatatable.toJSON()
                                console.log('toJSON() result type:', typeof json)
                                console.log('toJSON() result:', json)
                            } catch (e) {
                                console.log('toJSON() error:', e.message)
                            }
                        }
                    }
                }

                response = facilityResponse
                datatable = facilityDatatable
            } catch (apiError) {
                console.error('=== Facility Data API Error ===')
                console.error('Error type:', apiError.constructor.name)
                console.error('Error message:', apiError.message)
                console.error('Error stack:', apiError.stack)
                if (apiError.statusCode) {
                    console.error('Status code:', apiError.statusCode)
                }
                if (apiError.response) {
                    console.error('Error response:', apiError.response)
                }
                if (apiError.details) {
                    console.error('Error details:', apiError.details)
                }
                throw apiError
            }
        } else if (dataType === 'demand_supply') {
            // Fetch demand data and supply breakdown by fueltech_group
            // Demand comes from getMarket, supply breakdown from getNetworkData
            try {
                // Fetch demand data
                const { response: demandResponse, datatable: demandDatatable } = await client.getMarket(
                    'NEM',
                    ['demand', 'demand_energy'],
                    {
                        interval: interval,
                        dateStart: dateStartAware,
                        dateEnd: dateEndAware,
                        primaryGrouping: 'network_region'
                    }
                )

                // Fetch supply breakdown by fueltech_group
                const { response: supplyResponse, datatable: supplyDatatable } = await client.getNetworkData(
                    'NEM',
                    ['energy'],
                    {
                        interval: interval,
                        dateStart: dateStartAware,
                        dateEnd: dateEndAware,
                        primaryGrouping: 'network_region',
                        secondaryGrouping: ['fueltech_group']
                    }
                )

                // Store both datatables for processing
                response = demandResponse
                datatable = { demand: demandDatatable, supply: supplyDatatable }
            } catch (apiError) {
                console.error('Error fetching demand/supply data:', apiError)
                throw apiError
            }
        } else if (dataType === 'curtailment') {
            // Fetch curtailment data by region
            // Using curtailment energy metrics (MWh) grouped by network_region
            try {
                const { response: curtailmentResponse, datatable: curtailmentDatatable } = await client.getMarket(
                    'NEM',
                    ['curtailment_solar_utility_energy', 'curtailment_wind_energy', 'curtailment_energy'],
                    {
                        interval: interval,
                        dateStart: dateStartAware,
                        dateEnd: dateEndAware,
                        primaryGrouping: 'network_region'
                    }
                )
                response = curtailmentResponse
                datatable = curtailmentDatatable
            } catch (apiError) {
                console.error('Error fetching curtailment data:', apiError)
                throw apiError
            }
        } else if (dataType === 'fueltech') {
            // Fetch network data for solar_utility and wind fueltechs
            // Get energy and market_value metrics (not power) - we need energy (MWh) to calculate $/MWh
            // grouped by region and fueltech
            try {
                // Try with fueltech filter and secondaryGrouping
                const { response: networkResponse, datatable: networkDatatable } = await client.getNetworkData('NEM', ['energy', 'market_value'], {
                    interval: interval,
                    dateStart: dateStartAware,
                    dateEnd: dateEndAware,
                    primaryGrouping: 'network_region',
                    secondaryGrouping: ['fueltech'],
                    fueltech: ['solar_utility', 'wind'] // Filter for solar_utility and wind specifically
                })
                response = networkResponse
                datatable = networkDatatable
            } catch (apiError) {
                console.error('Error fetching fueltech data with fueltech filter:', apiError)
                // If that fails, try without the fueltech filter and filter in code
                try {
                    console.log('Retrying without fueltech filter...')
                    const { response: networkResponse, datatable: networkDatatable } = await client.getNetworkData('NEM', ['energy', 'market_value'], {
                        interval: interval,
                        dateStart: dateStartAware,
                        dateEnd: dateEndAware,
                        primaryGrouping: 'network_region',
                        secondaryGrouping: ['fueltech']
                    })
                    response = networkResponse
                    datatable = networkDatatable
                } catch (retryError) {
                    console.error('Error fetching fueltech data without filter:', retryError)
                    throw retryError
                }
            }

            // Fetch baseload prices (market prices) for percentage calculation
            try {
                const { response: baseloadResponse, datatable: baseloadDatatable } = await client.getMarket('NEM', ['price'], {
                    interval: interval,
                    dateStart: dateStartAware,
                    dateEnd: dateEndAware,
                    primaryGrouping: 'network_region'
                })
                baseloadPrices = baseloadDatatable
            } catch (baseloadError) {
                console.warn('Could not fetch baseload prices for percentage calculation:', baseloadError)
                // Continue without baseload prices - percentage will be null
            }
        } else {
            // Fetch market price data by region
            const { response: marketResponse, datatable: marketDatatable } = await client.getMarket('NEM', ['price'], {
                interval: interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware,
                primaryGrouping: 'network_region'
            })
            response = marketResponse
            datatable = marketDatatable
        }

        // response here is the parsed JSON data, not a Response object
        // The library already handles errors by throwing exceptions
        // For generator data, we might not have response.data, so check datatable instead
        if (dataType === 'generator') {
            if (!datatable) {
                return NextResponse.json(
                    { error: 'No datatable returned from API for facility data' },
                    { status: 500 }
                )
            }
        } else if (!response || !response.data) {
            return NextResponse.json(
                { error: 'No data returned from API' },
                { status: 500 }
            )
        }

        // Transform the DataTable data for easier frontend consumption
        const transformedData = {
            success: true,
            type: dataType,
            interval: interval,
            dateRange: { start: dateStart, end: dateEnd },
            regions: {}
        }

        if (dataType === 'demand_supply') {
            // Process demand and supply data
            const demandRows = datatable.demand.getRows()
            const supplyRows = datatable.supply.getRows()

            // Aggregate demand by region and time
            const demandAggregated = {}
            demandRows.forEach(row => {
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : 'UNKNOWN')
                const rowInterval = row.interval
                if (!rowInterval) return

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                const timeKey = timestamp.toISOString()

                if (!demandAggregated[region]) {
                    demandAggregated[region] = {}
                }
                if (!demandAggregated[region][timeKey]) {
                    demandAggregated[region][timeKey] = {
                        timestamp: timestamp,
                        demand: 0,
                        demandEnergy: 0
                    }
                }
                if (row.demand != null) demandAggregated[region][timeKey].demand += Number(row.demand)
                if (row.demand_energy != null) demandAggregated[region][timeKey].demandEnergy += Number(row.demand_energy)
            })

            // Aggregate supply by region, fueltech_group, and time
            const supplyAggregated = {}
            const fueltechGroups = new Set()

            supplyRows.forEach(row => {
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : 'UNKNOWN')
                const fueltechGroup = row.fueltech_group || row.fueltech || 'other'
                const rowInterval = row.interval
                const energy = row.energy

                if (!rowInterval || energy == null) return

                fueltechGroups.add(fueltechGroup)

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                const timeKey = timestamp.toISOString()

                if (!supplyAggregated[region]) {
                    supplyAggregated[region] = {}
                }
                if (!supplyAggregated[region][timeKey]) {
                    supplyAggregated[region][timeKey] = {
                        timestamp: timestamp,
                        fueltechs: {}
                    }
                }
                if (!supplyAggregated[region][timeKey].fueltechs[fueltechGroup]) {
                    supplyAggregated[region][timeKey].fueltechs[fueltechGroup] = 0
                }
                supplyAggregated[region][timeKey].fueltechs[fueltechGroup] += Number(energy)
            })

            // Merge demand and supply data into output format
            Object.keys(demandAggregated).forEach(region => {
                transformedData.regions[region] = []

                Object.entries(demandAggregated[region]).forEach(([timeKey, demandData]) => {
                    const timestamp = demandData.timestamp
                    const supplyData = supplyAggregated[region]?.[timeKey]

                    // Format date label
                    let dateLabel
                    if (interval === '1M' || interval === '3M' || interval === 'season' || interval === '1y' || interval === 'fy') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
                    } else if (interval === '7d' || interval === '1d') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                    } else {
                        dateLabel = timestamp.toLocaleDateString('en-AU', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                    }

                    transformedData.regions[region].push({
                        date: timestamp.toISOString(),
                        label: dateLabel,
                        month: timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
                        year: timestamp.getFullYear(),
                        monthNum: timestamp.getMonth() + 1,
                        day: timestamp.getDate(),
                        demand: demandData.demand,
                        demandEnergy: demandData.demandEnergy,
                        supply: supplyData?.fueltechs || {}
                    })
                })
            })

            // Add available fueltech groups to response
            transformedData.fueltechGroups = Array.from(fueltechGroups).sort()

        } else if (dataType === 'curtailment') {
            // Process curtailment data: group by region and time interval
            const rows = datatable.getRows()

            if (!rows || rows.length === 0) {
                console.warn('No curtailment data rows returned from API')
                return NextResponse.json(transformedData)
            }

            // Aggregate by region and time interval
            // Structure: { region: { timeKey: { ... } } }
            const aggregated = {}

            rows.forEach(row => {
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : 'UNKNOWN')
                const rowInterval = row.interval
                const curtailmentSolar = row.curtailment_solar_utility_energy
                const curtailmentWind = row.curtailment_wind_energy
                const curtailmentTotal = row.curtailment_energy

                // Filter out invalid data
                if (!rowInterval) {
                    return
                }

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                const timeKey = timestamp.toISOString()

                if (!aggregated[region]) {
                    aggregated[region] = {}
                }

                if (!aggregated[region][timeKey]) {
                    aggregated[region][timeKey] = {
                        timestamp: timestamp,
                        curtailmentSolar: 0,
                        curtailmentWind: 0,
                        curtailmentTotal: 0
                    }
                }

                // Sum up values (handle null/undefined)
                if (curtailmentSolar != null) {
                    aggregated[region][timeKey].curtailmentSolar += Number(curtailmentSolar)
                }
                if (curtailmentWind != null) {
                    aggregated[region][timeKey].curtailmentWind += Number(curtailmentWind)
                }
                if (curtailmentTotal != null) {
                    aggregated[region][timeKey].curtailmentTotal += Number(curtailmentTotal)
                }
            })

            // Format data for output
            Object.keys(aggregated).forEach(region => {
                transformedData.regions[region] = []

                Object.values(aggregated[region]).forEach(agg => {
                    const timestamp = agg.timestamp

                    // Format the date label based on the interval
                    let dateLabel
                    if (interval === '1M' || interval === '3M' || interval === 'season' || interval === '1y' || interval === 'fy') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
                    } else if (interval === '7d' || interval === '1d') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                    } else {
                        dateLabel = timestamp.toLocaleDateString('en-AU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }

                    transformedData.regions[region].push({
                        date: timestamp.toISOString(),
                        label: dateLabel,
                        month: timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
                        year: timestamp.getFullYear(),
                        monthNum: timestamp.getMonth() + 1,
                        day: timestamp.getDate(),
                        curtailmentSolar: agg.curtailmentSolar,
                        curtailmentWind: agg.curtailmentWind,
                        curtailmentTotal: agg.curtailmentTotal
                    })
                })
            })
        } else if (dataType === 'fueltech') {
            // Process fueltech data: calculate average prices (market_value / energy) for solar_utility and wind by region
            // Keep solar_utility and wind separate (don't aggregate)
            // Use energy (MWh) not power (MW) to calculate $/MWh correctly
            const rows = datatable.getRows()

            if (!rows || rows.length === 0) {
                console.warn('No fueltech data rows returned from API')
                return NextResponse.json(transformedData)
            }

            // Aggregate by region, fueltech, and time interval
            // Structure: { region: { fueltech: { timeKey: { ... } } } }
            const aggregated = {}

            // Debug: Log VIC solar_utility data
            const vicSolarRows = rows.filter(row => {
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : '')
                const fueltech = row.fueltech ? String(row.fueltech) : ''
                return region === 'VIC1' && fueltech === 'solar_utility'
            })
            if (vicSolarRows.length > 0) {
                console.log(`Found ${vicSolarRows.length} VIC solar_utility rows`)
                vicSolarRows.slice(0, 3).forEach(row => {
                    console.log('VIC solar_utility sample:', {
                        interval: row.interval,
                        energy: row.energy,
                        market_value: row.market_value,
                        region: row.region || row.network_region
                    })
                })
            } else {
                console.log('No VIC solar_utility rows found in data')
            }

            rows.forEach(row => {
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : 'UNKNOWN')
                const fueltech = row.fueltech ? String(row.fueltech) : null
                const rowInterval = row.interval
                const energy = row.energy // Energy in MWh
                const marketValue = row.market_value // Market value in $

                // Filter out invalid data
                if (!rowInterval || !fueltech || energy === undefined || marketValue === undefined ||
                    energy === null || marketValue === null) {
                    return
                }

                // Only filter out if both energy and marketValue are zero or negative
                // This allows periods with low but valid generation (e.g., winter solar)
                if (energy <= 0 && marketValue <= 0) {
                    return
                }

                // If we have market value but no energy, or vice versa, skip (data inconsistency)
                if ((energy <= 0 && marketValue > 0) || (energy > 0 && marketValue <= 0)) {
                    console.warn(`Data inconsistency for ${region} ${fueltech} at ${rowInterval}: energy=${energy}, marketValue=${marketValue}`)
                    return
                }

                // Only process solar_utility and wind
                if (fueltech !== 'solar_utility' && fueltech !== 'wind') {
                    return
                }

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                const timeKey = timestamp.toISOString()

                if (!aggregated[region]) {
                    aggregated[region] = {}
                }

                if (!aggregated[region][fueltech]) {
                    aggregated[region][fueltech] = {}
                }

                if (!aggregated[region][fueltech][timeKey]) {
                    aggregated[region][fueltech][timeKey] = {
                        timestamp: timestamp,
                        totalEnergy: 0,
                        totalMarketValue: 0
                    }
                }

                aggregated[region][fueltech][timeKey].totalEnergy += Number(energy)
                aggregated[region][fueltech][timeKey].totalMarketValue += Number(marketValue)
            })

            // Build baseload price lookup: { region: { timeKey: price } }
            const baseloadPriceLookup = {}
            if (baseloadPrices) {
                const baseloadRows = baseloadPrices.getRows()
                baseloadRows.forEach(row => {
                    const region = row.region ? String(row.region).toUpperCase() :
                        (row.network_region ? String(row.network_region).toUpperCase() : null)
                    const rowInterval = row.interval
                    const price = row.price

                    if (region && rowInterval && price !== undefined && price !== null) {
                        const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                        const timeKey = timestamp.toISOString()

                        if (!baseloadPriceLookup[region]) {
                            baseloadPriceLookup[region] = {}
                        }
                        baseloadPriceLookup[region][timeKey] = Number(price)
                    }
                })
            }

            // Calculate average prices and format data
            // Average price = total market value / total energy (weighted average)
            // Structure: { region: { fueltech: [{ ... }] } }
            Object.keys(aggregated).forEach(region => {
                transformedData.regions[region] = {}

                Object.keys(aggregated[region]).forEach(fueltech => {
                    transformedData.regions[region][fueltech] = []

                    Object.values(aggregated[region][fueltech]).forEach(agg => {
                        const avgPrice = agg.totalEnergy > 0 ? agg.totalMarketValue / agg.totalEnergy : 0
                        const timestamp = agg.timestamp
                        const timeKey = timestamp.toISOString()

                        // Get baseload price for this region and time period
                        const baseloadPrice = baseloadPriceLookup[region]?.[timeKey]
                        const percentageOfBaseload = baseloadPrice && baseloadPrice > 0
                            ? (avgPrice / baseloadPrice) * 100
                            : null

                        // Format the date label based on the interval
                        let dateLabel
                        if (interval === '1M' || interval === '3M' || interval === 'season' || interval === '1y' || interval === 'fy') {
                            dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
                        } else if (interval === '7d' || interval === '1d') {
                            dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                        } else {
                            dateLabel = timestamp.toLocaleDateString('en-AU', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                        }

                        transformedData.regions[region][fueltech].push({
                            date: timestamp.toISOString(),
                            label: dateLabel,
                            month: timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
                            year: timestamp.getFullYear(),
                            monthNum: timestamp.getMonth() + 1,
                            day: timestamp.getDate(),
                            price: avgPrice,
                            percentageOfBaseload: percentageOfBaseload,
                            baseloadPrice: baseloadPrice,
                            totalEnergy: agg.totalEnergy,
                            totalMarketValue: agg.totalMarketValue
                        })
                    })
                })
            })
        } else if (dataType === 'generator') {
            // Process generator/facility data: aggregate energy, market_value, power, and emissions for each facility
            // Note: Facility data is grouped by unit, so we need to aggregate across units for the same facility

            console.log('=== Processing Generator Data ===')
            console.log('Datatable exists:', !!datatable)

            if (!datatable) {
                console.warn('No datatable returned from API')
                return NextResponse.json({
                    ...transformedData,
                    error: 'No datatable returned from API'
                })
            }

            let rows = []
            try {
                if (typeof datatable.getRows === 'function') {
                    rows = datatable.getRows()
                } else {
                    console.warn('Datatable does not have getRows method')
                    return NextResponse.json({
                        ...transformedData,
                        error: 'Datatable structure is invalid'
                    })
                }
            } catch (rowsError) {
                console.error('Error getting rows from datatable:', rowsError)
                return NextResponse.json({
                    ...transformedData,
                    error: `Error accessing datatable rows: ${rowsError.message}`
                })
            }

            if (!rows || rows.length === 0) {
                console.warn('No generator data rows returned from API')
                return NextResponse.json({
                    ...transformedData,
                    warning: 'No data rows found for the specified facilities and date range'
                })
            }

            console.log(`=== Processing Generator Data: ${rows.length} rows ===`)

            // Log sample row to understand structure
            if (rows.length > 0) {
                console.log('Sample row structure:', {
                    keys: Object.keys(rows[0]),
                    sample: rows[0]
                })
                console.log('First 3 rows for analysis:', rows.slice(0, 3))

                // Log facility codes found in the data
                const facilityCodesInData = [...new Set(rows.map(row => row.facility_code || row.code || row.facility || 'UNKNOWN'))]
                console.log('Facility codes found in raw data:', facilityCodesInData)

                // Log what metrics are present
                const firstRow = rows[0]
                console.log('Metrics present in first row:', {
                    hasEnergy: 'energy' in firstRow,
                    hasMarketValue: 'market_value' in firstRow,
                    hasPower: 'power' in firstRow,
                    hasEmissions: 'emissions' in firstRow,
                    energyValue: firstRow.energy,
                    marketValueValue: firstRow.market_value,
                    powerValue: firstRow.power,
                    emissionsValue: firstRow.emissions
                })
            } else {
                console.warn('WARNING: No rows returned from API datatable!')
            }

            // Aggregate by facility code and time interval
            // Structure: { facilityCode: { timeKey: { ... } } }
            // Note: Data may be grouped by unit, so we aggregate across units for the same facility
            const aggregated = {}
            let skippedRows = 0
            const filteringStats = {
                missingInterval: 0,
                missingFacilityCode: 0,
                missingEnergy: 0,
                missingMarketValue: 0,
                zeroOrNegative: 0,
                dataInconsistency: 0,
                processed: 0
            }

            rows.forEach((row, index) => {
                // Try multiple possible column names for facility code
                // Note: The API returns unit_code, not facility_code directly
                // Extract facility code from unit_code (e.g., "BANGOWF1" -> "BANGOWF")
                const unitCode = row.unit_code || row.unit || null
                let facilityCode = row.facility_code || row.code || row.facility

                // If no facility_code but we have unit_code, extract facility from unit_code
                // Unit codes are typically like "FACILITY1", "FACILITY2", etc.
                if (!facilityCode && unitCode) {
                    // Remove trailing numbers to get facility code
                    facilityCode = unitCode.replace(/\d+$/, '')
                }

                if (!facilityCode) {
                    facilityCode = 'UNKNOWN'
                }

                const rowInterval = row.interval
                const energy = row.energy // Energy in MWh
                const marketValue = row.market_value // Market value in $
                const power = row.power // Power in MW
                const emissions = row.emissions // Emissions (units depend on API)
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : null)
                const unit = row.unit || row.unit_code || null // Unit information (for logging)

                // Filter out invalid data with detailed tracking
                if (!rowInterval) {
                    skippedRows++
                    filteringStats.missingInterval++
                    if (index < 5) {
                        console.warn(`Skipping row ${index}: missing interval`, { rowInterval, facilityCode })
                    }
                    return
                }

                if (!facilityCode || facilityCode === 'UNKNOWN') {
                    skippedRows++
                    filteringStats.missingFacilityCode++
                    if (index < 5) {
                        console.warn(`Skipping row ${index}: missing or unknown facility code`, { rowInterval, facilityCode })
                    }
                    return
                }

                // Don't require all metrics - some may be null/undefined
                // Convert to numbers, handling null/undefined/NaN properly
                const energyNum = energy != null && !isNaN(Number(energy)) ? Number(energy) : null
                const marketValueNum = marketValue != null && !isNaN(Number(marketValue)) ? Number(marketValue) : null
                const powerNum = power != null && !isNaN(Number(power)) ? Number(power) : null
                const emissionsNum = emissions != null && !isNaN(Number(emissions)) ? Number(emissions) : null

                // Skip rows where all metrics are null/undefined (no data at all)
                if (energyNum === null && marketValueNum === null && powerNum === null && emissionsNum === null) {
                    filteringStats.zeroOrNegative++
                    if (index < 5) {
                        console.warn(`Skipping row ${index}: all metrics are null/undefined`, { energy, marketValue, power, emissions, facilityCode })
                    }
                    return
                }

                // Row passed all filters - at least one metric has a value
                filteringStats.processed++

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)
                const timeKey = timestamp.toISOString()

                if (!aggregated[facilityCode]) {
                    aggregated[facilityCode] = {}
                }

                if (!aggregated[facilityCode][timeKey]) {
                    aggregated[facilityCode][timeKey] = {
                        timestamp: timestamp,
                        totalEnergy: 0,
                        totalMarketValue: 0,
                        totalPower: 0,
                        totalEmissions: 0,
                        region: region,
                        unitCount: 0, // Track how many units contributed to this aggregation
                        hasEnergy: false,
                        hasMarketValue: false,
                        hasPower: false,
                        hasEmissions: false
                    }
                }

                // Only add non-null values
                if (energyNum !== null) {
                    aggregated[facilityCode][timeKey].totalEnergy += energyNum
                    aggregated[facilityCode][timeKey].hasEnergy = true
                }
                if (marketValueNum !== null) {
                    aggregated[facilityCode][timeKey].totalMarketValue += marketValueNum
                    aggregated[facilityCode][timeKey].hasMarketValue = true
                }
                if (powerNum !== null) {
                    aggregated[facilityCode][timeKey].totalPower += powerNum
                    aggregated[facilityCode][timeKey].hasPower = true
                }
                if (emissionsNum !== null) {
                    aggregated[facilityCode][timeKey].totalEmissions += emissionsNum
                    aggregated[facilityCode][timeKey].hasEmissions = true
                }
                if (unit) {
                    aggregated[facilityCode][timeKey].unitCount++
                }
            })

            console.log(`=== Data Filtering Summary ===`)
            console.log(`Total rows processed: ${rows.length}`)
            console.log(`Rows passed filters: ${filteringStats.processed}`)
            console.log(`Rows skipped: ${skippedRows}`)
            console.log(`Filtering breakdown:`, filteringStats)

            console.log(`=== Aggregation Summary ===`)
            console.log(`Aggregated data for ${Object.keys(aggregated).length} facilities`)

            // Log detailed aggregation summary
            Object.keys(aggregated).forEach(facilityCode => {
                const timeKeys = Object.keys(aggregated[facilityCode])
                const totals = Object.values(aggregated[facilityCode]).reduce((acc, agg) => ({
                    energy: acc.energy + agg.totalEnergy,
                    marketValue: acc.marketValue + agg.totalMarketValue,
                    power: acc.power + agg.totalPower,
                    emissions: acc.emissions + agg.totalEmissions
                }), { energy: 0, marketValue: 0, power: 0, emissions: 0 })
                console.log(`Facility ${facilityCode}: ${timeKeys.length} time intervals, energy: ${totals.energy.toFixed(2)} MWh, market value: $${totals.marketValue.toFixed(2)}, power: ${totals.power.toFixed(2)} MW, emissions: ${totals.emissions.toFixed(2)}`)
            })

            // Format data with all 4 metrics
            // Structure: { facilityCode: [{ ... }] }
            Object.keys(aggregated).forEach(facilityCode => {
                transformedData.regions[facilityCode] = []

                Object.values(aggregated[facilityCode]).forEach(agg => {
                    const timestamp = agg.timestamp

                    // Format the date label based on the interval
                    let dateLabel
                    if (interval === '1M' || interval === '3M' || interval === 'season' || interval === '1y' || interval === 'fy') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
                    } else if (interval === '7d' || interval === '1d') {
                        dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                    } else {
                        dateLabel = timestamp.toLocaleDateString('en-AU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }

                    transformedData.regions[facilityCode].push({
                        date: timestamp.toISOString(),
                        label: dateLabel,
                        month: timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
                        year: timestamp.getFullYear(),
                        monthNum: timestamp.getMonth() + 1,
                        day: timestamp.getDate(),
                        // Only include metrics that have data (not null)
                        energy: agg.hasEnergy ? agg.totalEnergy : null,
                        market_value: agg.hasMarketValue ? agg.totalMarketValue : null,
                        power: agg.hasPower ? agg.totalPower : null,
                        emissions: agg.hasEmissions ? agg.totalEmissions : null,
                        region: agg.region
                    })
                })
            })
        } else {
            // Process market price data (existing logic)
            const rows = datatable.getRows()

            rows.forEach(row => {
                // Get region from the row - the column is called 'region'
                const region = row.region ? String(row.region).toUpperCase() :
                    (row.network_region ? String(row.network_region).toUpperCase() : 'UNKNOWN')

                const rowInterval = row.interval // This is a Date object
                const price = row.price

                if (!rowInterval || price === undefined || price === null) {
                    console.warn('Skipping row with missing data:', { region, rowInterval, price })
                    return
                }

                const timestamp = rowInterval instanceof Date ? rowInterval : new Date(rowInterval)

                if (!transformedData.regions[region]) {
                    transformedData.regions[region] = []
                }

                // Format the date label based on the interval
                let dateLabel
                if (interval === '1M' || interval === '3M' || interval === 'season' || interval === '1y' || interval === 'fy') {
                    // For monthly/quarterly/yearly intervals, use month format
                    dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
                } else if (interval === '7d') {
                    // For weekly intervals, use week format
                    dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                } else if (interval === '1d') {
                    // For daily intervals, use day format
                    dateLabel = timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
                } else {
                    // For hourly/5-minute intervals, use full datetime format
                    dateLabel = timestamp.toLocaleDateString('en-AU', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }

                transformedData.regions[region].push({
                    date: timestamp.toISOString(),
                    label: dateLabel,
                    month: timestamp.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }),
                    year: timestamp.getFullYear(),
                    monthNum: timestamp.getMonth() + 1,
                    day: timestamp.getDate(),
                    price: price
                })
            })
        }

        // Sort each region's data by date
        Object.keys(transformedData.regions).forEach(region => {
            if (dataType === 'fueltech') {
                // For fueltech data, sort each fueltech's data
                Object.keys(transformedData.regions[region]).forEach(fueltech => {
                    transformedData.regions[region][fueltech].sort((a, b) => {
                        return a.year !== b.year
                            ? a.year - b.year
                            : a.monthNum - b.monthNum
                    })
                })
            } else if (dataType === 'generator') {
                // For generator data, sort the array directly (facility code is the key)
                transformedData.regions[region].sort((a, b) => {
                    return a.year !== b.year
                        ? a.year - b.year
                        : a.monthNum - b.monthNum
                })
            } else {
                // For market data, sort the array directly
                transformedData.regions[region].sort((a, b) => {
                    return a.year !== b.year
                        ? a.year - b.year
                        : a.monthNum - b.monthNum
                })
            }
        })

        return NextResponse.json(transformedData)

    } catch (error) {
        console.error('Error fetching from Open Electricity API:', error)
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            statusCode: error.statusCode,
            response: error.response,
            details: error.details
        })

        // Handle specific error types from the library
        if (error instanceof NoDataFound) {
            return NextResponse.json(
                { error: 'No data found for the requested date range', details: error.message },
                { status: 404 }
            )
        }

        if (error instanceof OpenElectricityError) {
            return NextResponse.json(
                {
                    error: error.message,
                    details: error.details,
                    statusCode: error.statusCode,
                    response: error.response
                },
                { status: error.statusCode || 500 }
            )
        }

        // Handle generic errors
        return NextResponse.json(
            {
                error: 'Failed to fetch data from Open Electricity API',
                details: error.message,
                type: error.constructor.name
            },
            { status: 500 }
        )
    }
}
