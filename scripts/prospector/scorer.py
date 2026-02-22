"""
Relevance scoring for prospecting leads.
Weighted keyword matching with category detection.
"""

from . import config


def score_text(text: str, source: str = 'reddit', subreddit: str | None = None) -> dict | None:
    """
    Score a text for mastering pain point relevance.
    Returns dict with category, score, matched_keywords or None if below threshold.
    """
    text_lower = text.lower()

    # Check negative keywords first
    for neg in config.NEGATIVE_KEYWORDS:
        if neg in text_lower:
            return None

    best_category = None
    best_score = 0.0
    best_keywords = []

    # Score against each category (EN + ES)
    for category, keywords in config.PAIN_POINTS.items():
        score, matched = _score_category(text_lower, keywords)

        # Also check Spanish keywords
        es_keywords = config.PAIN_POINTS_ES.get(category, {})
        if es_keywords:
            es_score, es_matched = _score_category(text_lower, es_keywords, base_weight=keywords['weight'])
            if es_score > score:
                score = es_score
                matched = es_matched

        if score > best_score:
            best_score = score
            best_category = category
            best_keywords = matched

    if best_category is None or best_score == 0:
        return None

    # Apply bonuses
    if subreddit and subreddit.lower() in config.FOCUSED_SUBREDDITS:
        best_score += config.FOCUSED_SUBREDDIT_BONUS

    if '?' in text:
        best_score += config.QUESTION_BONUS

    # Cap at 1.0
    best_score = min(1.0, best_score)

    # Apply threshold
    threshold = config.MIN_RELEVANCE_SCORE if source == 'reddit' else config.MIN_RELEVANCE_YOUTUBE
    if best_score < threshold:
        return None

    return {
        'pain_point_category': best_category,
        'relevance_score': round(best_score, 3),
        'matched_keywords': best_keywords,
    }


def _score_category(text: str, keywords: dict, base_weight: float | None = None) -> tuple[float, list[str]]:
    """Score text against a single category's keywords."""
    weight = base_weight if base_weight is not None else keywords.get('weight', 1.0)
    score = 0.0
    matched = []

    for kw in keywords.get('primary', []):
        if kw in text:
            score += config.PRIMARY_KEYWORD_SCORE
            matched.append(kw)

    for kw in keywords.get('secondary', []):
        if kw in text:
            score += config.SECONDARY_KEYWORD_SCORE
            matched.append(kw)

    return score * weight, matched
