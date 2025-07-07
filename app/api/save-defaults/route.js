import { NextResponse } from 'next/server'
import clientPromise from '../../../lib/mongodb'

export async function POST(request) {
  const { defaults } = await request.json()

  try {
    const client = await clientPromise
    const database = client.db('renew') // Replace with your database name
    const collection = database.collection('CONFIG_Defaults')

    const updateDoc = {}
    defaults.forEach(setting => {
      let valueToSave = setting.currentValue
      // Convert to appropriate types if necessary
      if (valueToSave === 'true') valueToSave = true
      else if (valueToSave === 'false') valueToSave = false
      else if (!isNaN(valueToSave) && valueToSave !== '') valueToSave = Number(valueToSave)
      else if (valueToSave === 'null') valueToSave = null

      updateDoc[setting.name] = valueToSave
    })

    const result = await collection.findOneAndUpdate(
      {},
      { $set: updateDoc },
      { upsert: true, returnDocument: 'after' } // upsert: true creates the document if it doesn't exist
    )

    if (result) {
      return NextResponse.json({ message: 'Config updated successfully' })
    } else {
      return NextResponse.json({ error: 'Could not update config in database' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating config in MongoDB:', error)
    return NextResponse.json({ error: 'Could not update config in database' }, { status: 500 })
  } finally {
    await client.close()
  }
}