#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNICODE EMOJI MAP for MasteringReady PDF Generation
====================================================
Maps emojis to Unicode symbols compatible with ReportLab.
Version: 7.3.5-unicode
"""

# EMOJI → UNICODE SYMBOL MAPPING
PDF_UNICODE_MAP = {
    # Status symbols
    '✅': '✓',  # CHECK MARK (U+2713)
    '⚠️': '⚠',  # WARNING SIGN (U+26A0)
    '❌': '✗',  # BALLOT X (U+2717)
    'ℹ️': 'ℹ',  # INFORMATION (U+2139)
    '✓': '✓',  # Already compatible
    
    # Audio/Music symbols  
    '🎵': '♪',  # EIGHTH NOTE (U+266A)
    '🎧': '♪',  # EIGHTH NOTE (U+266A)
    '🔊': '♪',  # EIGHTH NOTE (U+266A)
    
    # Directional
    '→': '→',  # Already compatible (U+2192)
    
    # Other symbols
    '🎯': '★',  # BLACK STAR (U+2605)
    '💡': 'ℹ',  # INFO (U+2139)
    '🔧': '⚙',  # GEAR (U+2699)
    '📋': '□',  # WHITE SQUARE (U+25A1)
    '📊': '■',  # BLACK SQUARE (U+25A0)
    
    # Decorative (remove)
    '■': '',
    '═': '',
    '─': '',
    '━': '',
}

def clean_text_for_pdf(text: str) -> str:
    """
    Replace emojis with Unicode symbols for PDF.
    
    Args:
        text: Original text with emojis
        
    Returns:
        str: Text with Unicode symbols
    """
    for emoji, symbol in PDF_UNICODE_MAP.items():
        text = text.replace(emoji, symbol)
    return text
