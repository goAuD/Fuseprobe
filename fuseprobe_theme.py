"""
Fuseprobe Theme - CustomTkinter Theme
Unified color palette and UI settings for Fuseprobe.

Usage:
    from fuseprobe_theme import (
        FUSEPROBE_COLORS,
        FUSEPROBE_BUTTONS,
        FUSEPROBE_FONTS,
        apply_fuseprobe_theme,
    )
    apply_fuseprobe_theme(root)
"""

import customtkinter as ctk


# === Fuseprobe Color Palette ===
FUSEPROBE_COLORS = {
    # Backgrounds
    "bg_primary": "#050505",        # Window background
    "bg_secondary": "#0b0c0d",      # Text inputs / inset surfaces
    "bg_card": "#111316",           # Primary panel background
    "bg_card_alt": "#171a1f",       # Secondary panel background
    "bg_hover": "#1f2329",          # Hover state

    # Brand and semantic accents
    "accent_copper": "#c48a5a",     # Primary brand accent
    "accent_copper_hover": "#d89c69",
    "accent_copper_dim": "#7d5b3e",
    "accent_copper_soft": "#e7d7c6",
    "accent_graphite": "#2b2f36",   # Secondary surface accent
    "accent_graphite_hover": "#393e47",
    "accent_green": "#21c97a",
    "accent_red": "#ff5a70",
    "accent_orange": "#f0a048",
    "accent_purple": "#8775ff",

    # Text
    "text_primary": "#f5f5f2",
    "text_secondary": "#b8bcc4",
    "text_muted": "#7b818c",
    "text_link": "#d8a677",
    "text_on_accent": "#090909",

    # Borders
    "border": "#252931",
    "border_hover": "#383d47",

    # Semantic aliases
    "success": "#21c97a",
    "danger": "#ff5a70",
    "warning": "#f0a048",
    "neutral": "#2b2f36",
    "primary": "#c48a5a",
}


# === Button Presets ===
FUSEPROBE_BUTTONS = {
    "primary": {
        "fg_color": FUSEPROBE_COLORS["accent_copper"],
        "hover_color": FUSEPROBE_COLORS["accent_copper_hover"],
        "text_color": FUSEPROBE_COLORS["text_on_accent"],
    },
    "success": {
        "fg_color": FUSEPROBE_COLORS["accent_green"],
        "hover_color": "#28de87",
        "text_color": FUSEPROBE_COLORS["text_on_accent"],
    },
    "danger": {
        "fg_color": FUSEPROBE_COLORS["accent_red"],
        "hover_color": "#ff7385",
        "text_color": "#ffffff",
    },
    "warning": {
        "fg_color": FUSEPROBE_COLORS["accent_orange"],
        "hover_color": "#f7b66a",
        "text_color": FUSEPROBE_COLORS["text_on_accent"],
    },
    "secondary": {
        "fg_color": FUSEPROBE_COLORS["accent_graphite"],
        "hover_color": FUSEPROBE_COLORS["accent_graphite_hover"],
        "text_color": "#ffffff",
    },
    "ghost": {
        "fg_color": FUSEPROBE_COLORS["bg_card_alt"],
        "hover_color": FUSEPROBE_COLORS["bg_hover"],
        "border_color": FUSEPROBE_COLORS["border"],
        "border_width": 1,
        "text_color": FUSEPROBE_COLORS["text_primary"],
    },
}


# === Fonts ===
FUSEPROBE_FONTS = {
    # Headings
    "heading_xl": ("Roboto", 24, "bold"),
    "heading_lg": ("Roboto", 18, "bold"),
    "heading_md": ("Roboto", 16, "bold"),
    "heading_sm": ("Roboto", 14, "bold"),
    
    # Body
    "body": ("Roboto", 13),
    "body_small": ("Roboto", 11),
    
    # Monospace
    "mono": ("JetBrains Mono", 13),
    "mono_bold": ("JetBrains Mono", 13, "bold"),
    "mono_small": ("Consolas", 11),
    
    # Special
    "brand": ("Roboto", 10),        # Small app label
    "display": ("Roboto", 26, "bold"),
}


def apply_fuseprobe_theme(root: ctk.CTk = None):
    """
    Apply global Fuseprobe theme settings.
    
    Args:
        root: Optional CTk root window to configure background
    """
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    
    if root:
        root.configure(fg_color=FUSEPROBE_COLORS["bg_primary"])


def create_fuseprobe_button(
    master,
    text: str,
    style: str = "primary",
    **kwargs
) -> ctk.CTkButton:
    """
    Create a button with Fuseprobe styling.
    
    Args:
        master: Parent widget
        text: Button text
        style: One of 'primary', 'success', 'danger', 'warning', 'secondary', 'ghost'
        **kwargs: Additional CTkButton arguments
    
    Returns:
        CTkButton with Fuseprobe styling applied
    """
    preset = FUSEPROBE_BUTTONS.get(style, FUSEPROBE_BUTTONS["primary"])
    
    button_args = {
        "master": master,
        "text": text.upper(),
        "font": FUSEPROBE_FONTS["mono_bold"],
        "corner_radius": 10,
        "height": 42,
        "border_spacing": 6,
        **preset,
        **kwargs,
    }
    
    return ctk.CTkButton(**button_args)


def create_fuseprobe_frame(master, **kwargs) -> ctk.CTkFrame:
    """Create a Fuseprobe-styled card/frame."""
    return ctk.CTkFrame(
        master,
        fg_color=FUSEPROBE_COLORS["bg_card"],
        border_color=FUSEPROBE_COLORS["border"],
        border_width=1,
        corner_radius=8,
        **kwargs
    )


def create_fuseprobe_label(
    master,
    text: str,
    style: str = "body",
    **kwargs
) -> ctk.CTkLabel:
    """
    Create a label with Fuseprobe styling.
    
    Args:
        master: Parent widget
        text: Label text
        style: Font style key from FUSEPROBE_FONTS, or 'muted' for muted text
        **kwargs: Additional CTkLabel arguments
    
    Returns:
        CTkLabel with Fuseprobe styling applied
    """
    font = FUSEPROBE_FONTS.get(style, FUSEPROBE_FONTS["body"])
    color = (
        FUSEPROBE_COLORS["text_muted"]
        if style == "muted"
        else FUSEPROBE_COLORS["text_primary"]
    )
    
    return ctk.CTkLabel(
        master=master,
        text=text,
        font=font,
        text_color=color,
        **kwargs
    )


def create_fuseprobe_entry(master, placeholder: str = "", **kwargs) -> ctk.CTkEntry:
    """Create a Fuseprobe-styled input field."""
    return ctk.CTkEntry(
        master,
        placeholder_text=placeholder,
        font=FUSEPROBE_FONTS["mono"],
        fg_color=FUSEPROBE_COLORS["bg_secondary"],
        border_color=FUSEPROBE_COLORS["border"],
        text_color=FUSEPROBE_COLORS["text_primary"],
        corner_radius=6,
        **kwargs
    )


# Version
__version__ = "1.1.0"
