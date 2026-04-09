/**
 * Inline PDF preview via PDF.js (reliable on mobile; iframe PDFs are not).
 * Registers Alpine `pdfViewer` and `window.guitarIoResourceIsPdf`.
 */
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.mjs';

const PDFJS_VERSION = '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

/** Extra multiplier on top of devicePixelRatio for sharper text/lines (canvas vs native viewer). */
const PDF_QUALITY_BOOST = 1.85;
const MAX_PIXEL_RATIO = 4;
const MAX_CANVAS_EDGE = 12288;

/**
 * Some mobile browsers / modes under-report DPR; touch UIs need a higher floor for readable canvas text.
 * @returns {number}
 */
function effectiveCanvasPixelRatio() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    let coarse = false;
    let narrow = false;
    try {
        coarse = window.matchMedia('(pointer: coarse)').matches;
        narrow = window.matchMedia('(max-width: 768px)').matches;
    } catch (_) {
        /* ignore */
    }
    const base = coarse || narrow ? Math.max(dpr, 2.35) : dpr;
    return Math.min(base * PDF_QUALITY_BOOST, MAX_PIXEL_RATIO);
}

/**
 * @param {string | null | undefined} pathOrUrl
 * @returns {boolean}
 */
function guitarIoResourceIsPdf(pathOrUrl) {
    if (!pathOrUrl) return false;
    const base = pathOrUrl.split('?')[0].split('#')[0].toLowerCase();
    return base.endsWith('.pdf');
}

window.guitarIoResourceIsPdf = guitarIoResourceIsPdf;

document.addEventListener('alpine:init', () => {
    Alpine.data('pdfViewer', (subject, urlKey = 'tab_url') => ({
        loading: false,
        error: null,
        generation: 0,
        /** Not named `zoom` — that clashes with CSS `zoom` / browser quirks on mobile Safari. */
        pdfZoom: 1,
        _loadingTask: null,
        _subject: null,
        _urlKey: null,

        _getSubject() {
            if (typeof this._subject === 'function') {
                return this._subject();
            }
            return this._subject;
        },

        _getCurrentUrl() {
            const currentSubject = this._getSubject();
            return currentSubject?.[this._urlKey];
        },

        async init() {
            this._subject = subject;
            this._urlKey = urlKey;
            await Alpine.nextTick();
            await Alpine.nextTick();
            this.$watch(
                () => this._getCurrentUrl(),
                async (url, prev) => {
                    if (prev !== undefined && url !== prev) {
                        this.pdfZoom = 1;
                    }
                    await this.renderPdf(url);
                }
            );
            await this.renderPdf(this._getCurrentUrl());
        },

        async pdfZoomIn() {
            this.pdfZoom = Math.min(4, Math.round((this.pdfZoom + 0.25) * 100) / 100);
            await this.renderPdf(this._getCurrentUrl());
        },

        async pdfZoomOut() {
            this.pdfZoom = Math.max(0.5, Math.round((this.pdfZoom - 0.25) * 100) / 100);
            await this.renderPdf(this._getCurrentUrl());
        },

        async pdfZoomFit() {
            this.pdfZoom = 1;
            await this.renderPdf(this._getCurrentUrl());
        },

        async renderPdf(url) {
            const gen = (this.generation += 1);
            if (this._loadingTask) {
                try {
                    this._loadingTask.destroy();
                } catch (_) {
                    /* ignore */
                }
                this._loadingTask = null;
            }

            this.error = null;
            await Alpine.nextTick();
            await new Promise((r) => requestAnimationFrame(r));

            const host = this.$refs.pdfHost;
            const outer = this.$refs.pdfOuter;
            if (!host) {
                this.loading = false;
                return;
            }

            const hostWidth = Math.max(outer?.clientWidth || host.clientWidth || 0, 280);

            host.innerHTML = '';

            if (!url) {
                this.loading = false;
                return;
            }

            this.loading = true;

            let loadingTask;
            try {
                loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
                this._loadingTask = loadingTask;
                const pdf = await loadingTask.promise;
                if (gen !== this.generation) return;

                const z = this.pdfZoom || 1;
                let pixelRatio = effectiveCanvasPixelRatio();
                const numPages = pdf.numPages;

                for (let p = 1; p <= numPages; p++) {
                    if (gen !== this.generation) return;
                    const page = await pdf.getPage(p);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const fitScale = hostWidth / baseViewport.width;
                    const cssScale = fitScale * z;
                    let viewport = page.getViewport({ scale: cssScale * pixelRatio });
                    while (
                        pixelRatio > 1 &&
                        (viewport.width > MAX_CANVAS_EDGE || viewport.height > MAX_CANVAS_EDGE)
                    ) {
                        pixelRatio = Math.max(1, Math.round((pixelRatio - 0.2) * 100) / 100);
                        viewport = page.getViewport({ scale: cssScale * pixelRatio });
                    }
                    const canvas = document.createElement('canvas');
                    const ctx =
                        canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                    }
                    const w = Math.floor(viewport.width);
                    const h = Math.floor(viewport.height);
                    canvas.width = w;
                    canvas.height = h;
                    const cssW = w / pixelRatio;
                    const cssH = h / pixelRatio;
                    canvas.style.width = `${Math.round(cssW * 100) / 100}px`;
                    canvas.style.height = `${Math.round(cssH * 100) / 100}px`;
                    canvas.className = 'pdf-inline-canvas';
                    const renderTask = page.render({ canvasContext: ctx, viewport });
                    await renderTask.promise;
                    host.appendChild(canvas);
                }
            } catch (e) {
                if (gen !== this.generation) return;
                console.error('pdfViewer:', e);
                this.error = 'Could not show the PDF inline. Use “open in new tab” below.';
            } finally {
                if (this._loadingTask === loadingTask) {
                    this._loadingTask = null;
                }
                if (gen === this.generation) {
                    this.loading = false;
                }
            }
        },
    }));
});
