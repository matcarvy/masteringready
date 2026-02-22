"""
Hacker News source for lead prospecting.
Uses the free Algolia HN Search API (no key required).
Searches recent comments and stories for mastering-related pain points.
"""

import logging
from datetime import datetime, timedelta, timezone
import requests

from .. import config
from ..scorer import score_text

logger = logging.getLogger(__name__)

# Algolia HN Search API (free, no auth)
HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search_by_date'

# Queries tailored to HN audience (more technical)
HN_QUERIES = [
    'LUFS mastering',
    'loudness normalization',
    'audio mastering',
    'mastering music',
    'streaming loudness',
    'mix mastering',
    'audio loudness levels',
]

# How far back to search (days)
HN_LOOKBACK_DAYS = 7
HN_HITS_PER_QUERY = 50


def fetch_hackernews_leads() -> list[dict]:
    """
    Search HN comments and stories for mastering pain points.
    Returns list of lead dicts ready for API posting.
    """
    leads = []
    seen_ids: set[str] = set()

    since_ts = int((datetime.now(timezone.utc) - timedelta(days=HN_LOOKBACK_DAYS)).timestamp())

    for query in HN_QUERIES:
        try:
            # Search comments (where people ask questions)
            for tag in ['comment', 'story']:
                resp = requests.get(HN_SEARCH_URL, params={
                    'query': query,
                    'tags': tag,
                    'numericFilters': f'created_at_i>{since_ts}',
                    'hitsPerPage': HN_HITS_PER_QUERY,
                }, timeout=15)

                if resp.status_code != 200:
                    logger.warning(f'HN search returned {resp.status_code} for "{query}" ({tag})')
                    continue

                hits = resp.json().get('hits', [])

                for hit in hits:
                    object_id = hit.get('objectID', '')
                    if not object_id or object_id in seen_ids:
                        continue
                    seen_ids.add(object_id)

                    # Build text to score
                    if tag == 'story':
                        text = f"{hit.get('title', '')} {hit.get('story_text') or ''}"
                        title = hit.get('title', '')
                        source_url = hit.get('url') or f'https://news.ycombinator.com/item?id={object_id}'
                    else:
                        text = hit.get('comment_text', '') or ''
                        title = hit.get('story_title', '')
                        source_url = f'https://news.ycombinator.com/item?id={object_id}'

                    # Strip HTML tags (HN returns HTML in comments)
                    import re
                    text = re.sub(r'<[^>]+>', ' ', text)

                    if len(text.strip()) < 20:
                        continue

                    author = hit.get('author', 'unknown')
                    created_at = hit.get('created_at', '')

                    result = score_text(text, source='hackernews')
                    if result is None:
                        continue

                    leads.append({
                        'source': 'hackernews',
                        'source_url': source_url,
                        'source_id': object_id,
                        'subreddit': None,
                        'author_username': author,
                        'title': title[:500] if title else None,
                        'content_snippet': text[:500],
                        'pain_point_category': result['pain_point_category'],
                        'matched_keywords': result['matched_keywords'],
                        'relevance_score': result['relevance_score'],
                        'original_created_at': created_at if created_at else None,
                    })

            logger.info(f'HN search "{query}": {len(leads)} leads so far')

        except Exception as e:
            logger.error(f'HN search error for "{query}": {e}')
            continue

    logger.info(f'Hacker News: found {len(leads)} leads')
    return leads
