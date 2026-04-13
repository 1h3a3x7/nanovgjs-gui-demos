let canvas = null;
let gl = null;
let ctx = null;
let mouseX = -1000;
let mouseY = -1000;
let pointerDown = false;
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let activeControlId = null;
let controls = [];
let prevFrame = 0;
let currentPanelKey = null;
let dropdownOverlays = [];
let inputBlink = 0;

const ckState = {
    checkbox: true,
    checkboxAlt: false,
    triggerFlash: 0,
    dropdowns: {
        leftChoice: { value: "Choose ...", options: ["Choose ...", "Knob", "Toggle", "Envelope"], open: false },
        functionChoice: { value: "Sine", options: ["Sine", "Noise", "Pulse", "Envelope"], open: false },
        unitChoice: { value: "Num/Hz", options: ["Num/Hz", "dB", "ms", "ratio"], open: false },
        dockChoice: { value: "Docked", options: ["Docked", "Floating", "Hidden"], open: false },
    },
    sliders: { strength: 0.64, width: 0.38, range: 0.71 },
    colorIndex: 0,
    picker: { h: 0.52, s: 0.58, v: 0.58 },
    panels: {
        left: { x: 16, y: 194, w: 162, h: 514, collapsed: false },
        center: { x: 180, y: 194, w: 220, h: 514, collapsed: false },
        right: { x: 438, y: 194, w: 142, h: 514, collapsed: false },
        farRight: { x: 582, y: 194, w: 138, h: 600, collapsed: false },
        floatingColor: { x: 390, y: 402, w: 188, h: 136, collapsed: false },
        picker: { x: 198, y: 540, w: 316, h: 188, collapsed: false },
    },
    panelOrder: ["left", "center", "right", "farRight", "floatingColor", "picker"],
    groups: {
        "left:group1": { collapsed: false },
        "left:visual1": { collapsed: false },
        "left:visual2": { collapsed: false },
        "left:visual3": { collapsed: false },
        "center:functions": { collapsed: false },
        "center:behavior": { collapsed: false },
        "right:sub1": { collapsed: false },
        "right:sub2": { collapsed: false },
        "farRight:sub1": { collapsed: false },
        "farRight:controls1": { collapsed: false },
        "farRight:controls2": { collapsed: false },
        "farRight:inputs": { collapsed: false },
        "floatingColor:colors": { collapsed: false },
    },
    scroll: {
        leftVisual1: { x: 0, y: 0.15 },
        leftVisual2: { x: 0, y: 0.42 },
        leftVisual3: { x: 0, y: 0.66 },
        centerGraph: { x: 0.54, y: 0 },
    },
    inputs: {
        activeId: null,
        caret: 0,
        values: {
            name: "Synth Lab",
            bpm: "120",
        },
    },
};

const themePresets = {
    controlkit: {
        id: "controlkit",
        label: "Aqua Console",
        title: "CONTROLKIT",
        subtitle: "A lightweight controller and gui library.",
        background: [18, 18, 18],
        clear: [0.07, 0.07, 0.07, 1],
        accent: [0, 224, 207],
        palette: [[62, 135, 148], [237, 64, 99], [92, 190, 210]],
        tones: [[18, 18, 18], [34, 38, 41], [45, 50, 54], [60, 67, 72], [78, 88, 94], [150, 160, 168], [230, 236, 242], [255, 255, 255]],
    },
    antweakbar: {
        id: "antweakbar",
        label: "Copper Grid",
        title: "CONTROLKIT",
        subtitle: "Copper Grid color style.",
        background: [22, 20, 17],
        clear: [0.08, 0.07, 0.055, 1],
        accent: [232, 145, 53],
        palette: [[209, 112, 38], [232, 176, 79], [126, 103, 78]],
        tones: [[18, 16, 14], [38, 32, 26], [58, 48, 38], [82, 69, 54], [112, 93, 70], [185, 156, 118], [236, 220, 194], [255, 246, 226]],
    },
    imgui: {
        id: "imgui",
        label: "Blue Dock",
        title: "CONTROLKIT",
        subtitle: "Blue Dock color style.",
        background: [28, 30, 34],
        clear: [0.10, 0.11, 0.13, 1],
        accent: [66, 150, 250],
        palette: [[66, 150, 250], [178, 86, 212], [84, 180, 112]],
        tones: [[20, 22, 25], [38, 41, 46], [51, 56, 64], [66, 73, 84], [87, 98, 112], [160, 170, 185], [226, 232, 240], [255, 255, 255]],
    },
    gwen: {
        id: "gwen",
        label: "Classic Skin",
        title: "CONTROLKIT",
        subtitle: "Classic Skin color style.",
        background: [112, 126, 143],
        clear: [0.42, 0.47, 0.54, 1],
        accent: [61, 112, 180],
        palette: [[61, 112, 180], [190, 76, 76], [82, 150, 92]],
        tones: [[70, 78, 88], [104, 116, 130], [134, 147, 162], [170, 181, 192], [196, 205, 214], [88, 98, 112], [35, 42, 52], [12, 16, 22]],
    },
};

