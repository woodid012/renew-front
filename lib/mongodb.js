// lib/mongodb.js
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise

if (!uri) {
  // Don't throw at module load time - let the API route handle the error
  console.warn('MONGODB_URI is not set. MongoDB operations will fail.')
  // Create a rejected promise that will be caught by API routes
  clientPromise = Promise.reject(new Error('MONGODB_URI environment variable is not set. Please add it to .env.local'))
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise