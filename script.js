document.addEventListener('DOMContentLoaded', () => {

    // --- CMS Content Loader ---
    async function loadContent() {
        try {
            const response = await fetch('content/site.json');
            if (!response.ok) return;
            const data = await response.json();
            applyContent(data);
        } catch (e) {
            console.log('CMS: Using hardcoded content (JSON not available)');
        }
    }

    function applyContent(data) {
        // --- Hero ---
        if (data.hero) {
            const h = data.hero;
            setImg('.hero-bg > img', h.background_image, 'Intérieur La Taverne des Rois');
            setImg('.hero-logo', h.logo, 'Logo');
            const heroH1 = document.querySelector('.hero h1');
            if (heroH1) heroH1.innerHTML = `${h.title_line1}<br><span>${h.title_line2}</span>`;
            setText('.hero p', h.subtitle);
            const resLinks = document.querySelectorAll('a[href*="reservation.dish.co"], a.open-dish-reservation');
            resLinks.forEach(link => {
                if (h.reservation_url) link.href = h.reservation_url;
            });
            const resBtn = document.querySelector('.hero-buttons .btn-primary');
            if (resBtn && h.reservation_text) resBtn.textContent = h.reservation_text;
            const menuBtn = document.querySelector('.hero-buttons .btn-secondary');
            if (menuBtn && h.menu_text) menuBtn.textContent = h.menu_text;
        }

        // --- Restaurant ---
        if (data.restaurant) {
            const r = data.restaurant;
            setText('#restaurant .subtitle', r.subtitle);
            setText('#restaurant h2', r.title);
            const paras = document.querySelectorAll('#restaurant .text-content p');
            if (r.paragraphs) {
                r.paragraphs.forEach((text, i) => {
                    if (paras[i]) paras[i].textContent = text;
                });
                // Add extra paragraphs if needed
                if (r.paragraphs.length > paras.length) {
                    const container = document.querySelector('#restaurant .text-content');
                    for (let i = paras.length; i < r.paragraphs.length; i++) {
                        const p = document.createElement('p');
                        p.textContent = r.paragraphs[i];
                        container.appendChild(p);
                    }
                }
            }
            setImg('#restaurant .image-frame img', r.image);
        }

        // --- Gallery ---
        if (data.gallery) {
            const g = data.gallery;
            setText('#galerie .subtitle', g.subtitle);
            setText('#galerie h2', g.title);
            setText('#galerie .section-header p', g.description);
            if (g.images && g.images.length > 0) {
                const grid = document.querySelector('.gallery-grid');
                if (grid) {
                    grid.innerHTML = g.images.map(img => `
                        <div class="gallery-item tilt-effect">
                            <img src="${img.src}" alt="${img.alt}">
                            <div class="gallery-overlay"><i class="fas fa-search-plus"></i></div>
                        </div>
                    `).join('');
                    // Re-init lightbox bindings
                    initLightbox();
                }
            }
        }

        // --- Actualités ---
        if (data.actualites) {
            const a = data.actualites;
            setText('#actualites .subtitle', a.subtitle);
            setText('#actualites h2', a.title);
            setText('#actualites .section-header p', a.description);
            if (a.events && a.events.length > 0) {
                const grid = document.querySelector('.news-grid');
                if (grid) {
                    grid.innerHTML = a.events.map(ev => `
                        <div class="news-card">
                            <div class="news-image">
                                <img src="${ev.image}" alt="${ev.title}">
                                <div class="news-date"><span>${ev.date_day}</span>${ev.date_month}</div>
                            </div>
                            <div class="news-content">
                                <h4>${ev.title}</h4>
                                <p>${ev.description}</p>
                                <a href="#" class="read-more">En savoir plus <i class="fas fa-arrow-right"></i></a>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }

        // --- Plat du Jour ---
        if (data.menu_plat_du_jour) {
            const pdj = data.menu_plat_du_jour;
            renderPdjService('#menu-platdujour', '.pdj-block:nth-child(1)', pdj.midi, ['Entrée du jour', 'Plat du jour', 'Dessert du jour', 'Cocktail du jour']);
            renderPdjService('#menu-platdujour', '.pdj-block:nth-child(2)', pdj.soir, ['Entrée du jour', 'Plat du jour', 'Dessert du jour', 'Cocktail du jour']);
            if (pdj.formules) {
                const formulesContainer = document.querySelector('#menu-platdujour .pdj-formules');
                if (formulesContainer) {
                    formulesContainer.innerHTML = pdj.formules.map(f => `
                        <div class="pdj-formule-card${f.popular ? ' highlight' : ''}">
                            ${f.popular ? '<div class="formule-badge">★ Populaire</div>' : ''}
                            <h4>${f.name}</h4>
                            <p>${f.description}</p>
                            <span class="pdj-formule-price">${f.price}</span>
                        </div>
                    `).join('');
                }
            }
        }

        // --- Menu tabs (Entrées, Plats, Desserts, Boissons) ---
        renderMenuTab('#menu-entrees', data.menu_entrees);
        renderMenuTab('#menu-plats', data.menu_plats);
        renderMenuTab('#menu-desserts', data.menu_desserts);
        renderMenuTab('#menu-boissons', data.menu_boissons);

        // --- Footer ---
        if (data.footer) {
            const f = data.footer;
            setText('.brand-col > p', f.description);
            const fbLink = document.querySelector('.social-links a[aria-label="Facebook"]');
            if (fbLink && f.facebook_url) fbLink.href = f.facebook_url;
            const igLink = document.querySelector('.social-links a[aria-label="Instagram"]');
            if (igLink && f.instagram_url) igLink.href = f.instagram_url;
            const addressLi = document.querySelector('.contact-info li:first-child');
            if (addressLi && f.address) addressLi.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${f.address}`;
            const phoneLi = document.querySelector('.contact-info li:nth-child(2)');
            if (phoneLi && f.phone) phoneLi.innerHTML = `<i class="fas fa-phone-alt"></i> <a href="tel:${f.phone.replace(/\s/g, '')}">${f.phone}</a>`;
            setText('.footer-bottom p', f.copyright);
        }
    }

    // Helper: set text content
    function setText(selector, text) {
        const el = document.querySelector(selector);
        if (el && text) el.textContent = text;
    }

    // Helper: set image src
    function setImg(selector, src, alt) {
        const el = document.querySelector(selector);
        if (el && src) {
            el.src = src;
            if (alt) el.alt = alt;
        }
    }

    // Render a Plat du Jour service block (midi or soir)
    function renderPdjService(parentSel, blockSel, serviceData, labels) {
        if (!serviceData) return;
        const block = document.querySelector(`${parentSel} ${blockSel}`);
        if (!block) return;
        const items = block.querySelectorAll('.pdj-item');
        const keys = ['entree', 'plat', 'dessert', 'cocktail'];
        keys.forEach((key, i) => {
            if (serviceData[key] && items[i]) {
                const nameEl = items[i].querySelector('.pdj-name');
                const priceEl = items[i].querySelector('.pdj-price');
                if (nameEl) nameEl.textContent = serviceData[key].name;
                if (priceEl) priceEl.textContent = serviceData[key].price;
            }
        });
    }

    // Render a menu tab (Entrées, Plats, Desserts, Boissons)
    function renderMenuTab(sectionId, categories) {
        if (!categories || !categories.length) return;
        const section = document.querySelector(sectionId);
        if (!section) return;
        const container = section.querySelector('.plat-du-jour-container');
        if (!container) return;

        container.innerHTML = categories.map(cat => `
            <div class="pdj-block">
                <h3 class="pdj-title"><i class="fas ${cat.icon}"></i> ${cat.category}</h3>
                ${cat.subtitle ? `<p class="pdj-subtitle">${cat.subtitle}</p>` : ''}
                <div class="pdj-items">
                    ${cat.items.map(item => `
                        <div class="pdj-item">
                            <span class="pdj-label">${item.label}</span>
                            <span class="pdj-name">${item.name}</span>
                            <span class="pdj-price">${item.price}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Load content from JSON on page load
    loadContent();

    // --- Header Scroll Effect ---
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Mobile Navigation ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const closeMobileNav = document.querySelector('.close-mobile-nav');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLinks = mobileNav.querySelectorAll('a');

    function toggleMobileNav() {
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    }

    mobileMenuBtn.addEventListener('click', toggleMobileNav);
    closeMobileNav.addEventListener('click', toggleMobileNav);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Smooth Scrolling with Offset ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerHeight = document.getElementById('header').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // --- Modal Management ---

    // Function to open a modal
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            if (mobileNav.classList.contains('active')) {
                mobileNav.classList.remove('active');
            }
        }
    }

    // Function to close a modal
    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Attach Open Events
    document.querySelectorAll('.open-menu-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('menu-modal');
        });
    });

    document.querySelectorAll('.open-privatization-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('privatization-modal');
        });
    });

    document.querySelectorAll('.open-dish-reservation').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('dish-reservation-modal');
        });
    });

    // Attach Close Events
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        // Close on backdrop click
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => closeModal(modal));
        }

        // Close on button click
        const closeBtns = modal.querySelectorAll('.modal-close, .close-menu-modal, .close-privatization-modal, .close-dish-modal');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal(modal);
            });
        });
    });

    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) closeModal(activeModal);
        }
    });

    // --- Menu Modal Tabs Logic ---
    const menuTabs = document.querySelectorAll('.menu-tab');
    const menuSections = document.querySelectorAll('.menu-section');

    menuTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            menuTabs.forEach(t => t.classList.remove('active'));
            menuSections.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding section
            const target = tab.getAttribute('data-target');
            const targetSection = document.getElementById('menu-' + target);
            if (targetSection) {
                targetSection.style.display = 'block';
                // Small timeout to allow display block before animating opacity (simulated)
                setTimeout(() => {
                    targetSection.classList.add('active');
                }, 10);
            }
        });
    });

    // --- Privatization Form Simulation ---
    const privatizationForm = document.getElementById('privatization-form');
    const formSuccessMsg = document.getElementById('form-success-msg');

    if (privatizationForm) {
        privatizationForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload

            // Simulate processing
            const submitBtn = privatizationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Envoi en cours...';
            submitBtn.disabled = true;

            setTimeout(() => {
                // Hide form, show success message
                privatizationForm.style.display = 'none';
                formSuccessMsg.style.display = 'block';

                // Allow resetting after 3 seconds for demo purposes
                setTimeout(() => {
                    privatizationForm.reset();
                    privatizationForm.style.display = 'flex';
                    formSuccessMsg.style.display = 'none';
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    closeModal(document.getElementById('privatization-modal'));
                }, 3000);
            }, 1000);
        });
    }

    // --- Gallery Lightbox ---
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    let currentGalleryIndex = 0;
    let galleryImages = [];

    function initLightbox() {
        const items = document.querySelectorAll('.gallery-item');
        galleryImages = [];
        items.forEach((item, index) => {
            const img = item.querySelector('img');
            if (img) {
                galleryImages.push(img.src);
                item.addEventListener('click', () => {
                    currentGalleryIndex = index;
                    openLightbox(img.src);
                });
            }
        });
    }

    function openLightbox(src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showPrevImage() {
        currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
        lightboxImg.src = galleryImages[currentGalleryIndex];
    }

    function showNextImage() {
        currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
        lightboxImg.src = galleryImages[currentGalleryIndex];
    }

    // Lightbox controls (bound once)
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', showPrevImage);
    lightbox.querySelector('.lightbox-next').addEventListener('click', showNextImage);

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });

    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) showPrevImage();
            else showNextImage();
        }
    }, { passive: true });

    // Initialize lightbox for hardcoded gallery
    initLightbox();
});
