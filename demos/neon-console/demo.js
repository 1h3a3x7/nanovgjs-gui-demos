let canvas = null;
let gl = null;
let ctx = null;
let mx = -1000;
let my = -1000;
let prevFrameTime = 0;
let isPointerDown = false;
let activePanelKey = null;
let activeScrollOffset = 0;
let activePanelContent = false;

const PANEL_HEADER_H = 46;

const perfGraph = {
    name: "Frame Time",
    values: new Array(120).fill(0),
    head: 0,
};

let demoFontsReady = false;
let demoFontsLoading = null;
let controlMap = {};
let focusOrder = [];
let hitOrder = [];

const PRESETS = [
    "Studio / Cold Light",
    "Neon / Wet Surface",
    "Sunset / Warm Fog",
];

const MODE_LABELS = ["Edit", "Look", "Fx"];
const ACCENT_COLORS = [
    [114, 176, 255],
    [88, 204, 187],
    [241, 183, 84],
    [241, 128, 128],
    [175, 150, 255],
];
const THEMES = [
    {
        name: "Nebula",
        bgTop: [46, 48, 54],
        bgBottom: [26, 27, 31],
        glow: [108, 168, 255],
        panel: [24, 25, 29],
        panelStroke: [255, 255, 255, 22],
        headerGlow: [255, 255, 255, 18],
        headerLine: [255, 255, 255, 14],
        title: [232, 235, 240],
        subtitle: [140, 146, 155],
    },
    {
        name: "Ember",
        bgTop: [52, 44, 38],
        bgBottom: [26, 21, 18],
        glow: [255, 168, 96],
        panel: [30, 24, 22],
        panelStroke: [255, 230, 210, 28],
        headerGlow: [255, 220, 200, 22],
        headerLine: [255, 220, 200, 16],
        title: [240, 235, 228],
        subtitle: [175, 164, 150],
    },
    {
        name: "Aurora",
        bgTop: [34, 50, 48],
        bgBottom: [18, 28, 30],
        glow: [120, 255, 210],
        panel: [20, 30, 30],
        panelStroke: [210, 255, 240, 26],
        headerGlow: [210, 255, 240, 20],
        headerLine: [210, 255, 240, 16],
        title: [224, 242, 236],
        subtitle: [150, 176, 170],
    },
];
const LAYER_NAMES = [
    "Fog Volume",
    "Main Orb",
    "Reflection Pass",
    "UI Highlights",
    "Post Grain",
];

const uiState = {
    modeIndex: 0,
    presetIndex: 0,
    toggles: {
        snapToGrid: true,
        animateBloom: false,
    },
    sliders: {
        exposure: 0.35,
        bloom: 0.68,
        parallax: 0.24,
    },
    accentIndex: 0,
    transportIndex: 0,
    layerIndex: 1,
    playing: true,
    activeDragId: null,
    focusId: null,
    themeIndex: 0,
    panels: null,
    panelOrder: ["left", "right"],
    panelDrag: null,
    viewport: { w: 0, h: 0 },
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function roundedRectVarying(x, y, w, h, r1, r2, r3, r4) {
    if (ctx.nvgRoundedRectVarying) {
        ctx.nvgRoundedRectVarying(x, y, w, h, r1, r2, r3, r4);
        return;
    }
    ctx.nvgRoundedRect(x, y, w, h, Math.min(r1, r2, r3, r4));
}

function updateGraph(graph, frameTime) {
    graph.head = (graph.head + 1) % graph.values.length;
    graph.values[graph.head] = frameTime;
}

function getGraphAverage(graph) {
    let avg = 0;
    for (let i = 0; i < graph.values.length; i++) {
        avg += graph.values[i];
    }
    return avg / graph.values.length;
}

function ensureFonts() {
    if (!ctx) return Promise.resolve(false);
    if (demoFontsReady) return Promise.resolve(true);
    if (demoFontsLoading) return demoFontsLoading;

    const regular = ctx.nvgCreateFont("ui", "../../node_modules/nanovgjs/example/Roboto-Regular.ttf");
    const bold = ctx.nvgCreateFont("ui-bold", "../../node_modules/nanovgjs/example/Roboto-Bold.ttf");
    const fontIds = [regular, bold].filter((id) => id >= 0);
    const loaders = fontIds
        .map((id) => ctx.fs && ctx.fs.fonts[id] ? ctx.fs.fonts[id].loading : null)
        .filter(Boolean);

    demoFontsLoading = Promise.all(loaders).then(() => {
        demoFontsReady = true;
        demoFontsLoading = null;
        return true;
    }).catch(() => {
        demoFontsLoading = null;
        return false;
    });

    return demoFontsLoading;
}

function pointInRect(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
}

function pointInCircle(px, py, cx, cy, r) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
}

function getAccentColor(alpha = 220) {
    const c = ACCENT_COLORS[uiState.accentIndex];
    return NVGcolor.nvgRGBA(c[0], c[1], c[2], alpha);
}

function getTheme() {
    return THEMES[uiState.themeIndex % THEMES.length];
}

function ensurePanels(width, height) {
    if (!uiState.panels) {
        const leftW = 336;
        const leftH = height - 48;
        const rightW = clamp(width * 0.42, 360, 560);
        const rightH = height - 48;
        uiState.panels = {
            left: { x: 26, y: 24, w: leftW, h: leftH, collapsed: false, scrollY: 0, scrollMax: 0 },
            right: { x: width - rightW - 26, y: 24, w: rightW, h: rightH, collapsed: false, scrollY: 0, scrollMax: 0 },
        };
    }

    uiState.viewport.w = width;
    uiState.viewport.h = height;

    for (const key of Object.keys(uiState.panels)) {
        const p = uiState.panels[key];
        const minW = 280;
        const minH = 220;
        p.w = clamp(p.w, minW, width - 40);
        p.h = clamp(p.h, minH, height - 40);
        p.x = clamp(p.x, 10, width - p.w - 10);
        p.y = clamp(p.y, 10, height - p.h - 10);
    }
}

