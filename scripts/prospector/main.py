"""
MasteringReady Lead Prospector — Entry Point

Orchestrates Reddit and YouTube sources, scores leads, and posts to the API.
Designed to run in GitHub Actions on a cron schedule.
"""

import logging
import sys

from .sources.reddit import fetch_reddit_leads
from .sources.youtube import fetch_youtube_leads
from .sources.hackernews import fetch_hackernews_leads
from .sources.stackexchange import fetch_stackexchange_leads
from .poster import post_leads

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('prospector')


def main():
    logger.info('=== MasteringReady Lead Prospector ===')

    all_leads = []

    # Reddit
    logger.info('--- Scanning Reddit ---')
    try:
        reddit_leads = fetch_reddit_leads()
        all_leads.extend(reddit_leads)
        logger.info(f'Reddit: {len(reddit_leads)} leads found')
    except Exception as e:
        logger.error(f'Reddit source failed: {e}')

    # YouTube
    logger.info('--- Scanning YouTube ---')
    try:
        youtube_leads = fetch_youtube_leads()
        all_leads.extend(youtube_leads)
        logger.info(f'YouTube: {len(youtube_leads)} leads found')
    except Exception as e:
        logger.error(f'YouTube source failed: {e}')

    # Hacker News
    logger.info('--- Scanning Hacker News ---')
    try:
        hn_leads = fetch_hackernews_leads()
        all_leads.extend(hn_leads)
        logger.info(f'Hacker News: {len(hn_leads)} leads found')
    except Exception as e:
        logger.error(f'Hacker News source failed: {e}')

    # Stack Exchange
    logger.info('--- Scanning Stack Exchange ---')
    try:
        se_leads = fetch_stackexchange_leads()
        all_leads.extend(se_leads)
        logger.info(f'Stack Exchange: {len(se_leads)} leads found')
    except Exception as e:
        logger.error(f'Stack Exchange source failed: {e}')

    # Summary
    logger.info(f'--- Total leads to post: {len(all_leads)} ---')

    if not all_leads:
        logger.info('No leads found this run. Exiting.')
        return

    # Post to API
    logger.info('--- Posting to API ---')
    result = post_leads(all_leads)

    if 'error' in result:
        logger.error(f'API posting failed: {result["error"]}')
        sys.exit(1)
    else:
        logger.info(f'API result: {result["inserted"]} inserted, {result["skipped"]} skipped (duplicates), {result["total"]} total')

    logger.info('=== Prospector run complete ===')


if __name__ == '__main__':
    main()
