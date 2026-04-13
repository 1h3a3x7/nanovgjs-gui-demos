(function() {
    window.GuiDemo = function(options) {
        let canvas = null;
        let gl = null;
        let ctx = null;
        let controls = [];
        let active = null;
        let mouseX = -1000;
        let mouseY = -1000;
        let prev = 0;

        const rgba = (r, g, b, a = 255) => NVGcolor.nvgRGBA(r, g, b, a);
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const inRect = (px, py, x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h;
        const state = options.state || {};

        function text(str, x, y, size, color, align, font = "ui") {
            ctx.nvgFontSize(size);
            ctx.nvgFontFace(font);
            ctx.nvgFillColor(color);
            ctx.nvgTextAlign(align);
            ctx.nvgText(x, y, str, null);
        }

        function reg(control) { controls.push(control); }

        function hit(px, py) {
            for (let i = controls.length - 1; i >= 0; i--) {
                const c = controls[i];
                if (inRect(px, py, c.x, c.y, c.w, c.h)) return c;
            }
            return null;
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
            p.userPtr = gl;
            p.edgeAntiAlias = true;
            gl.edgeAntiAlias = true;
            ctx = nvgCreateInternal(p);
            ctx.nvgCreateFont("ui", "../../node_modules/nanovgjs/example/Roboto-Regular.ttf");
            ctx.nvgCreateFont("bold", "../../node_modules/nanovgjs/example/Roboto-Bold.ttf");
        }

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
            canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        }

        function render() {
            resize();
            const now = performance.now() * 0.001;
            const dt = prev === 0 ? 0 : now - prev;
            prev = now;
            controls = [];
            const winWidth = Math.max(1, canvas.clientWidth);
            const winHeight = Math.max(1, canvas.clientHeight);
            const ratio = gl.drawingBufferWidth / winWidth;
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(...options.clear);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            ctx.nvgBeginFrame(winWidth, winHeight, ratio);
            options.draw({ ctx, rgba, text, reg, clamp, state, mouseX, mouseY, active, t: now, dt, width: winWidth, height: winHeight });
            ctx.nvgEndFrame();
            requestAnimationFrame(render);
        }

        function setMouse(event) {
            const rect = canvas.getBoundingClientRect();
            mouseX = event.clientX - rect.left;
            mouseY = event.clientY - rect.top;
        }

        document.addEventListener("DOMContentLoaded", () => {
            canvas = document.querySelector("#glcanvas");
            resize();
            gl = canvas.getContext("experimental-webgl", { stencil: true, alpha: true, antialias: true });
            if (!gl) {
                alert("Unable to initialize WebGL.");
                return;
            }
            canvas.addEventListener("mousemove", (event) => {
                setMouse(event);
                if (active && options.drag) options.drag(active, mouseX, mouseY, state);
            });
            canvas.addEventListener("mousedown", (event) => {
                setMouse(event);
                active = hit(mouseX, mouseY);
                if (options.down) options.down(active, mouseX, mouseY, state);
                canvas.focus();
            });
            window.addEventListener("mouseup", () => {
                if (options.up) options.up(active, state);
                active = null;
            });
            window.addEventListener("keydown", (event) => {
                if (options.keydown) options.keydown(event, state);
            });
            createContext();
            render();
        });
    };
})();
