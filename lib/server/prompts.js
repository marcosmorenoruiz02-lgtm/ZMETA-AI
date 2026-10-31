export const NO_EVIDENCE = 'No hay suficiente evidencia para determinar este aspecto.'

export const SCORE_SPEC = `Para CADA tweet generado calcula un SCORE DE VIRALIDAD PREDICTIVO realista:
  - hookStrength: entero 0-100 (fuerza del gancho en la primera línea)
  - retention: "Alta" | "Media" | "Baja"
  - weakPoint: una frase corta señalando el punto débil o mayor área de mejora`

export const COPY_RULES = `REGLAS DE COPY PARA X (obligatorias):
  - Cada tweet DEBE caber en 280 caracteres como máximo.
  - Si la idea necesita más espacio, divídela en un HILO: rellena el campo "thread" (array de strings, cada uno ≤280 chars) donde thread[0] es el gancho y el resto continúa; deja "text" igual a thread[0]. Si el tweet cabe en 280, "thread" debe ser [] (array vacío).
  - NO incluyas placeholders como [IMAGEN], [VIDEO], [LINK], [ADJUNTO].
  - Aplica disparadores de viralidad: pattern interrupt, brecha de curiosidad, polarización, controversia o sarcasmo afilado, orientados al crecimiento de la cuenta.
  - Añade a cada objeto de generatedTweets el campo "thread" (array, vacío por defecto).`

export const GROWTH_SPEC = `MECÁNICAS DE CRECIMIENTO VIRAL (añádelas SIEMPRE al JSON):
  - Añade a CADA objeto de "generatedTweets" el campo "firstSelfReply": una autorespuesta breve (≤280) para publicar tú mismo justo debajo del post y arrancar los comentarios (dato extra, pregunta abierta o CTA que invite a responder).
  - Añade al NIVEL RAÍZ del JSON un objeto "growth" con esta forma EXACTA:
    "growth": {
      "topBanners": ["TITULAR 1 EN MAYÚSCULAS", "TITULAR 2 EN MAYÚSCULAS", "TITULAR 3 EN MAYÚSCULAS"],
      "loopOutro": "frase de cierre que conecta el final del contenido con su primer segundo para maximizar el loop y el watch time",
      "replyStrategy": "consejo de 1 frase para maximizar el ratio de respuestas/debate"
    }
  Los topBanners son ganchos de overlay para video: cortos, punchy, en MAYÚSCULAS.`

const PERSONALITY_SCHEMA = `{
  "tono_general":"", "nivel_humor":"", "nivel_ironia":"", "nivel_sarcasmo":"", "nivel_critica":"",
  "nivel_emocional":"", "tipo_argumentacion":"", "ritmo_escritura":"", "estructura_habitual":"",
  "vocabulario_recurrente":"", "expresiones_favoritas":"", "uso_hashtags":"", "uso_emojis":"",
  "call_to_action":"", "objetivo_principal":"", "tipo_contenido":"", "valores_recurrentes":"",
  "emociones_predominantes":"", "estilo_visual":"", "estilo_multimedia":"", "consistencia_editorial":"",
  "nivel_polarizacion":"", "personalidad_global":""
}`

