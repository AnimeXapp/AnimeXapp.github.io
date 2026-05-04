/**
 * AnimeX Download Portal
 * Lee `latest.json` (con cache buster) y rellena los enlaces de descarga
 * + información de versión en la página.
 */

// ────────────────────────────────────────────────────────────
// Element References
// ────────────────────────────────────────────────────────────

const versionEl = document.getElementById('version-tag');
const footerVersionEl = document.getElementById('footer-version');
const releaseNotesEl = document.getElementById('release-notes-preview');
const downloadBtns = [
    document.getElementById('download-btn'),
    document.getElementById('download-btn-2'),
];

// ────────────────────────────────────────────────────────────
// Error Handling
// ────────────────────────────────────────────────────────────

function setError(msg) {
    const errorMsg = `⚠ ${msg}`;
    if (versionEl) versionEl.textContent = errorMsg;
    if (versionEl) versionEl.style.color = '#FF2DA6';
    
    downloadBtns.forEach((btn) => {
        if (btn) {
            btn.removeAttribute('href');
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
            btn.title = 'No se pudo cargar el archivo de descarga';
            btn.setAttribute('disabled', 'disabled');
        }
    });
    
    console.error('[AnimeX] Error:', msg);
}

function setSuccess(data) {
    const apkUrl = `releases/${data.url}`;
    
    // Update version display
    if (versionEl) {
        versionEl.textContent = `v${data.version}`;
        versionEl.style.color = 'var(--primary)';
    }
    if (footerVersionEl) footerVersionEl.textContent = `v${data.version}`;
    
    // Update release notes
    if (releaseNotesEl && data.release_notes) {
        releaseNotesEl.textContent = data.release_notes;
    }
    
    // Enable download buttons
    downloadBtns.forEach((btn) => {
        if (btn) {
            btn.href = apkUrl;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.removeAttribute('disabled');
            btn.title = `Descargar AnimeX v${data.version}`;
            
            // Add click animation
            btn.addEventListener('click', (e) => {
                btn.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 150);
            });
        }
    });
    
    console.log('[AnimeX] Successfully loaded version:', data.version);
}

// ────────────────────────────────────────────────────────────
// Load Latest Version
// ────────────────────────────────────────────────────────────

(async function loadLatestVersion() {
    try {
        // Cache buster con timestamp para que GitHub Pages CDN no sirva versiones viejas.
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(`latest.json${cacheBuster}`, { 
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: No se pudo cargar latest.json`);
        }
        
        const data = await response.json();
        
        // Validate response
        if (!data.version || !data.url) {
            throw new Error('Formato inválido en latest.json');
        }
        
        setSuccess(data);
        
    } catch (err) {
        console.error('[AnimeX] Error loading manifest:', err);
        setError('versión no disponible');
    }
})();

// ────────────────────────────────────────────────────────────
// Smooth Scroll Animations
// ────────────────────────────────────────────────────────────

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const elementsToObserve = document.querySelectorAll(
        '.feature-card, .credit-card, .install-steps li'
    );
    
    elementsToObserve.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});

// ────────────────────────────────────────────────────────────
// Navigation Active State
// ────────────────────────────────────────────────────────────

window.addEventListener('scroll', () => {
    const navLinks = document.querySelectorAll('.nav a:not(.nav-cta)');
    
    navLinks.forEach(link => {
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            const rect = targetSection.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                link.style.color = 'var(--text-primary)';
            } else {
                link.style.color = 'var(--text-secondary)';
            }
        }
    });
});

// ────────────────────────────────────────────────────────────
// Performance: Lazy Loading Images
// ────────────────────────────────────────────────────────────

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ────────────────────────────────────────────────────────────
// Accessibility: Focus Management
// ────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    // Skip to main content with keyboard shortcut
    if (e.altKey && e.key === 'm') {
        const mainContent = document.querySelector('main') || document.getElementById('hero');
        if (mainContent) mainContent.focus();
    }
});

console.log('%cAnimeX v2.0', 'font-size: 24px; font-weight: bold; color: #7B2DFF;');
console.log('%cUI Mejorada - Premium Experience', 'font-size: 14px; color: #FF2DA6;');