function bringPanelToFront(key) {
    const order = uiState.panelOrder;
    const idx = order.indexOf(key);
    if (idx === -1 || idx === order.length - 1) return;
    order.splice(idx, 1);
    order.push(key);
}

function beginLayout() {
    controlMap = {};
    focusOrder = [];
    hitOrder = [];
}

function registerControl(id, type, bounds, extra = {}) {
    const enriched = { ...extra };
    if (activePanelKey && !enriched.panelKey) {
        enriched.panelKey = activePanelKey;
    }
    if (activePanelContent && enriched.scrollable !== false) {
        enriched.scrollable = true;
    }
    controlMap[id] = { id, type, ...bounds, ...enriched };
    hitOrder.push(id);
    if (extra.focusable !== false) {
        focusOrder.push(id);
    }
}

function isFocused(id) {
    return uiState.focusId === id;
}

function isHoveredRect(x, y, w, h) {
    const hoverY = activePanelKey ? my + activeScrollOffset : my;
    return pointInRect(mx, hoverY, x, y, w, h);
}

function isHoveredCircle(cx, cy, r) {
    const hoverY = activePanelKey ? my + activeScrollOffset : my;
    return pointInCircle(mx, hoverY, cx, cy, r);
}

function drawFocusRing(x, y, w, h, radius = 6) {
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
    ctx.nvgStrokeWidth(1.5);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(199, 224, 255, 120));
    ctx.nvgStroke();
}

function hitTestControl(px, py) {
    for (let i = hitOrder.length - 1; i >= 0; i--) {
        const item = controlMap[hitOrder[i]];
        if (!item) continue;
        let testX = px;
        let testY = py;
        if (item.scrollable && item.panelKey) {
            const panel = uiState.panels?.[item.panelKey];
            if (panel && !panel.collapsed) {
                testY = py + (panel.scrollY || 0);
            }
        }
        if (item.type === "swatch") {
            if (pointInCircle(testX, testY, item.cx, item.cy, item.r)) return item;
            continue;
        }
        if (pointInRect(testX, testY, item.x, item.y, item.w, item.h)) return item;
    }
    return null;
}

function focusNextControl(direction) {
    if (focusOrder.length === 0) return;
    const current = focusOrder.indexOf(uiState.focusId);
    if (current === -1) {
        uiState.focusId = focusOrder[0];
        return;
    }
    const next = (current + direction + focusOrder.length) % focusOrder.length;
    uiState.focusId = focusOrder[next];
}

function setSliderFromPointer(control, px) {
    const value = clamp((px - control.x) / control.w, 0, 1);
    uiState.sliders[control.key] = value;
}

function adjustFocusedControl(step) {
    const control = controlMap[uiState.focusId];
    if (!control) return;

    if (control.type === "slider") {
        uiState.sliders[control.key] = clamp(uiState.sliders[control.key] + step, 0, 1);
        return;
    }

    if (control.type === "segmented") {
        uiState.modeIndex = (uiState.modeIndex + (step > 0 ? 1 : MODE_LABELS.length - 1)) % MODE_LABELS.length;
        return;
    }

    if (control.type === "dropdown") {
        uiState.presetIndex = (uiState.presetIndex + (step > 0 ? 1 : PRESETS.length - 1)) % PRESETS.length;
        return;
    }

    if (control.type === "layer") {
        uiState.layerIndex = clamp(uiState.layerIndex + (step > 0 ? 1 : -1), 0, LAYER_NAMES.length - 1);
        return;
    }

    if (control.type === "swatch") {
        uiState.accentIndex = (uiState.accentIndex + (step > 0 ? 1 : ACCENT_COLORS.length - 1)) % ACCENT_COLORS.length;
    }
}

function activateControl(control) {
    if (!control) return;
    uiState.focusId = control.id;
    if (control.panelKey) {
        bringPanelToFront(control.panelKey);
    }

    switch (control.type) {
        case "panel-drag": {
            const panel = uiState.panels?.[control.panelKey];
            if (panel) {
                uiState.panelDrag = {
                    key: control.panelKey,
                    mode: "move",
                    offsetX: mx - panel.x,
                    offsetY: my - panel.y,
                };
                uiState.activeDragId = control.id;
            }
            break;
        }
        case "panel-resize": {
            const panel = uiState.panels?.[control.panelKey];
            if (panel) {
                uiState.panelDrag = {
                    key: control.panelKey,
                    mode: "resize",
                    startX: mx,
                    startY: my,
                    startW: panel.w,
                    startH: panel.h,
                };
                uiState.activeDragId = control.id;
            }
            break;
        }
        case "panel-toggle": {
            const panel = uiState.panels?.[control.panelKey];
            if (panel) panel.collapsed = !panel.collapsed;
            break;
        }
        case "panel-body":
            break;
        case "toggle":
            uiState.toggles[control.key] = !uiState.toggles[control.key];
            break;
        case "slider":
            setSliderFromPointer(control, mx);
            uiState.activeDragId = control.id;
            break;
        case "segmented":
            uiState.modeIndex = control.index;
            break;
        case "dropdown":
            uiState.presetIndex = (uiState.presetIndex + 1) % PRESETS.length;
            break;
        case "button":
            uiState.transportIndex = control.index;
            if (control.action === "Play") uiState.playing = true;
            if (control.action === "Pause") uiState.playing = false;
            if (control.action === "Reset") {
                prevFrameTime = 0;
                perfGraph.values.fill(0);
            }
            break;
        case "swatch":
            uiState.accentIndex = control.index;
            break;
        case "layer":
            uiState.layerIndex = control.index;
            break;
        default:
            break;
    }
}

function drawText(text, x, y, size, color, align, font = "ui") {
    ctx.nvgFontSize(size);
    ctx.nvgFontFace(font);
    ctx.nvgFillColor(color);
    ctx.nvgTextAlign(align);
    ctx.nvgText(x, y, text, null);
}

