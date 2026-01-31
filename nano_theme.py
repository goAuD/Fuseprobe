"""
Nano Design System - CustomTkinter Theme
Unified color palette and UI settings for the Nano Product Family.

Source: https://github.com/goAuD/NanoDesign

Usage:
    from nano_theme import NANO_COLORS, NANO_BUTTONS, NANO_FONTS, apply_nano_theme
    apply_nano_theme(root)
"""

import customtkinter as ctk


# === Nano Color Palette ===
NANO_COLORS = {
    # Background colors
    "bg_primary": "#0a0a0f",        # Main background - near black
    "bg_secondary": "#12121a",      # Secondary background
    "bg_card": "#1a1a24",           # Card/panel background
    "bg_hover": "#242430",          # Hover state
    
    # Accent colors
    "accent_cyan": "#00d4ff",       # Primary accent - cyan (Nano brand)
    "accent_magenta": "#ff00ff",    # Secondary - magenta
    "accent_green": "#00ff88",      # Success/Online (NanoGuard style)
    "accent_green_alt": "#4caf50",  # Success/Start (NanoServer style)
    "accent_red": "#ff3366",        # Error/Danger (NanoGuard style)
    "accent_red_alt": "#e74c3c",    # Error/Stop (NanoServer style)
    "accent_orange": "#e67e22",     # Warning/Restart
    "accent_yellow": "#ffcc00",     # Highlight/Warning
    "accent_purple": "#9b59b6",     # Special
    
    # Text colors
    "text_primary": "#ffffff",      # Primary text
    "text_secondary": "#a0a0b0",    # Secondary text
    "text_muted": "#606070",        # Muted text
    "text_link": "#00CED1",         # Links / Nano family text
    
    # Borders
    "border": "#2a2a3a",            # Default borders
    "border_hover": "#3a3a4a",      # Hover borders
    
    # Product-specific
    "laravel_red": "#ff2d20",       # Laravel color (NanoServer)
    
    # Semantic aliases
    "success": "#00ff88",
    "danger": "#ff3366",
    "warning": "#e67e22",
    "neutral": "#34495e",
    "primary": "#00d4ff",
}


# === Button Presets ===
NANO_BUTTONS = {
    "primary": {
        "fg_color": NANO_COLORS["accent_cyan"],
        "hover_color": "#00a8cc",
        "text_color": NANO_COLORS["bg_primary"],
    },
    "success": {
        "fg_color": NANO_COLORS["accent_green"],
        "hover_color": "#00cc66",
        "text_color": NANO_COLORS["bg_primary"],
    },
    "danger": {
        "fg_color": NANO_COLORS["accent_red"],
        "hover_color": "#cc2244",
        "text_color": "#ffffff",
    },
    "warning": {
        "fg_color": NANO_COLORS["accent_orange"],
        "hover_color": "#d35400",
        "text_color": "#ffffff",
    },
    "neutral": {
        "fg_color": NANO_COLORS["neutral"],
        "hover_color": "#3d566e",
        "text_color": "#ffffff",
    },
    "ghost": {
        "fg_color": "transparent",
        "hover_color": NANO_COLORS["bg_hover"],
        "border_color": NANO_COLORS["accent_cyan"],
        "border_width": 1,
        "text_color": NANO_COLORS["accent_cyan"],
    },
}


# === Fonts ===
NANO_FONTS = {
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
    "brand": ("Roboto", 10),        # Nano family label
    "display": ("Orbitron", 24),    # Display/logo font
}


def apply_nano_theme(root: ctk.CTk = None):
    """
    Apply global Nano theme settings.
    
    Args:
        root: Optional CTk root window to configure background
    """
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    
    if root:
        root.configure(fg_color=NANO_COLORS["bg_primary"])


def create_nano_button(
    master,
    text: str,
    style: str = "primary",
    **kwargs
) -> ctk.CTkButton:
    """
    Create a button with Nano styling.
    
    Args:
        master: Parent widget
        text: Button text
        style: One of 'primary', 'success', 'danger', 'warning', 'neutral', 'ghost'
        **kwargs: Additional CTkButton arguments
    
    Returns:
        CTkButton with Nano styling applied
    """
    preset = NANO_BUTTONS.get(style, NANO_BUTTONS["primary"])
    
    button_args = {
        "master": master,
        "text": text.upper(),
        "font": NANO_FONTS["mono_bold"],
        "corner_radius": 6,
        "height": 40,
        **preset,
        **kwargs,
    }
    
    return ctk.CTkButton(**button_args)


def create_nano_frame(master, **kwargs) -> ctk.CTkFrame:
    """Create a Nano-styled card/frame."""
    return ctk.CTkFrame(
        master,
        fg_color=NANO_COLORS["bg_card"],
        border_color=NANO_COLORS["border"],
        border_width=1,
        corner_radius=8,
        **kwargs
    )


def create_nano_label(
    master,
    text: str,
    style: str = "body",
    **kwargs
) -> ctk.CTkLabel:
    """
    Create a label with Nano styling.
    
    Args:
        master: Parent widget
        text: Label text
        style: Font style key from NANO_FONTS, or 'muted' for muted text
        **kwargs: Additional CTkLabel arguments
    
    Returns:
        CTkLabel with Nano styling applied
    """
    font = NANO_FONTS.get(style, NANO_FONTS["body"])
    color = NANO_COLORS["text_muted"] if style == "muted" else NANO_COLORS["text_primary"]
    
    return ctk.CTkLabel(
        master=master,
        text=text,
        font=font,
        text_color=color,
        **kwargs
    )


def create_nano_entry(master, placeholder: str = "", **kwargs) -> ctk.CTkEntry:
    """Create a Nano-styled input field."""
    return ctk.CTkEntry(
        master,
        placeholder_text=placeholder,
        font=NANO_FONTS["mono"],
        fg_color=NANO_COLORS["bg_secondary"],
        border_color=NANO_COLORS["border"],
        text_color=NANO_COLORS["text_primary"],
        corner_radius=6,
        **kwargs
    )


# Version
__version__ = "1.1.0"
