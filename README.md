# Your Life Story

Registra tus experiencias vitales y tenlo todo en un solo lugar. Haz búsquedas inteligentes entre tus recuerdos, pregúntale a la IA sobre tu vida o para recordar algo que pasó en un año concreto, y recupera tus memorias al instante.

Un espacio privado donde tu línea temporal, tu árbol de vida y tus reflexiones trabajan juntos para que nada importante se pierda.

## Puesta en marcha

1. Copia `.env.example` en `.env.local` y añade el proyecto de Supabase y una clave de OpenAI.
2. Aplica `supabase/migrations/0001_initial_schema.sql` mediante la CLI o el SQL Editor de Supabase.
3. En Supabase Auth, configura la URL del sitio y los callbacks:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/es/login`
   - `http://localhost:3000/en/login`
4. Activa el proveedor Google y registra el callback que te muestre Supabase en Google Cloud.
5. Ejecuta `pnpm dev`.

## Variables

- `NEXT_PUBLIC_APP_URL`: URL pública de la aplicación.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: cliente autenticado de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: sólo en servidor, necesaria para el borrado total de una cuenta.
- `OPENAI_API_KEY` y `OPENAI_MODEL`: utilizadas exclusivamente desde `app/api/ai`.

## Arquitectura

`src/modules` agrupa los dominios `identity`, `life-story`, `reflection` y `family-tree`. Cada dominio separa reglas y tipos (`domain`), casos de uso (`application`), adaptadores de Supabase/OpenAI (`infrastructure`) y UI (`presentation`). Las rutas de `src/app` sólo componen esos módulos.

## Privacidad

- Supabase RLS aísla filas y objetos de Storage por `auth.uid()`.
- Los adjuntos se guardan en el bucket privado `life-attachments` y no se incluyen en el contexto de IA.
- El asistente requiere consentimiento explícito y usa la Responses API con `store: false`. Revisa los [controles de datos de OpenAI](https://developers.openai.com/api/docs/guides/your-data).
- Ajustes permite exportar los datos estructurados y borrar la cuenta con sus filas y archivos.

## Comprobaciones

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

La prueba E2E sólo cubre la landing sin credenciales. Los flujos autenticados se validan tras configurar Supabase.
