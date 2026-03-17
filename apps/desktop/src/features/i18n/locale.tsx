import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ApiTemplateKey,
  AuthPresetKey,
} from "../presets/presets";
import type {
  CommandErrorCode,
  PersistenceWarningCode,
  RequestPolicyCode,
} from "../../lib/contracts";

export type LocaleCode = "en" | "de" | "hu";
export const LOCALE_STORAGE_KEY = "fuseprobe.locale";

export interface LocaleStrings {
  app: {
    brandSubtitle: string;
    requestMethodAriaLabel: string;
    requestMethodOptionsLabel: string;
    requestUrlAriaLabel: string;
    requestUrlPlaceholder: string;
    send: string;
    sending: string;
    interfaceLanguageLabel: string;
    languageOptionsLabel: string;
    dismissNotice: string;
  };
  request: {
    title: string;
    meta: string;
    tabs: {
      body: string;
      headers: string;
      auth: string;
    };
    bodyLabel: string;
    headersLabel: string;
    bodyPlaceholder: string;
    headersPlaceholder: string;
    authPresetLabel: string;
    manualRequest: string;
    fromTemplate: (templateName: string) => string;
  };
  response: {
    title: string;
    meta: string;
    tabs: {
      response: string;
      headers: string;
      raw: string;
    };
    requestError: string;
    working: string;
    noHeadersYet: string;
    noRawYet: string;
    policies: Record<RequestPolicyCode, string>;
    binaryResponseOmitted: (contentType: string, byteCount: number) => string;
    outputTruncated: (byteCount: number) => string;
    redirectNotFollowed: (location: string) => string;
  };
  history: {
    title: string;
    deviceOnly: string;
    clear: string;
    templates: string;
    loading: string;
    empty: string;
    remove: string;
    pending: string;
  };
  security: {
    title: string;
    meta: string;
    loading: string;
    unsafeTargets: {
      label: string;
      description: string;
      riskLabel: string;
      riskTitle: string;
      confirmationTitle: string;
      confirmationMessage: string;
    };
    persistHistory: {
      label: string;
      description: string;
      riskLabel: string;
      riskTitle: string;
      confirmationTitle: string;
      confirmationMessage: string;
    };
    riskBadge: string;
    enabled: string;
    disabled: string;
    saving: string;
    confirmOk: string;
    confirmCancel: string;
  };
  hooks: {
    idleStatus: string;
    idleResponseText: string;
    enterUrlBeforeSending: string;
    requestAlreadyInProgress: string;
    requestFailed: string;
    failedToLoadDesktopHistory: string;
    failedToRemoveHistoryEntry: string;
    failedToClearHistory: string;
    failedToLoadSecuritySettings: string;
    failedToUpdateSecuritySettings: string;
  };
  presets: {
    auth: Record<AuthPresetKey, {
      name: string;
      description: string;
    }>;
    templates: Record<ApiTemplateKey, {
      name: string;
      description: string;
    }>;
  };
  messages: {
    errors: Record<CommandErrorCode, string>;
    warnings: Record<PersistenceWarningCode, string>;
  };
}

const LOCALE_STRINGS: Record<LocaleCode, LocaleStrings> = {
  en: {
    app: {
      brandSubtitle: "Offline API Client",
      requestMethodAriaLabel: "Request method",
      requestMethodOptionsLabel: "Request method options",
      requestUrlAriaLabel: "Request URL",
      requestUrlPlaceholder: "https://api.example.com/users?limit=20",
      send: "Send",
      sending: "Sending...",
      interfaceLanguageLabel: "Interface language",
      languageOptionsLabel: "Language options",
      dismissNotice: "Dismiss notice",
    },
    request: {
      title: "Request",
      meta: "body · headers · auth",
      tabs: {
        body: "Body",
        headers: "Headers",
        auth: "Auth",
      },
      bodyLabel: "Request Body",
      headersLabel: "Request Headers",
      bodyPlaceholder: '{"include":["profile"]}',
      headersPlaceholder: "Accept: application/json\nX-Workspace: local-dev",
      authPresetLabel: "Auth Preset",
      manualRequest: "manual request",
      fromTemplate: (templateName: string) => `from ${templateName}`,
    },
    response: {
      title: "Response",
      meta: "formatted view first, raw when needed",
      tabs: {
        response: "Response",
        headers: "Headers",
        raw: "Raw",
      },
      requestError: "Request Error",
      working: "working...",
      noHeadersYet: "No response headers yet.",
      noRawYet: "No raw response yet.",
      policies: {
        redirects_disabled: "redirects disabled by policy",
      },
      binaryResponseOmitted: (contentType: string, byteCount: number) =>
        `[Binary response omitted: ${contentType}, ${byteCount} bytes]`,
      outputTruncated: (byteCount: number) =>
        `[Output truncated at ${byteCount} bytes to keep Fuseprobe responsive.]`,
      redirectNotFollowed: (location: string) =>
        `Redirect not followed. Location: ${location}`,
    },
    history: {
      title: "History",
      deviceOnly: "device only",
      clear: "Clear",
      templates: "Templates",
      loading: "Loading local history...",
      empty: "History is empty.",
      remove: "Remove",
      pending: "pending",
    },
    security: {
      title: "Security Defaults",
      meta: "explicit opt-in only",
      loading: "Loading local security settings...",
      unsafeTargets: {
        label: "Unsafe mode / Local targets",
        description:
          "Keeps localhost, private, link-local, and metadata-style targets blocked unless you explicitly opt in.",
        riskLabel:
          "Blocked by default to reduce accidental local-network and metadata probing.",
        riskTitle:
          "Allows requests to localhost, private IP ranges, link-local targets, and metadata-style endpoints. Enable only when you intentionally need local or internal targets.",
        confirmationTitle: "Enable Unsafe mode / Local targets?",
        confirmationMessage:
          "This allows requests to localhost, private IP ranges, link-local targets, and metadata-style endpoints. Use it only when you intentionally need local or internal targets on this device.",
      },
      persistHistory: {
        label: "History persistence",
        description:
          "Keeps request history session-only unless you explicitly allow local persistence on this device.",
        riskLabel:
          "Off by default so request activity is not written to disk unless you choose it.",
        riskTitle:
          "Stores redacted request history on this device under the local app config directory. Enable only if you accept local persistence for this workstation.",
        confirmationTitle: "Enable History persistence?",
        confirmationMessage:
          "This stores redacted request history on this device. Use it only if you accept local persistence for this workstation.",
      },
      riskBadge: "Risk",
      enabled: "Enabled",
      disabled: "Disabled",
      saving: "Saving...",
      confirmOk: "OK",
      confirmCancel: "Cancel",
    },
    hooks: {
      idleStatus: "Idle",
      idleResponseText: "Send a request to preview the desktop request flow.",
      enterUrlBeforeSending: "Enter a request URL before sending.",
      requestAlreadyInProgress: "A request is already in progress.",
      requestFailed: "Request failed.",
      failedToLoadDesktopHistory: "Failed to load desktop history.",
      failedToRemoveHistoryEntry: "Failed to remove history entry.",
      failedToClearHistory: "Failed to clear history.",
      failedToLoadSecuritySettings: "Failed to load security settings.",
      failedToUpdateSecuritySettings: "Failed to update security settings.",
    },
    presets: {
      auth: {
        none: {
          name: "No Auth",
          description: "No authentication",
        },
        bearer: {
          name: "Bearer Token",
          description: "JWT or OAuth2 bearer token",
        },
        basic: {
          name: "Basic Auth",
          description: "Base64 encoded username:password",
        },
        api_key_header: {
          name: "API Key (Header)",
          description: "API key in X-Api-Key header",
        },
        api_key_auth: {
          name: "API Key (Authorization)",
          description: "API key in Authorization header",
        },
      },
      templates: {
        open_meteo: {
          name: "Open-Meteo",
          description: "Public weather forecast API",
        },
        microsoft_graph: {
          name: "Microsoft Graph API",
          description: "Microsoft 365 & Azure AD API",
        },
        github: {
          name: "GitHub API",
          description: "GitHub REST API v3",
        },
        jsonplaceholder: {
          name: "JSONPlaceholder",
          description: "Free fake REST API for testing",
        },
        httpbin: {
          name: "HTTPBin",
          description: "HTTP request & response testing",
        },
        reqres: {
          name: "ReqRes",
          description: "Fake API for testing with auth flows",
        },
      },
    },
    messages: {
      errors: {
        request_in_progress: "A request is already in progress.",
        request_invalid_url: "Invalid request URL.",
        request_unsafe_target: "Local and private targets are blocked by default.",
        request_invalid_body: "Request body is not valid.",
        request_body_too_large: "Request body is too large.",
        request_invalid_headers: "Request headers are not valid.",
        request_headers_too_large: "Request headers are too large.",
        request_timeout: "Request timed out.",
        request_connection_local_unavailable: "Allowed local target did not respond.",
        request_connection_failed: "Unable to reach the target.",
        request_failed: "Request failed.",
        request_worker_failed: "Desktop request worker failed.",
        history_unavailable: "History state is unavailable.",
        settings_unavailable: "Security settings are unavailable.",
        settings_save_unavailable: "Local settings storage is unavailable.",
        settings_save_failed: "Failed to save security settings.",
        persistence_warning_unavailable: "Persistence warning state is unavailable.",
      },
      warnings: {
        config_dir_unavailable:
          "Fuseprobe could not resolve a local config directory. Persistent settings and history are unavailable.",
        settings_parse_failed:
          "Security settings could not be read. Safe defaults were restored.",
        history_load_failed:
          "History could not be loaded from disk. The current session will start empty.",
        history_parse_failed:
          "Saved history could not be parsed. The current session will start empty.",
        history_path_unavailable:
          "Persistent history is enabled, but Fuseprobe could not resolve a local storage path.",
        history_save_failed:
          "Persistent history could not be saved. Session history remains available.",
        history_remove_failed:
          "Persistent history could not be removed. Session-only history remains active.",
      },
    },
  },
  de: {
    app: {
      brandSubtitle: "Offline-API-Client",
      requestMethodAriaLabel: "Anfragemethode",
      requestMethodOptionsLabel: "Optionen für Anfragemethoden",
      requestUrlAriaLabel: "Anfrage-URL",
      requestUrlPlaceholder: "https://api.example.com/users?limit=20",
      send: "Senden",
      sending: "Sende...",
      interfaceLanguageLabel: "Sprache der Oberfläche",
      languageOptionsLabel: "Sprachoptionen",
      dismissNotice: "Hinweis schließen",
    },
    request: {
      title: "Anfrage",
      meta: "Body · Header · Auth",
      tabs: {
        body: "Body",
        headers: "Header",
        auth: "Auth",
      },
      bodyLabel: "Request-Body",
      headersLabel: "Request-Header",
      bodyPlaceholder: '{"include":["profile"]}',
      headersPlaceholder: "Accept: application/json\nX-Workspace: local-dev",
      authPresetLabel: "Auth-Vorgabe",
      manualRequest: "manuelle Anfrage",
      fromTemplate: (templateName: string) => `aus ${templateName}`,
    },
    response: {
      title: "Antwort",
      meta: "erst formatiert, roh bei Bedarf",
      tabs: {
        response: "Antwort",
        headers: "Header",
        raw: "Roh",
      },
      requestError: "Anfragefehler",
      working: "läuft...",
      noHeadersYet: "Noch keine Antwort-Header.",
      noRawYet: "Noch keine Rohantwort.",
      policies: {
        redirects_disabled: "Weiterleitungen sind per Richtlinie deaktiviert",
      },
      binaryResponseOmitted: (contentType: string, byteCount: number) =>
        `[Binäre Antwort ausgelassen: ${contentType}, ${byteCount} Bytes]`,
      outputTruncated: (byteCount: number) =>
        `[Ausgabe bei ${byteCount} Bytes abgeschnitten, damit Fuseprobe reaktionsfähig bleibt.]`,
      redirectNotFollowed: (location: string) =>
        `Weiterleitung nicht gefolgt. Ziel: ${location}`,
    },
    history: {
      title: "Verlauf",
      deviceOnly: "nur dieses Gerät",
      clear: "Leeren",
      templates: "Vorlagen",
      loading: "Lokalen Verlauf laden...",
      empty: "Verlauf ist leer.",
      remove: "Entfernen",
      pending: "ausstehend",
    },
    security: {
      title: "Sicherheitsstandards",
      meta: "nur per explizitem Opt-in",
      loading: "Lokale Sicherheitseinstellungen werden geladen...",
      unsafeTargets: {
        label: "Unsicherer Modus / Lokale Ziele",
        description:
          "Blockiert localhost-, private, link-lokale und metadata-ähnliche Ziele, bis du sie ausdrücklich erlaubst.",
        riskLabel:
          "Standardmäßig blockiert, um versehentliche Prüfungen lokaler Netze und Metadata-Endpunkte zu reduzieren.",
        riskTitle:
          "Erlaubt Anfragen an localhost, private IP-Bereiche, link-lokale Ziele und metadata-ähnliche Endpunkte. Nur aktivieren, wenn du lokale oder interne Ziele bewusst brauchst.",
        confirmationTitle: "Unsicheren Modus / Lokale Ziele aktivieren?",
        confirmationMessage:
          "Damit werden Anfragen an localhost, private IP-Bereiche, link-lokale Ziele und metadata-ähnliche Endpunkte erlaubt. Nur nutzen, wenn du solche Ziele auf diesem Gerät bewusst brauchst.",
      },
      persistHistory: {
        label: "Verlauf speichern",
        description:
          "Hält den Anfrageverlauf sitzungsbasiert, bis du lokale Speicherung auf diesem Gerät ausdrücklich erlaubst.",
        riskLabel:
          "Standardmäßig aus, damit Aktivität nicht auf die Festplatte geschrieben wird, solange du es nicht erlaubst.",
        riskTitle:
          "Speichert redigierten Anfrageverlauf lokal im App-Konfigurationsverzeichnis. Nur aktivieren, wenn du lokale Speicherung für diese Workstation akzeptierst.",
        confirmationTitle: "Verlaufsspeicherung aktivieren?",
        confirmationMessage:
          "Dadurch wird redigierter Anfrageverlauf lokal auf diesem Gerät gespeichert. Nur nutzen, wenn du lokale Speicherung auf dieser Workstation akzeptierst.",
      },
      riskBadge: "Risiko",
      enabled: "Aktiv",
      disabled: "Inaktiv",
      saving: "Speichere...",
      confirmOk: "OK",
      confirmCancel: "Abbrechen",
    },
    hooks: {
      idleStatus: "Bereit",
      idleResponseText: "Sende eine Anfrage, um den Desktop-Request-Flow zu prüfen.",
      enterUrlBeforeSending: "Gib vor dem Senden eine Anfrage-URL ein.",
      requestAlreadyInProgress: "Eine Anfrage läuft bereits.",
      requestFailed: "Anfrage fehlgeschlagen.",
      failedToLoadDesktopHistory: "Desktop-Verlauf konnte nicht geladen werden.",
      failedToRemoveHistoryEntry: "Verlaufseintrag konnte nicht entfernt werden.",
      failedToClearHistory: "Verlauf konnte nicht geleert werden.",
      failedToLoadSecuritySettings: "Sicherheitseinstellungen konnten nicht geladen werden.",
      failedToUpdateSecuritySettings: "Sicherheitseinstellungen konnten nicht aktualisiert werden.",
    },
    presets: {
      auth: {
        none: {
          name: "Keine Auth",
          description: "Keine Authentifizierung",
        },
        bearer: {
          name: "Bearer-Token",
          description: "JWT- oder OAuth2-Bearer-Token",
        },
        basic: {
          name: "Basic Auth",
          description: "Base64-codiertes username:password",
        },
        api_key_header: {
          name: "API-Schlüssel (Header)",
          description: "API-Schlüssel im X-Api-Key-Header",
        },
        api_key_auth: {
          name: "API-Schlüssel (Authorization)",
          description: "API-Schlüssel im Authorization-Header",
        },
      },
      templates: {
        open_meteo: {
          name: "Open-Meteo",
          description: "Öffentliche Wettervorhersage-API",
        },
        microsoft_graph: {
          name: "Microsoft Graph API",
          description: "Microsoft-365- und Azure-AD-API",
        },
        github: {
          name: "GitHub API",
          description: "GitHub-REST-API v3",
        },
        jsonplaceholder: {
          name: "JSONPlaceholder",
          description: "Freie Fake-REST-API für Tests",
        },
        httpbin: {
          name: "HTTPBin",
          description: "HTTP-Request- und Response-Tests",
        },
        reqres: {
          name: "ReqRes",
          description: "Fake-API zum Testen von Auth-Flows",
        },
      },
    },
    messages: {
      errors: {
        request_in_progress: "Eine Anfrage läuft bereits.",
        request_invalid_url: "Ungültige Anfrage-URL.",
        request_unsafe_target: "Lokale und private Ziele sind standardmäßig blockiert.",
        request_invalid_body: "Der Request-Body ist ungültig.",
        request_body_too_large: "Der Request-Body ist zu groß.",
        request_invalid_headers: "Die Request-Header sind ungültig.",
        request_headers_too_large: "Die Request-Header sind zu groß.",
        request_timeout: "Zeitüberschreitung bei der Anfrage.",
        request_connection_local_unavailable: "Ein erlaubtes lokales Ziel hat nicht geantwortet.",
        request_connection_failed: "Das Ziel konnte nicht erreicht werden.",
        request_failed: "Anfrage fehlgeschlagen.",
        request_worker_failed: "Der Desktop-Request-Worker ist fehlgeschlagen.",
        history_unavailable: "Der Verlaufszustand ist nicht verfügbar.",
        settings_unavailable: "Die Sicherheitseinstellungen sind nicht verfügbar.",
        settings_save_unavailable: "Der lokale Settings-Speicher ist nicht verfügbar.",
        settings_save_failed: "Die Sicherheitseinstellungen konnten nicht gespeichert werden.",
        persistence_warning_unavailable: "Der Zustand der Persistenzwarnung ist nicht verfügbar.",
      },
      warnings: {
        config_dir_unavailable:
          "Fuseprobe konnte kein lokales Konfigurationsverzeichnis auflösen. Persistente Einstellungen und Verlauf sind nicht verfügbar.",
        settings_parse_failed:
          "Sicherheitseinstellungen konnten nicht gelesen werden. Sichere Standardwerte wurden wiederhergestellt.",
        history_load_failed:
          "Der Verlauf konnte nicht vom Datenträger geladen werden. Die aktuelle Sitzung startet leer.",
        history_parse_failed:
          "Der gespeicherte Verlauf konnte nicht gelesen werden. Die aktuelle Sitzung startet leer.",
        history_path_unavailable:
          "Persistenter Verlauf ist aktiviert, aber Fuseprobe konnte keinen lokalen Speicherpfad auflösen.",
        history_save_failed:
          "Persistenter Verlauf konnte nicht gespeichert werden. Der Sitzungsverlauf bleibt verfügbar.",
        history_remove_failed:
          "Persistenter Verlauf konnte nicht entfernt werden. Der sitzungsbasierte Verlauf bleibt aktiv.",
      },
    },
  },
  hu: {
    app: {
      brandSubtitle: "Offline API kliens",
      requestMethodAriaLabel: "Kérés metódusa",
      requestMethodOptionsLabel: "Kérés metódusai",
      requestUrlAriaLabel: "Kérés URL",
      requestUrlPlaceholder: "https://api.example.com/users?limit=20",
      send: "Küldés",
      sending: "Küldés...",
      interfaceLanguageLabel: "Felület nyelve",
      languageOptionsLabel: "Nyelvi opciók",
      dismissNotice: "Értesítés bezárása",
    },
    request: {
      title: "Kérés",
      meta: "body · header · auth",
      tabs: {
        body: "Body",
        headers: "Headerek",
        auth: "Auth",
      },
      bodyLabel: "Kérés törzs",
      headersLabel: "Kérés headerek",
      bodyPlaceholder: '{"include":["profile"]}',
      headersPlaceholder: "Accept: application/json\nX-Workspace: local-dev",
      authPresetLabel: "Auth preset",
      manualRequest: "kézi kérés",
      fromTemplate: (templateName: string) => `${templateName} sablonból`,
    },
    response: {
      title: "Válasz",
      meta: "előbb formázott nézet, nyers csak ha kell",
      tabs: {
        response: "Válasz",
        headers: "Headerek",
        raw: "Nyers",
      },
      requestError: "Kéréshiba",
      working: "folyamatban...",
      noHeadersYet: "Még nincs válasz fejléc.",
      noRawYet: "Még nincs nyers válasz.",
      policies: {
        redirects_disabled: "az átirányítások policy alapján tiltva vannak",
      },
      binaryResponseOmitted: (contentType: string, byteCount: number) =>
        `[Bináris válasz kihagyva: ${contentType}, ${byteCount} bájt]`,
      outputTruncated: (byteCount: number) =>
        `[A kimenet ${byteCount} bájtnál le lett vágva, hogy a Fuseprobe reszponzív maradjon.]`,
      redirectNotFollowed: (location: string) =>
        `Az átirányítás nem lett követve. Cél: ${location}`,
    },
    history: {
      title: "Előzmények",
      deviceOnly: "csak ezen az eszközön",
      clear: "Törlés",
      templates: "Sablonok",
      loading: "Lokális előzmények betöltése...",
      empty: "Az előzmények üresek.",
      remove: "Eltávolítás",
      pending: "függőben",
    },
    security: {
      title: "Biztonsági alapértékek",
      meta: "csak explicit opt-innel",
      loading: "Lokális biztonsági beállítások betöltése...",
      unsafeTargets: {
        label: "Unsafe mode / Lokális célpontok",
        description:
          "A localhost, privát, link-local és metadata jellegű célpontok tiltva maradnak, amíg ezt külön nem engedélyezed.",
        riskLabel:
          "Alapból tiltva, hogy csökkenjen a véletlen lokális hálózati és metadata probing kockázata.",
        riskTitle:
          "Lehetővé teszi a localhost, privát IP-tartományok, link-local célpontok és metadata jellegű végpontok elérését. Csak akkor kapcsold be, ha tényleg szükséged van lokális vagy belső célpontokra.",
        confirmationTitle: "Bekapcsolod az Unsafe mode / Lokális célpontok opciót?",
        confirmationMessage:
          "Ezzel engedélyezed a localhost, privát IP-tartományok, link-local célpontok és metadata jellegű végpontok elérését. Csak akkor használd, ha ezen az eszközön tudatosan szükséged van rá.",
      },
      persistHistory: {
        label: "Előzmények mentése",
        description:
          "A request history csak session-szintű marad, amíg külön nem engedélyezed a lokális mentést ezen az eszközön.",
        riskLabel:
          "Alapból kikapcsolt, hogy a kérésaktivitás ne íródjon lemezre, amíg ezt külön nem választod.",
        riskTitle:
          "Redaktált kéréselőzményeket tárol ezen az eszközön, a helyi app config könyvtárban. Csak akkor kapcsold be, ha ezt ezen a gépen elfogadod.",
        confirmationTitle: "Bekapcsolod az előzmények mentését?",
        confirmationMessage:
          "Ezzel redaktált kéréselőzmény kerül helyileg mentésre ezen az eszközön. Csak akkor használd, ha ezt ezen a workstationön elfogadod.",
      },
      riskBadge: "Kockázat",
      enabled: "Bekapcsolva",
      disabled: "Kikapcsolva",
      saving: "Mentés...",
      confirmOk: "OK",
      confirmCancel: "Mégse",
    },
    hooks: {
      idleStatus: "Üresjárat",
      idleResponseText: "Küldj egy kérést a desktop request flow előnézetéhez.",
      enterUrlBeforeSending: "Adj meg egy kérés URL-t küldés előtt.",
      requestAlreadyInProgress: "Már fut egy kérés.",
      requestFailed: "A kérés sikertelen volt.",
      failedToLoadDesktopHistory: "Nem sikerült betölteni a desktop előzményeket.",
      failedToRemoveHistoryEntry: "Nem sikerült eltávolítani az előzménybejegyzést.",
      failedToClearHistory: "Nem sikerült törölni az előzményeket.",
      failedToLoadSecuritySettings: "Nem sikerült betölteni a biztonsági beállításokat.",
      failedToUpdateSecuritySettings: "Nem sikerült frissíteni a biztonsági beállításokat.",
    },
    presets: {
      auth: {
        none: {
          name: "Nincs auth",
          description: "Nincs hitelesítés",
        },
        bearer: {
          name: "Bearer token",
          description: "JWT vagy OAuth2 bearer token",
        },
        basic: {
          name: "Basic auth",
          description: "Base64 kódolt username:password",
        },
        api_key_header: {
          name: "API kulcs (header)",
          description: "API kulcs az X-Api-Key headerben",
        },
        api_key_auth: {
          name: "API kulcs (Authorization)",
          description: "API kulcs az Authorization headerben",
        },
      },
      templates: {
        open_meteo: {
          name: "Open-Meteo",
          description: "Nyilvános időjárás-előrejelző API",
        },
        microsoft_graph: {
          name: "Microsoft Graph API",
          description: "Microsoft 365 és Azure AD API",
        },
        github: {
          name: "GitHub API",
          description: "GitHub REST API v3",
        },
        jsonplaceholder: {
          name: "JSONPlaceholder",
          description: "Ingyenes fake REST API teszteléshez",
        },
        httpbin: {
          name: "HTTPBin",
          description: "HTTP kérés- és választesztelés",
        },
        reqres: {
          name: "ReqRes",
          description: "Fake API auth flow-k teszteléséhez",
        },
      },
    },
    messages: {
      errors: {
        request_in_progress: "Már fut egy kérés.",
        request_invalid_url: "Érvénytelen kérés URL.",
        request_unsafe_target: "A lokális és privát célpontok alapból tiltva vannak.",
        request_invalid_body: "A kérés törzse érvénytelen.",
        request_body_too_large: "A kérés törzse túl nagy.",
        request_invalid_headers: "A kérés headerei érvénytelenek.",
        request_headers_too_large: "A kérés headerei túl nagyok.",
        request_timeout: "A kérés időtúllépés miatt megszakadt.",
        request_connection_local_unavailable: "Az engedélyezett lokális célpont nem válaszolt.",
        request_connection_failed: "A célpont nem érhető el.",
        request_failed: "A kérés sikertelen volt.",
        request_worker_failed: "A desktop request worker hibával leállt.",
        history_unavailable: "Az előzményállapot nem érhető el.",
        settings_unavailable: "A biztonsági beállítások nem érhetők el.",
        settings_save_unavailable: "A helyi beállítástár nem érhető el.",
        settings_save_failed: "Nem sikerült menteni a biztonsági beállításokat.",
        persistence_warning_unavailable: "A perzisztencia-warning állapot nem érhető el.",
      },
      warnings: {
        config_dir_unavailable:
          "A Fuseprobe nem tudta feloldani a helyi konfigurációs könyvtárat. A perzisztens beállítások és előzmények nem érhetők el.",
        settings_parse_failed:
          "A biztonsági beállításokat nem sikerült beolvasni. A biztonságos alapértékek lettek visszaállítva.",
        history_load_failed:
          "Nem sikerült betölteni az előzményeket lemezről. Az aktuális session üresen indul.",
        history_parse_failed:
          "A mentett előzményeket nem sikerült feldolgozni. Az aktuális session üresen indul.",
        history_path_unavailable:
          "Az előzményperzisztálás be van kapcsolva, de a Fuseprobe nem tudott helyi tárolási útvonalat feloldani.",
        history_save_failed:
          "Nem sikerült menteni a perzisztens előzményeket. A session előzmény ettől még elérhető marad.",
        history_remove_failed:
          "Nem sikerült eltávolítani a perzisztens előzményeket. A csak-session előzmény aktív marad.",
      },
    },
  },
};

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  strings: LocaleStrings;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => undefined,
  strings: LOCALE_STRINGS.en,
});

function isLocaleCode(value: string | null): value is LocaleCode {
  return value === "en" || value === "de" || value === "hu";
}

function readStoredLocale(): LocaleCode {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocaleCode(storedLocale) ? storedLocale : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>(() => readStoredLocale());

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      strings: LOCALE_STRINGS[locale],
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
