"""
Configuration for the MasteringReady Lead Prospector.
Keywords, subreddits, thresholds, and scoring weights.
"""

# Target subreddits (ordered by focus/quality)
TARGET_SUBREDDITS = [
    'mixingmastering',        # ~95K — very focused on mastering
    'audioengineering',       # ~320K — professional audio
    'WeAreTheMusicMakers',    # ~2.4M — broad music production
    'musicproduction',        # ~1M — beginner to intermediate
    'edmproduction',          # ~500K — EDM producers
    'makinghiphop',           # ~400K — hip-hop producers
    'bedroombands',           # ~130K — indie/bedroom producers
]

# Subreddits that get a relevance bonus (more focused on mastering)
FOCUSED_SUBREDDITS = {'mixingmastering', 'audioengineering'}

# Pain point categories with weighted keyword groups
PAIN_POINTS = {
    'loudness': {
        'weight': 1.0,
        'primary': [
            'too quiet', 'too loud', 'not loud enough', 'loudness',
            'volume level', 'my master is quiet', 'master sounds quiet',
            'master sounds low', 'gain staging for mastering',
        ],
        'secondary': [
            'gain staging', 'headroom', 'clipping', 'distortion',
            'peak level', 'make it louder', 'loudness war',
        ],
    },
    'lufs_targets': {
        'weight': 1.0,
        'primary': [
            'lufs', '-14 lufs', '-16 lufs', '-14lufs', '-16lufs',
            'integrated loudness', 'loudness unit', 'target lufs',
            'what lufs', 'how many lufs',
        ],
        'secondary': [
            'true peak', 'dbtp', 'db tp', 'peak level',
            'loudness meter', 'loudness penalty', 'loudness range',
        ],
    },
    'streaming_targets': {
        'weight': 0.9,
        'primary': [
            'spotify normalization', 'apple music loudness', 'youtube loudness',
            'streaming platform', 'platform requirements', 'streaming requirements',
            'sounds different on spotify', 'sounds different on apple',
            'master for streaming', 'streaming ready', 'mastered for spotify',
        ],
        'secondary': [
            'spotify turns down', 'apple music turns down', 'youtube turns down',
            'platform loudness', 'streaming loudness', 'streaming standard',
        ],
    },
    'mastering_quality': {
        'weight': 0.85,
        'primary': [
            'my master sounds', 'mastering quality', 'master doesn\'t sound',
            'bad master', 'mastering went wrong', 'mastering results',
            'master sounds worse', 'master sounds different', 'ruined my master',
        ],
        'secondary': [
            'over-compressed', 'lost dynamics', 'squashed', 'lifeless master',
            'harsh master', 'muddy master', 'mastering crushed', 'too much limiting',
        ],
    },
    'mix_readiness': {
        'weight': 0.8,
        'primary': [
            'ready for mastering', 'before mastering', 'send to mastering',
            'pre-mastering', 'mix ready', 'prepare for mastering',
            'is my mix ready', 'mix before mastering', 'ready to master',
        ],
        'secondary': [
            'mastering engineer', 'mastering service', 'self mastering',
            'diy mastering', 'online mastering', 'send for mastering',
            'checklist before mastering', 'prepare mix',
        ],
    },
    'general_mastering': {
        'weight': 0.6,
        'primary': [
            'mastering help', 'mastering advice', 'mastering question',
            'how to master', 'mastering tutorial', 'learn mastering',
            'mastering tips', 'mastering for beginners',
        ],
        'secondary': [
            'limiter settings', 'mastering chain', 'mastering eq',
            'mastering compressor', 'mastering plugin', 'ozone mastering',
        ],
    },
}

# Spanish keywords (for LATAM reach)
PAIN_POINTS_ES = {
    'loudness': {
        'primary': [
            'muy bajo', 'muy fuerte', 'volumen', 'nivel de volumen',
            'suena bajo', 'suena fuerte', 'masterización volumen',
        ],
        'secondary': [
            'ganancia', 'headroom', 'clipeo', 'distorsión', 'saturación',
        ],
    },
    'lufs_targets': {
        'primary': [
            'lufs', 'loudness integrado', 'unidades de sonoridad',
            'cuantos lufs', 'nivel lufs',
        ],
        'secondary': [
            'true peak', 'pico real', 'nivel de pico',
        ],
    },
    'streaming_targets': {
        'primary': [
            'spotify normalización', 'spotify baja el volumen',
            'suena diferente en spotify', 'masterizar para streaming',
        ],
        'secondary': [
            'plataformas de streaming', 'requisitos de streaming',
        ],
    },
    'mastering_quality': {
        'primary': [
            'mi master suena', 'calidad del master', 'masterización mala',
            'master suena mal', 'arruinó el master',
        ],
        'secondary': [
            'sobre-comprimido', 'perdió dinámica', 'aplastado', 'sin vida',
        ],
    },
    'mix_readiness': {
        'primary': [
            'lista para masterizar', 'antes de masterizar', 'enviar a masterizar',
            'mezcla lista', 'preparar para masterizar',
        ],
        'secondary': [
            'ingeniero de masterización', 'servicio de mastering',
            'masterizar yo mismo', 'checklist mastering',
        ],
    },
    'general_mastering': {
        'primary': [
            'ayuda mastering', 'consejo mastering', 'cómo masterizar',
            'tutorial mastering', 'aprender a masterizar',
        ],
        'secondary': [
            'limitador', 'cadena de mastering', 'ecualizador mastering',
        ],
    },
}

# Negative keywords — filter out self-promotion and service offerings
NEGATIVE_KEYWORDS = [
    'my service', 'check out my', 'i offer mastering', 'dm for rates',
    'link in bio', 'hire me', 'my mastering', 'i can master',
    'promo code', 'discount code', 'free mastering', 'mastering for $',
    'mastering for hire', 'open for business', 'accepting clients',
    'mi servicio', 'ofrezco masterización', 'contáctame para',
]

# Scoring thresholds
MIN_RELEVANCE_SCORE = 0.3
MIN_RELEVANCE_YOUTUBE = 0.4  # Higher threshold for noisier YouTube comments

# Scoring bonuses
FOCUSED_SUBREDDIT_BONUS = 0.1
RECENCY_BONUS = 0.05  # Posted in last 24h
QUESTION_BONUS = 0.1  # Contains '?'
PRIMARY_KEYWORD_SCORE = 0.3
SECONDARY_KEYWORD_SCORE = 0.15

# Reddit fetch limits
REDDIT_NEW_LIMIT = 50  # Posts to fetch per subreddit per run

# YouTube search queries
YOUTUBE_SEARCHES = [
    'mastering loudness levels tutorial 2026',
    'LUFS mastering explained',
    'how to master music for streaming',
    'mix ready for mastering check',
    'mastering too quiet fix',
]
YOUTUBE_MAX_RESULTS_PER_QUERY = 10
YOUTUBE_MAX_COMMENTS_PER_VIDEO = 50