export function buildPrompt(mode, query, tweets, personality = null) {
  const context = tweets
    .map((t, i) => {
      const media = (t.media || []).length ? ` [multimedia: ${(t.media || []).map((m) => m.type).join(', ')}]` : ''
      return `#${i + 1} [❤️ ${t.likes} | 🔁 ${t.retweets} | 💬 ${t.replies} | 👁️ ${t.views}]${media}\n"${t.text}"`
    })
    .join('\n\n')
  const focus =
    mode === 'user'
      ? `los tweets recientes del perfil "${query}"`
      : `los tweets virales de alto engagement sobre la temática "${query}"`
  const voiceBlock = personality
    ? `\n\nPERSONALIDAD DIGITAL DEL AUTOR (PRIORIDAD ABSOLUTA — ESCRIBE COMO SI FUERAS ESTE AUTOR, replicando vocabulario, longitud, ritmo, humor, ironía, forma de empezar/cerrar, estructura, emojis, hashtags, pausas, preguntas y estilo argumentativo):\n${JSON.stringify(personality)}\n\nNo copies literalmente los tweets modelo: reproduce la VOZ e identidad comunicativa del autor.`
    : ''
  return `Eres un experto en marketing viral y copywriting para X (Twitter). A continuación te doy ${focus} que han funcionado bien:

${context}${voiceBlock}

TU TAREA (2 fases):

FASE 1 - ANÁLISIS DE PATRONES: Identifica POR QUÉ funcionaron estos tweets. Analiza la estructura del gancho, la longitud óptima, el tono, el formato y los elementos emocionales/psicológicos.

FASE 2 - INGENIERÍA INVERSA VIRAL: Genera EXACTAMENTE 3 propuestas de tweets nuevos, originales y optimizados, aplicando los patrones ganadores${personality ? ' Y manteniendo ESTRICTAMENTE la VOZ del autor descrita arriba' : ''}. Cada uno en un estilo diferente:
  1. Un Tweet Educativo / Lista
  2. Un Tweet Provocativo / Opinión
  3. Un Tweet Directo / Gancho corto
${personality ? '\nAUTOEVALUACIÓN DE VOZ: para CADA tweet incluye un campo "voiceScore" (entero 0-100) que mida QUÉ TAN FIEL suena a la voz del autor (tono, vocabulario, estructura, humor, ironía, ritmo, forma de empezar/cerrar). Reescribe internamente hasta que cada voiceScore sea >= 90 antes de responder.\n' : ''}
${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura EXACTA (en español):
{
  "patternAnalysis": {
    "summary": "...", "hook": "...", "tone": "...", "length": "...", "format": "...",
    "keyPatterns": ["patrón 1", "patrón 2", "patrón 3", "patrón 4"]
  },
  "generatedTweets": [
    { "style": "Educativo / Lista", "text": "...", "rationale": "...", "hookStrength": 87, "retention": "Alta", "weakPoint": "...", "thread": []${personality ? ', "voiceScore": 95' : ''} },
    { "style": "Provocativo / Opinión", "text": "...", "rationale": "...", "hookStrength": 82, "retention": "Media", "weakPoint": "...", "thread": []${personality ? ', "voiceScore": 93' : ''} },
    { "style": "Directo / Gancho corto", "text": "...", "rationale": "...", "hookStrength": 90, "retention": "Alta", "weakPoint": "...", "thread": []${personality ? ', "voiceScore": 96' : ''} }
  ]
}

Los tweets deben estar en español, ser auténticos, sin hashtags excesivos, listos para copiar y pegar.`
}

export function buildPersonalityPrompt(mode, query, tweets) {
  const context = tweets
    .map((t, i) => {
      const media = (t.media || []).length ? ` [adjunta: ${(t.media || []).map((m) => m.type).join(', ')}]` : ''
      return `#${i + 1}${media} "${t.text}"`
    })
    .join('\n')
  const who = mode === 'user' ? `del autor de la cuenta ${query}` : `del arquetipo de creador que domina la temática "${query}"`
  return `Analiza EXCLUSIVAMENTE el contenido publicado ${who}: los tweets siguientes y las imágenes/miniaturas adjuntas (si las hay). NO uses biografía, NO uses información externa, NO inventes rasgos, NO infieras intención ni ideología no evidenciada. Cada rasgo debe poder justificarse con el contenido observable. Si un rasgo NO puede inferirse con seguridad del contenido, escribe EXACTAMENTE "${NO_EVIDENCE}" en ese campo (prefiere la incertidumbre antes que alucinar).

CONTENIDO PUBLICADO:
${context}

Construye la PERSONALIDAD DIGITAL como un objeto JSON EXACTO con estas claves (valores breves en español; usa niveles "alto/medio/bajo" solo cuando el contenido lo respalde, de lo contrario "${NO_EVIDENCE}"):
${PERSONALITY_SCHEMA}

Responde ÚNICAMENTE con ese JSON.`
}