function drawBackground(width, height) {
    const theme = getTheme();
    const bg = ctx.nvgLinearGradient(
        0, 0, 0, height,
        NVGcolor.nvgRGBA(...theme.bgTop, 255),
        NVGcolor.nvgRGBA(...theme.bgBottom, 255)
    );
    ctx.nvgBeginPath();
    ctx.nvgRect(0, 0, width, height);
    ctx.nvgFillPaint(bg);
    ctx.nvgFill();

    const glow = ctx.nvgRadialGradient(
        width * 0.82, height * 0.22, 40, height * 0.55,
        NVGcolor.nvgRGBA(...theme.glow, 28),
        NVGcolor.nvgRGBA(...theme.glow, 0)
    );
    ctx.nvgBeginPath();
    ctx.nvgRect(0, 0, width, height);
    ctx.nvgFillPaint(glow);
    ctx.nvgFill();

    for (let i = 0; i < 22; i++) {
        const y = height * 0.12 + i * 34;
        ctx.nvgBeginPath();
        ctx.nvgMoveTo(0, y);
        ctx.nvgLineTo(width, y);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(NVGcolor.nvgRGBA(255, 255, 255, 6));
        ctx.nvgStroke();
    }
}

function drawPanel(panelKey, x, y, w, h, title, subtitle, collapsed) {
    const theme = getTheme();
    const radius = 8;
    const headerH = PANEL_HEADER_H;
    const panelH = collapsed ? headerH + 6 : h;
    const shadow = ctx.nvgBoxGradient(
        x, y + 8, w, panelH, radius + 4, 22,
        NVGcolor.nvgRGBA(0, 0, 0, 120),
        NVGcolor.nvgRGBA(0, 0, 0, 0)
    );

    ctx.nvgBeginPath();
    ctx.nvgRect(x - 30, y - 30, w + 60, panelH + 80);
    ctx.nvgRoundedRect(x, y, w, panelH, radius);
    ctx.nvgPathWinding(NVG_HOLE);
    ctx.nvgFillPaint(shadow);
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, panelH, radius);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(...theme.panel, 242));
    ctx.nvgFill();

    const top = ctx.nvgLinearGradient(
        x, y, x, y + headerH,
        NVGcolor.nvgRGBA(...theme.headerGlow),
        NVGcolor.nvgRGBA(255, 255, 255, 0)
    );
    ctx.nvgBeginPath();
    roundedRectVarying(x + 1, y + 1, w - 2, headerH + 2, radius - 1, radius - 1, 0, 0);
    ctx.nvgFillPaint(top);
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgMoveTo(x + 0.5, y + headerH + 0.5);
    ctx.nvgLineTo(x + w - 0.5, y + headerH + 0.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(...theme.headerLine));
    ctx.nvgStroke();

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, panelH - 1, radius - 0.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(...theme.panelStroke));
    ctx.nvgStroke();

    drawText(title, x + 18, y + 17, 13, NVGcolor.nvgRGBA(...theme.title, 220), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");
    drawText(subtitle, x + 18, y + 33, 11, NVGcolor.nvgRGBA(...theme.subtitle, 180), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);

    // Window controls
    const buttonX = x + w - 30;
    const buttonY = y + 12;
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(buttonX, buttonY, 16, 16, 4);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(255, 255, 255, 12));
    ctx.nvgFill();
    ctx.nvgBeginPath();
    if (collapsed) {
        ctx.nvgMoveTo(buttonX + 4, buttonY + 6);
        ctx.nvgLineTo(buttonX + 12, buttonY + 6);
        ctx.nvgLineTo(buttonX + 8, buttonY + 12);
    } else {
        ctx.nvgMoveTo(buttonX + 4, buttonY + 10);
        ctx.nvgLineTo(buttonX + 12, buttonY + 10);
        ctx.nvgLineTo(buttonX + 8, buttonY + 5);
    }
    ctx.nvgClosePath();
    ctx.nvgFillColor(NVGcolor.nvgRGBA(232, 235, 240, 200));
    ctx.nvgFill();

    // Controls
    const bodyH = Math.max(0, panelH - headerH);
    registerControl(`panel:${panelKey}`, "panel-body", { x, y: y + headerH, w, h: bodyH }, { panelKey, focusable: false });
    registerControl(`panel:drag:${panelKey}`, "panel-drag", { x, y, w, h: headerH }, { panelKey, focusable: false });
    registerControl(`panel:toggle:${panelKey}`, "panel-toggle", { x: buttonX, y: buttonY, w: 16, h: 16 }, { panelKey, focusable: false });
    if (!collapsed) {
        const resizeSize = 12;
        const rx = x + w - resizeSize - 4;
        const ry = y + panelH - resizeSize - 4;
        ctx.nvgBeginPath();
        ctx.nvgMoveTo(rx + 2, ry + resizeSize - 2);
        ctx.nvgLineTo(rx + resizeSize - 2, ry + 2);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(NVGcolor.nvgRGBA(255, 255, 255, 60));
        ctx.nvgStroke();
        registerControl(`panel:resize:${panelKey}`, "panel-resize", { x: rx, y: ry, w: resizeSize, h: resizeSize }, { panelKey, focusable: false });
    }
}

function drawPanelScrollbar(panel, bodyX, bodyY, bodyW, bodyH) {
    if (!panel || panel.scrollMax <= 0 || bodyH <= 0) return;

    const trackW = 6;
    const pad = 6;
    const trackX = bodyX + bodyW - trackW - pad;
    const trackY = bodyY + pad;
    const trackH = Math.max(0, bodyH - pad * 2);
    if (trackH <= 0) return;

    const ratio = bodyH / (bodyH + panel.scrollMax);
    const handleH = Math.max(24, trackH * ratio);
    const handleY = trackY + (trackH - handleH) * (panel.scrollY / panel.scrollMax);

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(trackX, trackY, trackW, trackH, trackW * 0.5);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(255, 255, 255, 18));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(trackX, handleY, trackW, handleH, trackW * 0.5);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(120, 170, 255, 140));
    ctx.nvgFill();
}

