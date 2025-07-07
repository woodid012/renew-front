import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const database = client.db('renew') // Replace with your database name
    const collection = database.collection('CONFIG_Defaults')

    const configDoc = await collection.findOne({}) // Assuming one document for defaults

    if (!configDoc) {
      return NextResponse.json({ error: 'CONFIG_Defaults document not found' }, { status: 404 })
    }

    const defaults = Object.keys(configDoc).filter(key => key !== '_id').map(key => {
      let options = null
      // Infer options based on known fields from config.py
      if (key === 'DEFAULT_CAPEX_FUNDING_TYPE') {
        options = ['equity_first', 'pari_passu']
      } else if (key === 'DEFAULT_DEBT_REPAYMENT_FREQUENCY') {
        options = ['monthly', 'quarterly']
      } else if (key === 'DEFAULT_DEBT_GRACE_PERIOD') {
        options = ['none', 'full_period']
      } else if (key === 'DEFAULT_DEBT_SIZING_METHOD') {
        options = ['dscr', 'annuity']
      } else if (key === 'DSCR_CALCULATION_FREQUENCY') {
        options = ['monthly', 'quarterly']
      }

      return {
        name: key,
        currentValue: String(configDoc[key]),
        options: options,
      }
    })

    return NextResponse.json(defaults)
  } catch (error) {
    console.error('Error fetching defaults from MongoDB:', error)
    return NextResponse.json({ error: 'Could not fetch defaults from database' }, { status: 500 })
  }
}