const FORENSIC_INTRO = `Actúas como un ANALISTA FORENSE DE CONTENIDO MULTIMEDIA, NO como un escritor creativo. Tu único objetivo es reportar EVIDENCIA OBSERVABLE y verificable del material. La precisión, la robustez y la trazabilidad están SIEMPRE por encima de la creatividad. Ante la mínima duda, declara incertidumbre en lugar de inventar.`

const FORENSIC_RULES = `PROHIBICIONES ABSOLUTAS (incumplirlas invalida el análisis):
  - PROHIBIDO inventar emociones, mensajes, simbolismos, intención, metáforas, narrativa, contexto político o contexto social.
  - PROHIBIDO convertir la AUSENCIA de contenido en un significado. Ejemplos PROHIBIDOS: "el vacío es el gancho", "el misterio invita a la introspección", "la nada representa X". Una pantalla negra es simplemente un fotograma sin elementos visuales discernibles, NADA MÁS.
  - PROHIBIDO usar conocimiento externo, cultura general o suposiciones. SOLO cuenta lo directamente observable en los fotogramas, el OCR o la transcripción de audio.
  - Solo puedes afirmar algo si puedes justificarlo con evidencia visual, textual o sonora CONCRETA y presente en el material.
  - SISTEMA DE CONFIANZA: asigna a cada observación un "confidence" 0-100. Si un aspecto tiene confidence < 80, su valor DEBE ser EXACTAMENTE esta frase: "${NO_EVIDENCE}". Nunca lo rellenes con una interpretación.
  - Prefiere SIEMPRE la incertidumbre explícita antes que una alucinación.`

