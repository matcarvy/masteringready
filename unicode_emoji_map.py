#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNICODE EMOJI MAP for MasteringReady PDF Generation  
====================================================
Version: 7.3.5-unicode-ULTRA-ROBUST
Date: 2025-12-29

ULTRA ROBUST: Handles ALL emoji variations
"""

import re


def normalize_emojis(text: str) -> str:
    """
    Aggressively normalize ALL emoji variations.
    
    Removes:
    - Variation Selector-16 (U+FE0F) - emoji style
    - Variation Selector-15 (U+FE0E) - text style  
    - Zero Width Joiner (U+200D) - compound emojis
    - Other invisible modifiers
    
    Args:
        text: Text with emojis
        
    Returns:
        Text with normalized emojis
    """
    if not text:
        return text
    
    # Remove all variation selectors and modifiers
    text = text.replace('\ufe0f', '')  # VS-16 (emoji presentation)
    text = text.replace('\ufe0e', '')  # VS-15 (text presentation)
    text = text.replace('\u200d', '')  # Zero width joiner
    
    return text


# COMPREHENSIVE EMOJI MAPPING
# Maps BOTH with and without variation selectors
PDF_UNICODE_MAP = {
    # ==========================================
    # WARNING SYMBOL - ALL VARIATIONS
    # ==========================================
    '⚠': '⚠',           # Base (U+26A0)
    '⚠️': '⚠',          # With VS-16
    '\u26a0': '⚠',     # Explicit base
    '\u26a0\ufe0f': '⚠',  # Explicit with VS
    
    # ==========================================
    # INFORMATION SYMBOL - ALL VARIATIONS
    # ==========================================
    'ℹ': 'ℹ',           # Base (U+2139)
    'ℹ️': 'ℹ',          # With VS-16
    '\u2139': 'ℹ',     # Explicit base
    '\u2139\ufe0f': 'ℹ',  # Explicit with VS
    
    # ==========================================
    # CHECK MARK - ALL VARIATIONS
    # ==========================================
    '✅': '✓',          # Check mark button (U+2705)
    '\u2705': '✓',
    '✓': '✓',           # Check mark (U+2713)
    '\u2713': '✓',
    
    # ==========================================
    # CROSS MARK - ALL VARIATIONS
    # ==========================================
    '❌': '✗',          # Cross mark (U+274C)
    '\u274c': '✗',
    '✗': '✗',           # Ballot X (U+2717)
    '\u2717': '✗',
    
    # ==========================================
    # AUDIO/MUSIC SYMBOLS - ALL VARIATIONS
    # ==========================================
    '🎵': '♪',          # Musical note (U+1F3B5)
    '\U0001f3b5': '♪',
    '🎧': '♪',          # Headphone (U+1F3A7)
    '\U0001f3a7': '♪',
    '🔊': '♪',          # Speaker high volume (U+1F50A) ← ESTE ES EL PROBLEMA
    '\U0001f50a': '♪',
    '♪': '♪',           # Eighth note (U+266A)
    '\u266a': '♪',
    
    # ==========================================
    # DIRECTIONAL ARROWS
    # ==========================================
    '→': '→',           # Rightwards arrow (U+2192)
    '\u2192': '→',
    '←': '←',
    '↑': '↑',
    '↓': '↓',
    
    # ==========================================
    # OTHER SYMBOLS
    # ==========================================
    '🎯': '★',          # Direct hit (U+1F3AF)
    '\U0001f3af': '★',
    '💡': 'ℹ',          # Light bulb (U+1F4A1)
    '\U0001f4a1': 'ℹ',
    '🔧': '⚙',          # Wrench (U+1F527)
    '\U0001f527': '⚙',
    '📋': '□',          # Clipboard (U+1F4CB)
    '\U0001f4cb': '□',
    '📊': '■',          # Bar chart (U+1F4CA)
    '\U0001f4ca': '■',
    '★': '★',           # Black star
    '⚙': '⚙',           # Gear
    '□': '□',           # White square
    
    # ==========================================
    # BLACK SQUARE - CONTEXT DEPENDENT
    # ==========================================
    # Keep ■ in map but we'll remove decorative usage in post-processing
    '■': '■',
    '\u25a0': '■',
    
    # ==========================================
    # DECORATIVE - REMOVE COMPLETELY
    # ==========================================
    '═': '',
    '─': '',
    '━': '',
    '\u2550': '',
    '\u2500': '',
    '\u2501': '',
}


def clean_text_for_pdf(text: str) -> str:
    """
    Ultra-robust emoji cleaning for PDF generation.
    
    Process:
    1. Normalize ALL emoji variations
    2. Apply comprehensive emoji→symbol mapping
    3. Remove decorative ■ at line starts
    4. Safety pass: replace any remaining unknown emojis with text
    
    Args:
        text: Original text with emojis
        
    Returns:
        Text with Unicode symbols compatible with ReportLab
    """
    if not text:
        return text
    
    # Step 1: Aggressive normalization
    text = normalize_emojis(text)
    
    # Step 2: Apply ALL mappings (including explicit codepoints)
    for emoji, symbol in PDF_UNICODE_MAP.items():
        if emoji in text:
            text = text.replace(emoji, symbol)
    
    # Step 3: Clean decorative ■ usage
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip lines that are ONLY ■
        if stripped == '■':
            continue
        
        # Remove ■ at START of line (decorative headers)
        # "■ Título" → "Título"
        # But keep: "Status: ■" (informational)
        if stripped.startswith('■ '):
            indent = len(line) - len(line.lstrip())
            line = ' ' * indent + stripped[2:]
        
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    # Step 4: SAFETY NET - Replace any remaining problematic characters
    # This catches emojis we might have missed
    
    # Pattern: High Unicode (emoji range)
    # U+1F000 to U+1FFFF (emoticons, symbols, etc.)
    emoji_pattern = re.compile(r'[\U0001F000-\U0001FFFF]+')
    
    def replace_unknown_emoji(match):
        # Replace unknown emoji with empty string
        # (They would become ■ in PDF anyway)
        return ''
    
    text = emoji_pattern.sub(replace_unknown_emoji, text)
    
    # Also replace the literal ■ character when it appears in wrong contexts
    # (Not in tables or after "Status:")
    lines = text.split('\n')
    for i, line in enumerate(lines):
        # If line has ■ but it's not in a status context, remove it
        if '■' in line and 'Status:' not in line and 'Estado:' not in line:
            # Check if it's a decorative line
            if line.strip() == '■' or line.strip().startswith('■'):
                lines[i] = line.replace('■', '')
    
    return '\n'.join(lines)


# =============================================================================
# TESTING & DEBUGGING
# =============================================================================

if __name__ == "__main__":
    print("="*75)
    print("Unicode Emoji Map - ULTRA ROBUST VERSION")
    print("="*75)
    
    # Test 1: Normalization
    print("\n🧪 Test 1: Normalization of variation selectors")
    print("-"*75)
    
    test_cases = [
        ('⚠️', 'Warning WITH selector'),
        ('⚠', 'Warning WITHOUT selector'),
        ('ℹ️', 'Info WITH selector'),
        ('ℹ', 'Info WITHOUT selector'),
        ('🔊', 'Speaker (becomes ■ if not mapped)'),
    ]
    
    for emoji, desc in test_cases:
        normalized = normalize_emojis(emoji)
        before_codes = ' '.join(f'U+{ord(c):04X}' for c in emoji)
        after_codes = ' '.join(f'U+{ord(c):04X}' for c in normalized)
        cleaned = clean_text_for_pdf(emoji)
        
        print(f"{emoji:3s} {desc:30s}")
        print(f"    Before: [{before_codes}]")
        print(f"    After:  [{after_codes}]")
        print(f"    Result: '{cleaned}'")
        print()
    
    # Test 2: Real content
    print("\n📄 Test 2: Real PDF content")
    print("-"*75)
    
    real_content = """■ Sobre "archivo.wav"

MÉTRICAS TÉCNICAS
LUFS (Integrated)    -8.7 LUFS    ■
Frequency Balance    Not analyzed ■

⚠️ Áreas a Mejorar:
• True Peak muy alto

ℹ️ Nota informativa

🔊 True Peak: Presente durante 19%

■ ANÁLISIS TEMPORAL:
"""
    
    print("BEFORE:")
    print(real_content)
    
    cleaned = clean_text_for_pdf(real_content)
    
    print("\nAFTER:")
    print(cleaned)
    
    # Count replacements
    differences = sum(1 for a, b in zip(real_content, cleaned) if a != b)
    print(f"\n📊 Characters changed: {differences}")
    
    # Check if ■ remains
    remaining_squares = cleaned.count('■')
    print(f"📊 Remaining ■: {remaining_squares}")
    
    if remaining_squares == 0:
        print("\n✅ SUCCESS: All black squares removed!")
    else:
        print(f"\n⚠️  {remaining_squares} black squares remain (check if intentional)")
    
    print("\n✅ Module ready for production!")