const urlTheme = new URLSearchParams(window.location.search).get("theme");
const requestedTheme = { ...(window.CONTROLKIT_THEME || {}), ...(urlTheme ? { id: urlTheme } : {}) };
const baseTheme = themePresets[requestedTheme.id] || themePresets.controlkit;
const ckTheme = { ...baseTheme, ...requestedTheme };
const ckPalette = ckTheme.palette;
const themeChoiceIds = ["controlkit", "antweakbar", "imgui", "gwen"];
const PANEL_HEADER_H = 30;
const PANEL_PAD_X = 8;
const PANEL_PAD_TOP = 12;
const PANEL_PAD_BOTTOM = 12;
const GROUP_HEADER_H = 26;
const GROUP_GAP = 10;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function inRect(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }
function hex(rgb) { return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`; }
function themedTone(r, g, b) {
    if (ckTheme.id === "controlkit") return [r, g, b];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), chroma = max - min;
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const accentLike = (g > r + 35 && g > b - 40) || (b > r + 35 && b > g - 30);
    if (accentLike && chroma > 35) {
        const accent = ckTheme.accent;
        const lift = clamp((lum - 90) / 220, -0.2, 0.35);
        return accent.map((value) => Math.round(clamp(value + lift * 80, 0, 255)));
    }
    if (chroma > 22) return [r, g, b];
    const tones = ckTheme.tones;
    const index = lum < 28 ? 0 : lum < 48 ? 1 : lum < 68 ? 2 : lum < 92 ? 3 : lum < 135 ? 4 : lum < 205 ? 5 : lum < 246 ? 6 : 7;
    return tones[index];
}

function rgba(r, g, b, a = 255) {
    const [tr, tg, tb] = themedTone(r, g, b);
    return NVGcolor.nvgRGBA(tr, tg, tb, a);
}

function groupHeight(id, expandedH) {
    return ckState.groups[id]?.collapsed ? GROUP_HEADER_H : expandedH;
}

function stackedPanelHeight(items) {
    return PANEL_HEADER_H + PANEL_PAD_TOP + PANEL_PAD_BOTTOM + items.reduce((sum, item) => sum + groupHeight(item.id, item.h), 0) + Math.max(0, items.length - 1) * GROUP_GAP;
}

function panelHeight(key) {
    if (key === "left") return stackedPanelHeight([
        { id: "left:group1", h: 116 },
        { id: "left:visual1", h: 118 },
        { id: "left:visual2", h: 84 },
        { id: "left:visual3", h: 98 },
    ]);
    if (key === "center") return stackedPanelHeight([
        { id: "center:functions", h: 272 },
        { id: "center:behavior", h: 160 },
    ]);
    if (key === "right") return stackedPanelHeight([
        { id: "right:sub1", h: 250 },
        { id: "right:sub2", h: 202 },
    ]);
    if (key === "farRight") return stackedPanelHeight([
        { id: "farRight:sub1", h: 146 },
        { id: "farRight:controls1", h: 126 },
        { id: "farRight:controls2", h: 124 },
        { id: "farRight:inputs", h: 116 },
    ]);
    if (key === "floatingColor") return stackedPanelHeight([{ id: "floatingColor:colors", h: 96 }]);
    if (key === "picker") return 230;
    return ckState.panels[key]?.h ?? 120;
}

function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const map = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return map.map((n) => Math.round(n * 255));
}

function pickerRgb() { return hsvToRgb(ckState.picker.h, ckState.picker.s, ckState.picker.v); }

function ensureFonts() {
    if (!ctx) return Promise.resolve(false);
    const ids = [
        ctx.nvgCreateFont("ck-ui", "../../node_modules/nanovgjs/example/Roboto-Regular.ttf"),
        ctx.nvgCreateFont("ck-bold", "../../node_modules/nanovgjs/example/Roboto-Bold.ttf"),
    ].filter((id) => id >= 0);
    const loads = ids.map((id) => ctx.fs && ctx.fs.fonts[id] ? ctx.fs.fonts[id].loading : null).filter(Boolean);
    return Promise.all(loads).then(() => true).catch(() => false);
}

function text(str, x, y, size, color, align, font = "ck-ui") {
    ctx.nvgFontSize(size);
    ctx.nvgFontFace(font);
    ctx.nvgFillColor(color);
    ctx.nvgTextAlign(align);
    ctx.nvgText(x, y, str, null);
}

function beginControls() {
    controls = [];
    dropdownOverlays = [];
}

function reg(c) {
    if (!c.panelKey && currentPanelKey) c.panelKey = currentPanelKey;
    controls.push(c);
}

function withPanel(key, fn) {
    const prev = currentPanelKey;
    currentPanelKey = key;
    fn();
    currentPanelKey = prev;
}

function bringPanelToFront(key) {
    const order = ckState.panelOrder;
    const idx = order.indexOf(key);
    if (idx === -1 || idx === order.length - 1) return;
    order.splice(idx, 1);
    order.push(key);
}

function closeDropdowns(except = null) { Object.keys(ckState.dropdowns).forEach((k) => { if (k !== except) ckState.dropdowns[k].open = false; }); }

function queueDropdownOverlay(overlay) { dropdownOverlays.push(overlay); }

function drawDropdownOverlays() {
    if (dropdownOverlays.length === 0) return;
    const order = ckState.panelOrder;
    dropdownOverlays.sort((a, b) => order.indexOf(a.panelKey) - order.indexOf(b.panelKey));
    for (const overlay of dropdownOverlays) {
        const { id, key, x, y, w, h, options, value } = overlay;
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(x, y, w, h * options.length, 2);
        ctx.nvgFillColor(rgba(63, 69, 74, 250));
        ctx.nvgFill();
        for (let i = 0; i < options.length; i++) {
            const oy = y + i * h;
            if (value === options[i]) {
                ctx.nvgBeginPath();
                ctx.nvgRect(x + 1, oy + 1, w - 2, h - 2);
                ctx.nvgFillColor(rgba(82, 112, 119));
                ctx.nvgFill();
            }
            text(options[i], x + 10, oy + h * 0.5, 10.5, rgba(248, 248, 248, 225), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
            reg({ id: `${id}:${i}`, type: "dropdown-option", key, option: options[i], x, y: oy, w, h, panelKey: overlay.panelKey });
        }
    }
}

function hitControl(px, py) {
    for (let i = controls.length - 1; i >= 0; i--) {
        const c = controls[i];
        if (inRect(px, py, c.x, c.y, c.w, c.h)) return c;
    }
    return null;
}

function hitScrollArea(px, py) {
    for (let i = controls.length - 1; i >= 0; i--) {
        const c = controls[i];
        if (c.type === "scroll-area" && inRect(px, py, c.x, c.y, c.w, c.h)) return c;
    }
    return null;
}

function updateSlider(id, px) {
    const c = controls.find((item) => item.id === id);
    if (c) ckState.sliders[c.key] = clamp((px - c.x) / c.w, 0, 1);
}

function updateScroll(id, px, py) {
    const c = controls.find((item) => item.id === id);
    if (!c) return;
    const state = ckState.scroll[c.key];
    if (!state) return;
    if (c.type === "scroll-v") {
        const thumbH = clamp(c.h * c.thumbRatio, 24, c.h - 8);
        state.y = clamp((py - c.y - thumbH * 0.5) / Math.max(1, c.h - thumbH), 0, 1);
    } else if (c.type === "scroll-h") {
        const thumbW = clamp(c.w * c.thumbRatio, 24, c.w - 8);
        state.x = clamp((px - c.x - thumbW * 0.5) / Math.max(1, c.w - thumbW), 0, 1);
    }
}

function scrollArea(c, dx, dy) {
    const state = ckState.scroll[c.key];
    if (!state) return false;
    let changed = false;
    if (c.axes.includes("y")) {
        state.y = clamp(state.y + dy * 0.0018, 0, 1);
        changed = true;
    }
    if (c.axes.includes("x")) {
        state.x = clamp(state.x + dx * 0.0018, 0, 1);
        changed = true;
    }
    return changed;
}

function updatePickerSv(id, px, py) {
    const c = controls.find((item) => item.id === id);
    if (!c) return;
    ckState.picker.s = clamp((px - c.x) / c.w, 0, 1);
    ckState.picker.v = clamp(1 - (py - c.y) / c.h, 0, 1);
}

function updatePickerHue(id, py) {
    const c = controls.find((item) => item.id === id);
    if (c) ckState.picker.h = clamp((py - c.y) / c.h, 0, 1);
}

function setActiveInput(id) {
    ckState.inputs.activeId = id;
    const value = ckState.inputs.values[id] ?? "";
    ckState.inputs.caret = value.length;
}

function insertInputText(id, textValue) {
    const value = ckState.inputs.values[id] ?? "";
    const caret = ckState.inputs.caret;
    ckState.inputs.values[id] = value.slice(0, caret) + textValue + value.slice(caret);
    ckState.inputs.caret = caret + textValue.length;
}

function deleteInputLeft(id) {
    const value = ckState.inputs.values[id] ?? "";
    const caret = ckState.inputs.caret;
    if (caret <= 0) return;
    ckState.inputs.values[id] = value.slice(0, caret - 1) + value.slice(caret);
    ckState.inputs.caret = caret - 1;
}

function deleteInputRight(id) {
    const value = ckState.inputs.values[id] ?? "";
    const caret = ckState.inputs.caret;
    if (caret >= value.length) return;
    ckState.inputs.values[id] = value.slice(0, caret) + value.slice(caret + 1);
}

function adjustNumericInput(control, dir, scale = 1) {
    const id = control.id;
    const step = control.step ?? 1;
    const decimals = control.decimals ?? 0;
    const min = control.min ?? -Infinity;
    const max = control.max ?? Infinity;
    const current = parseFloat(ckState.inputs.values[id] ?? "0");
    const base = Number.isFinite(current) ? current : 0;
    const next = clamp(base + step * dir * scale, min, max);
    ckState.inputs.values[id] = decimals > 0 ? next.toFixed(decimals) : `${Math.round(next)}`;
    ckState.inputs.caret = ckState.inputs.values[id].length;
}

function activate(c) {
    if (!c) { closeDropdowns(); ckState.inputs.activeId = null; return; }
    if (c.panelKey) bringPanelToFront(c.panelKey);
    if (c.type !== "edit-text" && c.type !== "edit-num") ckState.inputs.activeId = null;
    if (c.type === "panel-toggle") {
        const p = ckState.panels[c.panelKey];
        if (p) p.collapsed = !p.collapsed;
        return;
    }
    if (c.type === "panel") {
        return;
    }
    if (c.type === "edit-text" || c.type === "edit-num") {
        closeDropdowns();
        setActiveInput(c.id);
        return;
    }
    if (c.type === "drag-panel") {
        dragTarget = c.panelKey;
        dragOffsetX = mouseX - ckState.panels[dragTarget].x;
        dragOffsetY = mouseY - ckState.panels[dragTarget].y;
    } else if (c.type === "toggle") {
        ckState[c.key] = !ckState[c.key];
    } else if (c.type === "group-toggle") {
        const group = ckState.groups[c.key];
        if (group) group.collapsed = !group.collapsed;
    } else if (c.type === "theme-choice") {
        const params = new URLSearchParams(window.location.search);
        if (c.key === "controlkit") params.delete("theme");
        else params.set("theme", c.key);
        const query = params.toString();
        window.location.href = `${window.location.pathname}${query ? `?${query}` : ""}`;
    } else if (c.type === "button") {
        ckState.triggerFlash = 1;
    } else if (c.type === "dropdown") {
        closeDropdowns(c.key);
        ckState.dropdowns[c.key].open = !ckState.dropdowns[c.key].open;
    } else if (c.type === "dropdown-option") {
        ckState.dropdowns[c.key].value = c.option;
        ckState.dropdowns[c.key].open = false;
    } else if (c.type === "slider") {
        activeControlId = c.id;
        updateSlider(c.id, mouseX);
    } else if (c.type === "scroll-v" || c.type === "scroll-h") {
        activeControlId = c.id;
        updateScroll(c.id, mouseX, mouseY);
    } else if (c.type === "palette") {
        ckState.colorIndex = c.index;
        const rgb = ckPalette[c.index].map((v) => v / 255);
        const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
        let h = 0;
        if (d > 0) {
            if (max === rgb[0]) h = ((rgb[1] - rgb[2]) / d) % 6;
            else if (max === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
            else h = (rgb[0] - rgb[1]) / d + 4;
            h /= 6;
            if (h < 0) h += 1;
        }
        ckState.picker.h = h;
        ckState.picker.s = max === 0 ? 0 : d / max;
        ckState.picker.v = max;
    } else if (c.type === "picker-sv") {
        activeControlId = c.id;
        updatePickerSv(c.id, mouseX, mouseY);
    } else if (c.type === "picker-hue") {
        activeControlId = c.id;
        updatePickerHue(c.id, mouseY);
    }
}

function drawPanelFrame(key, title) {
    const p = ckState.panels[key];
    const x = p.x, y = p.y, w = p.w, fullH = p.displayH ?? p.h;
    const headerH = PANEL_HEADER_H;
    const frameH = p.collapsed ? headerH : fullH;
    ctx.nvgBeginPath(); ctx.nvgRect(x - 16, y - 16, w + 32, frameH + 32); ctx.nvgRoundedRect(x, y, w, frameH, 2); ctx.nvgPathWinding(NVG_HOLE);
    ctx.nvgFillPaint(ctx.nvgBoxGradient(x, y + 4, w, frameH, 4, 18, rgba(0, 0, 0, 96), rgba(0, 0, 0, 0))); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, frameH, 2); ctx.nvgFillColor(rgba(60, 67, 72)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, frameH - 1, 1.5); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(23, 25, 28)); ctx.nvgStroke();
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, headerH); ctx.nvgFillPaint(ctx.nvgLinearGradient(x, y, x, y + headerH, rgba(44, 49, 53), rgba(34, 38, 41))); ctx.nvgFill();
    text(title, x + 10, y + headerH * 0.5, 12, rgba(188, 196, 204, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
    ctx.nvgBeginPath(); ctx.nvgRect(x + w - 24, y + 6, 16, 16); ctx.nvgFillColor(rgba(35, 39, 42)); ctx.nvgFill();
    ctx.nvgBeginPath();
    if (p.collapsed) {
        ctx.nvgMoveTo(x + w - 20, y + 12);
        ctx.nvgLineTo(x + w - 12, y + 12);
        ctx.nvgLineTo(x + w - 16, y + 18);
    } else {
        ctx.nvgMoveTo(x + w - 20, y + 16);
        ctx.nvgLineTo(x + w - 12, y + 16);
        ctx.nvgLineTo(x + w - 16, y + 11);
    }
    ctx.nvgClosePath(); ctx.nvgFillColor(rgba(91, 100, 108)); ctx.nvgFill();
    reg({ id: `panel:${key}`, type: "panel", panelKey: key, x, y, w, h: frameH });
    reg({ id: `drag:${key}`, type: "drag-panel", panelKey: key, x, y, w, h: headerH });
    reg({ id: `toggle:${key}`, type: "panel-toggle", panelKey: key, x: x + w - 24, y: y + 6, w: 16, h: 16 });
}

function drawGroup(id, x, y, w, h, title) {
    const group = ckState.groups[id] ?? { collapsed: false };
    const headerH = GROUP_HEADER_H;
    const frameH = group.collapsed ? headerH : h;
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, frameH, 2); ctx.nvgFillColor(rgba(68, 76, 81)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, frameH - 1, 1.5); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(28, 31, 34)); ctx.nvgStroke();
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, headerH); ctx.nvgFillPaint(ctx.nvgLinearGradient(x, y, x, y + headerH, rgba(45, 50, 54), rgba(36, 40, 43))); ctx.nvgFill();
    text(title, x + 10, y + 13, 11, rgba(255, 255, 255, 242), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
    ctx.nvgBeginPath();
    if (group.collapsed) {
        ctx.nvgMoveTo(x + w - 18, y + 10);
        ctx.nvgLineTo(x + w - 10, y + 10);
        ctx.nvgLineTo(x + w - 14, y + 16);
    } else {
        ctx.nvgMoveTo(x + w - 18, y + 16);
        ctx.nvgLineTo(x + w - 10, y + 16);
        ctx.nvgLineTo(x + w - 14, y + 10);
    }
    ctx.nvgClosePath(); ctx.nvgFillColor(rgba(184, 194, 200)); ctx.nvgFill();
    reg({ id: `group:${id}`, type: "group-toggle", key: id, x: x + w - 24, y: y + 4, w: 22, h: 18 });
    return !group.collapsed;
}

function drawVScrollbar(id, key, x, y, h, ratio = 0.62) {
    const state = ckState.scroll[key] ?? { y: 0 };
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, 10, h); ctx.nvgFillColor(rgba(36, 40, 43)); ctx.nvgFill();
    const thumbH = clamp(h * ratio, 28, h - 8);
    const thumbY = y + 4 + clamp(state.y, 0, 1) * (h - thumbH - 8);
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 2, thumbY, 6, thumbH, 2); ctx.nvgFillColor(rgba(100, 111, 118)); ctx.nvgFill();
    reg({ id, type: "scroll-v", key, x, y, w: 10, h, thumbRatio: ratio });
}

function drawHScrollbar(id, key, x, y, w, ratio = 0.62) {
    const state = ckState.scroll[key] ?? { x: 0 };
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, 10); ctx.nvgFillColor(rgba(36, 40, 43)); ctx.nvgFill();
    const thumbW = clamp(w * ratio, 28, w - 8);
    const thumbX = x + 4 + clamp(state.x, 0, 1) * (w - thumbW - 8);
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(thumbX, y + 2, thumbW, 6, 2); ctx.nvgFillColor(rgba(100, 111, 118)); ctx.nvgFill();
    reg({ id, type: "scroll-h", key, x, y, w, h: 10, thumbRatio: ratio });
}

function regScrollArea(id, key, axes, x, y, w, h) {
    reg({ id, type: "scroll-area", key, axes, x, y, w, h });
}

function drawButton(id, x, y, w, h, label) {
    const flash = Math.floor(ckState.triggerFlash * 45);
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 2);
    ctx.nvgFillPaint(ctx.nvgLinearGradient(x, y, x, y + h, rgba(84 + flash, 96 + flash, 104 + flash), rgba(61 + flash, 69 + flash, 75 + flash))); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 1.5); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(29, 32, 35)); ctx.nvgStroke();
    text(label, x + w * 0.5, y + h * 0.5, 11, rgba(255, 255, 255, 235), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
    reg({ id, type: "button", x, y, w, h });
}

function drawDropdown(id, key, x, y, w, h, prefix = "") {
    const m = ckState.dropdowns[key];
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 2); ctx.nvgFillColor(rgba(69, 77, 83)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 1.5); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(33, 36, 39)); ctx.nvgStroke();
    text(prefix ? `${prefix} ${m.value}` : m.value, x + 10, y + h * 0.5, 10.5, rgba(255, 255, 255, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    text("v", x + w - 10, y + h * 0.5, 10, rgba(215, 219, 224, 180), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE, "ck-bold");
    reg({ id, type: "dropdown", key, x, y, w, h });
    if (!m.open) return;
    queueDropdownOverlay({ id, key, x, y: y + h + 2, w, h, options: m.options, value: m.value, panelKey: currentPanelKey });
}

function drawCheckRow(id, key, x, y, label, checked) {
    const bx = x, by = y + 1;
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(bx, by, 12, 12, 2); ctx.nvgFillColor(checked ? rgba(82, 191, 236) : rgba(72, 80, 85)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(bx + 0.5, by + 0.5, 11, 11, 1.5); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(31, 34, 37)); ctx.nvgStroke();
    if (checked) text("x", bx + 6, by + 6, 8, rgba(255, 255, 255), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
    text(label, x + 18, y + 7, 10.5, rgba(244, 244, 244, 235), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
    reg({ id, type: "toggle", key, x: bx, y: by, w: 80, h: 14 });
}

function drawSlider(id, key, x, y, w, value, label) {
    const knobX = x + w * value;
    text(label, x, y + 8, 10.5, rgba(228, 232, 236, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y + 18, w, 8, 3); ctx.nvgFillColor(rgba(42, 45, 48)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y + 18, w * value, 8, 3); ctx.nvgFillColor(rgba(88, 105, 114)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgCircle(knobX, y + 22, activeControlId === id ? 7.5 : 7); ctx.nvgFillColor(rgba(210, 215, 219)); ctx.nvgFill();
    reg({ id, type: "slider", key, x, y: y + 14, w, h: 16 });
}

function drawEditBox(id, x, y, w, h, placeholder = "") {
    const value = ckState.inputs.values[id] ?? "";
    const isActive = ckState.inputs.activeId === id;
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 2); ctx.nvgFillColor(rgba(61, 66, 71)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 1.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(isActive ? rgba(86, 150, 230) : rgba(33, 36, 39));
    ctx.nvgStroke();
    const textValue = value.length ? value : placeholder;
    const textColor = value.length ? rgba(255, 255, 255, 220) : rgba(168, 174, 180, 160);
    text(textValue, x + 8, y + h * 0.5, 10.5, textColor, NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    if (isActive && Math.floor(inputBlink * 2) % 2 === 0) {
        ctx.nvgFontSize(10.5);
        ctx.nvgFontFace("ck-ui");
        const caretText = value.slice(0, ckState.inputs.caret);
        const caretW = caretText ? ctx.nvgTextBounds(0, 0, caretText, null, null) : 0;
        const caretX = Math.min(x + w - 6, x + 8 + caretW);
        ctx.nvgBeginPath();
        ctx.nvgMoveTo(caretX, y + 4);
        ctx.nvgLineTo(caretX, y + h - 4);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(rgba(220, 230, 240, 220));
        ctx.nvgStroke();
    }
    reg({ id, type: "edit-text", x, y, w, h });
}

function drawEditBoxNum(id, units, x, y, w, h, options = {}) {
    const value = ckState.inputs.values[id] ?? "";
    const isActive = ckState.inputs.activeId === id;
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 2); ctx.nvgFillColor(rgba(61, 66, 71)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 1.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(isActive ? rgba(86, 150, 230) : rgba(33, 36, 39));
    ctx.nvgStroke();

    ctx.nvgFontSize(10.5);
    ctx.nvgFontFace("ck-ui");
    const unitsW = units ? ctx.nvgTextBounds(0, 0, units, null, null) : 0;
    if (units) text(units, x + w - 6, y + h * 0.5, 10.5, rgba(180, 188, 196, 180), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE);
    const textRight = x + w - unitsW - 10;
    const textValue = value.length ? value : "0";
    text(textValue, textRight, y + h * 0.5, 10.5, rgba(255, 255, 255, 220), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE);

    if (isActive && Math.floor(inputBlink * 2) % 2 === 0) {
        const valueW = textValue ? ctx.nvgTextBounds(0, 0, textValue, null, null) : 0;
        const caretText = textValue.slice(0, ckState.inputs.caret);
        const caretW = caretText ? ctx.nvgTextBounds(0, 0, caretText, null, null) : 0;
        const textLeft = textRight - valueW;
        const caretX = Math.min(x + w - 6 - unitsW, textLeft + caretW);
        ctx.nvgBeginPath();
        ctx.nvgMoveTo(caretX, y + 4);
        ctx.nvgLineTo(caretX, y + h - 4);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(rgba(220, 230, 240, 220));
        ctx.nvgStroke();
    }

    reg({
        id,
        type: "edit-num",
        x,
        y,
        w,
        h,
        step: options.step ?? 1,
        min: options.min ?? -Infinity,
        max: options.max ?? Infinity,
        decimals: options.decimals ?? 0,
    });
}

function drawGraph(x, y, w, h, t, xScroll = 0) {
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, h); ctx.nvgFillColor(rgba(42, 46, 49)); ctx.nvgFill();
    const gridStep = w / 9;
    const gridOffset = (xScroll * w * 1.6) % gridStep;
    for (let i = -1; i < 12; i++) { const gx = x + i * gridStep - gridOffset; ctx.nvgBeginPath(); ctx.nvgMoveTo(gx, y); ctx.nvgLineTo(gx, y + h); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(59, 65, 68)); ctx.nvgStroke(); }
    for (let i = 0; i < 6; i++) { const gy = y + (i / 5) * h; ctx.nvgBeginPath(); ctx.nvgMoveTo(x, gy); ctx.nvgLineTo(x + w, gy); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(59, 65, 68)); ctx.nvgStroke(); }
    ctx.nvgBeginPath();
    for (let i = 0; i < 64; i++) {
        const u = i / 63, su = u + xScroll * 0.8, px = x + u * w, py = y + h * (0.48 + Math.sin(t * 1.2 + su * 11.0) * 0.08 + Math.cos(su * 19.0) * 0.09 * (0.6 + ckState.sliders.range * 0.7));
        if (i === 0) ctx.nvgMoveTo(px, py); else ctx.nvgLineTo(px, py);
    }
    ctx.nvgStrokeWidth(2); ctx.nvgStrokeColor(rgba(244, 244, 244, 220)); ctx.nvgStroke();
}

function drawWave(x, y, w, h, color, phase, yScroll = 0) {
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, h); ctx.nvgFillColor(rgba(40, 44, 47)); ctx.nvgFill();
    ctx.nvgBeginPath();
    for (let i = 0; i < 40; i++) {
        const u = i / 39, px = x + u * w, py = y + h * (0.5 + Math.sin(u * 6.2 + phase + yScroll * 2.4) * 0.32 * (0.5 + ckState.sliders.strength)) - yScroll * h * 0.22;
        if (i === 0) ctx.nvgMoveTo(px, py); else ctx.nvgLineTo(px, py);
    }
    ctx.nvgStrokeWidth(3); ctx.nvgStrokeColor(color); ctx.nvgStroke();
}

function drawNoise(x, y, w, h, t, yScroll = 0) {
    ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, h); ctx.nvgFillColor(rgba(32, 32, 32)); ctx.nvgFill();
    for (let row = 0; row < 24; row++) {
        for (let col = 0; col < 18; col++) {
            const n = Math.abs(Math.sin(col * 13.1 + (row + yScroll * 16) * 19.7 + t * (4 + ckState.sliders.width * 4)));
            ctx.nvgBeginPath(); ctx.nvgRect(x + col * (w / 18), y + row * (h / 24), 3.8, 3.2); ctx.nvgFillColor(rgba(245, 245, 245, 40 + Math.floor(n * 170))); ctx.nvgFill();
        }
    }
}

function drawPalette(panelKey, drawFrame = true) {
    const p = ckState.panels[panelKey];
    if (drawFrame) drawPanelFrame(panelKey, "Floating Color Panel");
    const gx = p.x + PANEL_PAD_X, gy = p.y + PANEL_HEADER_H + PANEL_PAD_TOP, gw = p.w - PANEL_PAD_X * 2, gh = groupHeight("floatingColor:colors", 96);
    if (!drawGroup("floatingColor:colors", gx, gy, gw, gh, "System Colors")) return;
    for (let i = 0; i < ckPalette.length; i++) {
        const yy = gy + 32 + i * 20;
        text(`color${i}`, gx + 8, yy + 8, 10, rgba(242, 240, 224, 215), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        ctx.nvgBeginPath(); ctx.nvgRect(gx + 50, yy, gw - 66, 16); ctx.nvgFillColor(rgba(...ckPalette[i])); ctx.nvgFill();
        if (ckState.colorIndex === i) { ctx.nvgBeginPath(); ctx.nvgRect(gx + 48.5, yy - 1.5, gw - 63, 19); ctx.nvgStrokeWidth(2); ctx.nvgStrokeColor(rgba(255, 255, 255, 180)); ctx.nvgStroke(); }
        text(hex(ckPalette[i]), gx + 82, yy + 8, 10, rgba(255, 255, 255, 230), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
        reg({ id: `palette:${i}`, type: "palette", index: i, x: gx + 50, y: yy, w: gw - 66, h: 16 });
    }
}

function drawPicker(panelKey, drawFrame = true) {
    const p = ckState.panels[panelKey];
    const gx = p.x + 12, gy = p.y + 48, gw = 156, gh = 136, hue = hsvToRgb(ckState.picker.h, 1, 1), rgb = pickerRgb();
    if (drawFrame) drawPanelFrame(panelKey, "Color Picker");
    ctx.nvgBeginPath(); ctx.nvgRect(gx, gy, gw, gh); ctx.nvgFillPaint(ctx.nvgLinearGradient(gx, gy, gx + gw, gy, rgba(255, 255, 255), rgba(...hue))); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRect(gx, gy, gw, gh); ctx.nvgFillPaint(ctx.nvgLinearGradient(gx, gy, gx, gy + gh, rgba(0, 0, 0, 0), rgba(0, 0, 0))); ctx.nvgFill();
    const px = gx + gw * ckState.picker.s, py = gy + gh * (1 - ckState.picker.v);
    ctx.nvgBeginPath(); ctx.nvgCircle(px, py, 6); ctx.nvgStrokeWidth(2); ctx.nvgStrokeColor(rgba(255, 255, 255)); ctx.nvgStroke();
    reg({ id: "picker:sv", type: "picker-sv", x: gx, y: gy, w: gw, h: gh });
    const hx = gx + gw + 8;
    for (let i = 0; i < 32; i++) { const u0 = i / 32, u1 = (i + 1) / 32, c = hsvToRgb(u0, 1, 1); ctx.nvgBeginPath(); ctx.nvgRect(hx, gy + u0 * gh, 18, (u1 - u0) * gh + 1); ctx.nvgFillColor(rgba(...c)); ctx.nvgFill(); }
    ctx.nvgBeginPath(); ctx.nvgRect(hx - 2, gy + gh * ckState.picker.h - 2, 22, 4); ctx.nvgFillColor(rgba(255, 255, 255, 220)); ctx.nvgFill();
    reg({ id: "picker:hue", type: "picker-hue", x: hx, y: gy, w: 18, h: gh });
    const ix = hx + 30, values = [["H", `${Math.round(ckState.picker.h * 360)}`], ["R", `${rgb[0]}`], ["S", `${Math.round(ckState.picker.s * 100)}`], ["G", `${rgb[1]}`], ["V", `${Math.round(ckState.picker.v * 100)}`], ["B", `${rgb[2]}`]];
    for (let i = 0; i < values.length; i++) {
        const col = i % 2, row = Math.floor(i / 2), bx = ix + col * 58, by = gy + row * 38;
        text(values[i][0], bx, by + 10, 10, rgba(180, 180, 180, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
        ctx.nvgBeginPath(); ctx.nvgRoundedRect(bx + 16, by, 34, 20, 2); ctx.nvgFillColor(rgba(61, 66, 71)); ctx.nvgFill();
        text(values[i][1], bx + 33, by + 10, 10, rgba(242, 244, 246, 220), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
    }
    ctx.nvgBeginPath(); ctx.nvgRect(ix, gy + 114, 108, 22); ctx.nvgFillColor(rgba(...rgb)); ctx.nvgFill();
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(ix, gy + 144, 108, 24, 2); ctx.nvgFillColor(rgba(61, 66, 71)); ctx.nvgFill();
    text(hex(rgb), ix + 54, gy + 156, 11, rgba(255, 255, 255, 230), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
}

function drawHero(width, t) {
    const glow = 0.5 + Math.sin(t * 1.4) * 0.5;
    text(ckTheme.title, width * 0.5, 88, 34, rgba(248, 248, 248, 245), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
    text(ckTheme.subtitle, width * 0.5, 126, 16, rgba(...ckTheme.accent, 220), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE);
    const x = width * 0.5, y = 154, a = 150 + Math.floor(glow * 60);
    ctx.nvgBeginPath(); ctx.nvgRoundedRect(x - 11, y - 3, 22, 6, 3); ctx.nvgRoundedRect(x - 3, y - 11, 6, 22, 3); ctx.nvgFillColor(rgba(...ckTheme.accent, a)); ctx.nvgFill();
}

function drawThemeSwitcher(width) {
    const buttonW = 104, buttonH = 22, gap = 6;
    const x = Math.max(12, width - (buttonW + gap) * themeChoiceIds.length - 18);
    const y = 18;
    text("Color styles", x, y - 5, 10, rgba(210, 218, 226, 190), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
    for (let i = 0; i < themeChoiceIds.length; i++) {
        const id = themeChoiceIds[i];
        const preset = themePresets[id];
        const bx = x + i * (buttonW + gap);
        const active = ckTheme.id === id;
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(bx, y + 8, buttonW, buttonH, 2);
        ctx.nvgFillColor(active ? rgba(...preset.accent, 220) : rgba(42, 47, 51, 230));
        ctx.nvgFill();
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(bx + 0.5, y + 8.5, buttonW - 1, buttonH - 1, 1.5);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(active ? rgba(255, 255, 255, 180) : rgba(18, 20, 22, 220));
        ctx.nvgStroke();
        text(preset.label, bx + buttonW * 0.5, y + 19, 10, active ? rgba(18, 22, 24, 240) : rgba(230, 236, 240, 220), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ck-bold");
        reg({ id: `theme:${id}`, type: "theme-choice", key: id, x: bx, y: y + 8, w: buttonW, h: buttonH });
    }
}

function drawLeftPanel(t) {
    const l = ckState.panels.left;
    const gx = l.x + PANEL_PAD_X, gw = l.w - PANEL_PAD_X * 2;
    let y = l.y + PANEL_HEADER_H + PANEL_PAD_TOP;
    const group1H = groupHeight("left:group1", 116);
    if (drawGroup("left:group1", gx, y, gw, group1H, "Group 1")) {
        drawCheckRow("left:check", "checkbox", gx + 6, y + 34, "checkbox", ckState.checkbox);
        drawCheckRow("left:check2", "checkboxAlt", gx + 82, y + 34, "mute", ckState.checkboxAlt);
        drawDropdown("left:dropdown", "leftChoice", gx + 6, y + 60, gw - 12, 22);
        drawButton("left:button", gx + 6, y + 84, gw - 12, 22, "BUTTON");
    }
    y += group1H + GROUP_GAP;
    const visual1H = groupHeight("left:visual1", 118);
    if (drawGroup("left:visual1", gx, y, gw, visual1H, "Group With Visual Comps")) {
        const s = ckState.scroll.leftVisual1;
        regScrollArea("scrollArea:leftVisual1", "leftVisual1", "y", gx + 6, y + 34, gw - 28, 68);
        ctx.nvgSave(); ctx.nvgScissor(gx + 6, y + 34, gw - 28, 68);
        drawWave(gx + 6, y + 34, gw - 28, 68, rgba(243, 243, 243, 240), t * 0.8, s.y);
        ctx.nvgRestore();
        drawVScrollbar("scroll:leftVisual1", "leftVisual1", gx + gw - 14, y + 34, 68, 0.48);
    }
    y += visual1H + GROUP_GAP;
    const visual2H = groupHeight("left:visual2", 84);
    if (drawGroup("left:visual2", gx, y, gw, visual2H, "Group With Visual Comps")) {
        const s = ckState.scroll.leftVisual2;
        regScrollArea("scrollArea:leftVisual2", "leftVisual2", "y", gx + 6, y + 34, gw - 28, 38);
        ctx.nvgSave(); ctx.nvgScissor(gx + 6, y + 34, gw - 28, 38);
        drawWave(gx + 6, y + 34, gw - 28, 38, rgba(243, 243, 243, 240), t * 1.2, s.y);
        ctx.nvgRestore();
        drawVScrollbar("scroll:leftVisual2", "leftVisual2", gx + gw - 14, y + 34, 38, 0.58);
    }
    y += visual2H + GROUP_GAP;
    const visual3H = groupHeight("left:visual3", 98);
    if (drawGroup("left:visual3", gx, y, gw, visual3H, "Group With Visual Comps")) {
        const s = ckState.scroll.leftVisual3;
        regScrollArea("scrollArea:leftVisual3", "leftVisual3", "y", gx + 6, y + 34, gw - 28, 50);
        ctx.nvgSave(); ctx.nvgScissor(gx + 6, y + 34, gw - 28, 50);
        drawWave(gx + 6, y + 34, gw - 28, 22, rgba(243, 243, 243, 240), t * 0.5, s.y);
        drawWave(gx + 6, y + 62, gw - 28, 22, rgba(58, 152, 255, 240), t * 1.6, s.y);
        ctx.nvgRestore();
        drawVScrollbar("scroll:leftVisual3", "leftVisual3", gx + gw - 14, y + 34, 50, 0.68);
    }
}

function drawCenterPanel(t) {
    const c = ckState.panels.center;
    const gx = c.x + PANEL_PAD_X, gw = c.w - PANEL_PAD_X * 2;
    let y = c.y + PANEL_HEADER_H + PANEL_PAD_TOP;
    const functionsH = groupHeight("center:functions", 272);
    if (drawGroup("center:functions", gx, y, gw, functionsH, "Function Selection")) {
        const s = ckState.scroll.centerGraph;
        regScrollArea("scrollArea:centerGraph", "centerGraph", "x", gx + 6, y + 34, gw - 12, 168);
        ctx.nvgSave(); ctx.nvgScissor(gx + 6, y + 34, gw - 12, 168);
        drawGraph(gx + 6, y + 34, gw - 12, 158, t, s.x);
        ctx.nvgRestore();
        drawHScrollbar("scroll:centerGraph", "centerGraph", gx + 6, y + 202, gw - 12, 0.42);
        drawDropdown("center:functions", "functionChoice", gx + 6, y + 228, gw - 12, 22, "Functions");
    }
    y += functionsH + GROUP_GAP;
    const behaviorH = groupHeight("center:behavior", 160);
    if (drawGroup("center:behavior", gx, y, gw, behaviorH, "Behavior")) {
        drawSlider("slider:strength", "strength", gx + 8, y + 34, gw - 16, ckState.sliders.strength, "Strength");
        drawSlider("slider:width", "width", gx + 8, y + 78, gw - 16, ckState.sliders.width, "Slide");
        drawSlider("slider:range", "range", gx + 8, y + 122, gw - 16, ckState.sliders.range, "Range");
    }
}

function drawRightPanel(t) {
    const r = ckState.panels.right;
    const gx = r.x + PANEL_PAD_X, gw = r.w - PANEL_PAD_X * 2;
    let y = r.y + PANEL_HEADER_H + PANEL_PAD_TOP;
    const sub1H = groupHeight("right:sub1", 250);
    if (drawGroup("right:sub1", gx, y, gw, sub1H, "Sub Group 1")) {
        const chartX = gx + 12, chartY = y + 36, chartW = gw - 24, chartH = 198;
        ctx.nvgBeginPath(); ctx.nvgRect(chartX, chartY, chartW, chartH); ctx.nvgFillColor(rgba(37, 42, 45)); ctx.nvgFill();
        for (let i = 0; i < 3; i++) { const vx = chartX + (i / 2) * chartW; ctx.nvgBeginPath(); ctx.nvgMoveTo(vx, chartY); ctx.nvgLineTo(vx, chartY + chartH); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(58, 66, 70)); ctx.nvgStroke(); }
        for (let i = 0; i < 3; i++) { const vy = chartY + (i / 2) * chartH; ctx.nvgBeginPath(); ctx.nvgMoveTo(chartX, vy); ctx.nvgLineTo(chartX + chartW, vy); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(58, 66, 70)); ctx.nvgStroke(); }
    }
    y += sub1H + GROUP_GAP;
    const sub2H = groupHeight("right:sub2", 202);
    if (drawGroup("right:sub2", gx, y, gw, sub2H, "Sub Group 2")) {
        text("Signal monitor", gx + 10, y + 36, 10.5, rgba(224, 228, 232, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ck-bold");
        drawNoise(gx + 10, y + 52, gw - 20, 86, t, 0);
        drawCheckRow("right:monitor", "checkbox", gx + 10, y + 150, "monitor", ckState.checkbox);
        drawCheckRow("right:sync", "checkboxAlt", gx + 10, y + 172, "sync", ckState.checkboxAlt);
    }
}

function drawFarRightPanel() {
    const fr = ckState.panels.farRight;
    const gx = fr.x + PANEL_PAD_X, gw = fr.w - PANEL_PAD_X * 2;
    let y = fr.y + PANEL_HEADER_H + PANEL_PAD_TOP;
    const sub1H = groupHeight("farRight:sub1", 146);
    if (drawGroup("farRight:sub1", gx, y, gw, sub1H, "SubGroup 1")) {
        text("Number", gx + 6, y + 36, 10, rgba(242, 242, 242, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        drawDropdown("right:unit", "unitChoice", gx + 6, y + 48, gw - 12, 22);
        text("Str", gx + 6, y + 86, 10, rgba(242, 242, 242, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        drawSlider("right:strength", "strength", gx + 6, y + 94, gw - 12, ckState.sliders.strength, "Str/w");
    }
    y += sub1H + GROUP_GAP;
    const controls1H = groupHeight("farRight:controls1", 126);
    if (drawGroup("farRight:controls1", gx, y, gw, controls1H, "Group")) {
        drawSlider("right:width", "width", gx + 6, y + 34, gw - 12, ckState.sliders.width, "Slide");
        drawSlider("right:range", "range", gx + 6, y + 76, gw - 12, ckState.sliders.range, "Range");
    }
    y += controls1H + GROUP_GAP;
    const controls2H = groupHeight("farRight:controls2", 124);
    if (drawGroup("farRight:controls2", gx, y, gw, controls2H, "Group")) {
        drawButton("right:trigger", gx + 6, y + 34, gw - 12, 22, "Trigger");
        drawDropdown("right:dock", "dockChoice", gx + 6, y + 66, gw - 12, 22);
        drawCheckRow("right:arm", "checkboxAlt", gx + 6, y + 98, "Arm", ckState.checkboxAlt);
    }
    y += controls2H + GROUP_GAP;
    const inputsH = groupHeight("farRight:inputs", 116);
    if (drawGroup("farRight:inputs", gx, y, gw, inputsH, "Inputs")) {
        text("Name", gx + 6, y + 36, 9.5, rgba(214, 218, 224, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        drawEditBox("name", gx + 6, y + 48, gw - 12, 20, "Name");
        text("BPM", gx + 6, y + 76, 9.5, rgba(214, 218, 224, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        drawEditBoxNum("bpm", "bpm", gx + 6, y + 88, gw - 12, 20, { step: 1, min: 20, max: 300, decimals: 0 });
    }
}

function drawUI(t) {
    const titles = {
        left: "Panel 1 Left Floated",
        center: "Panel 3 Left Floated",
        right: "Control Panel",
        farRight: "Controller",
        floatingColor: "Floating Color Panel",
        picker: "Color Picker",
    };
    const drawers = {
        left: drawLeftPanel,
        center: drawCenterPanel,
        right: drawRightPanel,
        farRight: drawFarRightPanel,
        floatingColor: () => drawPalette("floatingColor", false),
        picker: () => drawPicker("picker", false),
    };

    for (const key of ckState.panelOrder) {
        const panel = ckState.panels[key];
        if (!panel) continue;
        panel.displayH = panelHeight(key);
        drawPanelFrame(key, titles[key] ?? key);
        if (panel.collapsed) continue;
        withPanel(key, () => drawers[key]?.(t));
    }
    drawDropdownOverlays();
}

function createContext() {
    const p = new NVGparams();
    p.renderCreate = function(userPtr) { return glnvg__renderCreate(userPtr); };
    p.renderCreateTexture = function(userPtr, type, width, height, imageFlags, data) { return glnvg__renderCreateTexture(userPtr, type, width, height, imageFlags, data); };
    p.renderDeleteTexture = function(userPtr, image) { return glnvg__renderDeleteTexture(userPtr, image); };
    p.renderUpdateTexture = function(userPtr, image, x, y, w, h, data) { return glnvg__renderUpdateTexture(userPtr, image, x, y, w, h, data); };
    p.renderGetTextureSize = function(userPtr, image) { return glnvg__renderGetTextureSize(userPtr, image); };
    p.renderViewport = function(userPtr, width, height, devicePixelRatio) { glnvg__renderViewport(userPtr, width, height, devicePixelRatio); };
    p.renderCancel = function(userPtr) { glnvg__renderCancel(userPtr); };
    p.renderFlush = function(userPtr) { glnvg__renderFlush(userPtr); };
    p.renderFill = function(userPtr, fillPaint, compositeOperation, scissor, fringeWidth, bounds, paths, npaths) { glnvg__renderFill(userPtr, fillPaint, compositeOperation, scissor, fringeWidth, bounds, paths, npaths); };
    p.renderStroke = function(userPtr, strokePaint, compositeOperation, scissor, fringe, strokeWidth, paths, npaths) { glnvg__renderStroke(userPtr, strokePaint, compositeOperation, scissor, fringe, strokeWidth, paths, npaths); };
    p.renderTriangles = function(userPtr, paint, compositeOperation, scissor, verts, nverts, fringe) { glnvg__renderTriangles(userPtr, paint, compositeOperation, scissor, verts, nverts, fringe); };
    p.renderDelete = function(userPtr) { glnvg__renderDelete(userPtr); };
    p.userPtr = gl; p.edgeAntiAlias = true; gl.edgeAntiAlias = true; ctx = nvgCreateInternal(p);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
}

function render() {
    resizeCanvas();
    const winWidth = Math.max(1, canvas.clientWidth), fbWidth = gl.drawingBufferWidth, fbHeight = gl.drawingBufferHeight, pxRatio = fbWidth / winWidth, now = performance.now() * 0.001, dt = prevFrame === 0 ? 0 : now - prevFrame;
    prevFrame = now; inputBlink = now; ckState.triggerFlash = Math.max(0, ckState.triggerFlash - dt * 2.5);
    gl.viewport(0, 0, fbWidth, fbHeight); gl.clearColor(...ckTheme.clear); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    beginControls();
    ctx.nvgBeginFrame(winWidth, Math.max(1, canvas.clientHeight), pxRatio);
    ctx.nvgBeginPath(); ctx.nvgRect(0, 0, winWidth, Math.max(1, canvas.clientHeight)); ctx.nvgFillColor(rgba(...ckTheme.background)); ctx.nvgFill();
    drawHero(winWidth, now);
    drawThemeSwitcher(winWidth);
    drawUI(now);
    ctx.nvgEndFrame();
    requestAnimationFrame(render);
}

function handleInputKeydown(event) {
    const id = ckState.inputs.activeId;
    if (!id) return;
    const control = controls.find((item) => item.id === id);
    if (!control) return;

    if (event.key === "Escape") {
        ckState.inputs.activeId = null;
        event.preventDefault();
        return;
    }

    if (control.type === "edit-num" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        adjustNumericInput(control, event.key === "ArrowUp" ? 1 : -1, event.shiftKey ? 10 : 1);
        event.preventDefault();
        return;
    }

    if (event.key === "ArrowLeft") {
        ckState.inputs.caret = Math.max(0, ckState.inputs.caret - 1);
        event.preventDefault();
        return;
    }

    if (event.key === "ArrowRight") {
        const value = ckState.inputs.values[id] ?? "";
        ckState.inputs.caret = Math.min(value.length, ckState.inputs.caret + 1);
        event.preventDefault();
        return;
    }

    if (event.key === "Home") {
        ckState.inputs.caret = 0;
        event.preventDefault();
        return;
    }

    if (event.key === "End") {
        const value = ckState.inputs.values[id] ?? "";
        ckState.inputs.caret = value.length;
        event.preventDefault();
        return;
    }

    if (event.key === "Backspace") {
        deleteInputLeft(id);
        event.preventDefault();
        return;
    }

    if (event.key === "Delete") {
        deleteInputRight(id);
        event.preventDefault();
        return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (control.type === "edit-num") {
            const value = ckState.inputs.values[id] ?? "";
            if (event.key === "-" && ckState.inputs.caret === 0 && !value.includes("-")) {
                insertInputText(id, event.key);
                event.preventDefault();
            } else if (event.key === "." && !value.includes(".")) {
                insertInputText(id, event.key);
                event.preventDefault();
            } else if ("0123456789".includes(event.key)) {
                insertInputText(id, event.key);
                event.preventDefault();
            }
            return;
        }
        insertInputText(id, event.key);
        event.preventDefault();
    }
}

function main() {
    canvas = document.querySelector("#glcanvas"); resizeCanvas();
    gl = canvas.getContext("experimental-webgl", { stencil: true, alpha: true, antialias: true });
    if (!gl) { alert("Unable to initialize WebGL. Your browser or machine may not support it."); return; }
    canvas.tabIndex = 0;
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect(); mouseX = event.clientX - rect.left; mouseY = event.clientY - rect.top;
        if (pointerDown && dragTarget) { const p = ckState.panels[dragTarget]; p.x = mouseX - dragOffsetX; p.y = mouseY - dragOffsetY; }
        if (pointerDown && activeControlId) {
            if (activeControlId.startsWith("slider") || activeControlId.startsWith("right:")) updateSlider(activeControlId, mouseX);
            else if (activeControlId.startsWith("scroll:")) updateScroll(activeControlId, mouseX, mouseY);
            else if (activeControlId === "picker:sv") updatePickerSv(activeControlId, mouseX, mouseY);
            else if (activeControlId === "picker:hue") updatePickerHue(activeControlId, mouseY);
        }
    });
    canvas.addEventListener("wheel", (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
        const c = hitControl(mouseX, mouseY);
        const target = c && c.type === "scroll-area" ? c : hitScrollArea(mouseX, mouseY);
        if (!target) return;
        const dx = target.axes.includes("x") ? (event.shiftKey ? event.deltaY : event.deltaX || event.deltaY) : event.deltaX;
        const dy = target.axes.includes("y") ? event.deltaY : 0;
        if (scrollArea(target, dx, dy)) event.preventDefault();
    }, { passive: false });
    canvas.addEventListener("mousedown", (event) => {
        const rect = canvas.getBoundingClientRect(); mouseX = event.clientX - rect.left; mouseY = event.clientY - rect.top; pointerDown = true; activeControlId = null; dragTarget = null;
        const c = hitControl(mouseX, mouseY); activate(c);
        if (c && (c.type === "slider" || c.type === "picker-sv" || c.type === "picker-hue")) activeControlId = c.id;
        canvas.focus();
    });
    window.addEventListener("mouseup", () => { pointerDown = false; dragTarget = null; activeControlId = null; });
    window.addEventListener("keydown", handleInputKeydown);
    window.addEventListener("resize", resizeCanvas);
    createContext(); ensureFonts().finally(() => render());
}

document.addEventListener("DOMContentLoaded", main);
