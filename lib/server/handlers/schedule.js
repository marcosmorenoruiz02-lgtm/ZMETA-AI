import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/server/db'
import { fail, json } from '@/lib/server/http'

function bounded(value, max, label) {
  const text = String(value ?? '').trim()
  if (text.length > max) throw fail(`${label} es demasiado largo (máx. ${max} caracteres).`, 400)
  return text
}

export async function createSchedule(body) {
  const text = bounded(body?.text, 8000, 'El texto')
  if (!text) throw fail("El campo 'text' es obligatorio", 400)
  const hasMedia = !!body?.hasMedia
  const style = bounded(body?.style, 80, 'El estilo')
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 3600 * 1000)
  if (Number.isNaN(scheduledAt.getTime())) throw fail('La fecha de programación no es válida.', 400)
  const draft = { id: uuidv4(), text, hasMedia, style, scheduledAt, status: 'scheduled', createdAt: new Date() }
  const database = await getDb()
  await database.collection('scheduled').insertOne({ ...draft })
  const count = await database.collection('scheduled').countDocuments({ status: 'scheduled' })
  const { _id, ...clean } = draft
  return json({ draft: clean, count })
}

export async function listSchedule() {
  const items = await (await getDb()).collection('scheduled').find({}).sort({ scheduledAt: 1 }).limit(50).toArray()
  const cleaned = items.map(({ _id, ...rest }) => rest)
  return json({ items: cleaned, count: cleaned.length })
}

export async function deleteSchedule(request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!id) throw fail("Falta el parámetro 'id'", 400)
  if (!/^[\w-]{8,80}$/.test(id)) throw fail('Identificador no válido.', 400)
  const database = await getDb()
  await database.collection('scheduled').deleteOne({ id })
  const count = await database.collection('scheduled').countDocuments({ status: 'scheduled' })
  return json({ ok: true, count })
}
