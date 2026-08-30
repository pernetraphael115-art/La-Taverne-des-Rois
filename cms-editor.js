/**
 * CMS Inline Editor — La Taverne des Rois
 * 
 * Double-clic sur le copyright → login → mode édition.
 * Le client peut modifier textes, images et menu directement sur le site.
 */

(function () {
    // ==============================
    // CONFIGURATION
    // ==============================
    // SHA-256 hash of admin password (hash of 'taverne2025')
    // To change: run in browser console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_NEW_PASSWORD')).then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('')))
    const CMS_PASSWORD_HASH = 'dc5d3ad8b1e660476be33f61a89159bcd4b15c95779b6c6c55f19e5ea260a794';
    const CONTENT_JSON_PATH = 'content/site.json';
    const GITHUB_OWNER = 'pernetraphael115-art';
    const GITHUB_REPO = 'La-Taverne-des-Rois';
    const GITHUB_IMAGES_PATH = 'assets/images/cms';

    // ==============================
    // STATE
    // ==============================
    let isEditMode = false;
    let siteData = null;
    let hasUnsavedChanges = false;

    // ==============================
    // INIT — Inject HTML elements
    // ==============================
    function init() {
        injectLoginModal();
        injectToolbar();
        injectFormatBar();
        injectToast();
        injectItemEditor();
        injectImageInput();

        // Secret trigger: double-click on copyright
        const copyright = document.querySelector('.footer-bottom');
        if (copyright) {
            copyright.addEventListener('dblclick', (e) => {
                e.preventDefault();
                showLogin();
            });
            copyright.style.cursor = 'default';
        }

        // Load content data for reference
        loadSiteData();
    }

    async function loadSiteData() {
        try {
            const res = await fetch(CONTENT_JSON_PATH);
            if (res.ok) siteData = await res.json();
        } catch (e) { /* ignore */ }
    }

    // ==============================
    // LOGIN MODAL
    // ==============================
    function injectLoginModal() {
        const html = `
        <div id="cms-login" class="cms-login-overlay">
            <button class="cms-login-close" onclick="document.getElementById('cms-login').classList.remove('active')">&times;</button>
            <div class="cms-login-box">
                <h2>🔐 Administration</h2>
                <p>Connectez-vous pour modifier le site</p>
                <input type="password" id="cms-password" placeholder="Mot de passe" autocomplete="current-password">
                <button class="cms-login-btn" id="cms-login-btn">Se connecter</button>
                <div class="cms-login-error" id="cms-login-error">Mot de passe incorrect</div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        // Bind events
        document.getElementById('cms-login-btn').addEventListener('click', attemptLogin);
        document.getElementById('cms-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    function showLogin() {
        const overlay = document.getElementById('cms-login');
        overlay.classList.add('active');
        document.getElementById('cms-login-error').style.display = 'none';
        setTimeout(() => document.getElementById('cms-password').focus(), 100);
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function attemptLogin() {
        const pwd = document.getElementById('cms-password').value;
        const pwdHash = await hashPassword(pwd);
        if (pwdHash === CMS_PASSWORD_HASH) {
            document.getElementById('cms-login').classList.remove('active');
            document.getElementById('cms-password').value = '';
            enterEditMode();
        } else {
            document.getElementById('cms-login-error').style.display = 'block';
            document.getElementById('cms-password').value = '';
            document.getElementById('cms-password').focus();
        }
    }

    // ==============================
    // TOOLBAR
    // ==============================
    function injectToolbar() {
        const html = `
        <div id="cms-toolbar" class="cms-toolbar">
            <div class="cms-toolbar-left">
                <span class="cms-toolbar-badge">Mode édition</span>
                <span class="cms-toolbar-text">Cliquez sur un élément pour le modifier</span>
            </div>
            <div class="cms-toolbar-right">
                <button class="cms-toolbar-btn cms-btn-save" id="cms-save-btn" disabled>
                    <i class="fas fa-save"></i> Publier en ligne
                </button>
                <button class="cms-toolbar-btn cms-btn-exit" id="cms-exit-btn">
                    <i class="fas fa-sign-out-alt"></i> Quitter
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('cms-save-btn').addEventListener('click', saveContent);
        document.getElementById('cms-exit-btn').addEventListener('click', exitEditMode);
    }

    // ==============================
    // TOAST
    // ==============================
    function injectToast() {
        document.body.insertAdjacentHTML('beforeend', '<div id="cms-toast" class="cms-toast"></div>');
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('cms-toast');
        toast.textContent = message;
        toast.className = `cms-toast ${type} active`;
        setTimeout(() => toast.classList.remove('active'), 3000);
    }

    // ==============================
    // ITEM EDITOR POPUP
    // ==============================
    function injectItemEditor() {
        const html = `
        <div id="cms-item-editor" class="cms-item-editor">
            <h4 id="cms-item-editor-title">Modifier l'élément</h4>
            <div id="cms-item-editor-fields"></div>
            <div class="cms-item-editor-btns">
                <button class="cms-item-cancel" id="cms-item-cancel">Annuler</button>
                <button class="cms-item-save" id="cms-item-save">Appliquer</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('cms-item-cancel').addEventListener('click', closeItemEditor);
    }

    let currentItemEditorCallback = null;

    function openItemEditor(title, fields, rect, callback) {
        const editor = document.getElementById('cms-item-editor');
        const fieldsContainer = document.getElementById('cms-item-editor-fields');
        document.getElementById('cms-item-editor-title').textContent = title;

        fieldsContainer.innerHTML = fields.map(f => `
            <label>${f.label}</label>
            ${f.type === 'textarea'
                ? `<textarea id="cms-field-${f.key}" rows="2">${f.value || ''}</textarea>`
                : `<input type="text" id="cms-field-${f.key}" value="${(f.value || '').replace(/"/g, '&quot;')}">`
            }
        `).join('');

        // Position near the element
        const top = Math.min(rect.bottom + 10, window.innerHeight - 300);
        const left = Math.min(rect.left, window.innerWidth - 420);
        editor.style.top = top + 'px';
        editor.style.left = Math.max(10, left) + 'px';
        editor.classList.add('active');

        currentItemEditorCallback = callback;
        document.getElementById('cms-item-save').onclick = () => {
            const values = {};
            fields.forEach(f => {
                values[f.key] = document.getElementById(`cms-field-${f.key}`).value;
            });
            callback(values);
            closeItemEditor();
            markChanged();
        };
    }

    function closeItemEditor() {
        document.getElementById('cms-item-editor').classList.remove('active');
    }

    // ==============================
    // HIDDEN IMAGE INPUT
    // ==============================
    let currentImageCallback = null;

    function injectImageInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.id = 'cms-image-input';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !currentImageCallback) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageCallback(ev.target.result);
                markChanged();
            };
            reader.readAsDataURL(file);
            input.value = '';
        });
    }

    function openImagePicker(callback) {
        currentImageCallback = callback;
        document.getElementById('cms-image-input').click();
    }

    // ==============================
    // EDIT MODE
    // ==============================
    function preventNav(e) {
        if (!isEditMode) return;
        if (e.target.closest('#cms-panel') || e.target.closest('#cms-toolbar') || e.target.closest('#cms-login') || e.target.closest('#cms-item-editor') || e.target.closest('#cms-toast')) return;
        const actionable = e.target.closest('a, button');
        if (actionable) {
            e.preventDefault();
        }
    }

    function interceptDishPhotoClick(e) {
        if (!isEditMode) return;
        const btn = e.target.closest('.dish-photo-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        currentEditDishBtn = btn;
        const name = btn.getAttribute('data-dish-name') || '';
        const imageUrl = btn.getAttribute('data-dish-image') || '';

        const lightbox = document.getElementById('dish-photo-lightbox');
        const img = document.getElementById('dish-photo-img');
        const title = lightbox.querySelector('.dish-photo-title');
        const replaceBtn = document.getElementById('cms-dish-replace-btn');

        title.textContent = name;
        if (imageUrl) {
            img.src = imageUrl;
            img.style.display = 'block';
        } else {
            img.src = '';
            img.style.display = 'none';
        }

        replaceBtn.style.display = 'inline-flex';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function enterEditMode() {
        isEditMode = true;
        hasUnsavedChanges = false;
        document.body.classList.add('cms-edit-mode');
        document.getElementById('cms-toolbar').classList.add('active');
        document.getElementById('cms-save-btn').disabled = true;

        document.addEventListener('click', preventNav, true);
        document.addEventListener('click', interceptDishPhotoClick, true);

        // Tag all editable elements
        tagEditableElements();
        // Init drag & drop
        initDragAndDrop();
        showToast('✏️ Mode édition activé — cliquez sur un élément pour le modifier');
    }

    function exitEditMode() {
        if (hasUnsavedChanges) {
            if (!confirm('Vous avez des modifications non sauvegardées. Quitter quand même ?')) return;
        }
        isEditMode = false;
        document.body.classList.remove('cms-edit-mode');
        document.getElementById('cms-toolbar').classList.remove('active');
        closeItemEditor();
        hideFormatBar();

        document.removeEventListener('click', preventNav, true);
        document.removeEventListener('click', interceptDishPhotoClick, true);

        // Remove all editable attributes
        document.querySelectorAll('[data-cms-editable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('data-cms-editable');
            el.classList.remove('cms-editing');
        });
        document.querySelectorAll('[data-cms-image]').forEach(el => {
            el.removeAttribute('data-cms-image');
        });
        // Remove drag handles
        document.querySelectorAll('.cms-drag-handle').forEach(h => h.remove());
        document.querySelectorAll('[data-cms-draggable]').forEach(el => {
            el.removeAttribute('data-cms-draggable');
            el.removeAttribute('draggable');
        });

        // Reload to reset any unsaved visual changes
        if (hasUnsavedChanges) location.reload();
        showToast('Mode édition désactivé');
    }

    function markChanged() {
        hasUnsavedChanges = true;
        document.getElementById('cms-save-btn').disabled = false;
    }

    // ==============================
    // TAG EDITABLE ELEMENTS
    // ==============================
    function tagEditableElements() {
        // --- Text elements ---
        const textSelectors = [
            '.hero h1',
            '.hero p',
            '.hero-buttons .btn-primary',
            '.hero-buttons .btn-secondary',
            '#restaurant .subtitle',
            '#restaurant h2',
            '#restaurant .text-content p',
            '#galerie .subtitle',
            '#galerie h2',
            '#galerie .section-header p',
            '#actualites .subtitle',
            '#actualites h2',
            '#actualites .section-header p',
            '.news-content h4',
            '.news-content p',
            '.news-date span',
            '.news-date',
            '.brand-col > p',
            '.contact-info li',
            '.footer-bottom p',
            '.modal-header h2',
            '.pdj-title',
            '.pdj-subtitle',
            '.pdj-name',
            '.pdj-price',
            '.pdj-label',
            '.pdj-formule-card h4',
            '.pdj-formule-card p',
            '.pdj-formule-price',
            'a',
            'button'
        ];

        textSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.closest('#cms-panel') || el.closest('#cms-toolbar') || el.closest('#cms-login') || el.closest('#cms-item-editor') || el.closest('#cms-toast')) return;
                if (el.closest('.modal-close') || el.closest('.lightbox-close') || el.classList.contains('mobile-menu-btn') || el.classList.contains('close-mobile-nav')) return;
                if (el.classList.contains('dish-photo-btn') || el.classList.contains('dish-photo-close') || el.classList.contains('cms-dish-replace-btn')) return;
                if (el.getAttribute('data-cms-editable')) return;

                el.setAttribute('data-cms-editable', 'text');
                el.addEventListener('click', handleTextClick);
            });
        });

        // --- Image elements ---
        const imageSelectors = [
            '.hero-bg',
            '.gallery-item',
            '.image-frame',
            '.news-image',
        ];

        imageSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.setAttribute('data-cms-image', 'true');
                el.addEventListener('click', handleImageClick);
            });
        });
    }

    function handleTextClick(e) {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const el = e.currentTarget;
        // If panel is already targeting this element, don't re-init
        if (panelTarget === el) return;

        // Deactivate previous element
        document.querySelectorAll('.cms-editing').forEach(prev => {
            if (prev !== el) {
                prev.removeAttribute('contenteditable');
                prev.classList.remove('cms-editing');
            }
        });

        el.setAttribute('contenteditable', 'true');
        el.classList.add('cms-editing');
        el.focus();

        // Show the side panel
        showFormatBar(el);

        // Do NOT add blur listener — panel handles save/cancel
    }

    function handleImageClick(e) {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const container = e.currentTarget;

        openImagePicker((dataUrl) => {
            const img = container.querySelector('img');
            if (img) {
                img.src = dataUrl;
            }
            showToast('📷 Image mise à jour');
        });
    }

    // --- Dish photo edit: open lightbox with "Replace" button ---
    let currentEditDishBtn = null;

    function handleDishPhotoBtnClick(e) {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        const btn = e.currentTarget;
        currentEditDishBtn = btn;
        const name = btn.getAttribute('data-dish-name') || '';
        const imageUrl = btn.getAttribute('data-dish-image') || '';

        const lightbox = document.getElementById('dish-photo-lightbox');
        const img = document.getElementById('dish-photo-img');
        const title = lightbox.querySelector('.dish-photo-title');
        const replaceBtn = document.getElementById('cms-dish-replace-btn');

        title.textContent = name;
        if (imageUrl) {
            img.src = imageUrl;
            img.style.display = 'block';
        } else {
            img.src = '';
            img.style.display = 'none';
        }

        replaceBtn.style.display = 'inline-flex';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // ==============================
    // IMAGE UPLOAD TO GITHUB
    // ==============================

    /**
     * Upload a base64 data URL image to GitHub repo.
     * Returns the relative path (e.g. /assets/images/cms/img_1234567890.jpg)
     */
    async function uploadImageToGitHub(dataUrl, ghToken) {
        // Extract MIME type and base64 content
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) throw new Error('Format image invalide');

        const mimeType = match[1];
        const base64Content = match[2];
        const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
        const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `${GITHUB_IMAGES_PATH}/${filename}`;
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${ghToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Upload image: ${filename}`,
                content: base64Content
            })
        });

        if (!putRes.ok) {
            if (putRes.status === 401 || putRes.status === 403) {
                localStorage.removeItem('cms_gh_token');
                throw new Error('Clé GitHub invalide ou permissions insuffisantes.');
            }
            const errData = await putRes.json();
            throw new Error(`Erreur upload image: ${errData.message || putRes.statusText}`);
        }

        return `/${filePath}`;
    }

    /**
     * Scan the collected data for base64 images and upload them to GitHub.
     * Replaces data: URLs with GitHub-hosted paths in-place.
     */
    async function uploadAllBase64Images(data, ghToken, progressCallback) {
        const imagesToUpload = [];

        // Collect all base64 image references
        function scanForBase64(obj, path) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => scanForBase64(item, `${path}[${i}]`));
                return;
            }
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                    imagesToUpload.push({ obj, key, dataUrl: value });
                } else if (typeof value === 'object') {
                    scanForBase64(value, `${path}.${key}`);
                }
            }
        }

        scanForBase64(data, 'root');

        if (imagesToUpload.length === 0) return;

        for (let i = 0; i < imagesToUpload.length; i++) {
            const img = imagesToUpload[i];
            if (progressCallback) {
                progressCallback(i + 1, imagesToUpload.length);
            }
            const remotePath = await uploadImageToGitHub(img.dataUrl, ghToken);
            img.obj[img.key] = remotePath;
        }
    }

    // ==============================
    // SAVE CONTENT
    // ==============================
    async function saveContent() {
        const btn = document.getElementById('cms-save-btn');
        btn.disabled = true;

        try {
            // Step 1: Collect content
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Collecte du contenu...';
            const data = collectContentFromDOM();

            // Step 2: Get GitHub token
            let ghToken = localStorage.getItem('cms_gh_token');
            if (!ghToken) {
                ghToken = prompt(
                    "🔑 Entrez votre clé secrète GitHub (Personal Access Token) pour publier les modifications en ligne.\n\n" +
                    "Cette clé sera mémorisée dans votre navigateur pour les prochaines fois."
                );
                if (!ghToken) {
                    showToast('⚠️ Publication annulée — aucune clé fournie.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-save"></i> Publier en ligne';
                    return;
                }
                localStorage.setItem('cms_gh_token', ghToken);
            }

            // Step 3: Upload base64 images to GitHub
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload des images...';
            showToast('📷 Upload des images en cours...');
            await uploadAllBase64Images(data, ghToken, (current, total) => {
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Image ${current}/${total}...`;
            });

            // Step 4: Save to localStorage for immediate local persistence
            localStorage.setItem('cms_site_content', JSON.stringify(data));

            // Step 5: Commit site.json to GitHub
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication du contenu...';
            showToast('⏳ Publication du contenu en cours...');

            const jsonStr = JSON.stringify(data, null, 2);
            const path = 'content/site.json';
            const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

            // Get file SHA
            const getRes = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${ghToken}` }
            });
            let sha = null;
            if (getRes.ok) {
                const fileData = await getRes.json();
                sha = fileData.sha;
            } else if (getRes.status === 401 || getRes.status === 403) {
                localStorage.removeItem('cms_gh_token');
                throw new Error('Clé GitHub invalide ou expirée. Réessayez.');
            } else if (getRes.status !== 404) {
                throw new Error('Erreur GitHub API : ' + getRes.statusText);
            }

            // Put new file
            const encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));
            const putData = {
                message: 'Mise à jour du contenu via CMS — ' + new Date().toLocaleString('fr-FR'),
                content: encodedContent
            };
            if (sha) putData.sha = sha;

            const putRes = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${ghToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putData)
            });

            if (!putRes.ok) {
                if (putRes.status === 401 || putRes.status === 403) {
                    localStorage.removeItem('cms_gh_token');
                    throw new Error('Clé GitHub invalide ou permissions insuffisantes. Réessayez.');
                }
                const errData = await putRes.json();
                throw new Error(errData.message || 'Erreur lors du commit');
            }

            // Step 6: Success with deployment countdown
            hasUnsavedChanges = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Publié !';
            showToast('✅ Publié avec succès ! Les changements seront visibles par tous dans ~30 secondes.', 'success');

            // Show countdown in toolbar
            let countdown = 30;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    btn.innerHTML = `<i class="fas fa-clock"></i> En ligne dans ${countdown}s...`;
                } else {
                    clearInterval(countdownInterval);
                    btn.innerHTML = '<i class="fas fa-save"></i> Publier en ligne';
                    btn.disabled = true; // No unsaved changes
                    showToast('🌐 Vos modifications sont maintenant visibles par tout le monde !', 'success');
                }
            }, 1000);

            return; // Don't reset button — countdown handles it

        } catch (err) {
            showToast('❌ Erreur : ' + err.message, 'error');
            console.error('CMS Save Error:', err);
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Publier en ligne';
    }

    function collectContentFromDOM() {
        const data = siteData || {};

        // Hero
        const heroH1 = document.querySelector('.hero h1');
        if (heroH1) {
            const parts = heroH1.innerHTML.split('<br>');
            data.hero = data.hero || {};
            data.hero.title_line1 = parts[0] ? parts[0].replace(/<[^>]*>/g, '').trim() : '';
            const spanMatch = (parts[1] || '').match(/<span>(.*?)<\/span>/);
            data.hero.title_line2 = spanMatch ? spanMatch[1].trim() : (parts[1] || '').replace(/<[^>]*>/g, '').trim();
        }
        const heroP = document.querySelector('.hero p');
        if (heroP) {
            data.hero = data.hero || {};
            data.hero.subtitle = heroP.textContent.trim();
        }
        const heroBg = document.querySelector('.hero-bg > img');
        if (heroBg) {
            data.hero = data.hero || {};
            data.hero.background_image = heroBg.src.startsWith('data:') ? heroBg.src : heroBg.getAttribute('src');
        }

        // Restaurant
        const restSubtitle = document.querySelector('#restaurant .subtitle');
        const restTitle = document.querySelector('#restaurant h2');
        const restParas = document.querySelectorAll('#restaurant .text-content p');
        const restImg = document.querySelector('#restaurant .image-frame img');
        data.restaurant = data.restaurant || {};
        if (restSubtitle) data.restaurant.subtitle = restSubtitle.textContent.trim();
        if (restTitle) data.restaurant.title = restTitle.textContent.trim();
        if (restParas.length) data.restaurant.paragraphs = Array.from(restParas).map(p => p.textContent.trim());
        if (restImg) data.restaurant.image = restImg.src.startsWith('data:') ? restImg.src : restImg.getAttribute('src');

        // Gallery
        const galleryImgs = document.querySelectorAll('.gallery-item img');
        if (galleryImgs.length) {
            data.gallery = data.gallery || {};
            data.gallery.subtitle = textOf('#galerie .subtitle') || data.gallery.subtitle;
            data.gallery.title = textOf('#galerie h2') || data.gallery.title;
            data.gallery.description = textOf('#galerie .section-header p') || data.gallery.description;
            data.gallery.images = Array.from(galleryImgs).map(img => ({
                src: img.src.startsWith('data:') ? img.src : img.getAttribute('src'),
                alt: img.alt
            }));
        }

        // Actualités
        const newsCards = document.querySelectorAll('.news-card');
        if (newsCards.length) {
            data.actualites = data.actualites || {};
            data.actualites.subtitle = textOf('#actualites .subtitle') || data.actualites.subtitle;
            data.actualites.title = textOf('#actualites h2') || data.actualites.title;
            data.actualites.description = textOf('#actualites .section-header p') || data.actualites.description;
            data.actualites.events = Array.from(newsCards).map(card => ({
                image: card.querySelector('.news-image img')?.getAttribute('src') || '',
                date_day: card.querySelector('.news-date span')?.textContent.trim() || '',
                date_month: card.querySelector('.news-date')?.textContent.replace(card.querySelector('.news-date span')?.textContent || '', '').trim() || '',
                title: card.querySelector('.news-content h4')?.textContent.trim() || '',
                description: card.querySelector('.news-content p')?.textContent.trim() || ''
            }));
        }

        // Menu tabs — collect from DOM
        data.menu_entrees = collectMenuCategories('#menu-entrees');
        data.menu_plats = collectMenuCategories('#menu-plats');
        data.menu_desserts = collectMenuCategories('#menu-desserts');
        data.menu_boissons = collectMenuCategories('#menu-boissons');

        // Plat du jour
        data.menu_plat_du_jour = data.menu_plat_du_jour || {};
        data.menu_plat_du_jour.midi = collectPdjService('#menu-platdujour .pdj-block:nth-child(1)');
        data.menu_plat_du_jour.soir = collectPdjService('#menu-platdujour .pdj-block:nth-child(2)');
        const formuleCards = document.querySelectorAll('#menu-platdujour .pdj-formule-card');
        if (formuleCards.length) {
            data.menu_plat_du_jour.formules = Array.from(formuleCards).map(card => ({
                name: card.querySelector('h4')?.textContent.trim() || '',
                description: card.querySelector('p')?.textContent.trim() || '',
                price: card.querySelector('.pdj-formule-price')?.textContent.trim() || '',
                popular: card.classList.contains('highlight')
            }));
        }

        // Footer
        data.footer = data.footer || {};
        const footerDesc = document.querySelector('.brand-col > p');
        if (footerDesc) data.footer.description = footerDesc.textContent.trim();
        const address = document.querySelector('.contact-info li:first-child');
        if (address) data.footer.address = address.textContent.trim();
        const phone = document.querySelector('.contact-info li:nth-child(2)');
        if (phone) data.footer.phone = phone.textContent.trim();
        const copyright = document.querySelector('.footer-bottom p');
        if (copyright) data.footer.copyright = copyright.textContent.trim();

        // Links generic saving
        data.links = data.links || {};
        document.querySelectorAll('[data-cms-link]').forEach(el => {
            const id = el.getAttribute('data-cms-link');
            if (id) {
                const linkData = {};
                linkData.text = el.innerHTML.trim();
                if (el.tagName.toLowerCase() === 'a') linkData.href = el.getAttribute('href') || '';
                if (el.classList.contains('open-menu-modal')) linkData.modalClass = 'open-menu-modal';
                else if (el.classList.contains('open-privatization-modal')) linkData.modalClass = 'open-privatization-modal';
                else if (el.classList.contains('open-dish-reservation')) linkData.modalClass = 'open-dish-reservation';
                else linkData.modalClass = '';
                data.links[id] = linkData;
            }
        });

        return data;
    }

    function collectMenuCategories(sectionId) {
        const blocks = document.querySelectorAll(`${sectionId} .pdj-block`);
        if (!blocks.length) return undefined;
        return Array.from(blocks).map(block => {
            const titleEl = block.querySelector('.pdj-title');
            const iconEl = titleEl?.querySelector('i');
            const subtitleEl = block.querySelector('.pdj-subtitle');
            const items = Array.from(block.querySelectorAll('.pdj-item')).map(item => ({
                label: item.querySelector('.pdj-label')?.textContent.trim() || '',
                name: item.querySelector('.pdj-name')?.textContent.trim() || '',
                price: item.querySelector('.pdj-price')?.textContent.trim() || '',
                image: item.querySelector('.dish-photo-btn')?.getAttribute('data-dish-image') || ''
            }));

            const iconClass = iconEl ? Array.from(iconEl.classList).find(c => c.startsWith('fa-')) : '';
            const categoryName = titleEl ? titleEl.textContent.trim() : '';

            return {
                category: categoryName,
                icon: iconClass || '',
                subtitle: subtitleEl ? subtitleEl.textContent.trim() : undefined,
                items
            };
        });
    }

    function collectPdjService(blockSelector) {
        const block = document.querySelector(blockSelector);
        if (!block) return {};
        const items = block.querySelectorAll('.pdj-item');
        const keys = ['entree', 'plat', 'dessert', 'cocktail'];
        const result = {};
        keys.forEach((key, i) => {
            if (items[i]) {
                result[key] = {
                    name: items[i].querySelector('.pdj-name')?.textContent.trim() || '',
                    price: items[i].querySelector('.pdj-price')?.textContent.trim() || ''
                };
            }
        });
        return result;
    }

    function textOf(selector) {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
    }

    // ==============================
    // SIDE PANEL (Webflow-style)
    // ==============================
    const FONTS = [
        { label: 'Playfair Display', value: "'Playfair Display', serif" },
        { label: 'Inter', value: "'Inter', sans-serif" },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Courier', value: "'Courier New', monospace" },
        { label: 'Times', value: "'Times New Roman', serif" },
        { label: 'Trebuchet', value: "'Trebuchet MS', sans-serif" },
    ];

    const COLOR_PALETTE = [
        // Reds
        '#e74c3c', '#c0392b', '#ff6b6b', '#ee5a24',
        // Oranges
        '#e67e22', '#f39c12', '#fdcb6e', '#ffeaa7',
        // Yellows/Golds
        '#d4af37', '#f1c40f', '#ffc312', '#f9ca24',
        // Greens
        '#2ecc71', '#27ae60', '#10b981', '#1abc9c',
        // Blues
        '#3498db', '#2980b9', '#0984e3', '#74b9ff',
        // Purples
        '#9b59b6', '#8e44ad', '#6c5ce7', '#a29bfe',
        // Neutrals
        '#ffffff', '#ecf0f1', '#bdc3c7', '#95a5a6',
        '#7f8c8d', '#636e72', '#2d3436', '#000000',
        // Extra
        '#dfe6e9', '#b2bec3', '#6d7f8b', '#485460',
        '#1a1e2e', '#0a0e17', '#ff9ff3', '#f368e0',
    ];

    let panelTarget = null;
    let panelOriginalStyles = {};
    let savedRange = null;

    // Save selection whenever it changes inside the editable element
    function saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && panelTarget && panelTarget.contains(sel.anchorNode)) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }

    function restoreSelection() {
        if (savedRange && panelTarget) {
            panelTarget.focus();
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    }

    function injectFormatBar() {
        const fontOptions = FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');
        const weightOptions = ['300', '400', '500', '600', '700', '800'].map(w => {
            const labels = { '300': 'Light', '400': 'Regular', '500': 'Medium', '600': 'Semi-bold', '700': 'Bold', '800': 'Extra-bold' };
            return `<option value="${w}">${labels[w]}</option>`;
        }).join('');
        const swatches = COLOR_PALETTE.map(c =>
            `<div class="cms-color-swatch" data-color="${c}" style="background:${c}" title="${c}"></div>`
        ).join('');

        const html = `
        <div id="cms-panel" class="cms-panel">
            <div class="cms-panel-header">
                <h3 id="cms-panel-title">Module d'Édition</h3>
                <button class="cms-panel-close" id="cms-panel-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="cms-panel-body">
                <div class="cms-section" id="cms-link-section" style="display:none;">
                    <span class="cms-section-label">Lien / Action</span>
                    <select id="cms-p-link" class="cms-select" style="width: 100%; margin-bottom: 5px; padding: 5px; background: #fff; border: 1px solid #ccc; border-radius: 4px; color: #333;">
                        <option value="">-- Aucun / Défaut --</option>
                        <optgroup label="Pages du site">
                            <option value="/">Accueil</option>
                            <option value="/restaurant-cergy/">Restaurant</option>
                            <option value="/la-carte/">La Carte</option>
                            <option value="/galerie/">Galerie</option>
                            <option value="/actualites/">Actualités</option>
                            <option value="/privatisation/">Privatisation</option>
                            <option value="/reservation/">Réservation</option>
                            <option value="/mentions-legales/">Mentions légales</option>
                            <option value="/donnees-personnelles/">Données personnelles</option>
                        </optgroup>
                        <optgroup label="Pop-ups (Modales)">
                            <option value="modal:menu-modal">Pop-up : La Carte</option>
                            <option value="modal:privatization-modal">Pop-up : Privatisation</option>
                            <option value="modal:dish-reservation-modal">Pop-up : Réservation</option>
                        </optgroup>
                        <optgroup label="Lien externe">
                            <option value="external">Lien personnalisé...</option>
                        </optgroup>
                    </select>
                    <input type="text" id="cms-p-link-custom" class="cms-text-input" placeholder="https://..." style="display:none; width: 100%; padding: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; color: #333;">
                </div>

                <div class="cms-section">
                    <span class="cms-section-label">Police</span>
                    <div class="cms-font-row">
                        <select id="cms-p-font" title="Famille de police">${fontOptions}</select>
                        <select id="cms-p-weight" title="Épaisseur">${weightOptions}</select>
                    </div>
                    <div class="cms-size-row">
                        <input type="range" id="cms-p-size-range" min="8" max="120" value="16">
                        <input type="text" class="cms-size-input" id="cms-p-size" value="16px">
                    </div>
                </div>

                <div class="cms-section">
                    <span class="cms-section-label">Style</span>
                    <div class="cms-style-row">
                        <button class="cms-style-btn" id="cms-p-bold"><b>Bold</b></button>
                        <button class="cms-style-btn" id="cms-p-italic"><i>Italic</i></button>
                        <button class="cms-style-btn" id="cms-p-underline"><u>U</u></button>
                    </div>
                </div>

                <div class="cms-section">
                    <span class="cms-section-label">Couleur</span>
                    <div class="cms-color-grid">${swatches}</div>
                    <div class="cms-color-custom">
                        <input type="color" id="cms-p-color-picker" value="#ffffff">
                        <input type="text" id="cms-p-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                        <div class="cms-color-preview" id="cms-p-color-preview"></div>
                    </div>
                </div>

                <div class="cms-section">
                    <span class="cms-section-label">Alignement</span>
                    <div class="cms-align-row">
                        <button class="cms-align-btn" data-align="left"><i class="fas fa-align-left"></i></button>
                        <button class="cms-align-btn" data-align="center"><i class="fas fa-align-center"></i></button>
                        <button class="cms-align-btn" data-align="right"><i class="fas fa-align-right"></i></button>
                        <button class="cms-align-btn" data-align="justify"><i class="fas fa-align-justify"></i></button>
                    </div>
                </div>

                <div class="cms-section">
                    <span class="cms-section-label">Texte</span>
                    <textarea class="cms-text-area" id="cms-p-text" rows="4"></textarea>
                </div>
            </div>
            <div class="cms-panel-footer">
                <button class="cms-panel-cancel" id="cms-panel-cancel-btn">Annuler</button>
                <button class="cms-panel-save" id="cms-panel-save-btn">Sauvegarder les modifications</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);

        // Prevent panel interactions from stealing focus/selection from the editable element
        document.getElementById('cms-panel').addEventListener('mousedown', (e) => {
            // Allow input/textarea/select to receive focus normally
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            e.preventDefault();
        });

        // Track selection changes in editable elements
        document.addEventListener('selectionchange', saveSelection);

        // === Bind panel events ===
        document.getElementById('cms-panel-close').addEventListener('click', hideFormatBar);

        // Link changes
        document.getElementById('cms-p-link').addEventListener('change', (e) => {
            if (!panelTarget) return;
            const val = e.target.value;
            const customInput = document.getElementById('cms-p-link-custom');
            
            panelTarget.classList.remove('open-menu-modal', 'open-privatization-modal', 'open-dish-reservation');
            
            if (val.startsWith('modal:')) {
                customInput.style.display = 'none';
                const modalId = val.split(':')[1];
                if (modalId === 'menu-modal') panelTarget.classList.add('open-menu-modal');
                if (modalId === 'privatization-modal') panelTarget.classList.add('open-privatization-modal');
                if (modalId === 'dish-reservation-modal') panelTarget.classList.add('open-dish-reservation');
                if (panelTarget.tagName.toLowerCase() === 'a') panelTarget.setAttribute('href', '#');
            } else if (val === 'external') {
                customInput.style.display = 'block';
                if (panelTarget.tagName.toLowerCase() === 'a') panelTarget.setAttribute('href', customInput.value || '#');
            } else {
                customInput.style.display = 'none';
                if (panelTarget.tagName.toLowerCase() === 'a') panelTarget.setAttribute('href', val || '#');
            }
        });
        
        document.getElementById('cms-p-link-custom').addEventListener('input', (e) => {
            if (!panelTarget) return;
            if (panelTarget.tagName.toLowerCase() === 'a') {
                panelTarget.setAttribute('href', e.target.value);
            }
        });

        // Dish photo replace button
        document.getElementById('cms-dish-replace-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openImagePicker((dataUrl) => {
                if (currentEditDishBtn) {
                    currentEditDishBtn.setAttribute('data-dish-image', dataUrl);
                    currentEditDishBtn.classList.remove('cms-no-image');
                }
                // Update lightbox preview
                const img = document.getElementById('dish-photo-img');
                img.src = dataUrl;
                img.style.display = 'block';
                showToast('📷 Image du plat mise à jour');
            });
        });

        // Font family
        document.getElementById('cms-p-font').addEventListener('change', (e) => {
            if (panelTarget) { panelTarget.style.fontFamily = e.target.value; }
        });

        // Font weight
        document.getElementById('cms-p-weight').addEventListener('change', (e) => {
            if (panelTarget) { panelTarget.style.fontWeight = e.target.value; }
        });

        // Font size (slider)
        document.getElementById('cms-p-size-range').addEventListener('input', (e) => {
            if (panelTarget) {
                panelTarget.style.fontSize = e.target.value + 'px';
                document.getElementById('cms-p-size').value = e.target.value + 'px';
            }
        });

        // Font size (input)
        document.getElementById('cms-p-size').addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if (panelTarget && val) {
                panelTarget.style.fontSize = val + 'px';
                document.getElementById('cms-p-size-range').value = val;
            }
        });

        // Bold
        document.getElementById('cms-p-bold').addEventListener('click', () => {
            if (!panelTarget) return;
            applyToSelection('bold');
            document.getElementById('cms-p-bold').classList.toggle('active');
        });

        // Italic
        document.getElementById('cms-p-italic').addEventListener('click', () => {
            if (!panelTarget) return;
            applyToSelection('italic');
            document.getElementById('cms-p-italic').classList.toggle('active');
        });

        // Underline
        document.getElementById('cms-p-underline').addEventListener('click', () => {
            if (!panelTarget) return;
            applyToSelection('underline');
            document.getElementById('cms-p-underline').classList.toggle('active');
        });

        // Color palette swatches
        document.querySelectorAll('.cms-color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const color = sw.dataset.color;
                applyColorToTarget(color);
                document.querySelectorAll('.cms-color-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
            });
        });

        // Color picker
        document.getElementById('cms-p-color-picker').addEventListener('input', (e) => {
            applyColorToTarget(e.target.value);
        });

        // Hex input
        document.getElementById('cms-p-color-hex').addEventListener('change', (e) => {
            let hex = e.target.value.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-fA-F]{3,6}$/.test(hex)) {
                applyColorToTarget(hex);
            }
        });

        // Alignment
        document.querySelectorAll('.cms-align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!panelTarget) return;
                panelTarget.style.textAlign = btn.dataset.align;
                document.querySelectorAll('.cms-align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Text content
        document.getElementById('cms-p-text').addEventListener('input', (e) => {
            if (panelTarget) {
                panelTarget.textContent = e.target.value;
            }
        });

        // Save button
        document.getElementById('cms-panel-save-btn').addEventListener('click', () => {
            markChanged();
            hideFormatBar();
            showToast('✅ Modifications appliquées');
        });

        // Cancel button
        document.getElementById('cms-panel-cancel-btn').addEventListener('click', () => {
            if (panelTarget && panelOriginalStyles) {
                // Restore original styles & HTML
                ['color', 'fontFamily', 'fontWeight', 'fontSize', 'fontStyle', 'textDecoration', 'textAlign'].forEach(prop => {
                    panelTarget.style[prop] = panelOriginalStyles[prop] || '';
                });
                panelTarget.innerHTML = panelOriginalStyles._html;
            }
            hideFormatBar();
        });
    }

    function applyColorToTarget(color) {
        if (!panelTarget) return;
        // Update preview controls
        document.getElementById('cms-p-color-picker').value = color;
        document.getElementById('cms-p-color-hex').value = color.toUpperCase();
        document.getElementById('cms-p-color-preview').style.background = color;
        document.querySelectorAll('.cms-color-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color.toLowerCase() === color.toLowerCase());
        });
        // Apply via selection or whole element
        applyToSelection('foreColor', color);
    }

    function getElementLabel(el) {
        const tag = el.tagName.toLowerCase();
        const labels = {
            'h1': 'Titre Principal', 'h2': 'Titre de Section', 'h3': 'Sous-titre',
            'h4': 'Titre', 'p': 'Paragraphe', 'span': 'Texte',
            'a': 'Lien / Bouton', 'li': 'Élément de liste', 'button': 'Bouton'
        };
        const classes = el.className;
        if (classes.includes('pdj-name')) return 'Nom du plat';
        if (classes.includes('pdj-price')) return 'Prix';
        if (classes.includes('pdj-label')) return 'Étiquette';
        if (classes.includes('pdj-title')) return 'Titre de catégorie';
        if (classes.includes('pdj-formule-price')) return 'Prix de formule';
        if (classes.includes('subtitle')) return 'Sous-titre de section';
        if (classes.includes('btn-primary')) return 'Bouton principal';
        if (classes.includes('btn-secondary')) return 'Bouton secondaire';
        return labels[tag] || 'Élément';
    }

    function showFormatBar(el) {
        panelTarget = el;
        const panel = document.getElementById('cms-panel');
        const cs = getComputedStyle(el);

        // Store original state for cancel
        panelOriginalStyles = {
            color: el.style.color,
            fontFamily: el.style.fontFamily,
            fontWeight: el.style.fontWeight,
            fontSize: el.style.fontSize,
            fontStyle: el.style.fontStyle,
            textDecoration: el.style.textDecoration,
            textAlign: el.style.textAlign,
            _html: el.innerHTML
        };

        // Set panel title
        document.getElementById('cms-panel-title').textContent = 'Modification — ' + getElementLabel(el);

        // Setup Link Option
        const linkSection = document.getElementById('cms-link-section');
        const linkSelect = document.getElementById('cms-p-link');
        const linkCustom = document.getElementById('cms-p-link-custom');
        const tag = el.tagName.toLowerCase();
        
        if (tag === 'a' || tag === 'button') {
            linkSection.style.display = 'block';
            let matchedLink = '';
            
            if (el.classList.contains('open-menu-modal')) matchedLink = 'modal:menu-modal';
            else if (el.classList.contains('open-privatization-modal')) matchedLink = 'modal:privatization-modal';
            else if (el.classList.contains('open-dish-reservation')) matchedLink = 'modal:dish-reservation-modal';
            else if (tag === 'a') {
                const href = el.getAttribute('href') || '#';
                if (href === '#' || href === '') matchedLink = '';
                else {
                    let found = false;
                    Array.from(linkSelect.options).forEach(opt => {
                        if (opt.value === href) { matchedLink = href; found = true; }
                    });
                    if (!found) matchedLink = 'external';
                }
            }
            
            linkSelect.value = matchedLink;
            if (matchedLink === 'external') {
                linkCustom.style.display = 'block';
                linkCustom.value = el.getAttribute('href') || '';
            } else {
                linkCustom.style.display = 'none';
                linkCustom.value = '';
            }
        } else {
            linkSection.style.display = 'none';
        }

        // Set current values
        const fontSel = document.getElementById('cms-p-font');
        const currentFont = cs.fontFamily.toLowerCase();
        let matched = false;
        for (let i = 0; i < fontSel.options.length; i++) {
            if (currentFont.includes(fontSel.options[i].text.toLowerCase())) {
                fontSel.selectedIndex = i; matched = true; break;
            }
        }
        if (!matched) fontSel.selectedIndex = 0;

        document.getElementById('cms-p-weight').value = cs.fontWeight;
        const size = parseInt(cs.fontSize);
        document.getElementById('cms-p-size-range').value = size;
        document.getElementById('cms-p-size').value = size + 'px';
        document.getElementById('cms-p-bold').classList.toggle('active', parseInt(cs.fontWeight) >= 700);
        document.getElementById('cms-p-italic').classList.toggle('active', cs.fontStyle === 'italic');
        document.getElementById('cms-p-underline').classList.toggle('active', cs.textDecorationLine.includes('underline'));

        // Color — just update the UI controls (don't apply a change)
        const hex = rgbToHex(cs.color);
        document.getElementById('cms-p-color-picker').value = hex;
        document.getElementById('cms-p-color-hex').value = hex.toUpperCase();
        document.getElementById('cms-p-color-preview').style.background = hex;
        document.querySelectorAll('.cms-color-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color.toLowerCase() === hex.toLowerCase());
        });

        // Alignment
        document.querySelectorAll('.cms-align-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.align === cs.textAlign);
        });

        // Text content
        document.getElementById('cms-p-text').value = el.textContent;

        panel.classList.add('active');
        document.body.classList.add('cms-panel-open');
    }

    function hideFormatBar() {
        // Deactivate contenteditable on current element
        if (panelTarget) {
            panelTarget.removeAttribute('contenteditable');
            panelTarget.classList.remove('cms-editing');
        }
        document.getElementById('cms-panel').classList.remove('active');
        document.body.classList.remove('cms-panel-open');
        panelTarget = null;
        savedRange = null;
    }

    // Apply style to selected text or whole element
    function applyToSelection(command, value) {
        if (!panelTarget) return;

        // Restore saved selection if available
        if (savedRange) {
            restoreSelection();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed && panelTarget.contains(sel.anchorNode)) {
                document.execCommand(command, false, value);
                // Re-save updated range
                savedRange = sel.getRangeAt(0).cloneRange();
                return;
            }
        }

        // Fallback: apply to whole element
        panelTarget.focus();
        switch (command) {
            case 'foreColor': panelTarget.style.color = value; break;
            case 'bold': {
                const isBold = parseInt(getComputedStyle(panelTarget).fontWeight) >= 700;
                panelTarget.style.fontWeight = isBold ? '400' : '700';
                break;
            }
            case 'italic': {
                const isIt = getComputedStyle(panelTarget).fontStyle === 'italic';
                panelTarget.style.fontStyle = isIt ? 'normal' : 'italic';
                break;
            }
            case 'underline': {
                const isU = getComputedStyle(panelTarget).textDecorationLine.includes('underline');
                panelTarget.style.textDecoration = isU ? 'none' : 'underline';
                break;
            }
        }
    }

    function rgbToHex(rgb) {
        const match = rgb.match(/\d+/g);
        if (!match || match.length < 3) return '#ffffff';
        return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }

    // ==============================
    // DRAG & DROP
    // ==============================
    let dragSrcEl = null;

    function initDragAndDrop() {
        // Make gallery items, news cards, and menu items draggable
        const draggableGroups = [
            { selector: '.gallery-item', container: '.gallery-grid' },
            { selector: '.news-card', container: '.news-grid' },
            { selector: '.pdj-item', container: '.pdj-items' },
            { selector: '.pdj-block', container: '.plat-du-jour-container' },
        ];

        draggableGroups.forEach(group => {
            document.querySelectorAll(group.selector).forEach(el => {
                el.setAttribute('data-cms-draggable', 'true');
                el.setAttribute('draggable', 'true');

                // Add drag handle
                if (!el.querySelector('.cms-drag-handle')) {
                    const handle = document.createElement('div');
                    handle.className = 'cms-drag-handle';
                    handle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
                    el.appendChild(handle);
                }

                el.addEventListener('dragstart', handleDragStart);
                el.addEventListener('dragover', handleDragOver);
                el.addEventListener('dragenter', handleDragEnter);
                el.addEventListener('dragleave', handleDragLeave);
                el.addEventListener('drop', handleDrop);
                el.addEventListener('dragend', handleDragEnd);
            });
        });
    }

    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add('cms-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        // Only highlight if same type of element
        if (dragSrcEl && this !== dragSrcEl && this.getAttribute('data-cms-draggable')) {
            this.classList.add('cms-drag-over');
        }
    }

    function handleDragLeave() {
        this.classList.remove('cms-drag-over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();

        if (dragSrcEl && this !== dragSrcEl && this.parentNode === dragSrcEl.parentNode) {
            // Swap positions in the DOM
            const parent = this.parentNode;
            const allChildren = Array.from(parent.children).filter(c => c.getAttribute('data-cms-draggable'));
            const fromIndex = allChildren.indexOf(dragSrcEl);
            const toIndex = allChildren.indexOf(this);

            if (fromIndex < toIndex) {
                parent.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                parent.insertBefore(dragSrcEl, this);
            }

            markChanged();
            showToast('↕️ Élément déplacé');
        }

        this.classList.remove('cms-drag-over');
    }

    function handleDragEnd() {
        document.querySelectorAll('[data-cms-draggable]').forEach(el => {
            el.classList.remove('cms-dragging', 'cms-drag-over');
        });
    }

    // ==============================
    // LOAD FROM LOCALSTORAGE
    // ==============================
    function loadFromLocalStorage() {
        const stored = localStorage.getItem('cms_site_content');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    // ==============================
    // BOOT
    // ==============================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
