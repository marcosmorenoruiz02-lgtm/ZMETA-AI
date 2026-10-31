import { MongoClient } from 'mongodb'

const globalCache = globalThis

function cache() {
  if (!globalCache.__zmetaMongo) globalCache.__zmetaMongo = { promise: null }
  return globalCache.__zmetaMongo
}

export async function getDb() {
  const url = process.env.MONGO_URL
  const name = process.env.DB_NAME
  if (!url || !name) {
    const err = new Error('Faltan MONGO_URL o DB_NAME en el entorno.')
    err.status = 500
    throw err
  }
  const slot = cache()
  if (!slot.promise) {
    slot.promise = (async () => {
      const client = new MongoClient(url, { serverSelectionTimeoutMS: 8000 })
      await client.connect()
      return client.db(name)
    })().catch((error) => {
      slot.promise = null
      const err = new Error('No se pudo conectar con la base de datos.')
      err.status = 503
      err.cause = error
      throw err
    })
  }
  return slot.promise
}

export async function getMetrics(database) {
  const doc = await database.collection('metrics').findOne({ _id: 'global' })
  const posts = doc?.posts || 0
  const diagnostics = doc?.diagnostics || 0
  return { posts, diagnostics, hours_saved: Math.round((posts * 0.5 + diagnostics * 0.25) * 100) / 100 }
}

export async function bumpMetrics(database, posts = 0, diagnostics = 0) {
  await database.collection('metrics').updateOne({ _id: 'global' }, { $inc: { posts, diagnostics } }, { upsert: true })
  return getMetrics(database)
}
