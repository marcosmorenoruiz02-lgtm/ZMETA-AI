import { NextResponse } from 'next/server'
import {
  alerts,
  analyzeAndGenerate,
  bookmarkOptimize,
  bookmarkScore,
  history,
  metrics,
  rewrite,
  root,
  textTemplate,
  visionGenerate,
} from '@/lib/server/handlers/content'
import { analyzeInstagram, downloadInstagram, proxyInstagram } from '@/lib/server/handlers/instagram'
import { createPerformance, deletePerformance, listPerformance, performanceFromUrl } from '@/lib/server/handlers/performance'
import { createSchedule, deleteSchedule, listSchedule } from '@/lib/server/handlers/schedule'
import { json, publicMessage, readJson, withCors } from '@/lib/server/http'

async function dispatch(request, route) {
  const method = request.method
  const body = method === 'POST' ? await readJson(request) : null

  if ((route === '/' || route === '/root') && method === 'GET') return root()
  if (route === '/alerts' && method === 'GET') return alerts(request)
  if (route === '/metrics' && method === 'GET') return metrics()
  if (route === '/history' && method === 'GET') return history()
  if (route === '/analyze-and-generate' && method === 'POST') return analyzeAndGenerate(body)
  if (route === '/vision-generate' && method === 'POST') return visionGenerate(body)
  if (route === '/bookmark-score' && method === 'POST') return bookmarkScore(body)
  if (route === '/bookmark-optimize' && method === 'POST') return bookmarkOptimize(body)
  if (route === '/text-template' && method === 'POST') return textTemplate(body)
  if (route === '/rewrite' && method === 'POST') return rewrite(body)
  if (route === '/schedule' && method === 'POST') return createSchedule(body)
  if (route === '/schedule' && method === 'GET') return listSchedule()
  if (route === '/schedule' && method === 'DELETE') return deleteSchedule(request)
  if (route === '/performance/from-url' && method === 'POST') return performanceFromUrl(body)
  if (route === '/performance' && method === 'POST') return createPerformance(body)
  if (route === '/performance' && method === 'GET') return listPerformance()
  if (route === '/performance' && method === 'DELETE') return deletePerformance(request)
  if (route === '/instagram/download' && method === 'POST') return downloadInstagram(body)
  if (route === '/instagram/proxy' && method === 'GET') return proxyInstagram(request)
  if (route === '/instagram/analyze' && method === 'POST') return analyzeInstagram(body)
  return json({ error: `Route ${route} not found` }, 404)
}

export async function handleApi(request, route) {
  try {
    const response = await dispatch(request, route)
    return withCors(response, request)
  } catch (error) {
    console.error('API Error:', error?.message || error)
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500
    return withCors(NextResponse.json({ error: publicMessage(error) }, { status }), request)
  }
}