export function buildVisionPrompt(note, transcript, frameCount = 1) {
  const hasNote = !!(note && String(note).trim())
  return `${FORENSIC_INTRO}

MATERIAL DISPONIBLE PARA ESTE ANÁLISIS:
- Fotogramas/imágenes adjuntos: ${frameCount > 0 ? `${frameCount} imagen(es) (keyframes representativos del contenido)` : 'ninguno'}
- Audio: ${transcript ? 'SÍ (transcripción verificable abajo)' : 'NO disponible / sin transcripción'}
- Nota de contexto del usuario: ${hasNote ? `"${String(note).trim()}"` : 'ninguna'}
${transcript ? `\nTRANSCRIPCIÓN DEL AUDIO (Gemini — evidencia sonora verificable):\n"""${transcript}"""` : ''}

${FORENSIC_RULES}

FASES DEL ANÁLISIS (ejecútalas en orden):

FASE A — EXTRACCIÓN FORENSE: describe SOLO hechos observables de cada fotograma y del audio. Cada campo lleva su confianza. Si una pantalla/imagen no tiene elementos discernibles, dilo literalmente y deja tono/sujetos como "${NO_EVIDENCE}".

FASE B — LÍNEA TEMPORAL (si hay varios fotogramas): para cada frame reporta descripción objetiva, objetos, personas/acciones y texto visible, con confianza. Nada de interpretación.

FASE C — ANÁLISIS DE AUDIO: separa transcripción / características de voz / emoción / ruidos / música / silencios, cada uno con su confianza. Si no hay audio, todos = "${NO_EVIDENCE}".

FASE D — FUSIÓN TRAZABLE: consolida en "usableFacts" SOLO los hechos con confidence >= 80 (cada uno con fact, origen [imagen|ocr|audio|texto] y confidence). Los descartados (confianza <80 o subjetivos) van en "discarded" con su motivo. Fija "evidenceSufficient" = true SOLO si existe al menos 1 usableFact con contenido real (o una nota de usuario con contenido) suficiente para fundamentar un post.

FASE E — GENERACIÓN CONDICIONADA A LA EVIDENCIA:
  - Si evidenceSufficient = true: genera EXACTAMENTE 3 posts para X fundamentados ÚNICAMENTE en usableFacts (+ la nota del usuario si existe). CADA afirmación de cada post debe poder rastrearse a un usableFact concreto (indícalo en "rationale"). Prohibido añadir simbolismo, emociones o narrativa no verificados.
  - Si evidenceSufficient = false: NO INVENTES. Devuelve EXACTAMENTE 3 posts cuyo "text" sea: "No hay suficiente evidencia en el material para generar un post fundamentado. Añade una nota de contexto o sube material con contenido verificable." con hookStrength 0, retention "Baja", weakPoint "Evidencia insuficiente", thread [], firstSelfReply "". Y "combined_hook_angle" = "${NO_EVIDENCE}".

FASE F — AUTOVALIDACIÓN (obligatoria antes de responder): revisa tu propio JSON y corrige: (a) cualquier afirmación sin evidencia, (b) cualquier interpretación subjetiva, (c) cualquier campo con confidence<80 que no use la frase de incertidumbre exacta, (d) cualquier post que mencione algo no presente en usableFacts. Corrige TODO eso antes de emitir la respuesta final.

${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con JSON válido con esta estructura EXACTA (en español):
{
  "evidence": {
    "evidenceSufficient": true,
    "evidenceLevel": "alto|medio|bajo",
    "usableFacts": [ { "fact": "hecho observable", "origen": "imagen", "confidence": 92 } ],
    "discarded": [ { "fact": "afirmación descartada", "reason": "confianza <80 | interpretación subjetiva", "confidence": 40 } ]
  },
  "vision": { "description": "descripción objetiva o '${NO_EVIDENCE}'", "descriptionConfidence": 90, "ocr": "texto detectado en pantalla o cadena vacía", "ocrConfidence": 95, "tone": "tono visual observable o '${NO_EVIDENCE}'", "toneConfidence": 60, "subjects": ["sujeto observable"], "timeline": [ { "t": "frame 1", "description": "...", "objetos": ["..."], "textoVisible": "...", "confidence": 88 } ] },
  "audio": { "transcript": "transcripción/resumen o cadena vacía", "keyQuotes": ["frase textual del audio"], "tone": "tono sonoro observable o '${NO_EVIDENCE}'", "toneConfidence": 55, "music": "descripción o '${NO_EVIDENCE}'", "noises": "descripción o '${NO_EVIDENCE}'", "silence": "descripción o '${NO_EVIDENCE}'" },
  "combined_hook_angle": "ángulo fundamentado SOLO en usableFacts, o '${NO_EVIDENCE}'",
  "patternAnalysis": { "summary": "...", "hook": "...", "tone": "...", "length": "...", "format": "...", "keyPatterns": ["...", "...", "..."] },
  "generatedTweets": [
    { "style": "Educativo / Lista", "text": "...", "rationale": "usableFacts en los que se basa", "hookStrength": 80, "retention": "Alta", "weakPoint": "...", "thread": [] },
    { "style": "Provocativo / Opinión", "text": "...", "rationale": "...", "hookStrength": 78, "retention": "Media", "weakPoint": "...", "thread": [] },
    { "style": "Directo / Gancho corto", "text": "...", "rationale": "...", "hookStrength": 82, "retention": "Alta", "weakPoint": "...", "thread": [] }
  ]
}`
}

const TEMPLATE_LABELS = {
  thread: 'Thread Starter (inicio de hilo que engancha a seguir leyendo)',
  controversy: 'Controversia / Opinión Polémica (postura contundente que genera debate)',
  myth: 'Mito vs Realidad (desmonta una creencia común del nicho)',
}

