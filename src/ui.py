"""
Fuseprobe - UI Module
CustomTkinter user interface for API testing.
"""

import customtkinter as ctk
import threading
import logging
import re
import time

from src.presets import (
    AUTH_PRESETS,
    get_auth_preset_names, get_api_template_names,
    get_auth_preset_by_name, get_api_template_by_name,
)
from src.services.history_store import HistoryStore
from src.services.request_service import RequestService
from version import APP_LABEL, APP_NAME, APP_TAGLINE, VERSION

# Import Fuseprobe theme
try:
    from fuseprobe_theme import (
        FUSEPROBE_BUTTONS,
        FUSEPROBE_COLORS,
        FUSEPROBE_FONTS,
        apply_fuseprobe_theme,
    )
    apply_fuseprobe_theme()
except ImportError:
    # Fallback if fuseprobe_theme is not available
    import customtkinter as ctk
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")

    def apply_fuseprobe_theme(root=None):
        if root:
            root.configure(fg_color="#050505")

    FUSEPROBE_BUTTONS = {}
    FUSEPROBE_COLORS = {}
    FUSEPROBE_FONTS = {}

logger = logging.getLogger(__name__)

# Constants
MAX_HIGHLIGHT_LINES = 1000  # Performance limit for syntax highlighting

# Theme colors (from fuseprobe_theme.py)
COLORS = {
    "bg_primary": FUSEPROBE_COLORS.get("bg_primary", "#050505"),
    "bg_secondary": FUSEPROBE_COLORS.get("bg_secondary", "#0b0c0d"),
    "bg_card": FUSEPROBE_COLORS.get("bg_card", "#111316"),
    "bg_card_alt": FUSEPROBE_COLORS.get("bg_card_alt", "#171a1f"),
    "bg_hover": FUSEPROBE_COLORS.get("bg_hover", "#1f2329"),
    "border": FUSEPROBE_COLORS.get("border", "#252931"),
    "border_hover": FUSEPROBE_COLORS.get("border_hover", "#383d47"),
    "text_primary": FUSEPROBE_COLORS.get("text_primary", "#f5f5f2"),
    "text_secondary": FUSEPROBE_COLORS.get("text_secondary", "#b8bcc4"),
    "text_on_accent": FUSEPROBE_COLORS.get("text_on_accent", "#090909"),
    "success": FUSEPROBE_COLORS.get("accent_green", "#4caf50"),
    "danger": FUSEPROBE_COLORS.get("accent_red", "#ff5a70"),
    "warning": FUSEPROBE_COLORS.get("accent_orange", "#e67e22"),
    "neutral": FUSEPROBE_COLORS.get("neutral", "#2b2f36"),
    "primary": FUSEPROBE_COLORS.get("primary", "#c48a5a"),
    "primary_hover": FUSEPROBE_COLORS.get("accent_copper_hover", "#d89c69"),
    "muted": FUSEPROBE_COLORS.get("text_muted", "#7b818c"),
    "link": FUSEPROBE_COLORS.get("text_link", "#d8a677"),
    "special": FUSEPROBE_COLORS.get("accent_copper_dim", "#7d5b3e"),
    "string": FUSEPROBE_COLORS.get("accent_copper_soft", "#e7d7c6"),
}

LAYOUT = {
    "page_pad_x": 24,
    "page_pad_y": 18,
    "section_gap": 14,
    "card_gap": 12,
    "control_height": 44,
    "button_height": 42,
    "tab_height": 36,
}


