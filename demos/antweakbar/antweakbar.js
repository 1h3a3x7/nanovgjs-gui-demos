GuiDemo({
    clear: [0.04, 0.05, 0.05, 1],
    state: {
        activeInput: null,
        ambient: true,
        diffuse: true,
        specular: false,
        wireframe: false,
        materialOpen: true,
        transformOpen: true,
        renderOpen: true,
        infoOpen: true,
        shape: 0,
        name: "Teapot01",
        segments: "32",
        rotation: 0.46,
        scale: 0.58,
        exposure: 0.66,
        ambientColor: [180, 0, 18],
        diffuseColor: [255, 255, 28],
        specularColor: [235, 235, 255],
        barX: null,
        barY: null,
        barW: 410,
        dragging: null,
    },
    down(control, mx, my, state) {
        state.activeInput = null;
        if (!control) return;
        if (control.type === "bar-drag") {
            state.dragging = { type: "move", dx: mx - state.barX, dy: my - state.barY };
            return;
        }
        if (control.type === "bar-resize") {
            state.dragging = { type: "resize", dx: state.barX + state.barW - mx };
            return;
        }
        if (control.type === "toggle") state[control.key] = !state[control.key];
        if (control.type === "group") state[control.key] = !state[control.key];
        if (control.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
        if (control.type === "shape") state.shape = (state.shape + 1) % 3;
        if (control.type === "color") {
            const next = {
                ambientColor: [[180, 0, 18], [24, 120, 160], [90, 170, 80]],
                diffuseColor: [[255, 255, 28], [255, 148, 36], [120, 220, 255]],
                specularColor: [[235, 235, 255], [255, 255, 255], [180, 220, 255]],
            }[control.key];
            const current = state[control.key];
            const index = next.findIndex((c) => c[0] === current[0] && c[1] === current[1] && c[2] === current[2]);
            state[control.key] = next[(index + 1) % next.length];
        }
        if (control.type === "input") state.activeInput = control.key;
    },
    drag(control, mx, my, state) {
        if (state.dragging?.type === "move") {
            state.barX = Math.max(8, mx - state.dragging.dx);
            state.barY = Math.max(8, my - state.dragging.dy);
            return;
        }
        if (state.dragging?.type === "resize") {
            state.barW = Math.max(340, Math.min(560, mx - state.barX + state.dragging.dx));
            return;
        }
        if (control?.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
    },
    up(control, state) {
        state.dragging = null;
    },
    keydown(event, state) {
        const key = state.activeInput;
        if (!key) return;
        if (event.key === "Escape" || event.key === "Enter") {
            state.activeInput = null;
            event.preventDefault();
            return;
        }
        if (event.key === "Backspace") {
            state[key] = String(state[key]).slice(0, -1);
            event.preventDefault();
            return;
        }
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        if (key === "segments" && !"0123456789".includes(event.key)) return;
        state[key] = `${state[key]}${event.key}`.slice(0, key === "segments" ? 3 : 16);
        event.preventDefault();
    },
    draw({ ctx, rgba, text, reg, state, t, width, height }) {
        ctx.nvgBeginPath();
        ctx.nvgRect(0, 0, width, height);
        ctx.nvgFillColor(rgba(6, 7, 7));
        ctx.nvgFill();
        text("AntTweakBar style widgets", width * 0.5, 70, 28, rgba(230, 238, 232), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
        text("dense variable rows, typed values, colors and collapsible groups", width * 0.5, 106, 13, rgba(120, 210, 200), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE);

        if (state.barX === null) state.barX = Math.max(24, width * 0.5 - state.barW * 0.5);
        if (state.barY === null) state.barY = 142;
        state.barX = Math.min(state.barX, width - 80);
        state.barY = Math.min(state.barY, height - 80);
        const x = state.barX;
        const y = state.barY;
        const w = state.barW;
        const rowH = 20;
        const headerH = 19;
        const labelX = x + 28;
        const valueX = x + 196;
        let cy = y + 30;

        function barHeight() {
            let h = 34;
            h += headerH + (state.materialOpen ? rowH * 7 : 0);
            h += headerH + (state.transformOpen ? rowH * 4 : 0);
            h += headerH + (state.renderOpen ? rowH * 4 : 0);
            h += headerH + (state.infoOpen ? rowH * 3 : 0);
            return h + 12;
        }

        function panelRect() {
            const h = barHeight();
            ctx.nvgBeginPath();
            ctx.nvgRect(x + 3, y + 3, w, h);
            ctx.nvgFillColor(rgba(0, 0, 0, 75));
            ctx.nvgFill();
            ctx.nvgBeginPath();
            ctx.nvgRect(x, y, w, h);
            ctx.nvgFillColor(rgba(12, 58, 61, 188));
            ctx.nvgFill();
            ctx.nvgBeginPath();
            ctx.nvgRect(x, y, w, 20);
            ctx.nvgFillColor(rgba(16, 82, 86, 224));
            ctx.nvgFill();
            ctx.nvgBeginPath();
            ctx.nvgRect(x, y, w, h);
            ctx.nvgStrokeWidth(1);
            ctx.nvgStrokeColor(rgba(96, 170, 174, 170));
            ctx.nvgStroke();
            text("TwBar: Sample Controls", x + 7, y + 10, 10.5, rgba(220, 246, 238), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
            text("x", x + w - 12, y + 10, 10.5, rgba(220, 246, 238), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
            ctx.nvgBeginPath();
            ctx.nvgMoveTo(x, y);
            ctx.nvgLineTo(x + 9, y);
            ctx.nvgMoveTo(x, y);
            ctx.nvgLineTo(x, y + 9);
            ctx.nvgMoveTo(x + w, y);
            ctx.nvgLineTo(x + w - 9, y);
            ctx.nvgMoveTo(x + w, y);
            ctx.nvgLineTo(x + w, y + 9);
            ctx.nvgMoveTo(x, y + h);
            ctx.nvgLineTo(x + 9, y + h);
            ctx.nvgMoveTo(x, y + h);
            ctx.nvgLineTo(x, y + h - 9);
            ctx.nvgStrokeWidth(1);
            ctx.nvgStrokeColor(rgba(218, 246, 238, 200));
            ctx.nvgStroke();
            for (let i = 0; i < 3; i++) {
                ctx.nvgBeginPath();
                ctx.nvgMoveTo(x + w - 4 - i * 5, y + h - 1);
                ctx.nvgLineTo(x + w - 1, y + h - 4 - i * 5);
                ctx.nvgStrokeWidth(1);
                ctx.nvgStrokeColor(rgba(218, 246, 238, 160));
                ctx.nvgStroke();
            }
            reg({ type: "bar-drag", x, y, w, h: 20 });
            reg({ type: "bar-resize", x: x + w - 18, y: y + h - 18, w: 18, h: 18 });
        }

        function group(label, key) {
            const open = state[key];
            ctx.nvgBeginPath();
            ctx.nvgRect(x + 2, cy, w - 4, headerH);
            ctx.nvgFillColor(rgba(7, 44, 47, 245));
            ctx.nvgFill();
            text(open ? "-" : "+", x + 14, cy + 10, 13, rgba(238, 245, 168), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
            text(label, labelX, cy + 10, 11.5, rgba(226, 248, 238), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
            reg({ type: "group", key, x: x + 2, y: cy, w: w - 4, h: headerH });
            cy += headerH;
            return open;
        }

        function row(label, drawValue) {
            ctx.nvgBeginPath();
            ctx.nvgRect(x + 2, cy, w - 4, rowH);
            ctx.nvgFillColor((Math.floor((cy - y) / rowH) % 2) ? rgba(13, 65, 68, 170) : rgba(10, 54, 57, 170));
            ctx.nvgFill();
            text(label, labelX, cy + 10, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
            drawValue(cy + 10);
            cy += rowH;
        }

        function checkbox(label, key) {
            row(label, (yy) => {
                const bx = valueX;
                ctx.nvgBeginPath();
                ctx.nvgRect(bx, yy - 7, 14, 14);
                ctx.nvgFillColor(state[key] ? rgba(180, 215, 210) : rgba(5, 28, 30));
                ctx.nvgFill();
                if (state[key]) text("x", bx + 7, yy, 9, rgba(4, 25, 28), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
                reg({ type: "toggle", key, x: bx, y: yy - 8, w: 88, h: 16 });
            });
        }

        function color(label, key) {
            row(label, (yy) => {
                const value = state[key];
                ctx.nvgBeginPath();
                ctx.nvgRect(valueX, yy - 7, 88, 14);
                ctx.nvgFillColor(rgba(value[0], value[1], value[2]));
                ctx.nvgFill();
                ctx.nvgBeginPath();
                ctx.nvgRect(valueX, yy - 7, 88, 14);
                ctx.nvgStrokeWidth(1);
                ctx.nvgStrokeColor(rgba(0, 0, 0, 170));
                ctx.nvgStroke();
                text(`#${value.map((v) => v.toString(16).padStart(2, "0")).join("")}`, valueX + 96, yy, 10, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                reg({ type: "color", key, x: valueX, y: yy - 8, w: 162, h: 16 });
            });
        }

        function slider(label, key) {
            row(label, (yy) => {
                const tw = 96;
                ctx.nvgBeginPath();
                ctx.nvgRect(valueX, yy - 5, tw, 10);
                ctx.nvgFillColor(rgba(5, 19, 20));
                ctx.nvgFill();
                ctx.nvgBeginPath();
                ctx.nvgRect(valueX, yy - 5, tw * state[key], 10);
                ctx.nvgFillColor(rgba(152, 224, 220));
                ctx.nvgFill();
                text(state[key].toFixed(2), valueX + tw + 10, yy, 10, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                reg({ type: "slider", key, x: valueX, y: yy - 8, w: tw, h: 16 });
            });
        }

        function input(label, key) {
            row(label, (yy) => {
                const active = state.activeInput === key;
                ctx.nvgBeginPath();
                ctx.nvgRect(valueX, yy - 8, 112, 16);
                ctx.nvgFillColor(active ? rgba(228, 244, 242) : rgba(4, 22, 24));
                ctx.nvgFill();
                text(String(state[key]), valueX + 6, yy, 10.5, active ? rgba(0, 28, 30) : rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                if (active && Math.floor(t * 2) % 2 === 0) text("|", valueX + 8 + String(state[key]).length * 6, yy, 11, rgba(0, 28, 30), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                reg({ type: "input", key, x: valueX, y: yy - 8, w: 112, h: 16 });
            });
        }

        function select(label) {
            row(label, (yy) => {
                const value = ["Teapot", "Sphere", "Cube"][state.shape];
                text(value, valueX, yy, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                text(">", valueX + 100, yy, 11, rgba(238, 245, 168), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
                reg({ type: "shape", x: valueX - 4, y: yy - 8, w: 124, h: 16 });
            });
        }

        panelRect();
        if (group("Material", "materialOpen")) {
            checkbox("Ambient", "ambient");
            color("Ambient Color", "ambientColor");
            checkbox("Diffuse", "diffuse");
            color("Diffuse Color", "diffuseColor");
            checkbox("Specular", "specular");
            color("Specular Color", "specularColor");
            select("Shape");
        }
        if (group("Transform", "transformOpen")) {
            slider("Rotation", "rotation");
            slider("Scale", "scale");
            input("Name", "name");
            input("Segments", "segments");
        }
        if (group("Render", "renderOpen")) {
            checkbox("Wireframe", "wireframe");
            slider("Exposure", "exposure");
            row("FPS", (yy) => text(`${Math.round(58 + Math.sin(t * 2) * 5)} fps`, valueX, yy, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold"));
            row("Help", (yy) => text("click values to edit", valueX, yy, 10.5, rgba(238, 245, 168), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE));
        }
        if (group("Info", "infoOpen")) {
            row("Library", (yy) => text("AntTweakBar", valueX, yy, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold"));
            row("Values width", (yy) => text("180", valueX, yy, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold"));
            row("Alpha", (yy) => text("220", valueX, yy, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold"));
        }

        const previewX = x + w + 28;
        const previewY = y + 8;
        ctx.nvgBeginPath();
        ctx.nvgRect(previewX, previewY, 190, 170);
        ctx.nvgFillColor(rgba(3, 3, 3));
        ctx.nvgFill();
        ctx.nvgBeginPath();
        ctx.nvgRect(previewX + 3, previewY + 3, 184, 164);
        ctx.nvgStrokeWidth(1);
        ctx.nvgStrokeColor(rgba(220, 235, 235, 190));
        ctx.nvgStroke();
        text("Preview", previewX + 12, previewY + 18, 11, rgba(220, 244, 234), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
        const cx = previewX + 96, cy2 = previewY + 94;
        ctx.nvgBeginPath();
        ctx.nvgCircle(cx, cy2, 35 + state.scale * 18);
        ctx.nvgFillPaint(ctx.nvgRadialGradient(cx - 14, cy2 - 18, 8, 58, rgba(...state.diffuseColor, 245), rgba(...state.ambientColor, 220)));
        ctx.nvgFill();
        if (state.wireframe) {
            ctx.nvgBeginPath();
            ctx.nvgCircle(cx, cy2, 35 + state.scale * 18);
            ctx.nvgStrokeWidth(2);
            ctx.nvgStrokeColor(rgba(...state.specularColor, 220));
            ctx.nvgStroke();
        }
    },
});
