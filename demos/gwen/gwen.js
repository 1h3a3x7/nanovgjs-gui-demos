GuiDemo({
    clear: [0.42, 0.47, 0.54, 1],
    state: { tab: 0, volume: 0.58, quality: 0.72, enabled: true },
    down(control, mx, my, state) {
        if (!control) return;
        if (control.type === "tab") state.tab = control.index;
        if (control.type === "toggle") state[control.key] = !state[control.key];
        if (control.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
    },
    drag(control, mx, my, state) {
        if (control?.type === "slider") state[control.key] = Math.max(0, Math.min(1, (mx - control.x) / control.w));
    },
    draw({ ctx, rgba, text, reg, state, width, height }) {
        ctx.nvgBeginPath(); ctx.nvgRect(0, 0, width, height); ctx.nvgFillColor(rgba(112, 126, 143)); ctx.nvgFill();
        text("GWEN GUI", width * 0.5, 70, 32, rgba(20, 28, 38), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
        text("skinned desktop widgets and property pages", width * 0.5, 106, 14, rgba(230, 236, 244), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE);

        function frame(x, y, w, h, title) {
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 4, y + 6, w, h, 4); ctx.nvgFillColor(rgba(48, 56, 66, 80)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 4); ctx.nvgFillColor(rgba(198, 207, 216)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRect(x, y, w, 30); ctx.nvgFillColor(rgba(61, 112, 180)); ctx.nvgFill();
            text(title, x + 12, y + 16, 12, rgba(255, 255, 255), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
        }
        function button(x, y, w, h, label) {
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, h, 3); ctx.nvgFillPaint(ctx.nvgLinearGradient(x, y, x, y + h, rgba(236, 241, 246), rgba(170, 184, 198))); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 2); ctx.nvgStrokeWidth(1); ctx.nvgStrokeColor(rgba(78, 88, 100)); ctx.nvgStroke();
            text(label, x + w * 0.5, y + h * 0.5, 11, rgba(20, 28, 38), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
        }
        function slider(x, y, w, key) {
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w, 12, 3); ctx.nvgFillColor(rgba(150, 164, 178)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(x, y, w * state[key], 12, 3); ctx.nvgFillColor(rgba(61, 112, 180)); ctx.nvgFill();
            ctx.nvgBeginPath(); ctx.nvgCircle(x + w * state[key], y + 6, 9); ctx.nvgFillColor(rgba(238, 243, 248)); ctx.nvgFill();
            reg({ type: "slider", key, x, y: y - 4, w, h: 20 });
        }

        frame(54, 146, 330, 330, "Properties");
        ["General", "Audio", "Render"].forEach((label, i) => {
            const tx = 74 + i * 88;
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(tx, 190, 78, 28, 3); ctx.nvgFillColor(state.tab === i ? rgba(236, 241, 246) : rgba(160, 174, 188)); ctx.nvgFill();
            text(label, tx + 39, 204, 11, rgba(20, 28, 38), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
            reg({ type: "tab", index: i, x: tx, y: 190, w: 78, h: 28 });
        });
        ctx.nvgBeginPath(); ctx.nvgRect(74, 226, 290, 178); ctx.nvgFillColor(rgba(230, 235, 240)); ctx.nvgFill();
        text(state.tab === 0 ? "Name" : state.tab === 1 ? "Volume" : "Quality", 94, 262, 12, rgba(26, 34, 44), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE, "bold");
        if (state.tab === 0) {
            ctx.nvgBeginPath(); ctx.nvgRoundedRect(164, 248, 150, 24, 3); ctx.nvgFillColor(rgba(255, 255, 255)); ctx.nvgFill();
            text("PlayerController", 174, 260, 11, rgba(26, 34, 44), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        } else {
            slider(164, 254, 150, state.tab === 1 ? "volume" : "quality");
        }
        const cbx = 94, cby = 314;
        ctx.nvgBeginPath(); ctx.nvgRect(cbx, cby, 16, 16); ctx.nvgFillColor(state.enabled ? rgba(61, 112, 180) : rgba(255, 255, 255)); ctx.nvgFill();
        if (state.enabled) text("x", cbx + 8, cby + 8, 10, rgba(255, 255, 255), NVG_ALIGN_CENTER | NVG_ALIGN_MIDDLE, "bold");
        text("Enabled", cbx + 26, cby + 8, 12, rgba(26, 34, 44), NVG_ALIGN_LEFT | NVG_ALIGN_MIDDLE);
        reg({ type: "toggle", key: "enabled", x: cbx, y: cby, w: 90, h: 18 });
        button(184, 430, 78, 28, "Apply");
        button(274, 430, 78, 28, "Cancel");

        frame(430, 166, 300, 240, "Toolbox");
        ["Button", "Checkbox", "Slider", "Tree Node", "List Box"].forEach((label, i) => {
            button(454, 218 + i * 34, 180, 24, label);
        });
    },
});