export function buildTemplatePrompt(format, topic) {
  const label = TEMPLATE_LABELS[format] || 'Post viral'
  return `Eres un copywriter viral senior para X. Genera EXACTAMENTE 3 propuestas de posts en formato "${label}" sobre la temática: "${topic}".

Requisitos de formato: usa listas con emojis cuando aporten valor, saltos de línea limpios, ganchos potentes en la primera línea, y un cierre con llamada a la interacción. En español, listo para copiar y pegar, sin hashtags excesivos.

${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con JSON válido con esta estructura EXACTA:
{
  "patternAnalysis": {
    "summary": "por qué el formato ${label} funciona para '${topic}'",
    "hook": "...", "tone": "...", "length": "...", "format": "${label}",
    "keyPatterns": ["...", "...", "..."]
  },
  "generatedTweets": [
    { "style": "Variante 1", "text": "...", "rationale": "...", "hookStrength": 88, "retention": "Alta", "weakPoint": "...", "thread": [] },
    { "style": "Variante 2", "text": "...", "rationale": "...", "hookStrength": 85, "retention": "Media", "weakPoint": "...", "thread": [] },
    { "style": "Variante 3", "text": "...", "rationale": "...", "hookStrength": 90, "retention": "Alta", "weakPoint": "...", "thread": [] }
  ]
}`
}

export function buildRewritePrompt(text, weakPoint, style) {
  return `Eres un copywriter viral senior para X. Reescribe y MEJORA el siguiente tweet corrigiendo específicamente su punto débil, manteniendo el estilo "${style}" y el mismo idioma.

TWEET ORIGINAL:
"${text}"

PUNTO DÉBIL A CORREGIR:
"${weakPoint || 'Mejora el gancho y la retención general.'}"

Devuelve ÚNICAMENTE un JSON con esta estructura EXACTA:
{
  "text": "nuevo tweet mejorado listo para publicar",
  "rationale": "qué cambiaste y por qué mejora el rendimiento",
  "hookStrength": 92,
  "retention": "Alta",
  "weakPoint": "punto débil residual (o 'Ninguno relevante')"
}`
}

export function buildBookmarkOptimizePrompt({ text, label, firstReply, target }) {
  return `Eres un copywriter viral senior para X (Twitter), especializado en el nicho "${label}". Reescribe y MEJORA el siguiente post aplicando ESPECÍFICAMENTE esta mejora: "${target}".

POST ACTUAL:
"""${text}"""
${firstReply ? `\nPrimer comentario / link ya aislado (NO lo incluyas en el texto principal): "${firstReply}"` : ''}

REGLAS OBLIGATORIAS:
- Mantén el mensaje e intención centrales del autor y el mismo idioma (español).
- Aplica la mejora pedida para aumentar la "guardabilidad" (bookmark score): más accionable, mejor estructura, gancho más fuerte según corresponda.
- Máximo 280 caracteres si es un post simple; si necesita más, estructúralo en líneas limpias con lista numerada o viñetas cuando aporte.
- NO inventes estadísticas ni datos falsos. Si la mejora pide un dato/cifra que NO está en el post, inserta un marcador editable EXACTO "[tu dato aquí]" para que el usuario lo complete (no inventes números concretos).
- NO incluyas ningún enlace/URL externo en el texto principal.
- Nada de placeholders tipo [IMAGEN]/[VIDEO]/[LINK].

Responde ÚNICAMENTE con JSON válido: { "text": "post mejorado listo para publicar", "rationale": "qué cambiaste en 1 frase" }`
}

export function buildVoiceValidationPrompt(personality, tweets) {
  const list = tweets.map((t, i) => `#${i}: "${t.text}"`).join('\n')
  return `Dada esta PERSONALIDAD DIGITAL del autor:\n${JSON.stringify(personality)}\n\nEvalúa si CADA tweet suena EXACTAMENTE como ese autor (tono, vocabulario, estructura, humor, ironía, ritmo, forma de empezar/cerrar).\n\nTWEETS:\n${list}\n\nResponde ÚNICAMENTE con JSON: { "scores": [ { "index": 0, "voiceScore": 0, "issue": "1 frase de mejora si <90, o 'OK'" } ] }`
}
