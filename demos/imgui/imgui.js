GuiDemo({
    clear: [0.10, 0.11, 0.13, 1],
    state: { exposure: 0.72, gamma: 0.46, paused: false, selected: 1 },
    down(control, mx, my, state) {
        if (!control) return;
        if (control.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
        if (control.type === "select") state.selected = control.index;
        if (control.type === "toggle") state[control.key] = !state[control.key];
    },
    drag(control, mx, my, state) {
        if (control?.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
    },
    draw({ ctx, rgba, text, reg, state, t, width, height }) {
        ctx.nvgBeginPath(); ctx.nvgRect(0, 0, width, height); ctx.nvgFillColor(rgba(24, 26, 30)); ctx.nvgFill();
        ctx.nvgBeginPath(); ctx.nvgRect(0, 0, width, 28); ctx.nvgFillColor(rgba(36, 40, 46)); ctx.nvgFill();
        text("File   Edit   View   Tools   Help", 12, 15, 12, rgba(230, 235, 242), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        text("Dear ImGui style workspace", width * 0.5, 74, 28, rgba(232, 238, 246), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");

        function windowBox(x, y, w, h, title) {
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 3); ctx.nvgFillColor(rgba(43, 48, 56)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, 28); ctx.nvgFillColor(rgba(31, 35, 41)); ctx.nvgFill();
            text(title, x + 10, y + 15, 12, rgba(232, 238, 246), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
        }
        function slider(x, y, w, label, key) {
            text(label, x, y + 7, 11, rgba(218, 224, 232), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
            const sx = x + 86, sw = w - 86;
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(sx, y, sw, 16, 2); ctx.nvgFillColor(rgba(30, 34, 40)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(sx, y, sw * state[key], 16, 2); ctx.nvgFillColor(rgba(66, 150, 250)); ctx.nvgFill();
            reg({ type: "slider", key, x: sx, y, w: sw, h: 16 });
        }

        windowBox(26, 116, 220, 360, "Hierarchy");
        ["Scene", "Camera", "Light", "MeshRenderer", "PostProcess"].forEach((name, i) => {
            const yy = 160 + i * 34;
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(42, yy - 12, 178, 24, 2); ctx.nvgFillColor(state.selected === i ? rgba(66, 150, 250, 160) : rgba(53, 59, 68)); ctx.nvgFill();
            text(`${i === 0 ? "v" : ">"} ${name}`, 54, yy, 12, rgba(238, 242, 248), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
            reg({ type: "select", index: i, x: 42, y: yy - 12, w: 178, h: 24 });
        });

        windowBox(270, 116, 304, 220, "Inspector");
        slider(290, 168, 250, "Exposure", "exposure");
        slider(290, 210, 250, "Gamma", "gamma");
        const bx = 290, by = 258;
        ctx.nvgBeginPath(); ctx.nvgRoundedRect(bx, by, 18, 18, 2); ctx.nvgFillColor(state.paused ? rgba(66, 150, 250) : rgba(31, 35, 41)); ctx.nvgFill();
        text("Pause simulation", bx + 28, by + 9, 12, rgba(225, 230, 238), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        reg({ type: "toggle", key: "paused", x: bx, y: by, w: 140, h: 18 });

        windowBox(270, 356, 420, 170, "Console");
        for (let i = 0; i < 5; i++) {
            text(`[${(t + i).toFixed(2)}] frame pass ${i}: ${(state.exposure * 16 + i).toFixed(1)} ms`, 290, 402 + i * 22, 11, rgba(175, 202, 236), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        }

        windowBox(604, 116, 168, 220, "Viewport");
        const cx = 688, cy = 232;
        ctx.nvgBeginPath(); ctx.nvgCircle(cx, cy, 54); ctx.nvgFillColor(rgba(66, 150, 250, 80)); ctx.nvgFill();
        ctx.nvgBeginPath(); ctx.nvgCircle(cx + Math.sin(t) * 18, cy + Math.cos(t * 0.8) * 18, 38); ctx.nvgStrokeWidth(3); ctx.nvgStrokeColor(rgba(232, 238, 246)); ctx.nvgStroke();
    },
});
