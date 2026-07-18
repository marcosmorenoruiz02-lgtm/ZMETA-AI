// Plantillas de alertas proactivas ("Trend Catching") para ZMETA-AI.
// Variante A (Tendencia) y Variante B (Rendimiento).

export const ALERT_TEMPLATES = {
  trend: [
    {
      title: 'Detectado pico de tracción',
      build: (topic) =>
        `Detectado pico de tracción en tu nicho sobre ${topic} en las últimas 3 horas. Tu competencia no ha publicado. Diseña un gancho viral ahora.`,
    },
    {
      title: 'Ventana de oportunidad abierta',
      build: (topic) =>
        `El engagement sobre "${topic}" está subiendo un 62% respecto a la media semanal. Es el momento óptimo para publicar tu gancho.`,
    },
    {
      title: 'Conversación emergente',
      build: (topic) =>
        `Nueva conversación viral emergiendo alrededor de "${topic}". Los primeros en entrar capturan el 80% del alcance. Actúa ya.`,
    },
  ],
  performance: [
    {
      title: 'Rendimiento Anómalo Positivo',
      build: () =>
        'Tu publicación de las 14:00 está rindiendo un 40% mejor de lo normal; activa el hilo de retención secundario ya.',
    },
    {
      title: 'Curva de retención al alza',
      build: () =>
        'Tu último tweet supera el ratio de guardado habitual x2. Refuerza con un segundo gancho en los próximos 30 min.',
    },
    {
      title: 'Momentum detectado',
      build: () =>
        'Tres de tus últimos ganchos superan el 85% de fuerza. Encadena una serie temtica para consolidar autoridad.',
    },
  ],
}

export function buildAlerts(topic = 'tu nicho') {
  const t = ALERT_TEMPLATES.trend[Math.floor(Math.random() * ALERT_TEMPLATES.trend.length)]
  const p = ALERT_TEMPLATES.performance[Math.floor(Math.random() * ALERT_TEMPLATES.performance.length)]
  return [
    { id: `trend-${Date.now()}`, type: 'trend', title: t.title, message: t.build(topic) },
    { id: `perf-${Date.now()}`, type: 'performance', title: p.title, message: p.build() },
  ]
}
