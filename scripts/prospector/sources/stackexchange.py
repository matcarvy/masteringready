"""
Stack Exchange source for lead prospecting.
Uses the free SE API (no key required, 300 req/day without key).
Targets Music (music.stackexchange.com) and Sound Design (sound.stackexchange.com).
"""

import logging
from datetime import datetime, timedelta, timezone
import requests

from .. import config
from ..scorer import score_text

logger = logging.getLogger(__name__)

SE_API_URL = 'https://api.stackexchange.com/2.3/search/advanced'

# Sites focused on audio/music
SE_SITES = [
    'music',        # music.stackexchange.com — Music Practice & Theory
    'sound',        # sound.stackexchange.com — Sound Design
    'video',        # video.stackexchange.com — Video Production
]

# Search queries (SE search is title-based, keep them focused)
SE_QUERIES = [
    'mastering loudness',
    'LUFS',
    'loudness normalization',
    'audio mastering',
    'master too quiet',
    'mix ready mastering',
    'streaming loudness',
    'true peak',
]

SE_LOOKBACK_DAYS = 30
SE_PAGE_SIZE = 50


def fetch_stackexchange_leads() -> list[dict]:
    """
    Search Stack Exchange questions for mastering pain points.
    Returns list of lead dicts ready for API posting.
    """
    leads = []
    seen_ids: set[str] = set()

    since_ts = int((datetime.now(timezone.utc) - timedelta(days=SE_LOOKBACK_DAYS)).timestamp())

    for site in SE_SITES:
        for query in SE_QUERIES:
            try:
                resp = requests.get(SE_API_URL, params={
                    'site': site,
                    'q': query,
                    'fromdate': since_ts,
                    'pagesize': SE_PAGE_SIZE,
                    'order': 'desc',
                    'sort': 'creation',
                    'filter': '!nNPvSNdWme',  # Include body excerpt
                }, timeout=15)

                if resp.status_code != 200:
                    logger.warning(f'SE search returned {resp.status_code} for "{query}" on {site}')
                    continue

                data = resp.json()
                items = data.get('items', [])
                quota = data.get('quota_remaining', '?')

                for item in items:
                    q_id = str(item.get('question_id', ''))
                    source_key = f'{site}_{q_id}'
                    if not q_id or source_key in seen_ids:
                        continue
                    seen_ids.add(source_key)

                    title = item.get('title', '')
                    # body_markdown may not be present with this filter, use excerpt
                    body = item.get('body_markdown', '') or item.get('excerpt', '') or ''

                    # Decode HTML entities in title
                    import html
                    title = html.unescape(title)
                    body = html.unescape(body)

                    text = f'{title} {body}'
                    if len(text.strip()) < 20:
                        continue

                    author = item.get('owner', {}).get('display_name', 'unknown')
                    link = item.get('link', f'https://{site}.stackexchange.com/q/{q_id}')
                    creation_date = item.get('creation_date')
                    created_at = datetime.fromtimestamp(creation_date, tz=timezone.utc).isoformat() if creation_date else None

                    result = score_text(text, source='stackexchange')
                    if result is None:
                        continue

                    leads.append({
                        'source': 'stackexchange',
                        'source_url': link,
                        'source_id': source_key,
                        'subreddit': site,  # Reuse subreddit field for SE site name
                        'author_username': author,
                        'title': title[:500] if title else None,
                        'content_snippet': body[:500] if body else title[:500],
                        'pain_point_category': result['pain_point_category'],
                        'matched_keywords': result['matched_keywords'],
                        'relevance_score': result['relevance_score'],
                        'original_created_at': created_at,
                    })

                if items:
                    logger.info(f'SE "{query}" on {site}: {len(items)} questions (quota: {quota})')

            except Exception as e:
                logger.error(f'SE search error for "{query}" on {site}: {e}')
                continue

    logger.info(f'Stack Exchange: found {len(leads)} leads')
    return leads
