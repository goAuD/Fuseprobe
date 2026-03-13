import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type LocaleCode = "en" | "de" | "hu";

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
    taglineWorkbench: string;
    taglineHistory: string;
    taglineNoCloud: string;
    taglineRustCore: string;
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
      taglineWorkbench: "Focused request workbench, not a generic dashboard shell.",
      taglineHistory: "history local",
      taglineNoCloud: "no cloud",
      taglineRustCore: "rust core staged",
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
      taglineWorkbench: "Fokussierte Request-Workbench, kein generisches Dashboard.",
      taglineHistory: "Verlauf lokal",
      taglineNoCloud: "keine Cloud",
      taglineRustCore: "Rust-Core aktiv",
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
      taglineWorkbench: "Fókuszált request workbench, nem generikus dashboard.",
      taglineHistory: "lokális előzmény",
      taglineNoCloud: "nincs felhő",
      taglineRustCore: "rust core aktív",
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>("en");
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
