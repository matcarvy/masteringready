# Supabase Database Setup / Configuración de Base de Datos

## Quick Start / Inicio Rápido

### 1. Create Supabase Project / Crear Proyecto de Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and API keys from Settings > API

---

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Anota la URL de tu proyecto y las claves API desde Settings > API

### 2. Run Migrations / Ejecutar Migraciones

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI / Instalar CLI de Supabase
npm install -g supabase

# Login / Iniciar sesión
supabase login

# Link to your project / Vincular a tu proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations / Ejecutar migraciones
supabase db push
```

**Option B: Using SQL Editor / Usando Editor SQL**

1. Go to SQL Editor in Supabase Dashboard
2. Run each migration file in order:
   - `20240123000001_initial_schema.sql`
   - `20240123000002_seed_plans.sql`
   - `20240123000003_storage_buckets.sql`
   - `20240123000004_user_feedback.sql`

---

1. Ve al Editor SQL en el Dashboard de Supabase
2. Ejecuta cada archivo de migración en orden

### 3. Configure Environment / Configurar Entorno

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

---

Copia `.env.example` a `.env.local` y completa tus credenciales de Supabase.

---

## Database Schema / Esquema de Base de Datos

### Tables / Tablas

| Table / Tabla | Description / Descripción |
|---------------|---------------------------|
| `plans` | Subscription plans (Free, Pro, Studio) / Planes de suscripción |
| `profiles` | User profiles (extends auth.users) / Perfiles de usuario |
| `subscriptions` | User subscriptions / Suscripciones de usuarios |
| `analyses` | Analysis history / Historial de análisis |
| `usage_tracking` | Daily usage counters / Contadores de uso diario |
| `payments` | Payment history (Stripe) / Historial de pagos |
| `api_keys` | API keys for Studio tier / Claves API para tier Studio |
| `user_feedback` | User feedback & feature requests / Retroalimentación y solicitudes |
| `feedback_votes` | Votes on feature requests / Votos en solicitudes |

### Subscription Plans / Planes de Suscripción

| Plan | Price / Precio | Analyses / Análisis | Features / Características |
|------|----------------|---------------------|----------------------------|
| **Free** | $0 | 3/month | Basic analysis / Análisis básico |
| **Pro** | $9.99/mo | Unlimited | + Social Media Optimizer, Reference Comparison (5/day) |
| **Studio** | $29.99/mo | Unlimited | + API Access, Batch Processing, White-label |

---

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data.

Todas las tablas tienen RLS habilitado. Los usuarios solo pueden acceder a sus propios datos.

### Key Policies / Políticas Clave

- **profiles**: Users can read/update their own profile only
- **analyses**: Users can create and view their own analyses
- **subscriptions**: Users can only view their own subscription
- **plans**: Everyone can read active plans (public)
- **user_feedback**: Users can create and view their own feedback

---

## Functions / Funciones

### `can_user_analyze(user_id)`

Checks if user is within their plan's analysis limit.

Verifica si el usuario está dentro del límite de análisis de su plan.

```sql
SELECT can_user_analyze('user-uuid-here');
-- Returns: true/false
```

### `increment_analysis_count(user_id)`

Increments user's analysis counters (called after each analysis).

Incrementa los contadores de análisis del usuario.

### `reset_monthly_counters()`

Resets all users' monthly analysis counts. Schedule this to run monthly.

Reinicia los contadores mensuales de todos los usuarios. Programa esto mensualmente.

---

## Storage Buckets / Buckets de Almacenamiento

| Bucket | Purpose / Propósito | Access / Acceso |
|--------|---------------------|-----------------|
| `reports` | Saved PDF reports / Reportes PDF guardados | Private (user's own) |
| `avatars` | User profile pictures / Fotos de perfil | Public read |

---

## Connecting from Vercel & Render

### Vercel (Frontend)

Add these environment variables in Vercel Dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Render (Backend)

Add these environment variables in Render Dashboard:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Note**: The backend should use the Service Role Key to bypass RLS when needed.

**Nota**: El backend debe usar la Service Role Key para omitir RLS cuando sea necesario.

---

## TypeScript Types / Tipos TypeScript

Types are defined in `/lib/database.types.ts`. To regenerate after schema changes:

Los tipos están definidos en `/lib/database.types.ts`. Para regenerar después de cambios:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

---

## Cron Jobs / Tareas Programadas

### Monthly Counter Reset / Reinicio Mensual de Contadores

Set up a cron job to call `reset_monthly_counters()` on the 1st of each month:

Configura un cron job para llamar `reset_monthly_counters()` el 1° de cada mes:

```sql
-- In Supabase SQL Editor, or via pg_cron extension
SELECT cron.schedule(
  'reset-monthly-counters',
  '0 0 1 * *',  -- First day of month at midnight / Primer día del mes a medianoche
  $$SELECT reset_monthly_counters()$$
);
```

---

## Troubleshooting / Solución de Problemas

### "permission denied for table X"

Make sure RLS policies are correctly set up. Check if user is authenticated.

Asegúrate de que las políticas RLS estén correctamente configuradas.

### "foreign key violation"

Check that referenced records exist (e.g., plan exists before creating subscription).

Verifica que los registros referenciados existan.

### "invalid input syntax for type uuid"

Ensure you're passing valid UUIDs, not strings like 'null' or empty strings.

Asegúrate de pasar UUIDs válidos, no strings como 'null' o cadenas vacías.

---

## Support / Soporte

- **Supabase Docs**: https://supabase.com/docs
- **MasteringReady Issues**: https://github.com/matcarvy/masteringready/issues