function drawSectionTitle(text, x, y) {
    drawText(text, x, y, 10.5, NVGcolor.nvgRGBA(135, 141, 150, 160), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");
}

function drawDivider(x, y, w) {
    ctx.nvgBeginPath();
    ctx.nvgMoveTo(x, y);
    ctx.nvgLineTo(x + w, y);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(255, 255, 255, 12));
    ctx.nvgStroke();
}

function drawValuePill(text, x, y, w, h, active) {
    const fill = active ? NVGcolor.nvgRGBA(70, 116, 180, 190) : NVGcolor.nvgRGBA(255, 255, 255, 10);
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, h, h * 0.5);
    ctx.nvgFillColor(fill);
    ctx.nvgFill();
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, h * 0.5 - 0.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(active ? NVGcolor.nvgRGBA(153, 194, 255, 60) : NVGcolor.nvgRGBA(255, 255, 255, 16));
    ctx.nvgStroke();
    drawText(text, x + w * 0.5, y + h * 0.5, 10.5, active ? NVGcolor.nvgRGBA(238, 244, 255, 220) : NVGcolor.nvgRGBA(164, 170, 178, 180), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ui-bold");
}

function drawLabelValueRow(label, value, x, y, w) {
    drawText(label, x, y, 11.5, NVGcolor.nvgRGBA(188, 192, 198, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    drawText(value, x + w, y, 11.5, NVGcolor.nvgRGBA(137, 207, 255, 210), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE, "ui-bold");
}

function drawToggleRow(id, label, x, y, w, isOn, key) {
    drawLabelValueRow(label, isOn ? "ON" : "OFF", x, y + 10, w);

    const switchW = 36;
    const switchH = 16;
    const switchX = x + w - switchW;
    const switchY = y + 20;
    const fill = isOn ? NVGcolor.nvgRGBA(78, 127, 198, 200) : NVGcolor.nvgRGBA(52, 55, 61, 255);
    const hover = isHoveredRect(x, y, w, 38);

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(switchX, switchY, switchW, switchH, 8);
    ctx.nvgFillColor(hover ? NVGcolor.nvgRGBA(fill.r, fill.g, fill.b, Math.min(255, fill.a + 20)) : fill);
    ctx.nvgFill();

    const knobX = isOn ? switchX + switchW - 9 : switchX + 9;
    ctx.nvgBeginPath();
    ctx.nvgCircle(knobX, switchY + switchH * 0.5, 6);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(228, 232, 236, 245));
    ctx.nvgFill();

    if (isFocused(id)) {
        drawFocusRing(x, y, w, 38, 6);
    }

    registerControl(id, "toggle", { x, y, w, h: 38 }, { key });
}

function drawSliderRow(id, label, valueText, x, y, w, value, accent, key) {
    drawLabelValueRow(label, valueText, x, y + 8, w);

    const trackY = y + 24;
    const trackH = 4;
    const knobX = x + clamp(value, 0, 1) * w;
    const hover = isHoveredRect(x, y, w, 34) || isHoveredCircle(knobX, trackY + 2, 9);

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, trackY, w, trackH, 2);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(62, 66, 72, 255));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, trackY, knobX - x, trackH, 2);
    ctx.nvgFillColor(accent);
    ctx.nvgFill();

    const shadow = ctx.nvgRadialGradient(
        knobX, trackY + 2, 2, 10,
        NVGcolor.nvgRGBA(0, 0, 0, 100),
        NVGcolor.nvgRGBA(0, 0, 0, 0)
    );
    ctx.nvgBeginPath();
    ctx.nvgRect(knobX - 14, trackY - 14, 28, 28);
    ctx.nvgCircle(knobX, trackY + 2, 8);
    ctx.nvgPathWinding(NVG_HOLE);
    ctx.nvgFillPaint(shadow);
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgCircle(knobX, trackY + 2, hover || isFocused(id) ? 6.8 : 6);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(224, 228, 232, 240));
    ctx.nvgFill();

    if (isFocused(id)) {
        drawFocusRing(x, y, w, 34, 6);
    }

    registerControl(id, "slider", { x, y, w, h: 34 }, { key });
}

