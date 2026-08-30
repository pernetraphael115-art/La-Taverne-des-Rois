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
        // --- Generic Links ---
        if (data.links) {
            document.querySelectorAll('[data-cms-link]').forEach(el => {
                const id = el.getAttribute('data-cms-link');
                const linkData = data.links[id];
                if (linkData) {
                    if (linkData.text) el.innerHTML = linkData.text;
                    if (linkData.href && el.tagName.toLowerCase() === 'a') el.href = linkData.href;
                    // Reset known modal classes
                    el.classList.remove('open-reservation-modal');
                    if (linkData.modalClass) {
                        el.classList.add(linkData.modalClass);
                    }
                }
            });
        }

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
                            <button class="dish-photo-btn ${item.image ? '' : 'cms-no-image'}" data-dish-name="${item.name.replace(/"/g, '&quot;')}" data-dish-image="${item.image || ''}" title="Voir/Modifier la photo"><i class="fas fa-camera"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Bind photo buttons in this section
        bindDishPhotoButtons(container);
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

    // --- Reservation Modal Management ---

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
            // Reset reservation modal to choice screen when closing
            if (modal.id === 'reservation-modal') {
                const choice = document.getElementById('reservation-choice');
                const form = document.getElementById('reservation-group-form');
                if (choice) choice.style.display = '';
                if (form) form.style.display = 'none';
            }
        }
    }

    // Open reservation modal
    document.querySelectorAll('.open-reservation-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('reservation-modal');
        });
    });

    // Close reservation modal
    const reservationModal = document.getElementById('reservation-modal');
    if (reservationModal) {
        const backdrop = reservationModal.querySelector('.modal-backdrop');
        if (backdrop) backdrop.addEventListener('click', () => closeModal(reservationModal));
        
        reservationModal.querySelectorAll('.modal-close, .close-reservation-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal(reservationModal);
            });
        });
    }

    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) closeModal(activeModal);
        }
    });

    // Large group button → show form
    const btnLargeGroup = document.getElementById('btn-large-group');
    const reservationChoice = document.getElementById('reservation-choice');
    const reservationGroupForm = document.getElementById('reservation-group-form');

    if (btnLargeGroup) {
        btnLargeGroup.addEventListener('click', () => {
            reservationChoice.style.display = 'none';
            reservationGroupForm.style.display = 'block';
        });
    }

    // Back button → show choice
    const backBtn = document.getElementById('reservation-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            reservationGroupForm.style.display = 'none';
            reservationChoice.style.display = '';
        });
    }

    // Group reservation form submission
    const groupForm = document.getElementById('group-reservation-form');
    const groupSuccess = document.getElementById('group-form-success');

    if (groupForm) {
        groupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = groupForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Envoi en cours...';
            submitBtn.disabled = true;

            // Collect form data for Web3Forms
            const formData = {
                access_key: 'ffe93cfc-7ed8-4f01-a6f5-89de6f2f8546',
                subject: 'Nouvelle demande de réservation groupe — La Taverne des Rois',
                from_name: 'Site Web - La Taverne des Rois',
                name: groupForm.querySelector('#grp-nom').value + ' ' + groupForm.querySelector('#grp-prenom').value,
                email: groupForm.querySelector('#grp-email').value,
                phone: groupForm.querySelector('#grp-tel').value,
                guests: groupForm.querySelector('#grp-personnes').value,
                date: groupForm.querySelector('#grp-date').value,
                message: groupForm.querySelector('#grp-message').value || 'Aucun commentaire.'
            };

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    groupForm.style.display = 'none';
                    groupSuccess.style.display = 'block';

                    setTimeout(() => {
                        groupForm.reset();
                        groupForm.style.display = 'flex';
                        groupSuccess.style.display = 'none';
                        submitBtn.innerText = originalText;
                        submitBtn.disabled = false;
                        closeModal(document.getElementById('reservation-modal'));
                    }, 4000);
                } else {
                    alert(result.message || "Une erreur est survenue.");
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert("Erreur de connexion au serveur.");
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }


    // --- Gallery Lightbox ---
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    let currentGalleryIndex = 0;
    let galleryImages = [];

    function initLightbox() {
        const closeMentionsBtn = document.getElementById('close-mentions-modal');
        const mentionsModal = document.getElementById('mentions-modal');
        const donneesModal = document.getElementById('donnees-modal');
        const closeDonneesBtn = document.getElementById('close-donnees-modal');
        const mentionsLink = document.querySelector('a[data-cms-link="footer-link-4"]');
        const donneesLink = document.querySelector('a[data-cms-link="footer-link-5"]');

        if (mentionsLink) {
            mentionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                mentionsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (donneesLink) {
            donneesLink.addEventListener('click', (e) => {
                e.preventDefault();
                donneesModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeMentionsBtn) {
            closeMentionsBtn.addEventListener('click', () => {
                mentionsModal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        if (closeDonneesBtn) {
            closeDonneesBtn.addEventListener('click', () => {
                donneesModal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close on click outside for legal modals
        const backdrops = [
            document.getElementById('backdrop-mentions'),
            document.getElementById('backdrop-donnees')
        ];
        
        backdrops.forEach(backdrop => {
            if (backdrop) {
                backdrop.addEventListener('click', (e) => {
                    mentionsModal.classList.remove('active');
                    donneesModal.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }
        });

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

    // --- Dish Photo Lightbox ---
    const dishPhotoLightbox = document.getElementById('dish-photo-lightbox');
    const dishPhotoImg = document.getElementById('dish-photo-img');
    const dishPhotoTitle = dishPhotoLightbox.querySelector('.dish-photo-title');

    function openDishPhoto(name, imageUrl) {
        dishPhotoTitle.textContent = name;
        dishPhotoImg.src = imageUrl;
        dishPhotoLightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDishPhoto() {
        dishPhotoLightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function bindDishPhotoButtons(container) {
        container.querySelectorAll('.dish-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-dish-name');
                const image = btn.getAttribute('data-dish-image');
                openDishPhoto(name, image);
            });
        });
    }

    // Make bindDishPhotoButtons available globally for renderMenuTab
    window.bindDishPhotoButtons = bindDishPhotoButtons;

    dishPhotoLightbox.querySelector('.dish-photo-close').addEventListener('click', closeDishPhoto);
    dishPhotoLightbox.querySelector('.dish-photo-backdrop').addEventListener('click', closeDishPhoto);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dishPhotoLightbox.classList.contains('active')) {
            closeDishPhoto();
        }
    });

    // Bind any hardcoded photo buttons already in the DOM
    bindDishPhotoButtons(document);
});
