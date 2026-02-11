# 🚀 MasteringReady - Deployment Guide

Guía paso a paso para deployar **MasteringReady Full Stack MVP** en producción.

---

## 📋 PRE-REQUISITOS

- [ ] Cuenta en GitHub
- [ ] Cuenta en Railway (backend) → https://railway.app
- [ ] Cuenta en Vercel (frontend) → https://vercel.com
- [ ] Dominio personalizado (opcional)

---

## 🔧 PARTE 1: SETUP LOCAL

### 1. Clonar/Copiar Archivos

```bash
# Descargar los archivos del proyecto
# Estructura:
# - mix-analyzer-api/
# - masteringready-web/
```

### 2. Crear Repositorio Git

```bash
# En la raíz del proyecto
git init
git add .
git commit -m "Initial commit: MasteringReady MVP"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/YOUR-USERNAME/masteringready.git
git push -u origin main
```

---

## 🐍 PARTE 2: DEPLOY BACKEND (Railway)

### Step 1: Crear Proyecto

1. Ve a https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Selecciona tu repositorio `masteringready`

### Step 2: Configurar Root Directory

En Railway:
- Settings → Root Directory: `mix-analyzer-api`
- Click "Save"

### Step 3: Environment Variables (Opcional)

Variables → Add Variable:
```
ENVIRONMENT=production
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=200
```

### Step 4: Deploy

Railway detectará automáticamente:
- `requirements.txt` → instalará dependencias
- `main.py` → ejecutará la app

Deploy comenzará automáticamente.

### Step 5: Obtener URL Pública

1. Settings → Networking
2. Click "Generate Domain"
3. Copia la URL (ej: `masteringready-api.railway.app`)

**⚠️ IMPORTANTE:** Guarda esta URL, la necesitarás para el frontend.

---

## ⚛️ PARTE 3: DEPLOY FRONTEND (Vercel)

### Step 1: Importar Proyecto

1. Ve a https://vercel.com
2. Click "Add New" → "Project"
3. Import from GitHub → selecciona `masteringready`

### Step 2: Configurar Build Settings

- Framework Preset: `Next.js`
- Root Directory: `masteringready-web`
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)

### Step 3: Environment Variables

Click "Environment Variables" → Add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://masteringready-api.railway.app` |

**⚠️ Reemplaza con tu URL de Railway del paso anterior**

### Step 4: Deploy

Click "Deploy"

Vercel:
- Instalará dependencias (`npm install`)
- Ejecutará build (`npm run build`)
- Deployará la app

### Step 5: Obtener URL

Una vez deployado, Vercel te dará una URL:
- ej: `masteringready.vercel.app`

---

## ✅ PARTE 4: VERIFICACIÓN

### Test Backend

```bash
curl https://masteringready-api.railway.app/health
```

Expected:
```json
{
  "status": "healthy",
  "version": "7.3.0"
}
```

### Test Frontend

1. Abre `https://masteringready.vercel.app`
2. Sube un archivo .wav
3. Analiza
4. Verifica que aparezcan resultados

---

## 🔧 PARTE 5: CUSTOM DOMAIN (Opcional)

### Para Backend (Railway)

1. Settings → Networking
2. Custom Domain → Add Domain
3. Ingresa tu dominio: `api.masteringready.com`
4. Configura DNS según instrucciones de Railway

### Para Frontend (Vercel)

1. Settings → Domains
2. Add → ingresa: `masteringready.com` o `www.masteringready.com`
3. Configura DNS según instrucciones de Vercel

---

## 🐛 TROUBLESHOOTING

### Backend no responde

```bash
# Ver logs en Railway
railway logs
```

Posibles problemas:
- [ ] Dependencias no instaladas → revisar `requirements.txt`
- [ ] Puerto incorrecto → Railway usa `$PORT` automáticamente
- [ ] Archivo `analyzer.py` faltante → verificar que esté en el repo

### Frontend no conecta con backend

Problemas comunes:
- [ ] `NEXT_PUBLIC_API_URL` incorrecta → verificar variable de entorno
- [ ] CORS bloqueado → verificar `ALLOWED_ORIGINS` en `main.py`
- [ ] Backend caído → verificar health endpoint

### CORS Error

En `main.py`, verificar:
```python
ALLOWED_ORIGINS = [
    "https://masteringready.vercel.app",  # Tu dominio Vercel
    "https://www.masteringready.com",      # Si tienes custom domain
]
```

---

## 📊 MONITORING

### Backend (Railway)

- Metrics → Ver CPU, Memory, Network
- Logs → Ver errores en tiempo real

### Frontend (Vercel)

- Analytics → Ver tráfico
- Logs → Ver errores de build/runtime

---

## 🔄 UPDATES & REDEPLOY

### Backend

```bash
# Hacer cambios en mix-analyzer-api/
git add .
git commit -m "Update backend"
git push

# Railway redeploya automáticamente
```

### Frontend

```bash
# Hacer cambios en masteringready-web/
git add .
git commit -m "Update frontend"
git push

# Vercel redeploya automáticamente
```

---

## 💰 COSTOS ESTIMADOS

### Free Tier

| Service | Plan | Cost |
|---------|------|------|
| Railway | Free Trial | $0 (luego $5/mo) |
| Vercel | Hobby | $0 |
| **Total** | | **~$5/mo** |

### Production (100-500 users/día)

| Service | Plan | Cost |
|---------|------|------|
| Railway | Pro | $20-50/mo |
| Vercel | Pro | $20/mo |
| **Total** | | **~$40-70/mo** |

---

## 🎯 POST-DEPLOYMENT CHECKLIST

- [ ] Backend health check funciona
- [ ] Frontend carga correctamente
- [ ] Upload de archivo funciona
- [ ] Análisis retorna resultados
- [ ] Download de reporte funciona
- [ ] Funciona en móvil
- [ ] Funciona en desktop
- [ ] Configurar analytics (Google Analytics, etc.)
- [ ] Configurar error tracking (Sentry, etc.)

---

## 📞 SOPORTE

Si encuentras problemas:

1. Check logs (Railway/Vercel)
2. Ver troubleshooting arriba
3. Contactar: support@masteringready.com

---

## 🎉 LISTO!

Tu aplicación **MasteringReady** está ahora en producción.

**URLs:**
- Backend: `https://masteringready-api.railway.app`
- Frontend: `https://masteringready.vercel.app`

**Next Steps:**
- [ ] Testear con usuarios
- [ ] Configurar analytics
- [ ] Implementar límites de uso
- [ ] Agregar autenticación
- [ ] Configurar payments (Stripe)

---

**¡Éxito con el lanzamiento!** 🚀
