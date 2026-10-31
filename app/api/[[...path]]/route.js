import { handleApi } from '@/lib/server/api'
import { preflight } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function OPTIONS(request) {
  return preflight(request)
}

async function dispatch(request, context) {
  const { path = [] } = await context.params
  const route = `/${path.join('/')}`
  return handleApi(request, route)
}

export const GET = dispatch
export const POST = dispatch
export const PUT = dispatch
export const DELETE = dispatch
export const PATCH = dispatch