function drawSegmentedRow(id, label, x, y, w, labels, activeIndex) {
    drawText(label, x, y + 8, 11.5, NVGcolor.nvgRGBA(188, 192, 198, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    const pad = 6;
    const segW = (w - pad * (labels.length - 1)) / labels.length;
    const segY = y + 20;
    const segH = 18;

    for (let i = 0; i < labels.length; i++) {
        const sx = x + i * (segW + pad);
        const active = i === activeIndex;
        drawValuePill(labels[i], sx, segY, segW, segH, active);
        registerControl(`${id}:${i}`, "segmented", { x: sx, y: segY, w: segW, h: segH }, { index: i, focusable: false });
    }

    if (isFocused(id)) {
        drawFocusRing(x, y, w, 42, 6);
    }

    registerControl(id, "segmented", { x, y, w, h: 42 });
}

function drawDropdownRow(id, label, value, x, y, w) {
    drawText(label, x, y + 8, 11.5, NVGcolor.nvgRGBA(188, 192, 198, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);

    const boxY = y + 20;
    const boxH = 24;
    const hover = isHoveredRect(x, boxY, w, boxH);
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, boxY, w, boxH, 5);
    ctx.nvgFillColor(hover ? NVGcolor.nvgRGBA(42, 45, 50, 255) : NVGcolor.nvgRGBA(37, 39, 44, 255));
    ctx.nvgFill();
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x + 0.5, boxY + 0.5, w - 1, boxH - 1, 4.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(255, 255, 255, 18));
    ctx.nvgStroke();

    drawText(value, x + 12, boxY + boxH * 0.5, 11.5, NVGcolor.nvgRGBA(220, 223, 228, 210), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    drawText(">", x + w - 12, boxY + boxH * 0.5, 12, NVGcolor.nvgRGBA(140, 146, 155, 180), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE, "ui-bold");

    if (isFocused(id)) {
        drawFocusRing(x, y, w, 44, 6);
    }

    registerControl(id, "dropdown", { x, y, w, h: 44 });
}

function drawButtonRow(id, x, y, w, labels, activeIndex) {
    const gap = 8;
    const bw = (w - gap * (labels.length - 1)) / labels.length;
    const bh = 28;

    for (let i = 0; i < labels.length; i++) {
        const bx = x + i * (bw + gap);
        const active = i === activeIndex;
        const hover = isHoveredRect(bx, y, bw, bh);
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(bx, y, bw, bh, 5);
        ctx.nvgFillColor(active
            ? NVGcolor.nvgRGBA(84, 129, 191, hover ? 220 : 190)
            : hover
                ? NVGcolor.nvgRGBA(255, 255, 255, 18)
                : NVGcolor.nvgRGBA(255, 255, 255, 10));
        ctx.nvgFill();
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(bx + 0.5, y + 0.5, bw - 1, bh - 1, 4.5);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(active ? NVGcolor.nvgRGBA(158, 205, 255, 65) : NVGcolor.nvgRGBA(255, 255, 255, 18));
        ctx.nvgStroke();
        drawText(labels[i], bx + bw * 0.5, y + bh * 0.5, 11, active ? NVGcolor.nvgRGBA(240, 245, 255, 220) : NVGcolor.nvgRGBA(175, 180, 186, 185), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "ui-bold");
        registerControl(`${id}:${i}`, "button", { x: bx, y, w: bw, h: bh }, { index: i, action: labels[i], focusable: false });
    }

    if (isFocused(id)) {
        drawFocusRing(x, y, w, bh, 6);
    }

    registerControl(id, "button", { x, y, w, h: bh });
}

function drawMeterCard(x, y, w, h, title, valueText, ratio, accent) {
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, h, 7);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(255, 255, 255, 8));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 6.5);
    ctx.nvgStrokeWidth(1);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(255, 255, 255, 16));
    ctx.nvgStroke();

    drawText(title, x + 12, y + 13, 10.5, NVGcolor.nvgRGBA(140, 146, 155, 170), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");
    drawText(valueText, x + 12, y + 33, 18, NVGcolor.nvgRGBA(232, 236, 240, 225), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");

    const barX = x + 12;
    const barY = y + h - 15;
    const barW = w - 24;
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(barX, barY, barW, 4, 2);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(58, 61, 67, 255));
    ctx.nvgFill();
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(barX, barY, barW * clamp(ratio, 0, 1), 4, 2);
    ctx.nvgFillColor(accent);
    ctx.nvgFill();
}

function drawColorSwatches(id, x, y, size, gap, colors, activeIndex) {
    for (let i = 0; i < colors.length; i++) {
        const sx = x + i * (size + gap);
        const c = colors[i];
        const hover = isHoveredRect(sx, y, size, size);
        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(sx, y, size, size, 5);
        ctx.nvgFillColor(NVGcolor.nvgRGBA(c[0], c[1], c[2], 255));
        ctx.nvgFill();
        if (i === activeIndex || hover) {
            ctx.nvgBeginPath();
            ctx.nvgRoundedRect(sx - 2, y - 2, size + 4, size + 4, 7);
            ctx.nvgStrokeWidth(i === activeIndex ? 2 : 1);
            ctx.nvgStrokeColor(i === activeIndex ? NVGcolor.nvgRGBA(220, 232, 255, 180) : NVGcolor.nvgRGBA(255, 255, 255, 70));
            ctx.nvgStroke();
        }
        registerControl(`${id}:${i}`, "swatch", { x: sx, y, w: size, h: size }, {
            index: i,
            cx: sx + size * 0.5,
            cy: y + size * 0.5,
            r: size * 0.5,
            focusable: i === activeIndex,
        });
    }

    if (isFocused(id)) {
        drawFocusRing(x - 2, y - 2, colors.length * size + (colors.length - 1) * gap + 4, size + 4, 7);
    }

    registerControl(id, "swatch", {
        x: x - 2,
        y: y - 2,
        w: colors.length * size + (colors.length - 1) * gap + 4,
        h: size + 4,
    });
}

function drawMiniTimeline(x, y, w, h, t) {
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, h, 6);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(255, 255, 255, 8));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    for (let i = 0; i < 24; i++) {
        const u = i / 23;
        const px = x + 10 + u * (w - 20);
        const py = y + lerp(h - 16, 12, 0.5 + Math.sin(t * 1.5 + u * 7.0) * 0.35);
        if (i === 0) ctx.nvgMoveTo(px, py);
        else ctx.nvgLineTo(px, py);
    }
    ctx.nvgStrokeWidth(2);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(114, 176, 255, 180));
    ctx.nvgStroke();
}

function drawScenePreview(x, y, w, h, t) {
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, h, 10);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(20, 22, 26, 255));
    ctx.nvgFill();

    const pane = ctx.nvgLinearGradient(
        x, y, x, y + h,
        NVGcolor.nvgRGBA(60, 66, 78, 255),
        NVGcolor.nvgRGBA(16, 18, 22, 255)
    );
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x + 1, y + 1, w - 2, h - 2, 9);
    ctx.nvgFillPaint(pane);
    ctx.nvgFill();

    const orbit = 0.5 + Math.sin(t * 1.2) * 0.5;
    const coreX = x + w * 0.5;
    const coreY = y + h * 0.54;
    const lightX = lerp(x + w * 0.25, x + w * 0.78, orbit);

    const bloom = ctx.nvgRadialGradient(
        lightX, y + h * 0.28, 10, 80,
        NVGcolor.nvgRGBA(134, 186, 255, 150),
        NVGcolor.nvgRGBA(134, 186, 255, 0)
    );
    ctx.nvgBeginPath();
    ctx.nvgRect(x, y, w, h);
    ctx.nvgFillPaint(bloom);
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgCircle(coreX, coreY, 34);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(65, 115, 175, 180));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    ctx.nvgCircle(coreX, coreY, 18);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(233, 239, 247, 235));
    ctx.nvgFill();

    for (let i = 0; i < 3; i++) {
        const a = t * (0.65 + i * 0.2) + i * 1.5;
        const rx = 55 + i * 18;
        const ry = 18 + i * 7;
        ctx.nvgSave();
        ctx.nvgTranslate(coreX, coreY);
        ctx.nvgRotate(a);
        ctx.nvgBeginPath();
        ctx.nvgEllipse(0, 0, rx, ry);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(NVGcolor.nvgRGBA(180, 212, 255, 55 - i * 10));
        ctx.nvgStroke();
        ctx.nvgRestore();
    }

    drawText("Scene Preview", x + 14, y + 16, 11, NVGcolor.nvgRGBA(208, 214, 220, 180), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");
}

