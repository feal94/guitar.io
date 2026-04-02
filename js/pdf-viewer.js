/**
 * Inline PDF preview via PDF.js (reliable on mobile; iframe PDFs are not).
 * Registers Alpine `pdfViewer` and `window.guitarIoResourceIsPdf`.
 */
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.mjs';

const PDFJS_VERSION = '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

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
        _loadingTask: null,

        async init() {
            await Alpine.nextTick();
            this.$watch(
                () => subject?.[urlKey],
                async (url) => {
                    await this.renderPdf(url);
                }
            );
            await this.renderPdf(subject?.[urlKey]);
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
            const host = this.$refs.pdfHost;
            if (!host) {
                return;
            }
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

                const hostWidth = Math.max(host.clientWidth || 0, 280);
                const numPages = pdf.numPages;

                for (let p = 1; p <= numPages; p++) {
                    if (gen !== this.generation) return;
                    const page = await pdf.getPage(p);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = Math.min(2.5, hostWidth / baseViewport.width);
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
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
