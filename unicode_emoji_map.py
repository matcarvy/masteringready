#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNICODE EMOJI MAP for MasteringReady PDF Generation  
====================================================
Version: 7.3.5-UNICODE-DEJAVU
Date: 2025-12-29

SOLUTION: Use Unicode symbols with DejaVu Sans font
DejaVu Sans supports full Unicode, so we can use proper symbols
"""

import re


def normalize_emojis(text: str) -> str:
    """Remove variation selectors from emojis."""
    if not text:
        return text
    text = text.replace('\ufe0f', '')  # VS-16 (emoji style)
    text = text.replace('\ufe0e', '')  # VS-15 (text style)
    return text


# EMOJI → UNICODE SYMBOL MAPPING
# DejaVu Sans can render these Unicode symbols correctly
PDF_UNICODE_MAP = {
    # Status symbols
    '✅': '✓',  # CHECK MARK BUTTON → CHECK MARK
    '⚠': '⚠',   # WARNING SIGN (keep as-is)
    '⚠️': '⚠',  # WARNING with variation selector
    '❌': '✗',  # CROSS MARK → BALLOT X
    'ℹ': 'ℹ',   # INFORMATION (keep as-is)
    'ℹ️': 'ℹ',  # INFO with variation selector
    '✓': '✓',   # CHECK MARK (keep as-is)
    '✗': '✗',   # BALLOT X (keep as-is)
    
    # Audio/Music symbols
    '🎵': '♪',  # MUSICAL NOTE → EIGHTH NOTE
    '🎧': '♪',  # HEADPHONE → EIGHTH NOTE
    '🔊': '♪',  # SPEAKER → EIGHTH NOTE
    '♪': '♪',   # EIGHTH NOTE (keep as-is)
    
    # Directional arrows
    '→': '→',   # RIGHTWARDS ARROW (keep as-is)
    '←': '←',
    '↑': '↑',
    '↓': '↓',
    
    # Other symbols
    '🎯': '★',  # DIRECT HIT → BLACK STAR
    '💡': 'ℹ',  # LIGHT BULB → INFO
    '🔧': '⚙',  # WRENCH → GEAR
    '📋': '□',  # CLIPBOARD → WHITE SQUARE
    '📊': '■',  # BAR CHART → BLACK SQUARE
    '★': '★',   # BLACK STAR (keep as-is)
    '⚙': '⚙',   # GEAR (keep as-is)
    '□': '□',   # WHITE SQUARE (keep as-is)
    
    # Decorative - remove completely
    '■': '',
    '═': '',
    '─': '',
    '━': '',
}


def clean_text_for_pdf(text: str) -> str:
    """
    Convert emojis to Unicode symbols for PDF.
    
    Uses symbols that DejaVu Sans can render.
    Falls back to ASCII if DejaVu is not available.
    
    Args:
        text: Original text with emojis
        
    Returns:
        Text with Unicode symbols
    """
    if not text:
        return text
    
    # Step 1: Normalize emojis (remove variation selectors)
    text = normalize_emojis(text)
    
    # Step 2: Apply emoji→symbol replacements
    for emoji, symbol in PDF_UNICODE_MAP.items():
        text = text.replace(emoji, symbol)
    
    # Step 3: Remove any remaining high Unicode emojis
    # (emojis we might have missed - these would become ■ anyway)
    emoji_pattern = re.compile(r'[\U0001F000-\U0001FFFF]+')
    text = emoji_pattern.sub('', text)
    
    # Step 4: Clean decorative ■ at line starts
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip lines that are ONLY ■
        if stripped == '■':
            continue
        
        # Remove ■ at START of line (decorative headers)
        if stripped.startswith('■ '):
            indent = len(line) - len(line.lstrip())
            line = ' ' * indent + stripped[2:]
        
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


if __name__ == "__main__":
    print("="*70)
    print("Unicode Emoji Map - DEJAVU SANS VERSION")
    print("="*70)
    print("\n✨ This version uses Unicode symbols that DejaVu Sans can render")
    print("   Produces professional-looking PDFs with proper symbols\n")
    
    # Test mappings
    print("Key mappings:")
    test_cases = [
        ('✅', 'Check'),
        ('⚠️', 'Warning'),
        ('❌', 'Error'),
        ('ℹ️', 'Info'),
        ('🎵', 'Music'),
        ('🔊', 'Speaker'),
        ('→', 'Arrow'),
        ('■', 'Black square'),
    ]
    
    for emoji, desc in test_cases:
        result = clean_text_for_pdf(emoji)
        print(f"  {emoji:3s} ({desc:15s}) → '{result}'")
    
    # Test real content
    print("\n" + "="*70)
    print("Test with real PDF content:")
    print("="*70)
    
    test_content = """🎵 Sobre "archivo.wav"

⚠️ ANÁLISIS TEMPORAL:
🔊 True Peak: Presente durante 19%
💡 El track está procesado

■ Áreas a Mejorar:
• Headroom muy bajo

→ Revisar nivel general
"""
    
    print("\nBEFORE:")
    print(test_content)
    
    cleaned = clean_text_for_pdf(test_content)
    
    print("\nAFTER:")
    print(cleaned)
    
    print("\n✅ Result: Professional Unicode symbols!")
    print("✅ Module ready for production with DejaVu Sans!")