class FuseprobeApp(ctk.CTk):
    """Main application window for the Fuseprobe API client."""
    
    def __init__(self):
        super().__init__()
        apply_fuseprobe_theme(self)
        
        # Window settings
        self.title(f"{APP_NAME} v{VERSION} - {APP_LABEL}")
        self.geometry("1120x820")
        self.minsize(980, 720)
        self.configure(fg_color=COLORS["bg_primary"])
        
        # History storage
        self.history_store = HistoryStore()
        self.request_service = RequestService()
        self.history = self.history_store.load()
        
        # Current tab
        self.current_tab = "response"
        self.tab_groups = {
            "primary": {"response", "body", "headers"},
            "secondary": {"presets", "history"},
        }
        
        # Grid layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1)  # Content area expands
        
        self.create_widgets()
        self.refresh_history_view()
        
        # Save history on close
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        
        logger.info(f"{APP_NAME} v{VERSION} started")

    def _create_panel(self, master, accent: bool = False, **kwargs) -> ctk.CTkFrame:
        """Create a panel with consistent Fuseprobe styling."""
        return ctk.CTkFrame(
            master,
            fg_color=COLORS["bg_card_alt"] if accent else COLORS["bg_card"],
            border_color=COLORS["border"],
            border_width=1,
            corner_radius=16,
            **kwargs,
        )

    def _create_textbox(self, master, **kwargs) -> ctk.CTkTextbox:
        """Create a styled text area with consistent colors and spacing."""
        return ctk.CTkTextbox(
            master,
            font=FUSEPROBE_FONTS.get("mono", ("Consolas", 13)),
            fg_color=COLORS["bg_secondary"],
            border_color=COLORS["border"],
            border_width=1,
            corner_radius=12,
            scrollbar_button_color=COLORS["neutral"],
            scrollbar_button_hover_color=COLORS["bg_hover"],
            text_color=COLORS["text_primary"],
            **kwargs,
        )

    def _create_button(self, master, text: str, style: str = "secondary", **kwargs) -> ctk.CTkButton:
        """Create a button with normalized sizing and text alignment."""
        preset = FUSEPROBE_BUTTONS.get(style, FUSEPROBE_BUTTONS.get("secondary", {})).copy()
        button = ctk.CTkButton(
            master,
            text=text,
            height=kwargs.pop("height", LAYOUT["button_height"]),
            corner_radius=kwargs.pop("corner_radius", 10),
            border_spacing=kwargs.pop("border_spacing", 6),
            font=kwargs.pop("font", FUSEPROBE_FONTS.get("body_small", ("Roboto", 11))),
            anchor=kwargs.pop("anchor", "center"),
            border_width=kwargs.pop("border_width", preset.pop("border_width", 0)),
            border_color=kwargs.pop("border_color", preset.pop("border_color", COLORS["border"])),
            text_color=kwargs.pop("text_color", preset.pop("text_color", COLORS["text_primary"])),
            fg_color=kwargs.pop("fg_color", preset.pop("fg_color", COLORS["neutral"])),
            hover_color=kwargs.pop("hover_color", preset.pop("hover_color", COLORS["bg_hover"])),
            **kwargs,
        )
        self._polish_button_text(button)
        return button

    def _polish_button_text(self, button: ctk.CTkButton):
        """Remove label chrome so button text sits more cleanly in the center."""
        button._draw()
        if getattr(button, "_text_label", None) is not None:
            button._text_label.configure(borderwidth=0, highlightthickness=0, padx=0, pady=0)

    def _enable_option_menu_autoclose(self, option_menu: ctk.CTkOptionMenu):
        """Make CTkOptionMenu act like a toggle on Windows."""
        dropdown = option_menu._dropdown_menu
        original_command = dropdown._command
        option_menu._fuseprobe_menu_open = False
        option_menu._fuseprobe_ignore_until = 0.0

        def wrapped_command(value: str):
            option_menu._fuseprobe_menu_open = False
            if original_command is not None:
                original_command(value)
            return "break"

        dropdown.configure(command=wrapped_command)

        def pointer_is_over_widget() -> bool:
            x = option_menu.winfo_pointerx()
            y = option_menu.winfo_pointery()
            left = option_menu.winfo_rootx()
            top = option_menu.winfo_rooty()
            right = left + option_menu.winfo_width()
            bottom = top + option_menu.winfo_height()
            return left <= x <= right and top <= y <= bottom

        def mark_open(_event=None):
            option_menu._fuseprobe_menu_open = True

        def mark_closed(_event=None):
            option_menu._fuseprobe_menu_open = False
            if pointer_is_over_widget():
                option_menu._fuseprobe_ignore_until = time.monotonic() + 0.2

        def toggle_dropdown(_event=None):
            if option_menu._state == "disabled" or len(option_menu._values) == 0:
                return "break"

            now = time.monotonic()
            if now < option_menu._fuseprobe_ignore_until:
                option_menu._fuseprobe_ignore_until = 0.0
                return "break"

            if option_menu._fuseprobe_menu_open:
                option_menu._fuseprobe_menu_open = False
                option_menu._fuseprobe_ignore_until = now + 0.2
                try:
                    dropdown.unpost()
                except Exception:
                    pass
                return "break"

            option_menu._fuseprobe_menu_open = True
            option_menu._open_dropdown_menu()
            return "break"

        dropdown.bind("<Map>", mark_open, add="+")
        dropdown.bind("<Unmap>", mark_closed, add="+")
        option_menu._canvas.bind("<Button-1>", toggle_dropdown)
        option_menu._text_label.bind("<Button-1>", toggle_dropdown)
    
    def create_widgets(self):
        """Create all UI widgets."""
        pad_x = LAYOUT["page_pad_x"]

        # 1. Header
        self.header_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.header_frame.grid(
            row=0,
            column=0,
            padx=pad_x,
            pady=(LAYOUT["page_pad_y"], 10),
            sticky="ew",
        )
        self.header_frame.grid_columnconfigure(1, weight=1)

        self.lbl_title = ctk.CTkLabel(
            self.header_frame,
            text=APP_NAME,
            font=FUSEPROBE_FONTS.get("display", ("Roboto", 26, "bold")),
            text_color=COLORS["text_primary"],
        )
        self.lbl_title.grid(row=0, column=0, sticky="w")

        self.lbl_subtitle = ctk.CTkLabel(
            self.header_frame,
            text=APP_TAGLINE,
            font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            text_color=COLORS["text_secondary"],
        )
        self.lbl_subtitle.grid(row=0, column=1, padx=(16, 0), sticky="w")

        self.lbl_app_label = ctk.CTkLabel(
            self.header_frame,
            text=APP_LABEL,
            font=FUSEPROBE_FONTS.get("brand", ("Roboto", 10)),
            text_color=COLORS["primary"],
        )
        self.lbl_app_label.grid(row=0, column=2, sticky="e")

        # 2. Control bar (Method + URL + Send)
        self.control_frame = self._create_panel(self)
        self.control_frame.grid(row=1, column=0, padx=pad_x, pady=0, sticky="ew")
        self.control_frame.grid_columnconfigure(1, weight=1)

        self.method_var = ctk.StringVar(value="GET")
        self.opt_method = ctk.CTkOptionMenu(
            self.control_frame,
            values=["GET", "POST", "PUT", "PATCH", "DELETE"],
            variable=self.method_var,
            width=116,
            height=LAYOUT["control_height"],
            corner_radius=10,
            fg_color=COLORS["neutral"],
            button_color=COLORS["primary"],
            button_hover_color=COLORS["primary_hover"],
            text_color=COLORS["text_primary"],
            dropdown_fg_color=COLORS["bg_card_alt"],
            dropdown_hover_color=COLORS["bg_hover"],
            dropdown_text_color=COLORS["text_primary"],
            font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            dropdown_font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            anchor="center",
        )
        self._enable_option_menu_autoclose(self.opt_method)
        self.opt_method.grid(row=0, column=0, padx=(14, 12), pady=14)

        self.entry_url = ctk.CTkEntry(
            self.control_frame,
            placeholder_text="Enter API URL (e.g., http://localhost:8080/api)",
            height=LAYOUT["control_height"],
            corner_radius=10,
            border_width=1,
            fg_color=COLORS["bg_secondary"],
            border_color=COLORS["border"],
            text_color=COLORS["text_primary"],
            placeholder_text_color=COLORS["muted"],
            font=FUSEPROBE_FONTS.get("mono", ("Consolas", 13)),
        )
        self.entry_url.grid(row=0, column=1, padx=(0, 12), pady=14, sticky="ew")
        self.entry_url.bind("<Return>", lambda e: self.send_request_thread())

        self.btn_send = self._create_button(
            self.control_frame,
            text="SEND",
            style="primary",
            width=118,
            font=FUSEPROBE_FONTS.get("heading_sm", ("Roboto", 14, "bold")),
            command=self.send_request_thread,
        )
        self.btn_send.grid(row=0, column=2, padx=(0, 10), pady=14)

        self.btn_clear = self._create_button(
            self.control_frame,
            text="CLEAR",
            style="ghost",
            width=92,
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            command=self.clear_response,
        )
        self.btn_clear.grid(row=0, column=3, padx=(0, 14), pady=14)

        # 3. Custom tab bar
        self.tab_bar = self._create_panel(self, accent=True)
        self.tab_bar.grid(
            row=2,
            column=0,
            padx=pad_x,
            pady=(LAYOUT["section_gap"], 0),
            sticky="ew",
        )
        self.tab_buttons = {}

        main_tabs = [
            ("response", "Response"),
            ("body", "Request Body"),
            ("headers", "Headers"),
        ]
        secondary_tabs = [
            ("presets", "Presets"),
            ("history", "History"),
        ]

        for key, label in main_tabs:
            btn = self._create_button(
                self.tab_bar,
                text=label,
                style="secondary",
                width=124,
                height=LAYOUT["tab_height"],
                font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
                command=lambda k=key: self.switch_tab(k),
            )
            btn.pack(side="left", padx=(10 if key == "response" else 0, 6), pady=10)
            self.tab_buttons[key] = btn

        spacer = ctk.CTkLabel(self.tab_bar, text="", fg_color="transparent")
        spacer.pack(side="left", expand=True)

        for index, (key, label) in enumerate(secondary_tabs):
            btn = self._create_button(
                self.tab_bar,
                text=label,
                style="secondary",
                width=118,
                height=LAYOUT["tab_height"],
                font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
                command=lambda k=key: self.switch_tab(k),
            )
            btn.pack(side="left", padx=(0, 6 if index == 0 else 10), pady=10)
            self.tab_buttons[key] = btn

        # 4. Content area (single frame, content swapped)
        self.content_frame = self._create_panel(self)
        self.content_frame.grid(
            row=3,
            column=0,
            padx=pad_x,
            pady=(LAYOUT["section_gap"], 10),
            sticky="nsew",
        )
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_rowconfigure(0, weight=1)

        self._create_response_content()
        self._create_body_content()
        self._create_headers_content()
        self._create_presets_content()
        self._create_history_content()

        # 5. Status bar
        self.status_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.status_frame.grid(row=4, column=0, padx=pad_x, pady=(0, 12), sticky="ew")
        self.status_frame.grid_columnconfigure(0, weight=1)

        self.lbl_status = ctk.CTkLabel(
            self.status_frame,
            text="Ready. Enter a URL and press SEND.",
            anchor="w",
            font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            text_color=COLORS["text_secondary"],
        )
        self.lbl_status.grid(row=0, column=0, sticky="w")

        self.lbl_count = ctk.CTkLabel(
            self.status_frame,
            text="0 requests",
            anchor="e",
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["muted"],
        )
        self.lbl_count.grid(row=0, column=1, sticky="e")
        self.switch_tab(self.current_tab)
    
    def _create_response_content(self):
        """Create response tab content."""
        self.response_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.response_frame.grid(row=0, column=0, sticky="nsew")
        self.response_frame.grid_columnconfigure(0, weight=1)
        self.response_frame.grid_rowconfigure(0, weight=1)

        self.txt_response = self._create_textbox(self.response_frame, wrap="word")
        self.txt_response.grid(row=0, column=0, sticky="nsew", padx=12, pady=12)
        self.txt_response.insert("0.0", "// Response will appear here\n// Press SEND or Enter to make a request\n\n// Quick start:\n// 1. Enter a URL or use Presets tab for templates\n// 2. Select HTTP method\n// 3. Press SEND or Enter\n\n// Try these test APIs:\n// https://httpbin.org/get\n// https://jsonplaceholder.typicode.com/posts/1")
    
    def _create_body_content(self):
        """Create request body tab content."""
        self.body_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.body_frame.grid(row=0, column=0, sticky="nsew")
        self.body_frame.grid_columnconfigure(0, weight=1)
        self.body_frame.grid_rowconfigure(0, weight=1)

        self.txt_body = self._create_textbox(self.body_frame)
        self.txt_body.grid(row=0, column=0, sticky="nsew", padx=12, pady=12)
        self.txt_body.insert("0.0", '{\n    "key": "value"\n}')
        
        self.body_frame.grid_remove()  # Hide initially
    
    def _create_headers_content(self):
        """Create headers tab content."""
        self.headers_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.headers_frame.grid(row=0, column=0, sticky="nsew")
        self.headers_frame.grid_columnconfigure(0, weight=1)
        self.headers_frame.grid_rowconfigure(0, weight=1)

        self.txt_headers = self._create_textbox(self.headers_frame)
        self.txt_headers.grid(row=0, column=0, sticky="nsew", padx=12, pady=12)
        self.txt_headers.insert("0.0", "Content-Type: application/json")
        
        self.headers_frame.grid_remove()  # Hide initially
    
    def _create_presets_content(self):
        """Create presets tab content with auth presets and API templates."""
        self.presets_frame = ctk.CTkScrollableFrame(
            self.content_frame,
            fg_color="transparent",
            scrollbar_button_color=COLORS["neutral"],
            scrollbar_button_hover_color=COLORS["bg_hover"],
        )
        self.presets_frame.grid(row=0, column=0, sticky="nsew")
        self.presets_frame.grid_columnconfigure(0, weight=1)
        self.presets_frame.grid_columnconfigure(1, weight=1)

        auth_section = self._create_panel(self.presets_frame, accent=True)
        auth_section.grid(row=0, column=0, sticky="nsew", padx=(12, 8), pady=(12, 8))
        auth_section.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            auth_section,
            text="Auth Presets",
            font=FUSEPROBE_FONTS.get("heading_sm", ("Roboto", 14, "bold")),
            text_color=COLORS["primary"],
        ).grid(row=0, column=0, padx=18, pady=(18, 4), sticky="w")

        ctk.CTkLabel(
            auth_section,
            text="Select an auth method to apply headers",
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["text_secondary"],
        ).grid(row=1, column=0, padx=18, pady=(0, 12), sticky="w")

        self.auth_preset_var = ctk.StringVar(value="No Auth")
        self.auth_dropdown = ctk.CTkOptionMenu(
            auth_section,
            values=get_auth_preset_names(),
            variable=self.auth_preset_var,
            width=240,
            height=LAYOUT["control_height"],
            corner_radius=10,
            fg_color=COLORS["neutral"],
            button_color=COLORS["primary"],
            button_hover_color=COLORS["primary_hover"],
            text_color=COLORS["text_primary"],
            dropdown_fg_color=COLORS["bg_card_alt"],
            dropdown_hover_color=COLORS["bg_hover"],
            dropdown_text_color=COLORS["text_primary"],
            font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            dropdown_font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            command=self._apply_auth_preset,
        )
        self._enable_option_menu_autoclose(self.auth_dropdown)
        self.auth_dropdown.grid(row=2, column=0, padx=18, pady=0, sticky="w")

        self.auth_desc_label = ctk.CTkLabel(
            auth_section,
            text="No authentication required",
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["muted"],
            wraplength=320,
            justify="left",
        )
        self.auth_desc_label.grid(row=3, column=0, padx=18, pady=(12, 18), sticky="w")

        template_section = self._create_panel(self.presets_frame, accent=True)
        template_section.grid(row=0, column=1, sticky="nsew", padx=(8, 12), pady=(12, 8))
        template_section.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            template_section,
            text="API Templates",
            font=FUSEPROBE_FONTS.get("heading_sm", ("Roboto", 14, "bold")),
            text_color=COLORS["primary"],
        ).grid(row=0, column=0, padx=18, pady=(18, 4), sticky="w")

        ctk.CTkLabel(
            template_section,
            text="Click to load template URL and auth",
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["text_secondary"],
        ).grid(row=1, column=0, padx=18, pady=(0, 12), sticky="w")

        button_list = ctk.CTkFrame(template_section, fg_color="transparent")
        button_list.grid(row=2, column=0, padx=18, pady=(0, 18), sticky="ew")
        button_list.grid_columnconfigure(0, weight=1)

        for index, name in enumerate(get_api_template_names()):
            template = get_api_template_by_name(name)
            btn = self._create_button(
                button_list,
                text=name,
                style="secondary",
                width=0,
                font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
                command=lambda t=template: self._apply_api_template(t),
            )
            btn.grid(row=index, column=0, pady=(0, 8 if index < len(get_api_template_names()) - 1 else 0), sticky="ew")

        self.template_examples_frame = self._create_panel(self.presets_frame)
        self.template_examples_frame.grid(
            row=1,
            column=0,
            columnspan=2,
            sticky="nsew",
            padx=12,
            pady=(4, 12),
        )

        self.template_examples_label = ctk.CTkLabel(
            self.template_examples_frame,
            text="Select a template to see example endpoints",
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["muted"],
        )
        self.template_examples_label.pack(padx=18, pady=18, anchor="w")

        self.presets_frame.grid_remove()  # Hide initially
    
    def _apply_auth_preset(self, preset_name: str):
        """Apply selected auth preset to headers."""
        preset = get_auth_preset_by_name(preset_name)
        if preset and preset.get("headers"):
            # Get current headers
            current = self.txt_headers.get("0.0", "end").strip()
            new_headers = []
            
            # Parse existing headers, remove Authorization if present
            for line in current.split('\n'):
                if ':' in line:
                    key = line.split(':', 1)[0].strip().lower()
                    if key not in ('authorization', 'x-api-key'):
                        new_headers.append(line)
            
            # Add preset headers
            for key, value in preset["headers"].items():
                new_headers.append(f"{key}: {value}")
            
            # Update headers textbox
            self.txt_headers.delete("0.0", "end")
            self.txt_headers.insert("0.0", '\n'.join(new_headers))
            
            # Update description
            desc = preset.get("description", "")
            if preset.get("docs"):
                desc += f"\nDocs: {preset['docs']}"
            self.auth_desc_label.configure(text=desc)

            self._set_status(f"Applied auth preset: {preset_name}", COLORS["special"])
        else:
            self.auth_desc_label.configure(text="No authentication required")
    
    def _apply_api_template(self, template: dict):
        """Apply API template to URL, method, and optionally auth."""
        base_url = template.get("base_url", "")
        
        # Set URL to first example or base URL
        examples = template.get("examples", [])
        if examples:
            first_example = examples[0]
            url = base_url + first_example.get("path", "")
            method = first_example.get("method", "GET")
        else:
            url = base_url
            method = "GET"
        
        # Update URL
        self.entry_url.delete(0, "end")
        self.entry_url.insert(0, url)
        
        # Update method
        self.method_var.set(method)
        
        # Apply auth preset if specified
        auth_key = template.get("auth", "none")
        if auth_key in AUTH_PRESETS:
            preset = AUTH_PRESETS[auth_key]
            self.auth_preset_var.set(preset["name"])
            self._apply_auth_preset(preset["name"])
        
        # Update examples display
        self._show_template_examples(template)
        
        self._set_status(f"Loaded template: {template.get('name', 'Unknown')}", COLORS["special"])
    
    def _show_template_examples(self, template: dict):
        """Show example endpoints for selected template."""
        for widget in self.template_examples_frame.winfo_children():
            widget.destroy()

        ctk.CTkLabel(
            self.template_examples_frame,
            text=f"{template.get('name', 'API')} - Example Endpoints",
            font=FUSEPROBE_FONTS.get("heading_sm", ("Roboto", 14, "bold")),
            text_color=COLORS["primary"],
        ).pack(padx=18, pady=(18, 4), anchor="w")

        if template.get("docs"):
            ctk.CTkLabel(
                self.template_examples_frame,
                text=f"Docs: {template['docs']}",
                font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
                text_color=COLORS["text_secondary"],
            ).pack(padx=18, anchor="w")

        examples = template.get("examples", [])
        for example in examples:
            btn_frame = ctk.CTkFrame(self.template_examples_frame, fg_color="transparent")
            btn_frame.pack(fill="x", padx=18, pady=(10, 0))
            btn_frame.grid_columnconfigure(1, weight=1)

            method = example.get("method", "GET")
            path = example.get("path", "/")
            desc = example.get("desc", "")

            method_color = {
                "GET": COLORS["primary"],
                "POST": COLORS["success"],
                "PUT": COLORS["warning"],
                "PATCH": COLORS["warning"],
                "DELETE": COLORS["danger"],
            }.get(method, COLORS["neutral"])

            ctk.CTkLabel(
                btn_frame,
                text=method,
                font=FUSEPROBE_FONTS.get("mono_small", ("Consolas", 11)),
                text_color=method_color,
                fg_color=COLORS["bg_secondary"],
                corner_radius=8,
                width=60,
                height=LAYOUT["button_height"],
            ).grid(row=0, column=0, padx=(0, 10), sticky="w")

            btn = self._create_button(
                btn_frame,
                text=f"{path}  -  {desc}",
                style="ghost",
                font=FUSEPROBE_FONTS.get("mono_small", ("Consolas", 11)),
                anchor="w",
                command=lambda t=template, e=example: self._load_example(t, e),
            )
            btn.grid(row=0, column=1, sticky="ew")
    
    def _load_example(self, template: dict, example: dict):
        """Load a specific example endpoint."""
        base_url = template.get("base_url", "")
        path = example.get("path", "")
        method = example.get("method", "GET")
        
        self.entry_url.delete(0, "end")
        self.entry_url.insert(0, base_url + path)
        self.method_var.set(method)
        
        self.switch_tab("response")
        self._set_status(f"Loaded: {method} {path}", COLORS["primary"])

    
    def _create_history_content(self):
        """Create history tab content."""
        self.history_frame = ctk.CTkScrollableFrame(
            self.content_frame,
            fg_color="transparent",
            scrollbar_button_color=COLORS["neutral"],
            scrollbar_button_hover_color=COLORS["bg_hover"],
        )
        self.history_frame.grid(row=0, column=0, sticky="nsew")
        self.history_frame.grid_columnconfigure(0, weight=1)
        self.lbl_history_empty = None
        
        self.history_frame.grid_remove()  # Hide initially
    
    def switch_tab(self, tab_key: str):
        """Switch between tabs."""
        self.current_tab = tab_key

        for key, btn in self.tab_buttons.items():
            if key == tab_key:
                btn.configure(
                    fg_color=COLORS["primary"],
                    hover_color=COLORS["primary_hover"],
                    text_color=COLORS["text_on_accent"],
                    border_width=0,
                    border_color=COLORS["primary"],
                )
            else:
                btn.configure(
                    fg_color=COLORS["neutral"],
                    hover_color=COLORS["bg_hover"],
                    text_color=COLORS["text_secondary"] if key in self.tab_groups["secondary"] else COLORS["text_primary"],
                    border_width=1,
                    border_color=COLORS["border"],
                )

        self.response_frame.grid_remove()
        self.body_frame.grid_remove()
        self.headers_frame.grid_remove()
        self.presets_frame.grid_remove()
        self.history_frame.grid_remove()

        if tab_key == "response":
            self.response_frame.grid()
        elif tab_key == "body":
            self.body_frame.grid()
        elif tab_key == "headers":
            self.headers_frame.grid()
        elif tab_key == "presets":
            self.presets_frame.grid()
        elif tab_key == "history":
            self.history_frame.grid()
    
    def apply_json_highlighting(self, textbox: ctk.CTkTextbox, content: str) -> bool:
        """Apply basic JSON syntax highlighting with performance limit."""
        textbox.delete("0.0", "end")
        textbox.insert("0.0", content)
        
        lines = content.split('\n')
        
        # Performance limit: skip highlighting for large JSON
        if len(lines) > MAX_HIGHLIGHT_LINES:
            logger.info(f"Skipping highlighting: {len(lines)} lines exceeds limit of {MAX_HIGHLIGHT_LINES}")
            return False
        
        # Define tags (colors aligned with the app theme)
        textbox._textbox.tag_configure("key", foreground=COLORS["warning"])
        textbox._textbox.tag_configure("string", foreground=COLORS["string"])
        textbox._textbox.tag_configure("number", foreground=COLORS["primary_hover"])
        textbox._textbox.tag_configure("boolean", foreground=COLORS["danger"])
        textbox._textbox.tag_configure("null", foreground=COLORS["special"])
        
        # Apply highlighting
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            # Keys (before colon)
            for match in re.finditer(r'"([^"]+)"\s*:', line):
                start = f"{line_num}.{match.start()}"
                end = f"{line_num}.{match.end()-1}"
                textbox._textbox.tag_add("key", start, end)
            
            # String values (after colon)
            for match in re.finditer(r':\s*"([^"]*)"', line):
                start = f"{line_num}.{match.start() + len(match.group(0)) - len(match.group(1)) - 1}"
                end = f"{line_num}.{match.end()}"
                textbox._textbox.tag_add("string", start, end)
            
            # Numbers
            for match in re.finditer(r':\s*(-?\d+\.?\d*)', line):
                start = f"{line_num}.{match.start(1)}"
                end = f"{line_num}.{match.end(1)}"
                textbox._textbox.tag_add("number", start, end)
            
            # Booleans
            for match in re.finditer(r'\b(true|false)\b', line, re.IGNORECASE):
                start = f"{line_num}.{match.start()}"
                end = f"{line_num}.{match.end()}"
                textbox._textbox.tag_add("boolean", start, end)
            
            # Null
            for match in re.finditer(r'\bnull\b', line, re.IGNORECASE):
                start = f"{line_num}.{match.start()}"
                end = f"{line_num}.{match.end()}"
                textbox._textbox.tag_add("null", start, end)

        return True
    
    def clear_response(self):
        """Clear the response text."""
        self.txt_response.delete("0.0", "end")
        self.txt_response.insert("0.0", "// Cleared")
        self._set_status("Response cleared.", COLORS["muted"])

    def _set_status(self, text: str, color: str):
        """Update the status bar through a single styling path."""
        self.lbl_status.configure(text=text, text_color=color)

    def _status_color(self, status_code: int) -> str:
        """Return themed status color based on HTTP status code."""
        if 200 <= status_code < 300:
            return COLORS["success"]
        if 300 <= status_code < 400:
            return COLORS["warning"]
        return COLORS["danger"]
    
    def add_to_history(self, method: str, url: str, status_code: int, elapsed: float):
        """
        Add a request to history.
        
        Security Note: Only method, URL, status, elapsed time, and timestamp are saved.
        Headers and request body are intentionally NOT persisted to prevent
        leaking sensitive data (Authorization tokens, API keys, etc.).
        """
        self.history = self.history_store.add_entry(self.history, method, url, status_code, elapsed)
        self.save_history()
        self.refresh_history_view()

    def refresh_history_view(self):
        """Rebuild the history list from persisted items."""
        for widget in self.history_frame.winfo_children():
            widget.destroy()

        if not self.history:
            self.lbl_history_empty = ctk.CTkLabel(
                self.history_frame,
                text="No requests yet. Send a request to see history.",
                text_color=COLORS["muted"],
                font=FUSEPROBE_FONTS.get("body", ("Roboto", 13)),
            )
            self.lbl_history_empty.grid(row=0, column=0, pady=20)
        else:
            self.lbl_history_empty = None
            toolbar = ctk.CTkFrame(self.history_frame, fg_color="transparent")
            toolbar.grid(row=0, column=0, sticky="ew", padx=4, pady=(4, 12))
            toolbar.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(
                toolbar,
                text="Recent Requests",
                font=FUSEPROBE_FONTS.get("heading_sm", ("Roboto", 14, "bold")),
                text_color=COLORS["text_primary"],
            ).grid(row=0, column=0, sticky="w")

            clear_button = self._create_button(
                toolbar,
                text="Clear History",
                style="ghost",
                width=108,
                font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
                command=self.clear_history,
            )
            clear_button.grid(row=0, column=1, sticky="e")

            for row, item in enumerate(self.history, start=1):
                self._render_history_item(row, row - 1, item)

        self.lbl_count.configure(text=f"{len(self.history)} requests")

    def _render_history_item(self, row: int, history_index: int, item: dict):
        """Render a single history row."""
        method = item["method"]
        url = item["url"]
        status_code = item["status"]
        elapsed = item["elapsed"]
        color = self._status_color(status_code)

        item_frame = self._create_panel(self.history_frame, accent=True)
        item_frame.grid(row=row, column=0, sticky="ew", padx=4, pady=(0, 8))
        item_frame.grid_columnconfigure(1, weight=1)

        lbl_method = ctk.CTkLabel(
            item_frame,
            text=method,
            width=64,
            height=32,
            font=FUSEPROBE_FONTS.get("mono_small", ("Consolas", 11)),
            fg_color=COLORS["bg_secondary"],
            text_color=color,
            corner_radius=8,
        )
        lbl_method.grid(row=0, column=0, padx=(12, 10), pady=12)

        display_url = url[:60] + "..." if len(url) > 60 else url
        lbl_url = ctk.CTkLabel(
            item_frame,
            text=display_url,
            font=FUSEPROBE_FONTS.get("mono_small", ("Consolas", 11)),
            anchor="w",
            text_color=COLORS["text_primary"],
        )
        lbl_url.grid(row=0, column=1, padx=(0, 12), pady=12, sticky="w")

        lbl_status = ctk.CTkLabel(
            item_frame,
            text=str(status_code),
            width=50,
            font=FUSEPROBE_FONTS.get("mono_small", ("Consolas", 11)),
            text_color=color,
        )
        lbl_status.grid(row=0, column=2, padx=(0, 12), pady=12)

        lbl_time = ctk.CTkLabel(
            item_frame,
            text=f"{item.get('time', '--:--:--')} · {elapsed:.2f}s",
            width=110,
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            text_color=COLORS["muted"],
        )
        lbl_time.grid(row=0, column=3, padx=(0, 12), pady=12)

        btn_load = self._create_button(
            item_frame,
            text="Load",
            style="ghost",
            width=74,
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            command=lambda u=url, m=method: self.load_from_history(m, u),
        )
        btn_load.grid(row=0, column=4, padx=(0, 12), pady=10)

        btn_delete = self._create_button(
            item_frame,
            text="Delete",
            style="ghost",
            width=78,
            font=FUSEPROBE_FONTS.get("body_small", ("Roboto", 11)),
            command=lambda idx=history_index: self.delete_history_item(idx),
        )
        btn_delete.grid(row=0, column=5, padx=(0, 12), pady=10)
    
    def load_from_history(self, method: str, url: str):
        """Load a request from history."""
        self.method_var.set(method)
        self.entry_url.delete(0, "end")
        self.entry_url.insert(0, url)
        self.switch_tab("response")
        self._set_status(f"Loaded from history: {method} {url[:50]}...", COLORS["primary"])

    def delete_history_item(self, index: int):
        """Delete a single history entry and persist the change immediately."""
        self.history = self.history_store.delete_entry(self.history, index)
        self.save_history()
        self.refresh_history_view()
        self._set_status("History entry deleted.", COLORS["muted"])

    def clear_history(self):
        """Clear the full history and persist the empty state immediately."""
        self.history = self.history_store.clear()
        self.save_history()
        self.refresh_history_view()
        self._set_status("History cleared.", COLORS["muted"])
    
    def send_request_thread(self):
        """Start request in a separate thread to avoid UI freeze."""
        self._set_status("Sending request...", COLORS["primary"])
        self.btn_send.configure(state="disabled", text="...")
        threading.Thread(target=self._execute_request, daemon=True).start()
    
    def _execute_request(self):
        """Execute the API request (runs in background thread)."""
        method = self.method_var.get()
        url = self.entry_url.get().strip()
        payload = self.txt_body.get("0.0", "end").strip()
        headers_text = self.txt_headers.get("0.0", "end").strip()

        result = self.request_service.send(method, url, payload, headers_text)
        
        # Update UI (thread-safe via after)
        self.after(0, lambda: self._update_ui(result, method, url))
    
    def _update_ui(self, result, method: str, url: str):
        """Update UI with request result."""
        self.btn_send.configure(state="normal", text="SEND")

        if result.success:
            self._render_success_result(result, method, url)
            return

        self._render_error_result(result)

    def _render_response_body(self, result) -> list[str]:
        """Render the response body and return status suffixes for the status bar."""
        suffixes = []

        if result.is_json:
            highlighted = self.apply_json_highlighting(self.txt_response, result.body)
            if not highlighted:
                suffixes.append(f"Plain view (> {MAX_HIGHLIGHT_LINES} lines)")
        else:
            self.txt_response.delete("0.0", "end")
            self.txt_response.insert("0.0", result.body)

        if result.truncated:
            suffixes.append("Truncated")
        if result.is_binary:
            suffixes.append("Binary")

        return suffixes

    def _render_success_result(self, result, method: str, url: str):
        """Render a successful request and synchronize status/history/UI state."""
        status_text = f"Status: {result.status_code} {result.reason} | Time: {result.elapsed_seconds:.3f}s"
        suffixes = self._render_response_body(result)
        if suffixes:
            status_text += " | " + " | ".join(suffixes)

        self._set_status(status_text, self._status_color(result.status_code))
        self.add_to_history(method, url, result.status_code, result.elapsed_seconds)
        self.switch_tab("response")

    def _render_error_result(self, result):
        """Render a failed request without mutating request history."""
        self._set_status(f"Error: {result.error[:80]}...", COLORS["danger"])
        self.txt_response.delete("0.0", "end")
        self.txt_response.insert("0.0", f"Error:\n{result.error}")
        self.switch_tab("response")
    
    def save_history(self):
        """Save history to JSON file."""
        self.history_store.save(self.history)
    
    def on_close(self):
        """Handle window close event."""
        self.save_history()
        self.destroy()


def main():
    """Application entry point."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    app = FuseprobeApp()
    app.mainloop()


if __name__ == "__main__":
    main()

