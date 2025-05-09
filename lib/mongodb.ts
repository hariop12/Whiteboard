import { MongoClient } from "mongodb"

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env")
}

const uri = process.env.MONGODB_URI

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export function getMongoClient() {
  return clientPromise
}

export async function connectToDatabase() {
  const client = await clientPromise
  const db = client.db()
  return { client, db }
}
