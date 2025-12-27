import { NextResponse } from 'next/server'
import { OpenElectricityClient, makeAware, OpenElectricityError, NoDataFound } from 'openelectricity'

// Asset Analysis API - Aggregates generator data with market context
// Combines: generator performance, market prices, demand/supply, curtailment
//
// API Reference Documentation:
// - Overview: https://docs.openelectricity.org.au/api-reference/overview
// - Data Limits: https://docs.openelectricity.org.au/api-reference/data-limits
// - Facilities: https://docs.openelectricity.org.au/api-reference/facilities

export async function GET(request) {
    const { searchParams } = new URL(request.url)

    // Parameters
    const facilityCode = searchParams.get('facility_code') || 'WAUBRAWF'
    const dateParam = searchParams.get('date') // Format: YYYY-MM-DD
    const interval = searchParams.get('interval') || '5m'

    // Default to yesterday if no date provided
    const targetDate = dateParam ? new Date(dateParam) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dateStart = targetDate.toISOString().split('T')[0]

    // End date is the next day
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + 1)
    const dateEnd = endDate.toISOString().split('T')[0]

    const apiKey = process.env.OPEN_ELECTRICITY_API_KEY || 'oe_3ZMYh2P6b93uKsZV3tMETp6w'

    if (!apiKey) {
        return NextResponse.json(
            { error: 'Open Electricity API key not configured' },
            { status: 500 }
        )
    }

    try {
        const client = new OpenElectricityClient({
            apiKey: apiKey,
            baseUrl: 'https://api.openelectricity.org.au/v4'
        })

        // Make date strings timezone-aware for NEM (AEST/UTC+10)
        const dateStartAware = makeAware(`${dateStart}T00:00:00`, 'NEM')
        const dateEndAware = makeAware(`${dateEnd}T00:00:00`, 'NEM')

        console.log(`Asset Analysis: ${facilityCode} from ${dateStart} to ${dateEnd} at ${interval} interval`)

        // First, get facility info to determine the region
        let facilityRegion = null
        try {
            const { response: facilitiesResponse } = await client.getFacilities({
                network_id: 'NEM',
                facility_code: facilityCode
            })

            if (facilitiesResponse?.data && facilitiesResponse.data.length > 0) {
                facilityRegion = facilitiesResponse.data[0].network_region || facilitiesResponse.data[0].region
                console.log(`Facility ${facilityCode} is in region: ${facilityRegion}`)
            }
        } catch (facError) {
            console.warn('Could not fetch facility info:', facError.message)
        }

        // If region not found from facility, default to VIC1 for WAUBRAWF
        if (!facilityRegion) {
            facilityRegion = facilityCode === 'WAUBRAWF' ? 'VIC1' : 'NSW1'
            console.log(`Using default region: ${facilityRegion}`)
        }

        // Fetch all data in parallel
        const [generatorResult, marketResult, demandResult, supplyResult, curtailmentResult] = await Promise.allSettled([
            // 1. Generator data
            client.getFacilityData('NEM', facilityCode, ['energy', 'market_value', 'power', 'emissions'], {
                interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware
            }),

            // 2. Market prices
            client.getMarket('NEM', ['price'], {
                interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware,
                primaryGrouping: 'network_region'
            }),

            // 3. Demand data
            client.getMarket('NEM', ['demand', 'demand_energy'], {
                interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware,
                primaryGrouping: 'network_region'
            }),

            // 4. Supply by fueltech
            client.getNetworkData('NEM', ['energy'], {
                interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware,
                primaryGrouping: 'network_region',
                secondaryGrouping: ['fueltech_group']
            }),

            // 5. Curtailment
            client.getMarket('NEM', ['curtailment_wind_energy', 'curtailment_solar_utility_energy'], {
                interval,
                dateStart: dateStartAware,
                dateEnd: dateEndAware,
                primaryGrouping: 'network_region'
            })
        ])

        // Process generator data
        const generatorData = {}
        if (generatorResult.status === 'fulfilled' && generatorResult.value.datatable) {
            const rows = generatorResult.value.datatable.getRows()
            console.log(`Generator: ${rows.length} rows`)

            rows.forEach(row => {
                // Extract facility code from unit_code
                const unitCode = row.unit_code || row.unit || ''
                let rowFacilityCode = row.facility_code || unitCode.replace(/\d+$/, '') || facilityCode

                if (rowFacilityCode !== facilityCode) return

                const timestamp = row.interval instanceof Date ? row.interval.toISOString() : new Date(row.interval).toISOString()

                if (!generatorData[timestamp]) {
                    generatorData[timestamp] = { energy: 0, market_value: 0, power: 0, emissions: 0 }
                }

                // Aggregate across units
                if (row.energy != null) generatorData[timestamp].energy += Number(row.energy)
                if (row.market_value != null) generatorData[timestamp].market_value += Number(row.market_value)
                if (row.power != null) generatorData[timestamp].power += Number(row.power)
                if (row.emissions != null) generatorData[timestamp].emissions += Number(row.emissions)
            })
        }

        // Process market prices
        const marketData = {}
        if (marketResult.status === 'fulfilled' && marketResult.value.datatable) {
            const rows = marketResult.value.datatable.getRows()
            console.log(`Market: ${rows.length} rows`)

            rows.forEach(row => {
                const region = (row.region || row.network_region || '').toUpperCase()
                if (region !== facilityRegion.toUpperCase()) return

                const timestamp = row.interval instanceof Date ? row.interval.toISOString() : new Date(row.interval).toISOString()
                marketData[timestamp] = { price: Number(row.price) || 0 }
            })
        }

        // Process demand data
        const demandData = {}
        if (demandResult.status === 'fulfilled' && demandResult.value.datatable) {
            const rows = demandResult.value.datatable.getRows()
            console.log(`Demand: ${rows.length} rows`)

            rows.forEach(row => {
                const region = (row.region || row.network_region || '').toUpperCase()
                if (region !== facilityRegion.toUpperCase()) return

                const timestamp = row.interval instanceof Date ? row.interval.toISOString() : new Date(row.interval).toISOString()
                demandData[timestamp] = {
                    demand: Number(row.demand) || 0,
                    demand_energy: Number(row.demand_energy) || 0
                }
            })
        }

        // Process supply data
        const supplyData = {}
        if (supplyResult.status === 'fulfilled' && supplyResult.value.datatable) {
            const rows = supplyResult.value.datatable.getRows()
            console.log(`Supply: ${rows.length} rows`)

            rows.forEach(row => {
                const region = (row.region || row.network_region || '').toUpperCase()
                if (region !== facilityRegion.toUpperCase()) return

                const timestamp = row.interval instanceof Date ? row.interval.toISOString() : new Date(row.interval).toISOString()
                const fueltechGroup = row.fueltech_group || row.fueltech || 'other'

                if (!supplyData[timestamp]) {
                    supplyData[timestamp] = {}
                }
                supplyData[timestamp][fueltechGroup] = (supplyData[timestamp][fueltechGroup] || 0) + Number(row.energy || 0)
            })
        }

        // Process curtailment data
        const curtailmentData = {}
        if (curtailmentResult.status === 'fulfilled' && curtailmentResult.value.datatable) {
            const rows = curtailmentResult.value.datatable.getRows()
            console.log(`Curtailment: ${rows.length} rows`)

            rows.forEach(row => {
                const region = (row.region || row.network_region || '').toUpperCase()
                if (region !== facilityRegion.toUpperCase()) return

                const timestamp = row.interval instanceof Date ? row.interval.toISOString() : new Date(row.interval).toISOString()
                curtailmentData[timestamp] = {
                    wind: Number(row.curtailment_wind_energy) || 0,
                    solar: Number(row.curtailment_solar_utility_energy) || 0
                }
            })
        }

        // Get all unique timestamps and sort them
        const allTimestamps = new Set([
            ...Object.keys(generatorData),
            ...Object.keys(marketData),
            ...Object.keys(demandData)
        ])

        const sortedTimestamps = Array.from(allTimestamps).sort()

        // Build combined data points
        const dataPoints = sortedTimestamps.map(timestamp => ({
            timestamp,
            generator: generatorData[timestamp] || { energy: null, market_value: null, power: null, emissions: null },
            market: marketData[timestamp] || { price: null },
            demand: demandData[timestamp] || { demand: null, demand_energy: null },
            supply: supplyData[timestamp] || {},
            curtailment: curtailmentData[timestamp] || { wind: null, solar: null }
        }))

        // Log errors from any failed requests
        const errors = []
        if (generatorResult.status === 'rejected') errors.push({ source: 'generator', error: generatorResult.reason?.message })
        if (marketResult.status === 'rejected') errors.push({ source: 'market', error: marketResult.reason?.message })
        if (demandResult.status === 'rejected') errors.push({ source: 'demand', error: demandResult.reason?.message })
        if (supplyResult.status === 'rejected') errors.push({ source: 'supply', error: supplyResult.reason?.message })
        if (curtailmentResult.status === 'rejected') errors.push({ source: 'curtailment', error: curtailmentResult.reason?.message })

        if (errors.length > 0) {
            console.warn('Some API calls failed:', errors)
        }

        return NextResponse.json({
            success: true,
            facility: facilityCode,
            region: facilityRegion,
            date: dateStart,
            interval,
            dataPoints,
            summary: {
                totalDataPoints: dataPoints.length,
                generatorDataPoints: Object.keys(generatorData).length,
                marketDataPoints: Object.keys(marketData).length,
                demandDataPoints: Object.keys(demandData).length,
                supplyDataPoints: Object.keys(supplyData).length,
                curtailmentDataPoints: Object.keys(curtailmentData).length
            },
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error) {
        console.error('Asset Analysis API error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch asset analysis data',
                details: error.message
            },
            { status: 500 }
        )
    }
}
