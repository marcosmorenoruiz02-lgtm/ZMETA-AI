# ZMETA

ZMETA ayuda a redactar tweets a partir de lo que ya funciona en X: un perfil, un tema, un texto propio o un vídeo. El análisis y la redacción los hace Google Gemini de forma directa.

## Qué necesitas

- Node.js 20 o superior
- Yarn
- MongoDB en local o una URI accesible
- Una clave de [Google AI Studio](https://aistudio.google.com/apikey)
- Una clave de [twitterapi.io](https://twitterapi.io) para analizar perfiles y temas
- Una clave de RapidAPI (descargador de Instagram) solo si vas a usar Reels

## Variables de entorno

Copia el ejemplo y rellena los valores:

```bash
cp .env.example .env
```

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `MONGO_URL` | Sí | Conexión a MongoDB |
| `DB_NAME` | Sí | Nombre de la base |
| `GEMINI_API_KEY` | Sí, para redactar | Clave de la API de Gemini |
| `GEMINI_MODEL` | No | Modelo. Si no se define, `gemini-3.8-flash` |
| `TWITTER_API_IO_KEY` | Para analizar X | Búsqueda de tweets |
| `RAPIDAPI_KEY` | Para Instagram | Descarga de Reels |
| `RAPIDAPI_HOST_INSTAGRAM` | Para Instagram | Host de RapidAPI del descargador |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma. Vacío = solo el mismo sitio |

La redacción, la visión y la transcripción de audio usan la API oficial de Gemini (`generativelanguage.googleapis.com`). No hace falta ninguna clave del proxy Emergent. En modelos Gemini 3 el borrador usa nivel de pensamiento `low` para responder antes; en modelos anteriores, como `gemini-2.5-flash`, se respeta la temperatura de cada tarea.

## Cómo ejecutarlo

```bash
yarn install
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para comprobar que compila:

```bash
yarn build
yarn start
```

Las pruebas automáticas de la lógica interna (sin llamadas reales a Gemini ni a X):

```bash
yarn test
```

## Cómo se usa

1. **Analizar.** Elige un tema o un @usuario y pulsa «Crear 3 tweets».
2. **Escribir.** Redacta el tuyo. Verás si conviene guardarlo y podrás aplicar mejoras.
3. **Vídeo.** Pega un Reel o sube una imagen, un vídeo o un audio.
4. **Medir.** Anota las cifras de una publicación o pega su enlace.

El historial de esta sesión del navegador y la cola de borradores están en la barra superior. El usuario que aparece en la vista previa se guarda en el navegador.
