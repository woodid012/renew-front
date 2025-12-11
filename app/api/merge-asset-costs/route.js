// app/api/merge-asset-costs/route.js
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const assetCosts = {
  "Templers BESS": {
    "operatingCosts": 4.06,
    "operatingCostEscalation": 2.5,
    "terminalValue": 51,
    "capex": 238.6,
    "maxGearing": 0.65,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.65,
    "debtStructure": "sculpting"
  },
  "Solar River Solar": {
    "operatingCosts": 3.25,
    "operatingCostEscalation": 2.5,
    "terminalValue": 0,
    "capex": 208.3,
    "maxGearing": 0.7,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 22,
    "calculatedGearing": 0.7,
    "debtStructure": "sculpting"
  },
  "Solar River BESS": {
    "operatingCosts": 10.01,
    "operatingCostEscalation": 2.5,
    "terminalValue": 119,
    "capex": 500,
    "maxGearing": 0.7,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.7,
    "debtStructure": "sculpting"
  },
  "Wagga North": {
    "operatingCosts": 3.23,
    "operatingCostEscalation": 2.5,
    "terminalValue": 49,
    "capex": 246.8,
    "maxGearing": 0.65,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.65,
    "debtStructure": "sculpting"
  },
  "North Yarragon": {
    "operatingCosts": 6.05,
    "operatingCostEscalation": 2.5,
    "terminalValue": 97,
    "capex": 512.7,
    "maxGearing": 0.65,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.65,
    "debtStructure": "sculpting"
  },
  "Noblevale": {
    "operatingCosts": 5.19,
    "operatingCostEscalation": 2.5,
    "terminalValue": 83,
    "capex": 296.6,
    "maxGearing": 0.65,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.65,
    "debtStructure": "sculpting"
  },
  "Hookey Creek (BESS)": {
    "operatingCosts": 5.95,
    "operatingCostEscalation": 2.5,
    "terminalValue": 93,
    "capex": 452.7,
    "maxGearing": 0.65,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 1.8,
    "interestRate": 0.06,
    "tenorYears": 20,
    "calculatedGearing": 0.65,
    "debtStructure": "sculpting"
  },
  "Yarraville": {
    "capex": 141.5,
    "operatingCosts": 2.2,
    "operatingCostEscalation": 2.5,
    "terminalValue": 32,
    "maxGearing": 0.7,
    "targetDSCRContract": 1.4,
    "targetDSCRMerchant": 2,
    "interestRate": 0.06,
    "tenorYears": 18,
    "debtStructure": "sculpting",
    "calculatedGearing": 0.7
  }
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('renew_assets')
    const collection = db.collection('CONFIG_Asset_Inputs')

    let updatedCount = 0;
    for (const assetName in assetCosts) {
      const costs = assetCosts[assetName];
      const result = await collection.updateOne(
        { name: assetName },
        { $set: costs }
      );
      updatedCount += result.modifiedCount;
    }

    return NextResponse.json({ success: true, message: `${updatedCount} documents updated successfully.` })

  } catch (error) {
    console.error('Data merge failed:', error);
    return NextResponse.json({ error: 'Data merge failed', details: error.message }, { status: 500 })
  }
}
