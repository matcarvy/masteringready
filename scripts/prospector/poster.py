"""
Posts scored leads to the MasteringReady API.
Handles batching, retry, and error reporting.
"""

import os
import time
import requests


API_URL = os.environ.get('MR_PROSPECTING_API_URL', '')
API_SECRET = os.environ.get('MR_PROSPECTING_SECRET', '')

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def post_leads(leads: list[dict]) -> dict:
    """
    POST leads to the MasteringReady prospecting API.
    Returns { inserted, skipped, total } on success, or { error } on failure.
    """
    if not API_URL or not API_SECRET:
        return {'error': 'MR_PROSPECTING_API_URL or MR_PROSPECTING_SECRET not set'}

    if not leads:
        return {'inserted': 0, 'skipped': 0, 'total': 0}

    # Batch in groups of 50
    total_inserted = 0
    total_skipped = 0

    for i in range(0, len(leads), 50):
        batch = leads[i:i + 50]
        result = _post_batch(batch)

        if 'error' in result:
            return result

        total_inserted += result.get('inserted', 0)
        total_skipped += result.get('skipped', 0)

    return {
        'inserted': total_inserted,
        'skipped': total_skipped,
        'total': len(leads),
    }


def _post_batch(batch: list[dict]) -> dict:
    """POST a single batch with retry."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                API_URL,
                json={'leads': batch},
                headers={
                    'X-Prospecting-Secret': API_SECRET,
                    'Content-Type': 'application/json',
                },
                timeout=30,
            )

            if response.status_code == 200:
                return response.json()

            if response.status_code >= 500 and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue

            return {'error': f'HTTP {response.status_code}: {response.text[:200]}'}

        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {'error': 'Request timed out after retries'}

        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            return {'error': f'Request failed: {str(e)}'}

    return {'error': 'Max retries exceeded'}
