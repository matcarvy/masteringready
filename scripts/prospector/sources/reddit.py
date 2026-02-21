"""
Reddit source for lead prospecting.
Uses PRAW to scan target subreddits for mastering pain points.
"""

import os
import logging
from datetime import datetime, timezone

import praw

from .. import config
from ..scorer import score_text

logger = logging.getLogger(__name__)


def fetch_reddit_leads() -> list[dict]:
    """
    Scan target subreddits for posts with mastering pain points.
    Returns list of lead dicts ready for API posting.
    """
    client_id = os.environ.get('REDDIT_CLIENT_ID', '')
    client_secret = os.environ.get('REDDIT_CLIENT_SECRET', '')
    user_agent = os.environ.get('REDDIT_USER_AGENT', 'MasteringReady Prospector v1.0')

    if not client_id or not client_secret:
        logger.warning('Reddit credentials not set, skipping Reddit source')
        return []

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
        )
    except Exception as e:
        logger.error(f'Failed to initialize Reddit client: {e}')
        return []

    leads = []

    for subreddit_name in config.TARGET_SUBREDDITS:
        try:
            subreddit = reddit.subreddit(subreddit_name)
            posts = subreddit.new(limit=config.REDDIT_NEW_LIMIT)

            for post in posts:
                # Combine title + selftext for scoring
                text = f"{post.title} {post.selftext or ''}"

                result = score_text(text, source='reddit', subreddit=subreddit_name)
                if result is None:
                    continue

                lead = {
                    'source': 'reddit',
                    'source_url': f'https://reddit.com{post.permalink}',
                    'source_id': post.id,
                    'subreddit': subreddit_name,
                    'author_username': str(post.author) if post.author else '[deleted]',
                    'title': post.title[:500] if post.title else None,
                    'content_snippet': (post.selftext or post.title or '')[:500],
                    'pain_point_category': result['pain_point_category'],
                    'matched_keywords': result['matched_keywords'],
                    'relevance_score': result['relevance_score'],
                    'original_created_at': datetime.fromtimestamp(
                        post.created_utc, tz=timezone.utc
                    ).isoformat(),
                }
                leads.append(lead)

            logger.info(f'r/{subreddit_name}: scanned {config.REDDIT_NEW_LIMIT} posts, found {sum(1 for l in leads if l["subreddit"] == subreddit_name)} leads')

        except Exception as e:
            logger.error(f'Error scanning r/{subreddit_name}: {e}')
            continue

    return leads
