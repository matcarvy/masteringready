#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNICODE EMOJI MAP for MasteringReady PDF Generation  
====================================================
Version: 7.3.5-unicode-FINAL
Date: 2025-12-29

SOLUTION: Normalize emoji variations BEFORE mapping
"""

import re

def normalize_emojis(text: str) -> str:
    """
    Normalize emoji variations by removing variation selectors.
    
    Variation selectors (U+FE0F, U+FE0E) are invisible Unicode characters
    that change emoji presentation. We remove them for consistent matching.
    
    Args:
        text: Text with emojis
        
    Returns:
        Text with normalized emojis
    """
    # Remove variation selectors
    text = text.replace('\ufe0f', '')  # VARIATION SELECTOR-16 (emoji style)
    text = text.replace('\ufe0e', '')  # VARIATION SELECTOR-15 (text style)
    return text


# EMOJI → UNICODE SYMBOL MAPPING
# This maps the BASE emoji (without variation selectors) to Unicode symbols
PDF_UNICODE_MAP = {
    # Status symbols
    '✅': '✓',  # CHECK MARK
    '⚠': '⚠',   # WARNING SIGN (keep as-is, it's already Unicode)
    '❌': '✗',  # CROSS MARK → BALLOT X
    'ℹ': 'ℹ',   # INFORMATION (keep as-is)
    '✓': '✓',   # CHECK MARK (keep as-is)
    '✗': '✗',   # BALLOT X (keep as-is)
    
    # Audio/Music symbols
    '🎵': '♪',  # MUSICAL NOTE → EIGHTH NOTE
    '🎧': '♪',  # HEADPHONE → EIGHTH NOTE
    '🔊': '♪',  # SPEAKER → EIGHTH NOTE
    '♪': '♪',   # EIGHTH NOTE (keep as-is)
    
    # Directional
    '→': '→',   # RIGHTWARDS ARROW (keep as-is)
    '←': '←',
    '↑': '↑',
    '↓': '↓',
    
    # Other symbols
    '🎯': '★',  # DIRECT HIT → BLACK STAR
    '💡': 'ℹ',  # LIGHT BULB → INFO
    '🔧': '⚙',  # WRENCH → GEAR
    '📋': '□',  # CLIPBOARD → WHITE SQUARE
    '📊': '■',  # BAR CHART → BLACK SQUARE (for stats context)
    '★': '★',   # BLACK STAR (keep as-is)
    '⚙': '⚙',   # GEAR (keep as-is)
    '□': '□',   # WHITE SQUARE (keep as-is)
    '■': '■',   # BLACK SQUARE (keep in specific contexts)
    
    # Decorative - REMOVE
    '═': '',
    '─': '',
    '━': '',
}


def clean_text_for_pdf(text: str) -> str:
    """
    Convert emojis to Unicode symbols compatible with ReportLab.
    
    Process:
    1. Normalize emojis (remove variation selectors)
    2. Apply emoji→symbol mapping
    3. Clean up decorative ■ at line starts
    
    Args:
        text: Original text with emojis
        
    Returns:
        Text with Unicode symbols
    """
    if not text:
        return text
    
    # Step 1: Normalize emojis
    text = normalize_emojis(text)
    
    # Step 2: Apply replacements
    for emoji, symbol in PDF_UNICODE_MAP.items():
        text = text.replace(emoji, symbol)
    
    # Step 3: Clean decorative ■ usage
    # Only remove ■ when it appears alone at the start of a line (decorative)
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip lines that are ONLY ■
        if stripped == '■':
            continue
            
        # Remove ■ at the START of a line when followed by space
        # This catches decorative usage: "■ Título" → " Título"
        # But keeps informational: "Status: ■" → "Status: ■"
        if stripped.startswith('■ '):
            # Get the indentation
            indent = len(line) - len(line.lstrip())
            # Rebuild line without leading ■
            line = ' ' * indent + stripped[2:]  # Skip '■ '
        
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


# Testing and debug
if __name__ == "__main__":
    print("="*70)
    print("Unicode Emoji Map - FINAL VERSION (with normalization)")
    print("="*70)
    
    # Test normalization
    print("\n🧪 Test 1: Emoji Normalization")
    print("-"*70)
    test_emojis = [
        '⚠️',  # With variation selector
        '⚠',   # Without variation selector
        'ℹ️',  # With variation selector
        'ℹ',   # Without variation selector
    ]
    
    for emoji in test_emojis:
        normalized = normalize_emojis(emoji)
        codepoints_before = ' '.join(f'U+{ord(c):04X}' for c in emoji)
        codepoints_after = ' '.join(f'U+{ord(c):04X}' for c in normalized)
        print(f"  {repr(emoji):8s} [{codepoints_before}] → [{codepoints_after}]")
    
    # Test full mapping
    print("\n🎯 Test 2: Key Mappings")
    print("-"*70)
    key_tests = [
        ('✅', 'Check'),
        ('⚠️', 'Warning (with selector)'),
        ('⚠', 'Warning (no selector)'),
        ('❌', 'Error'),
        ('ℹ️', 'Info (with selector)'),
        ('ℹ', 'Info (no selector)'),
        ('🎵', 'Music'),
        ('→', 'Arrow'),
        ('■', 'Black square'),
    ]
    
    for emoji, description in key_tests:
        cleaned = clean_text_for_pdf(emoji)
        print(f"  {emoji:3s} ({description:25s}) → {cleaned}")
    
    # Test real content
    print("\n📄 Test 3: Real PDF Content")
    print("-"*70)
    
    test_content = """■ Sobre "Baile_Laico.wav"

⚠️ Áreas a Mejorar:
• LUFS (Integrated): Mezcla muy fuerte
• Status: ■ Warning

ℹ️ Nota: Esto es informativo

🎵 Audio analizado con MasteringReady

■ (decorative separator)

✅ Aspectos correctos
"""
    
    print("BEFORE:")
    print(test_content)
    
    cleaned = clean_text_for_pdf(test_content)
    
    print("\nAFTER:")
    print(cleaned)
    
    # Count changes
    changes = sum(1 for a, b in zip(test_content, cleaned) if a != b)
    print(f"\n📊 Characters changed: {changes}")
    print("✅ Module ready for production!")
