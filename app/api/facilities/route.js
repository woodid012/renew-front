
import { NextResponse } from 'next/server'
import { OpenElectricityClient, OpenElectricityError } from 'openelectricity'

// Open Electricity API proxy route for fetching facilities list
// This avoids CORS issues when calling the external API from the frontend
//
// API Reference Documentation:
// - Overview: https://docs.openelectricity.org.au/api-reference/overview
// - Facilities: https://docs.openelectricity.org.au/api-reference/facilities
//
// If the API/code is getting confused, refer to the above documentation to see what options are available.

export async function GET(request) {
    const { searchParams } = new URL(request.url)

    // Optional filters
    const statusId = searchParams.get('status_id')
    const fueltechId = searchParams.get('fueltech_id')
    const networkId = searchParams.get('network_id')
    const networkRegion = searchParams.get('network_region')

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

        // Build params object
        const params = {}
        if (statusId) {
            params.status_id = statusId.split(',').filter(Boolean)
        }
        if (fueltechId) {
            params.fueltech_id = fueltechId.split(',').filter(Boolean)
        }
        if (networkId) {
            params.network_id = networkId.split(',').filter(Boolean)
        }
        if (networkRegion) {
            params.network_region = networkRegion
        }

        // Fetch facilities - returns { response, table } where table is a RecordTable
        const { response, table } = await client.getFacilities(params)

        // Extract rows from the table response
        let facilities = []
        if (table) {
            if (Array.isArray(table)) {
                facilities = table
            } else if (typeof table.getRows === 'function') {
                facilities = table.getRows()
            } else if (typeof table.toArray === 'function') {
                facilities = table.toArray()
            } else if (table.rows) {
                facilities = table.rows
            }
        }

        // Transform facilities to our expected format
        if (facilities.length > 0) {
            facilities = facilities.map(row => {
                // Map from OpenElectricity API fields (which appear to be flat unit-level records)
                const code = row.facility_code || row.code
                const name = row.facility_name || row.name
                const network = row.facility_network || row.network
                const networkRegion = row.facility_region || row.network_region

                // Unit specific fields
                const fueltech = row.unit_fueltech || row.fueltech
                const status = row.unit_status || row.status
                const capacity = row.unit_capacity ? Number(row.unit_capacity) : (row.capacity ? Number(row.capacity) : null)

                // Location might not be directly available, try generic fields
                const location = row.location || row.address || null

                // Derive fueltechGroup
                let fueltechGroup = row.fueltech_group || row.fueltechGroup || null
                if (!fueltechGroup && fueltech) {
                    // Derive fueltech group from fueltech if not provided
                    const ft = fueltech.toLowerCase()
                    if (ft.includes('solar')) fueltechGroup = 'solar'
                    else if (ft.includes('wind')) fueltechGroup = 'wind'
                    else if (ft.includes('hydro') || ft.includes('water')) fueltechGroup = 'hydro'
                    else if (ft.includes('coal')) fueltechGroup = 'coal'
                    else if (ft.includes('gas')) fueltechGroup = 'gas'
                    else if (ft.includes('battery') || ft.includes('storage')) fueltechGroup = 'storage'
                    else if (ft.includes('oil')) fueltechGroup = 'oil'
                    else fueltechGroup = 'other'
                }

                // Only determine renewable if we have fueltech data
                let renewable = null
                if (fueltech) {
                    const renewableFueltechs = ['solar', 'wind', 'hydro', 'battery', 'solar_utility', 'solar_rooftop', 'wind_onshore', 'wind_offshore', 'hydro_water', 'pumps']
                    const isRenewable = renewableFueltechs.some(rt => fueltech.toLowerCase().includes(rt.toLowerCase()))
                    renewable = isRenewable ? 'renewable' : 'non-renewable'
                }

                return {
                    code,
                    name,
                    network,
                    networkRegion,
                    fueltech,
                    fueltechGroup,
                    status,
                    renewable,
                    capacity,
                    location
                }
            })
        }

        // Filter out facilities without codes
        facilities = facilities.filter(f => !!f.code)

        // Deduplicate by code (aggregating capacity)
        const uniqueFacilities = new Map()
        facilities.forEach(f => {
            if (!uniqueFacilities.has(f.code)) {
                uniqueFacilities.set(f.code, f)
            } else {
                // If facility already exists, add capacity if available
                const existing = uniqueFacilities.get(f.code)
                if (f.capacity && existing.capacity) {
                    existing.capacity += f.capacity
                } else if (f.capacity) {
                    existing.capacity = f.capacity
                }
            }
        })
        facilities = Array.from(uniqueFacilities.values())

        return NextResponse.json({
            success: true,
            facilities: facilities
        })

    } catch (error) {
        console.error('Error fetching facilities from Open Electricity API:', error)

        // Handle specific error types from the library
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
                error: 'Failed to fetch facilities from Open Electricity API',
                details: error.message,
                type: error.constructor.name
            },
            { status: 500 }
        )
    }
}
