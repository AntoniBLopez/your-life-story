# Your Life Story

Registra tus experiencias vitales y tenlo todo en un solo lugar. Haz búsquedas inteligentes entre tus recuerdos, pregúntale a la IA sobre tu vida o para recordar algo que pasó en un año concreto, y recupera tus memorias al instante.

Un espacio privado donde tu línea temporal, tu árbol de vida y tus reflexiones trabajan juntos para que nada importante se pierda.

## Puesta en marcha

1. Copia `.env.example` en `.env` (o `.env.local`) y configura MongoDB y OpenAI.
2. En desarrollo se usa `MONGODB_CONNECTION_DEV`; en producción (Vercel) `MONGODB_CONNECTION`. Usa el mismo nombre de base de datos en ambas (por ejemplo `yourlifestorydb`). MongoDB Atlas solo muestra la base de datos tras el primer documento insertado.
3. Pon `DEMO_MODE=false` cuando quieras datos reales. En producción, si MongoDB está configurado, la app ignora el modo demo aunque `DEMO_MODE=true`.
4. En Vercel → Settings → Environment Variables (Production), configura al menos:
   - `MONGODB_CONNECTION` con la URI de Atlas (`.../yourlifestorydb?...`)
   - `DEMO_MODE=false`
   - `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET` (cadena aleatoria larga)
   - `NEXT_PUBLIC_APP_URL=https://your-life-story-jade.vercel.app`
5. En MongoDB Atlas → Network Access, permite acceso desde `0.0.0.0/0` (necesario para Vercel).
6. Opcional: login con Google. Redirect URIs en Google Cloud Console:
   - `http://localhost:3000/auth/callback` (desarrollo)
   - `https://your-life-story-jade.vercel.app/auth/callback` (producción)
7. Ejecuta `pnpm install` y luego `pnpm dev`.

Los índices de MongoDB se crean automáticamente al primer arranque.

## Variables

- `NEXT_PUBLIC_APP_URL`: URL pública de la aplicación (opcional en Vercel; si no se define o apunta a localhost, se detecta automáticamente).
- `MONGODB_CONNECTION`: URI de MongoDB para producción.
- `MONGODB_CONNECTION_DEV`: URI de MongoDB para desarrollo local.
- `SESSION_SECRET`: secreto para firmar sesiones (recomendado en producción).
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: login con Google (opcional).
- `OPENAI_API_KEY` y `OPENAI_MODEL`: utilizadas exclusivamente desde `app/api/ai`.
- `DEMO_MODE`: `true` para explorar sin MongoDB en local. En producción con MongoDB configurado se desactiva automáticamente.

## Arquitectura

`src/modules` agrupa los dominios `identity`, `life-story`, `reflection` y `family-tree`. Cada dominio separa reglas y tipos (`domain`), casos de uso (`application`), adaptadores de MongoDB/OpenAI (`infrastructure`) y UI (`presentation`). Las rutas de `src/app` sólo componen esos módulos.

## Privacidad

- Todos los datos de usuario se filtran por `userId` en el servidor; MongoDB no se expone al cliente.
- Los adjuntos se guardan en GridFS (`life_attachments`) y no se incluyen en el contexto de IA.
- El asistente requiere consentimiento explícito y usa la Responses API con `store: false`. Revisa los [controles de datos de OpenAI](https://developers.openai.com/api/docs/guides/your-data).
- Ajustes permite exportar los datos estructurados y borrar la cuenta con sus documentos y archivos.

## Comprobaciones

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

La prueba E2E sólo cubre la landing sin credenciales. Los flujos autenticados se validan tras configurar MongoDB.
