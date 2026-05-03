/**
 * Lee `latest.json` (con cache buster) y rellena los enlaces de descarga
 * + información de versión en la página.
 */
(async function () {
    const versionEl = document.getElementById('version-tag');
    const footerVersionEl = document.getElementById('footer-version');
    const releaseNotesEl = document.getElementById('release-notes-preview');
    const downloadBtns = [
        document.getElementById('download-btn'),
        document.getElementById('download-btn-2'),
    ];

    function setError(msg) {
        if (versionEl) versionEl.textContent = msg;
        downloadBtns.forEach((b) => {
            if (b) {
                b.removeAttribute('href');
                b.style.opacity = '0.5';
                b.style.cursor = 'not-allowed';
            }
        });
    }

    try {
        // Cache buster con timestamp para que GitHub Pages CDN no sirva versiones viejas.
        const r = await fetch(`latest.json?t=${Date.now()}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error('No se pudo cargar latest.json');

        const data = await r.json();
        const apkUrl = `releases/${data.url}`;

        if (versionEl) versionEl.textContent = `Versión ${data.version}`;
        if (footerVersionEl) footerVersionEl.textContent = `v${data.version}`;
        if (releaseNotesEl && data.release_notes) {
            releaseNotesEl.textContent = data.release_notes;
        }

        downloadBtns.forEach((b) => {
            if (b) b.href = apkUrl;
        });
    } catch (err) {
        console.error('Error cargando manifest:', err);
        setError('versión no disponible');
    }
})();