function drawFpsGraph(x, y, w, h) {
    ctx.nvgBeginPath();
    ctx.nvgRoundedRect(x, y, w, h, 7);
    ctx.nvgFillColor(NVGcolor.nvgRGBA(255, 255, 255, 8));
    ctx.nvgFill();

    ctx.nvgBeginPath();
    for (let i = 0; i < perfGraph.values.length; i++) {
        const u = i / (perfGraph.values.length - 1);
        const v = perfGraph.values[(perfGraph.head + i) % perfGraph.values.length];
        const fps = clamp(1 / Math.max(v, 0.0001), 0, 144);
        const px = x + 10 + u * (w - 20);
        const py = y + h - 12 - (fps / 144) * (h - 26);
        if (i === 0) ctx.nvgMoveTo(px, py);
        else ctx.nvgLineTo(px, py);
    }
    ctx.nvgStrokeWidth(2);
    ctx.nvgStrokeColor(NVGcolor.nvgRGBA(126, 188, 255, 170));
    ctx.nvgStroke();

    const avg = getGraphAverage(perfGraph);
    drawText(perfGraph.name, x + 12, y + 14, 10.5, NVGcolor.nvgRGBA(140, 146, 155, 170), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "ui-bold");
    drawText(`${(1 / Math.max(avg, 0.0001)).toFixed(1)} FPS`, x + w - 12, y + 14, 11, NVGcolor.nvgRGBA(231, 236, 244, 220), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE, "ui-bold");
}

