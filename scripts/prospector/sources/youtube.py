"""
YouTube source for lead prospecting.
Uses YouTube Data API v3 to find comments on mastering-related videos.
"""

import os
import logging
from datetime import datetime

from googleapiclient.discovery import build

from .. import config
from ..scorer import score_text

logger = logging.getLogger(__name__)


def fetch_youtube_leads() -> list[dict]:
    """
    Search for mastering-related videos and scan their comments for pain points.
    Returns list of lead dicts ready for API posting.
    """
    api_key = os.environ.get('YOUTUBE_API_KEY', '')

    if not api_key:
        logger.warning('YOUTUBE_API_KEY not set, skipping YouTube source')
        return []

    try:
        youtube = build('youtube', 'v3', developerKey=api_key)
    except Exception as e:
        logger.error(f'Failed to initialize YouTube client: {e}')
        return []

    leads = []
    video_map: dict[str, str] = {}  # video_id -> video_title

    # Step 1: Search for relevant videos
    for query in config.YOUTUBE_SEARCHES:
        try:
            search_response = youtube.search().list(
                q=query,
                part='snippet',
                type='video',
                order='relevance',
                maxResults=config.YOUTUBE_MAX_RESULTS_PER_QUERY,
                publishedAfter=_days_ago_rfc3339(config.YOUTUBE_PUBLISHED_DAYS),
            ).execute()

            for item in search_response.get('items', []):
                vid = item['id']['videoId']
                title = item['snippet'].get('title', '')
                video_map[vid] = title

            logger.info(f'YouTube search "{query}": {len(search_response.get("items", []))} videos')

        except Exception as e:
            logger.error(f'YouTube search error for "{query}": {e}')
            continue

    logger.info(f'Total unique videos to scan: {len(video_map)}')

    # Step 2: Fetch comments from each video
    for video_id in video_map:
        try:
            comments_response = youtube.commentThreads().list(
                videoId=video_id,
                part='snippet',
                maxResults=config.YOUTUBE_MAX_COMMENTS_PER_VIDEO,
                order='time',
                textFormat='plainText',
            ).execute()

            for item in comments_response.get('items', []):
                snippet = item['snippet']['topLevelComment']['snippet']
                text = snippet.get('textDisplay', '')
                author = snippet.get('authorDisplayName', 'unknown')
                comment_id = item['id']
                published_at = snippet.get('publishedAt', '')

                result = score_text(text, source='youtube')
                if result is None:
                    continue

                video_title = video_map.get(video_id, '')

                lead = {
                    'source': 'youtube',
                    'source_url': f'https://youtube.com/watch?v={video_id}&lc={comment_id}',
                    'source_id': comment_id,
                    'subreddit': None,
                    'author_username': author,
                    'title': video_title,
                    'content_snippet': text[:500],
                    'pain_point_category': result['pain_point_category'],
                    'matched_keywords': result['matched_keywords'],
                    'relevance_score': result['relevance_score'],
                    'original_created_at': published_at if published_at else None,
                }
                leads.append(lead)

        except Exception as e:
            logger.error(f'Error fetching comments for video {video_id}: {e}')
            continue

    logger.info(f'YouTube: found {len(leads)} leads from {len(video_map)} videos')
    return leads


def _days_ago_rfc3339(days: int) -> str:
    """Return RFC 3339 timestamp for N days ago."""
    from datetime import timedelta, timezone
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
