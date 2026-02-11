# 🎵 MasteringReady - Full Stack MVP

Aplicación web completa para análisis de mezclas de audio preparadas para mastering.

Basado en la metodología "Mastering Ready" de Matías Carvajal García.

## 📦 Estructura del Proyecto

```
masteringready/
├── mix-analyzer-api/          # Backend (FastAPI)
│   ├── main.py                # API endpoints
│   ├── analyzer.py            # Mix analyzer v7.3
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker config
│   └── README.md
│
└── masteringready-web/        # Frontend (Next.js)
    ├── app/                   # Next.js app directory
    │   ├── page.tsx           # Main analyzer page
    │   ├── layout.tsx         # Root layout
    │   └── globals.css        # Global styles
    ├── components/            # React components
    │   └── index.tsx          # All components
    ├── lib/                   # Utilities
    │   └── api.ts             # API client
    ├── package.json
    └── tailwind.config.js
```

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd mix-analyzer-api

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
```

Server runs at: `http://localhost:8000`

### Frontend (Next.js)

```bash
cd masteringready-web

# Install dependencies
npm install

# Set environment variable
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

## 🎨 Features

- ✅ **Privacy-First**: Audio analyzed in-memory, auto-deleted
- 🌐 **Bilingual**: Spanish & English support
- 📊 **Comprehensive Analysis**: LUFS, True Peak, Headroom, Stereo, Frequency Balance
- ⚡ **Fast**: Analysis in ~5-15 seconds
- 📱 **Responsive**: Works on desktop & mobile
- 🎯 **Professional**: Based on proven methodology

## 🔧 Configuration

### Backend Environment Variables

Create `.env` file in `mix-analyzer-api/`:

```env
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
MAX_FILE_SIZE_MB=200
LOG_LEVEL=INFO
PORT=8000
```

### Frontend Environment Variables

Create `.env.local` file in `masteringready-web/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📤 Deployment

### Backend → Railway

1. Push backend code to GitHub
2. Create new project in Railway
3. Connect to your repo
4. Set root directory to `mix-analyzer-api`
5. Deploy automatically

### Frontend → Vercel

1. Push frontend code to GitHub
2. Import project in Vercel
3. Set root directory to `masteringready-web`
4. Add environment variable: `NEXT_PUBLIC_API_URL=<your-backend-url>`
5. Deploy

## 🧪 Testing

### Test Backend

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "7.3.0",
  "analyzer_loaded": true
}
```

### Test Full Stack

1. Open `http://localhost:3000`
2. Upload a .wav file
3. Select options (language, mode, strict)
4. Click "Analizar Mezcla"
5. View results

## 📚 API Documentation

Once backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🎯 Roadmap

- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Add user authentication
- [ ] Implement usage limits (3 free analyses)
- [ ] Add payment integration (Stripe)
- [ ] Social Media Audio Optimizer
- [ ] Reference Comparison Tool

## 👨‍💻 Author

**Matías Carvajal García** (@matcarvy)

Based on "Mastering Ready" methodology - 300+ professional productions

## 📄 License

© 2025 MasteringReady. All rights reserved.

## 🔒 Privacy

- Audio files processed in-memory only
- Automatic deletion after analysis
- No permanent storage without consent
- HTTPS enforced in production
- GDPR & CCPA compliant

## 🆘 Support

For issues or questions:
- Email: support@masteringready.com
- GitHub Issues: [repository-url]

---

**Version:** 1.0.0
**Last Updated:** January 2026
