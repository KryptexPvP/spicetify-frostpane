(function init() {
    // Warte, bis Spicetify mit allen genutzten APIs geladen ist
    if (!window.Spicetify?.Player || !Spicetify.Topbar || !Spicetify.PopupModal || !Spicetify.Menu) {
        setTimeout(init, 100);
        return;
    }

    const root = document.documentElement;

    // Kopie von color.ini, damit das Farbschema ohne "spicetify apply" live wechseln kann
    const SCHEMES = {
        "Frost-Dark":  { text: "FFFFFF", subtext: "B3B3B3", main: "0F0F11", sidebar: "16161A", player: "16161A", card: "242429", shadow: "000000", "selected-row": "2A2A30", button: "0A84FF", "button-active": "0A84FF", "button-disabled": "FFFFFF", "tab-active": "242429", notification: "0A84FF", "notification-error": "FF453A", misc: "8E8E93" },
        "Frost-Light": { text: "1D1D1F", subtext: "6E6E73", main: "F5F5F7", sidebar: "FFFFFF", player: "FFFFFF", card: "E8E8ED", shadow: "8E8E93", "selected-row": "E2E2E7", button: "007AFF", "button-active": "007AFF", "button-disabled": "000000", "tab-active": "E8E8ED", notification: "007AFF", "notification-error": "FF3B30", misc: "6E6E73" },
        "Frost-Blue":  { text: "FFFFFF", subtext: "B3B3B3", main: "080C14", sidebar: "0C121E", player: "0C121E", card: "172030", shadow: "000000", "selected-row": "1C293E", button: "007AFF", "button-active": "40A0FF", "button-disabled": "FFFFFF", "tab-active": "172030", notification: "007AFF", "notification-error": "FF453A", misc: "8E8E93" },
        "Frost-Pink":  { text: "FFFFFF", subtext: "B3B3B3", main: "14080F", sidebar: "1E0C17", player: "1E0C17", card: "301625", shadow: "000000", "selected-row": "3E1C30", button: "FF2D55", "button-active": "FF5E7E", "button-disabled": "FFFFFF", "tab-active": "301625", notification: "FF2D55", "notification-error": "FF453A", misc: "8E8E93" },
    };
    const COLOR_KEYS = Object.keys(SCHEMES["Frost-Dark"]);

    // ---------------------------------------------------------------- Einstellungen
    const DEFAULTS = {
        scheme: "",          // "" = Schema aus spicetify config (color_scheme)
        accent: "",          // "" = Akzent des Schemas
        coverBg: true, bgBlur: 30, bgBrightness: 0.62, bgOpacity: 0.65,
        glassAlpha: 0.42, radius: 16, gap: 10,
        tilt: true, volumePct: true, wheelStep: 5,
    };
    const KEY = "frostpane:settings";
    let settings = { ...DEFAULTS };
    try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} };

    const hexToRgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(",");
    const setColor = (name, hex) => {
        root.style.setProperty(`--spice-${name}`, `#${hex}`);
        root.style.setProperty(`--spice-rgb-${name}`, hexToRgb(hex));
    };

    function applySettings() {
        const s = settings;
        // Farben: Inline-Overrides nur setzen, wenn ein Schema/Akzent gewählt ist
        for (const k of COLOR_KEYS) {
            root.style.removeProperty(`--spice-${k}`);
            root.style.removeProperty(`--spice-rgb-${k}`);
        }
        if (s.scheme && SCHEMES[s.scheme]) for (const k of COLOR_KEYS) setColor(k, SCHEMES[s.scheme][k]);
        if (/^#[0-9a-f]{6}$/i.test(s.accent)) {
            const hex = s.accent.slice(1);
            ["button", "button-active", "notification"].forEach(k => setColor(k, hex));
        }
        // Hell/Dunkel an der echten Hintergrundfarbe erkennen: klappt auch, wenn das Schema
        // über den Marketplace gewählt wurde (dann steht in Spicetify.Config kein Schemaname)
        const luma = v => { const [r, g, b] = getComputedStyle(root).getPropertyValue(v).split(",").map(Number); return 0.299 * r + 0.587 * g + 0.114 * b; };
        const isLight = luma("--spice-rgb-main") > 150;
        root.classList.toggle("fp-light", isLight);
        // Lesbare Schrift auf Akzentflächen, auch bei sehr hellen Akzenten (z. B. Weiß)
        root.style.setProperty("--fp-on-accent", luma("--spice-rgb-button") > 160 ? "#000000" : "#ffffff");

        root.style.setProperty("--fp-bg-blur", `${s.bgBlur}px`);
        root.style.setProperty("--fp-glass-alpha", s.glassAlpha);
        root.style.setProperty("--fp-radius", `${s.radius}px`);
        root.style.setProperty("--fp-gap", `${s.gap}px`);
        // Helligkeit/Deckkraft nur im Dunkelmodus überschreiben; Light hat eigene Werte in user.css
        if (isLight) {
            root.style.removeProperty("--bg-brightness");
            root.style.removeProperty("--bg-opacity");
        } else {
            root.style.setProperty("--bg-brightness", s.bgBrightness);
            root.style.setProperty("--bg-opacity", s.bgOpacity);
        }
        root.classList.toggle("fp-no-cover-bg", !s.coverBg);
        root.classList.toggle("fp-no-tilt", !s.tilt);
        root.classList.toggle("fp-hide-volume-pct", !s.volumePct);
    }

    // Texte in Spotifys App-Sprache (Deutsch oder Englisch)
    const DE = /^de/i.test(Spicetify.Locale?.getLocale?.() || navigator.language);
    const T = DE ? {
        title: "Frostpane Einstellungen", look: "Aussehen", scheme: "Farbschema", standard: "Standard", accent: "Akzentfarbe",
        glassAlpha: "Glas-Deckkraft", radius: "Eckenradius", gap: "Abstand zwischen Panels", tilt: "3D-Hover-Effekt",
        coverSection: "Cover-Hintergrund", coverBg: "Cover als Hintergrund", bgBlur: "Unschärfe", bgBrightness: "Helligkeit (dunkel)",
        bgOpacity: "Deckkraft (dunkel)", volume: "Lautstärke", volumePct: "Prozent anzeigen", wheelStep: "Mausrad-Schritt (0 = aus)", reset: "Zurücksetzen",
    } : {
        title: "Frostpane Settings", look: "Appearance", scheme: "Color scheme", standard: "Default", accent: "Accent color",
        glassAlpha: "Glass opacity", radius: "Corner radius", gap: "Panel gap", tilt: "3D hover effect",
        coverSection: "Cover background", coverBg: "Use cover as background", bgBlur: "Blur", bgBrightness: "Brightness (dark)",
        bgOpacity: "Opacity (dark)", volume: "Volume", volumePct: "Show percentage", wheelStep: "Mouse wheel step (0 = off)", reset: "Reset",
    };

    function buildSettingsPanel() {
        const el = document.createElement("div");
        el.className = "fp-settings";
        const rows = [
            [T.look],
            ["scheme", T.scheme, "swatch"],
            ["accent", T.accent, "color"],
            ["glassAlpha", T.glassAlpha, "range", [0, 1, 0.01]],
            ["radius", T.radius, "range", [0, 28, 1], "px"],
            ["gap", T.gap, "range", [0, 24, 1], "px"],
            ["tilt", T.tilt, "checkbox"],
            [T.coverSection],
            ["coverBg", T.coverBg, "checkbox"],
            ["bgBlur", T.bgBlur, "range", [0, 80, 1], "px"],
            ["bgBrightness", T.bgBrightness, "range", [0.2, 1.2, 0.01]],
            ["bgOpacity", T.bgOpacity, "range", [0, 1, 0.01]],
            [T.volume],
            ["volumePct", T.volumePct, "checkbox"],
            ["wheelStep", T.wheelStep, "range", [0, 10, 1], "%"],
        ];
        for (const [key, label, type, opts, unit = ""] of rows) {
            if (!label) {
                const h = document.createElement("h3");
                h.textContent = key;
                el.append(h);
                continue;
            }
            const row = document.createElement("div");
            row.className = "fp-row";
            const id = `fp-${key}`;
            const lab = document.createElement("label");
            lab.htmlFor = id;
            lab.textContent = label;
            const out = document.createElement("output");
            let input;
            if (type === "swatch") {
                // Farbfelder: Hintergrund- + Akzentfarbe je Schema, aktives hervorgehoben
                const wrap = document.createElement("div");
                wrap.className = "fp-swatches";
                wrap.setAttribute("role", "group");
                wrap.setAttribute("aria-label", label);
                const options = [["", T.standard, null], ...Object.entries(SCHEMES).map(([k, c]) => [k, k.replace("Frost-", ""), c])];
                for (const [value, name, c] of options) {
                    const b = document.createElement("button");
                    b.type = "button";
                    b.className = "fp-swatch";
                    b.setAttribute("aria-pressed", String(settings.scheme === value));
                    const dot = document.createElement("i");
                    dot.style.setProperty("--a", c ? `#${c.main}` : "var(--spice-main)");
                    dot.style.setProperty("--b", c ? `#${c.button}` : "var(--fp-accent)");
                    b.append(dot, name);
                    b.onclick = () => {
                        settings.scheme = value;
                        wrap.querySelectorAll(".fp-swatch").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
                        applySettings();
                        save();
                    };
                    wrap.append(b);
                }
                row.append(lab, wrap);
                el.append(row);
                continue;
            } else {
                input = document.createElement("input");
                input.type = type;
                if (type === "range") {
                    [input.min, input.max, input.step] = opts;
                    input.value = settings[key];
                    out.textContent = settings[key] + unit;
                } else if (type === "checkbox") {
                    input.checked = settings[key];
                } else if (type === "color") {
                    input.value = settings.accent || getComputedStyle(root).getPropertyValue("--spice-button").trim() || "#0a84ff";
                }
            }
            input.id = id;
            input.addEventListener("input", () => {
                settings[key] = type === "checkbox" ? input.checked : type === "range" ? Number(input.value) : input.value;
                if (type === "range") out.textContent = input.value + unit;
                applySettings();
                save();
            });
            row.append(lab, input, out);
            el.append(row);
        }
        const actions = document.createElement("div");
        actions.className = "fp-actions";
        const reset = document.createElement("button");
        reset.textContent = T.reset;
        reset.onclick = () => {
            settings = { ...DEFAULTS };
            save();
            applySettings();
            openSettings(); // neu aufbauen, damit Regler die Standardwerte zeigen
        };
        actions.append(reset);
        el.append(actions);
        return el;
    }

    function openSettings() {
        Spicetify.PopupModal.display({ title: T.title, content: buildSettingsPanel(), isLarge: true });
    }

    applySettings();
    new Spicetify.Topbar.Button(
        T.title,
        `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M8 1a7 7 0 1 0 0 14c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H12a3 3 0 0 0 3-3C15 3.6 11.9 1 8 1zM4 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm2-3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm2 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`,
        openSettings
    );
    new Spicetify.Menu.Item(T.title, false, openSettings).register();

    // ---------------------------------------------------------------- Hintergrundbild
    let current = null;
    function updateBackground() {
        const track = Spicetify.Player.data?.item;
        if (!track) return false;

        let imageUrl = track.metadata?.image_url || track.images?.[0]?.url || "";
        if (imageUrl.startsWith("spotify:image:")) {
            imageUrl = imageUrl.replace("spotify:image:", "https://i.scdn.co/image/");
        }
        if (imageUrl === current) return true; // gleiches Album: kein Neuzeichnen des Vollbild-Blurs
        current = imageUrl;

        if (!imageUrl) { // lokale Datei/Podcast ohne Cover: altes Cover nicht stehen lassen
            root.style.removeProperty("--image_url");
            return true;
        }
        // Erst vorladen, dann tauschen: kein leerer Frame beim Songwechsel
        const img = new Image();
        img.onload = () => {
            if (current === imageUrl) root.style.setProperty("--image_url", `url("${imageUrl}")`);
        };
        img.src = imageUrl;
        return true;
    }
    // Player.data ist beim Start oft noch leer und "songchange" feuert erst beim nächsten Song
    (function retry(n) { if (!updateBackground() && n > 0) setTimeout(retry, 1000, n - 1); })(30);
    Spicetify.Player.addEventListener("songchange", updateBackground);
    Spicetify.Player.addEventListener("onplaypause", updateBackground);

    // ---------------------------------------------------------------- Lautstärke
    function updateVolumePct() {
        const bar = document.querySelector('[data-testid="volume-bar"]');
        if (!bar) return;
        let pct = bar.querySelector(".fp-volume-pct");
        if (!pct) {
            pct = document.createElement("span");
            pct.className = "fp-volume-pct";
            bar.append(pct);
        }
        const text = `${Math.round(Spicetify.Player.getVolume() * 100)}%`;
        if (pct.textContent !== text) pct.textContent = text;
    }
    // Lautstärke-Leiste ändert ihr style-Attribut bei jeder Änderung (Maus, Tasten, andere Geräte)
    // Player-Leiste wird erst nach dem Theme-Skript gerendert -> warten
    (function watchPlayerBar() {
        const playerBar = document.querySelector(".Root__now-playing-bar");
        if (!playerBar) return setTimeout(watchPlayerBar, 500);
        new MutationObserver(muts => {
            if (muts.some(m => m.type === "childList" || m.target.closest?.('[data-testid="volume-bar"]'))) updateVolumePct();
        }).observe(playerBar, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
        updateVolumePct();
    })();

    // Mausrad über der Lautstärke-Leiste
    document.addEventListener("wheel", e => {
        if (!settings.wheelStep || !e.target.closest?.('[data-testid="volume-bar"]')) return;
        e.preventDefault();
        const step = settings.wheelStep / 100;
        const v = Spicetify.Player.getVolume() + (e.deltaY < 0 ? step : -step);
        Spicetify.Player.setVolume(Math.min(1, Math.max(0, Math.round(v * 100) / 100)));
    }, { passive: false });
})();
