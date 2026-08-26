# Your Life Story

Registra tus experiencias vitales y tenlo todo en un solo lugar. Haz búsquedas inteligentes entre tus recuerdos, pregúntale a la IA sobre tu vida o para recordar algo que pasó en un año concreto, y recupera tus memorias al instante.

Un espacio privado donde tu línea temporal, tu árbol de vida y tus reflexiones trabajan juntos para que nada importante se pierda.

## Puesta en marcha

1. Copia `.env.example` en `.env` (o `.env.local`) y configura MongoDB y OpenAI.
2. En desarrollo, `MONGODB_CONNECTION_DEV` apunta a tu instancia local; en producción usa `MONGODB_CONNECTION` (por ejemplo MongoDB Atlas).
3. Opcional: configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` para login con Google. El callback autorizado debe ser `http://localhost:3000/auth/callback`.
4. Ejecuta `pnpm install` y luego `pnpm dev`.

Los índices de MongoDB se crean automáticamente al primer arranque.

## Variables

- `NEXT_PUBLIC_APP_URL`: URL pública de la aplicación.
- `MONGODB_CONNECTION`: URI de MongoDB para producción.
- `MONGODB_CONNECTION_DEV`: URI de MongoDB para desarrollo local.
- `SESSION_SECRET`: secreto para firmar sesiones (recomendado en producción).
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: login con Google (opcional).
- `OPENAI_API_KEY` y `OPENAI_MODEL`: utilizadas exclusivamente desde `app/api/ai`.
- `DEMO_MODE`: `true` para explorar la app sin MongoDB.

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