function drawLayerList(id, x, y, w, rowH, items, activeIndex) {
    for (let i = 0; i < items.length; i++) {
        const iy = y + i * (rowH + 6);
        const active = i === activeIndex;
        const hover = pointInRect(mx, my, x, iy, w, rowH);

        ctx.nvgBeginPath();
        ctx.nvgRoundedRect(x, iy, w, rowH, 5);
        ctx.nvgFillColor(active
            ? NVGcolor.nvgRGBA(74, 110, 160, 150)
            : hover
                ? NVGcolor.nvgRGBA(255, 255, 255, 10)
                : NVGcolor.nvgRGBA(255, 255, 255, 6));
        ctx.nvgFill();

        ctx.nvgBeginPath();
        ctx.nvgCircle(x + 12, iy + rowH * 0.5, 4);
        ctx.nvgFillColor(active ? NVGcolor.nvgRGBA(176, 215, 255, 230) : NVGcolor.nvgRGBA(102, 108, 118, 220));
        ctx.nvgFill();

        drawText(items[i], x + 24, iy + rowH * 0.5, 11.2, NVGcolor.nvgRGBA(220, 223, 228, active ? 220 : 180), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        drawText(active ? "LIVE" : "IDLE", x + w - 10, iy + rowH * 0.5, 9.5, active ? NVGcolor.nvgRGBA(190, 223, 255, 200) : NVGcolor.nvgRGBA(120, 126, 134, 140), NVG_ALIGN_RIGHT | NVG_ALIGN_MIDDLE, "ui-bold");
        registerControl(`${id}:${i}`, "layer", { x, y: iy, w, h: rowH }, { index: i, focusable: false });
    }

    if (isFocused(id)) {
        drawFocusRing(x, y, w, items.length * rowH + (items.length - 1) * 6, 6);
    }

    registerControl(id, "layer", {
        x,
        y,
        w,
        h: items.length * rowH + (items.length - 1) * 6,
    });
}

function drawLeftPanelContent(panel, t) {
    const leftX = panel.x;
    const leftY = panel.y + PANEL_HEADER_H;
    const leftW = panel.w;

    const bloomAnimated = uiState.toggles.animateBloom
        ? clamp(uiState.sliders.bloom + Math.cos(t * 0.9) * 0.08, 0, 1)
        : uiState.sliders.bloom;

    let cy = leftY + 20;
    const cx = leftX + 18;
    const innerW = leftW - 36;

    drawSectionTitle("SURFACE", cx, cy);
    cy += 20;
    drawSegmentedRow("mode", "Mode", cx, cy, innerW, MODE_LABELS, uiState.modeIndex);
    cy += 56;
    drawDropdownRow("preset", "Preset", PRESETS[uiState.presetIndex], cx, cy, innerW);
    cy += 58;
    drawToggleRow("snap", "Snap to grid", cx, cy, innerW, uiState.toggles.snapToGrid, "snapToGrid");
    cy += 54;
    drawToggleRow("animateBloom", "Animate bloom", cx, cy, innerW, uiState.toggles.animateBloom, "animateBloom");
    cy += 52;
    drawDivider(cx, cy, innerW);
    cy += 18;

    drawSectionTitle("LIGHTING", cx, cy);
    cy += 20;
    drawSliderRow("exposure", "Exposure", `${Math.round(uiState.sliders.exposure * 100)}%`, cx, cy, innerW, uiState.sliders.exposure, getAccentColor(220), "exposure");
    cy += 46;
    drawSliderRow("bloom", "Bloom", `${Math.round(bloomAnimated * 100)}%`, cx, cy, innerW, bloomAnimated, NVGcolor.nvgRGBA(126, 206, 255, 220), "bloom");
    cy += 46;
    drawSliderRow("parallax", "Parallax", `${Math.round(uiState.sliders.parallax * 100)}%`, cx, cy, innerW, uiState.sliders.parallax, NVGcolor.nvgRGBA(152, 166, 255, 220), "parallax");
    cy += 48;
    drawText("Accent", cx, cy + 8, 11.5, NVGcolor.nvgRGBA(188, 192, 198, 200), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
    drawColorSwatches("accent", cx, cy + 20, 22, 8, ACCENT_COLORS, uiState.accentIndex);
    cy += 62;
    drawDivider(cx, cy, innerW);
    cy += 18;

    drawSectionTitle("TRANSPORT", cx, cy);
    cy += 18;
    drawButtonRow("transport", cx, cy, innerW, ["Play", "Pause", "Reset"], uiState.transportIndex);
    cy += 42;
    drawMiniTimeline(cx, cy, innerW, 64, t);
    const contentBottom = cy + 64 + 20;
    return contentBottom - leftY;
}

function drawRightPanelContent(panel, t) {
    const rightX = panel.x;
    const rightY = panel.y + PANEL_HEADER_H;
    const rightW = panel.w;
    const rightH = panel.h - PANEL_HEADER_H;

    const transportPulse = uiState.playing ? 0.5 + Math.sin(t * 0.8) * 0.5 : 0.2;
    const bloomAnimated = uiState.toggles.animateBloom
        ? clamp(uiState.sliders.bloom + Math.cos(t * 0.9) * 0.08, 0, 1)
        : uiState.sliders.bloom;

    const previewX = rightX + 18;
    const previewY = rightY + 16;
    const previewW = rightW - 36;
    const previewH = clamp(rightH * 0.34, 180, 260);

    drawScenePreview(previewX, previewY, previewW, previewH, t);

    const cardGap = 10;
    const cardY = previewY + previewH + 16;
    const cardW = (previewW - cardGap * 2) / 3;
    drawMeterCard(previewX, cardY, cardW, 72, "CPU", `${Math.round(22 + transportPulse * 23)}%`, 0.22 + transportPulse * 0.23, getAccentColor(220));
    drawMeterCard(previewX + cardW + cardGap, cardY, cardW, 72, "GPU", `${Math.round(38 + bloomAnimated * 28)}%`, 0.38 + bloomAnimated * 0.28, NVGcolor.nvgRGBA(87, 207, 186, 220));
    drawMeterCard(previewX + (cardW + cardGap) * 2, cardY, cardW, 72, "MEM", `${Math.round(44 + uiState.sliders.parallax * 24)}%`, 0.44 + uiState.sliders.parallax * 0.24, NVGcolor.nvgRGBA(240, 186, 96, 220));

    const graphY = cardY + 88;
    drawFpsGraph(previewX, graphY, previewW, 108);

    const listY = graphY + 124;
    drawSectionTitle("LAYERS", previewX, listY);
    const listTop = listY + 16;
    const listHeight = LAYER_NAMES.length * 24 + (LAYER_NAMES.length - 1) * 6;
    drawLayerList("layers", previewX, listTop, previewW, 24, LAYER_NAMES, uiState.layerIndex);
    const contentBottom = listTop + listHeight + 20;
    return contentBottom - rightY;
}

function drawDashboard(width, height, t) {
    drawBackground(width, height);
    ensurePanels(width, height);

    const panelDrawers = {
        left: drawLeftPanelContent,
        right: drawRightPanelContent,
    };

    for (const key of uiState.panelOrder) {
        const panel = uiState.panels[key];
        if (!panel) continue;
        drawPanel(
            key,
            panel.x,
            panel.y,
            panel.w,
            panel.h,
            key === "left" ? "Render Controls" : "Composition",
            key === "left" ? "Custom NanoVG inspector" : "Live overview and layers",
            panel.collapsed
        );
        if (!panel.collapsed) {
            const bodyX = panel.x;
            const bodyY = panel.y + PANEL_HEADER_H;
            const bodyW = panel.w;
            const bodyH = Math.max(0, panel.h - PANEL_HEADER_H);
            activePanelKey = key;
            activePanelContent = true;
            activeScrollOffset = panel.scrollY || 0;
            ctx.nvgSave();
            ctx.nvgScissor(bodyX, bodyY, bodyW, bodyH);
            ctx.nvgTranslate(0, -activeScrollOffset);
            const contentHeight = panelDrawers[key]?.(panel, t) || 0;
            ctx.nvgRestore();
            activePanelKey = null;
            activePanelContent = false;
            activeScrollOffset = 0;
            panel.scrollMax = Math.max(0, contentHeight - bodyH);
            panel.scrollY = clamp(panel.scrollY || 0, 0, panel.scrollMax);

            if (panel.scrollMax > 0) {
                ctx.nvgSave();
                ctx.nvgScissor(bodyX, bodyY, bodyW, bodyH);
                drawPanelScrollbar(panel, bodyX, bodyY, bodyW, bodyH);
                ctx.nvgRestore();
            }
        }
    }
}

function createContext() {
    const params = new NVGparams();

    params.renderCreate = function(userPtr) { return glnvg__renderCreate(userPtr); };
    params.renderCreateTexture = function(userPtr, type, width, height, imageFlags, data) {
        return glnvg__renderCreateTexture(userPtr, type, width, height, imageFlags, data);
    };
    params.renderDeleteTexture = function(userPtr, image) { return glnvg__renderDeleteTexture(userPtr, image); };
    params.renderUpdateTexture = function(userPtr, image, x, y, w, h, data) {
        return glnvg__renderUpdateTexture(userPtr, image, x, y, w, h, data);
    };
    params.renderGetTextureSize = function(userPtr, image) { return glnvg__renderGetTextureSize(userPtr, image); };
    params.renderViewport = function(userPtr, width, height, devicePixelRatio) {
        glnvg__renderViewport(userPtr, width, height, devicePixelRatio);
    };
    params.renderCancel = function(userPtr) { glnvg__renderCancel(userPtr); };
    params.renderFlush = function(userPtr) { glnvg__renderFlush(userPtr); };
    params.renderFill = function(userPtr, fillPaint, compositeOperation, scissor, fringeWidth, bounds, paths, npaths) {
        glnvg__renderFill(userPtr, fillPaint, compositeOperation, scissor, fringeWidth, bounds, paths, npaths);
    };
    params.renderStroke = function(userPtr, strokePaint, compositeOperation, scissor, fringe, strokeWidth, paths, npaths) {
        glnvg__renderStroke(userPtr, strokePaint, compositeOperation, scissor, fringe, strokeWidth, paths, npaths);
    };
    params.renderTriangles = function(userPtr, paint, compositeOperation, scissor, verts, nverts, fringe) {
        glnvg__renderTriangles(userPtr, paint, compositeOperation, scissor, verts, nverts, fringe);
    };
    params.renderDelete = function(userPtr) { glnvg__renderDelete(userPtr); };
    params.userPtr = gl;
    params.edgeAntiAlias = true;

    gl.edgeAntiAlias = params.edgeAntiAlias;
    ctx = nvgCreateInternal(params);
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

    const winWidth = Math.max(1, canvas.clientWidth);
    const winHeight = Math.max(1, canvas.clientHeight);
    const fbWidth = gl.drawingBufferWidth;
    const fbHeight = gl.drawingBufferHeight;
    const pxRatio = fbWidth / winWidth;
    const now = performance.now() * 0.001;

    if (prevFrameTime === 0) prevFrameTime = now;
    updateGraph(perfGraph, now - prevFrameTime);
    prevFrameTime = now;

    gl.viewport(0, 0, fbWidth, fbHeight);
    gl.clearColor(0.15, 0.16, 0.18, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    beginLayout();
    ctx.nvgBeginFrame(winWidth, winHeight, pxRatio);
    drawDashboard(winWidth, winHeight, now);
    ctx.nvgEndFrame();

    requestAnimationFrame(render);
}

function main() {
    canvas = document.querySelector("#glcanvas");
    resizeCanvas();

    gl = canvas.getContext("experimental-webgl", {
        stencil: true,
        alpha: true,
        antialias: true,
    });

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        mx = event.clientX - rect.left;
        my = event.clientY - rect.top;

        if (uiState.activeDragId) {
            const control = controlMap[uiState.activeDragId];
            if (control && control.type === "slider") {
                setSliderFromPointer(control, mx);
            } else if (control && (control.type === "panel-drag" || control.type === "panel-resize")) {
                const drag = uiState.panelDrag;
                const panel = drag ? uiState.panels?.[drag.key] : null;
                if (!panel) return;
                if (drag.mode === "move") {
                    const nextX = mx - drag.offsetX;
                    const nextY = my - drag.offsetY;
                    panel.x = clamp(nextX, 10, uiState.viewport.w - panel.w - 10);
                    panel.y = clamp(nextY, 10, uiState.viewport.h - panel.h - 10);
                } else if (drag.mode === "resize") {
                    const minW = 280;
                    const minH = 220;
                    const maxW = uiState.viewport.w - panel.x - 10;
                    const maxH = uiState.viewport.h - panel.y - 10;
                    panel.w = clamp(drag.startW + (mx - drag.startX), minW, Math.max(minW, maxW));
                    panel.h = clamp(drag.startH + (my - drag.startY), minH, Math.max(minH, maxH));
                }
            }
        }
    });

    canvas.addEventListener("wheel", (event) => {
        const rect = canvas.getBoundingClientRect();
        mx = event.clientX - rect.left;
        my = event.clientY - rect.top;
        const control = hitTestControl(mx, my);
        let panel = control?.panelKey ? uiState.panels?.[control.panelKey] : null;
        if (!panel) {
            for (const key of Object.keys(uiState.panels || {})) {
                const candidate = uiState.panels[key];
                if (!candidate || candidate.collapsed) continue;
                const bodyX = candidate.x;
                const bodyY = candidate.y + PANEL_HEADER_H;
                const bodyW = candidate.w;
                const bodyH = Math.max(0, candidate.h - PANEL_HEADER_H);
                if (pointInRect(mx, my, bodyX, bodyY, bodyW, bodyH)) {
                    panel = candidate;
                    break;
                }
            }
        }
        if (panel && !panel.collapsed && panel.scrollMax > 0) {
            panel.scrollY = clamp((panel.scrollY || 0) + event.deltaY, 0, panel.scrollMax);
            event.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("mousedown", (event) => {
        const rect = canvas.getBoundingClientRect();
        mx = event.clientX - rect.left;
        my = event.clientY - rect.top;
        isPointerDown = true;
        const control = hitTestControl(mx, my);
        activateControl(control);
        canvas.focus();
    });

    window.addEventListener("mouseup", () => {
        isPointerDown = false;
        uiState.activeDragId = null;
        uiState.panelDrag = null;
    });

    canvas.addEventListener("mouseleave", () => {
        mx = -1000;
        my = -1000;
        if (!isPointerDown) {
            uiState.activeDragId = null;
            uiState.panelDrag = null;
        }
    });

    canvas.addEventListener("keydown", (event) => {
        if (event.key === "t" || event.key === "T") {
            uiState.themeIndex = (uiState.themeIndex + 1) % THEMES.length;
            event.preventDefault();
            return;
        }

        if (event.key === "Tab") {
            focusNextControl(event.shiftKey ? -1 : 1);
            event.preventDefault();
            return;
        }

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            adjustFocusedControl(0.03);
            event.preventDefault();
            return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            adjustFocusedControl(-0.03);
            event.preventDefault();
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            const control = controlMap[uiState.focusId];
            if (control) {
                activateControl(control);
                uiState.activeDragId = null;
                event.preventDefault();
            }
        }
    });

    canvas.tabIndex = 0;

    window.addEventListener("resize", resizeCanvas);

    createContext();
    ensureFonts().finally(() => {
        render();
    });
}

document.addEventListener("DOMContentLoaded", main);
