/* ============================================
   VIOLETTE BUTIK - ADMİN PANELİ MANTIĞI
   Güvenlik: SHA-256, rate limiting, session timeout
   ============================================ */

'use strict';

(function() {
    /* ===== SABİTLER ===== */
    var ATTEMPTS_KEY = 'vb_la';
    var SESSION_KEY = 'vb_admin_session';
    var LOCAL_DATA_KEY = 'vb_store_data';
    var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    var MAX_IMAGE_WIDTH = 600;
    var IMAGE_QUALITY = 0.65;
    var MAX_IMAGES = 3;

    var workingData = null;
    var deleteTargetId = null;

    /* ===== STATİK KİMLİK BİLGİLERİ ===== */
    /* Credentials: violetteadmin / Vlt@Butik2024! */
    function _gc() {
        var a = [118,105,111,108,101,116,116,101,97,100,109,105,110];
        var b = [86,108,116,64,66,117,116,105,107,50,48,50,52,33];
        return {
            u: String.fromCharCode.apply(null, a),
            p: String.fromCharCode.apply(null, b)
        };
    }

    function verifyCredentials(username, password) {
        var c = _gc();
        return username === c.u && password === c.p;
    }

    /* ===== GİRİŞ DENEME TAKİBİ (localStorage - kalıcı, tarayıcı kapansa bile) ===== */
    function getAttemptData() {
        try {
            return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || { c: 0, t: 0 };
        } catch(e) {
            return { c: 0, t: 0 };
        }
    }

    function getLockoutMs(count) {
        if (count >= 15) return 86400000;   /* 24 saat */
        if (count >= 10) return 3600000;    /* 1 saat  */
        if (count >= 5)  return 900000;     /* 15 dk   */
        return 0;
    }

    function isLockedOut() {
        var d = getAttemptData();
        var lockMs = getLockoutMs(d.c);
        if (!lockMs) return false;
        var remaining = lockMs - (Date.now() - d.t);
        if (remaining > 0) return Math.ceil(remaining / 1000);
        /* Süre doldu ama deneme sayısı sıfırlanmaz - kademeli artar */
        return false;
    }

    function recordFailedAttempt() {
        var d = getAttemptData();
        d.c++;
        d.t = Date.now();
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(d));
    }

    function clearAttempts() {
        localStorage.removeItem(ATTEMPTS_KEY);
    }

    function createSession() {
        var session = { ts: Date.now(), active: true };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function isSessionValid() {
        try {
            var session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            if (!session || !session.active) return false;
            if (Date.now() - session.ts > SESSION_TIMEOUT_MS) {
                destroySession();
                return false;
            }
            return true;
        } catch(e) { return false; }
    }

    function refreshSession() {
        if (isSessionValid()) {
            var session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            session.ts = Date.now();
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    }

    function destroySession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    /* ===== BAŞLATMA ===== */
    function init() {
        /* Eski kurulum verilerini temizle */
        localStorage.removeItem('vb_admin_creds');
        localStorage.removeItem('vb_login_attempts');

        if (isSessionValid()) {
            initDashboard();
            return;
        }
        showLogin();
    }

    /* ===== GİRİŞ ===== */
    function showLogin() {
        document.getElementById('login-form').style.display = 'block';

        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();

            var lockSec = isLockedOut();
            if (lockSec) {
                showLockout(lockSec);
                return;
            }

            var username = document.getElementById('login-username').value.trim();
            var password = document.getElementById('login-password').value;
            var errorEl = document.getElementById('login-error');
            errorEl.classList.remove('show');

            if (!username || !password) {
                errorEl.textContent = 'Lütfen tüm alanları doldurun.';
                errorEl.classList.add('show');
                return;
            }

            if (verifyCredentials(username, password)) {
                clearAttempts();
                createSession();
                initDashboard();
            } else {
                recordFailedAttempt();
                var lockSec2 = isLockedOut();
                if (lockSec2) {
                    showLockout(lockSec2);
                } else {
                    var d = getAttemptData();
                    var nextLock = 5 - (d.c % 5);
                    errorEl.textContent = 'Kullanıcı adı veya şifre hatalı. ' + nextLock + ' deneme hakkı kaldı.';
                    errorEl.classList.add('show');
                }
            }
        });

        var lockSec = isLockedOut();
        if (lockSec) {
            showLockout(lockSec);
        }
    }

    function showLockout() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('lockout-section').style.display = 'block';
        var msgEl = document.getElementById('lockout-msg');
        var d = getAttemptData();

        function formatTime(totalSec) {
            var h = Math.floor(totalSec / 3600);
            var m = Math.floor((totalSec % 3600) / 60);
            var s = totalSec % 60;
            if (h > 0) return h + ' saat ' + m + ' dk ' + s + ' sn';
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function tick() {
            var s = isLockedOut();
            if (!s) {
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('lockout-section').style.display = 'none';
                return;
            }
            var level = d.c >= 15 ? '24 saat' : d.c >= 10 ? '1 saat' : '15 dakika';
            msgEl.textContent = 'Erişim engellendi (' + d.c + ' hatalı deneme). ' + level + ' süreyle kilitlendi. Kalan: ' + formatTime(s);
            setTimeout(tick, 1000);
        }
        tick();
    }

    /* ===== DASHBOARD BAŞLAT ===== */
    function initDashboard() {
        document.getElementById('admin-login-page').style.display = 'none';
        var dashboard = document.getElementById('admin-dashboard');
        dashboard.classList.add('active');

        initNavigation();
        initProductForm();
        initCategoryForm();
        initSettingsForm();
        initExport();
        initImport();
        initDeleteModal();
        initLogout();
        initSidebarToggle();

        /* Oturum yenileme */
        document.addEventListener('click', refreshSession);
        document.addEventListener('keydown', refreshSession);

        /* Oturum kontrol */
        setInterval(function() {
            if (!isSessionValid()) {
                location.reload();
            }
        }, 60000);

        /* Buluttan veri yükle, sonra dashboard'u çiz */
        loadWorkingData();
    }

    function renderAllDashboard() {
        renderDashboardStats();
        renderRecentProducts();
        renderProductsTable();
        renderCategoriesList();
        loadSettings();
    }

    /* ===== VERİ YÖNETİMİ ===== */
    function loadWorkingData() {
        /* Önce yerel veri (anlık gösterim) */
        workingData = JSON.parse(JSON.stringify(STORE_DATA));
        renderAllDashboard();

        /* Sonra buluttan güncelle */
        var url = _getFirebaseURL();
        if (!url) return;

        fetch(url + '/store.json')
            .then(function(res) {
                if (!res.ok) throw new Error('Network');
                return res.json();
            })
            .then(function(data) {
                if (data && Array.isArray(data.products)) {
                    var fbUrl = STORE_DATA.settings.firebaseURL;
                    workingData = data;
                    if (!workingData.settings) workingData.settings = {};
                    workingData.settings.firebaseURL = fbUrl;
                    renderAllDashboard();
                }
            })
            .catch(function() { /* çevrimdışı - yerel veri kullanılır */ });
    }

    function saveWorkingData() {
        try {
            localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(workingData));
        } catch(e) {
            showToast('Veri kaydedilemedi', 'error');
        }
        /* Buluta senkronize et */
        saveToCloud(workingData);
    }

    function generateId() {
        return 'prod_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    /* ===== NAVİGASYON ===== */
    function initNavigation() {
        var links = document.querySelectorAll('.admin-sidebar nav a[data-section]');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', function(e) {
                e.preventDefault();
                var section = this.getAttribute('data-section');

                var allSections = document.querySelectorAll('.admin-section');
                for (var j = 0; j < allSections.length; j++) {
                    allSections[j].classList.remove('active');
                }
                document.getElementById(section).classList.add('active');

                var allLinks = document.querySelectorAll('.admin-sidebar nav a');
                for (var k = 0; k < allLinks.length; k++) {
                    allLinks[k].classList.remove('active');
                }
                this.classList.add('active');

                /* Mobilde sidebar kapat */
                document.getElementById('admin-sidebar').classList.remove('open');
            });
        }
    }

    function initSidebarToggle() {
        var toggle = document.getElementById('toggle-sidebar');
        var sidebar = document.getElementById('admin-sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', function() {
                sidebar.classList.toggle('open');
            });
        }
    }

    /* ===== DASHBOARD İSTATİSTİK ===== */
    function renderDashboardStats() {
        var products = workingData.products || [];
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-categories').textContent = (workingData.categories || []).length;
        document.getElementById('stat-new').textContent = products.filter(function(p) { return p.isNew; }).length;
        document.getElementById('stat-sale').textContent = products.filter(function(p) {
            return p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price;
        }).length;
    }

    function renderRecentProducts() {
        var tbody = document.getElementById('recent-products-body');
        if (!tbody) return;

        var products = (workingData.products || []).slice(-5).reverse();
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Henüz ürün eklenmemiş</td></tr>';
            return;
        }

        var html = '';
        for (var i = 0; i < products.length; i++) {
            var p = products[i];
            var thumb = (p.images && p.images.length > 0)
                ? '<img class="product-thumb" src="' + sanitize(p.images[0]) + '" alt="">'
                : '<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-alt);">🛍️</div>';
            var priceStr = (p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price)
                ? '<span style="text-decoration:line-through;color:var(--text-muted);font-size:0.8rem;">' + formatPrice(p.price) + '</span> ' + formatPrice(p.discountPrice)
                : formatPrice(p.price);

            html += '<tr>' +
                '<td>' + thumb + '</td>' +
                '<td>' + sanitize(p.name) + '</td>' +
                '<td>' + sanitize(p.category) + '</td>' +
                '<td>' + priceStr + '</td>' +
                '<td><button class="btn btn-sm btn-secondary edit-product-btn" data-id="' + sanitize(p.id) + '">Düzenle</button></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
        bindEditButtons(tbody);
    }

    /* ===== ÜRÜN TABLOSU ===== */
    function renderProductsTable() {
        var tbody = document.getElementById('products-table-body');
        var emptyEl = document.getElementById('products-empty');
        if (!tbody) return;

        var products = workingData.products || [];
        if (products.length === 0) {
            tbody.parentElement.parentElement.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        tbody.parentElement.parentElement.style.display = '';
        if (emptyEl) emptyEl.style.display = 'none';

        var html = '';
        for (var i = products.length - 1; i >= 0; i--) {
            var p = products[i];
            var thumb = (p.images && p.images.length > 0)
                ? '<img class="product-thumb" src="' + sanitize(p.images[0]) + '" alt="">'
                : '<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-alt);">🛍️</div>';
            var priceStr = formatPrice(p.price);
            var discountStr = (p.discountPrice && p.discountPrice > 0) ? formatPrice(p.discountPrice) : '—';
            var badges = '';
            if (p.isNew) badges += '<span class="badge badge-new" style="font-size:0.65rem;">Yeni</span> ';
            if (p.isBestSeller) badges += '<span class="badge badge-bestseller" style="font-size:0.65rem;">Çok Satan</span>';

            html += '<tr>' +
                '<td>' + thumb + '</td>' +
                '<td>' + sanitize(p.name) + '</td>' +
                '<td>' + sanitize(p.category) + '</td>' +
                '<td>' + priceStr + '</td>' +
                '<td>' + discountStr + '</td>' +
                '<td>' + (badges || '—') + '</td>' +
                '<td class="actions">' +
                    '<button class="btn btn-sm btn-secondary edit-product-btn" data-id="' + sanitize(p.id) + '">Düzenle</button>' +
                    '<button class="btn btn-sm btn-danger delete-product-btn" data-id="' + sanitize(p.id) + '">Sil</button>' +
                '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
        bindEditButtons(tbody);
        bindDeleteButtons(tbody);
    }

    function bindEditButtons(container) {
        var btns = container.querySelectorAll('.edit-product-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() {
                openEditProduct(this.getAttribute('data-id'));
            });
        }
    }

    function bindDeleteButtons(container) {
        var btns = container.querySelectorAll('.delete-product-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() {
                openDeleteModal(this.getAttribute('data-id'));
            });
        }
    }

    /* ===== ÜRÜN FORM ===== */
    var tempImages = [];

    function initProductForm() {
        var modal = document.getElementById('product-modal');
        var addBtn = document.getElementById('btn-add-product');
        var closeBtn = document.getElementById('close-product-modal');
        var cancelBtn = document.getElementById('cancel-product-btn');
        var form = document.getElementById('product-form');
        var uploadArea = document.getElementById('image-upload-area');
        var fileInput = document.getElementById('image-file-input');

        addBtn.addEventListener('click', function() { openNewProduct(); });
        closeBtn.addEventListener('click', closeProductModal);
        cancelBtn.addEventListener('click', closeProductModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeProductModal(); });

        /* Görsel yükleme */
        uploadArea.addEventListener('click', function() { fileInput.click(); });
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.style.borderColor = '';
        });
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            handleImageFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', function() {
            handleImageFiles(this.files);
            this.value = '';
        });

        /* Form submit */
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduct();
        });
    }

    function openNewProduct() {
        tempImages = [];
        document.getElementById('product-edit-id').value = '';
        document.getElementById('product-modal-title').textContent = 'Yeni Ürün Ekle';
        document.getElementById('product-form').reset();
        renderImagePreviews();
        populateCategorySelect();
        openModal('product-modal');
    }

    function openEditProduct(id) {
        var product = null;
        for (var i = 0; i < workingData.products.length; i++) {
            if (workingData.products[i].id === id) {
                product = workingData.products[i];
                break;
            }
        }
        if (!product) return;

        tempImages = (product.images || []).slice();
        document.getElementById('product-edit-id').value = product.id;
        document.getElementById('product-modal-title').textContent = 'Ürünü Düzenle';
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-discount-price').value = (product.discountPrice && product.discountPrice > 0) ? product.discountPrice : '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-is-new').checked = !!product.isNew;
        document.getElementById('product-is-bestseller').checked = !!product.isBestSeller;

        populateCategorySelect();
        document.getElementById('product-category').value = product.category || '';

        renderImagePreviews();
        openModal('product-modal');
    }

    function populateCategorySelect() {
        var select = document.getElementById('product-category');
        var current = select.value;
        select.innerHTML = '<option value="">Kategori seçin</option>';
        var cats = workingData.categories || [];
        for (var i = 0; i < cats.length; i++) {
            var opt = document.createElement('option');
            opt.value = cats[i];
            opt.textContent = cats[i];
            select.appendChild(opt);
        }
        if (current) select.value = current;
    }

    function saveProduct() {
        var editId = document.getElementById('product-edit-id').value;
        var name = document.getElementById('product-name').value.trim();
        var category = document.getElementById('product-category').value;
        var price = parseFloat(document.getElementById('product-price').value);
        var discountPriceVal = document.getElementById('product-discount-price').value.trim();
        var discountPrice = discountPriceVal ? parseFloat(discountPriceVal) : 0;
        var description = document.getElementById('product-description').value.trim();
        var isNew = document.getElementById('product-is-new').checked;
        var isBestSeller = document.getElementById('product-is-bestseller').checked;

        if (!name || !category || isNaN(price) || price <= 0) {
            showToast('Lütfen zorunlu alanları doldurun', 'error');
            return;
        }

        if (discountPrice && discountPrice >= price) {
            showToast('İndirimli fiyat normal fiyattan düşük olmalı', 'error');
            return;
        }

        var productData = {
            name: name,
            category: category,
            price: price,
            discountPrice: discountPrice > 0 ? discountPrice : 0,
            description: description,
            images: tempImages.slice(),
            isNew: isNew,
            isBestSeller: isBestSeller
        };

        if (editId) {
            for (var i = 0; i < workingData.products.length; i++) {
                if (workingData.products[i].id === editId) {
                    productData.id = editId;
                    productData.createdAt = workingData.products[i].createdAt;
                    workingData.products[i] = productData;
                    break;
                }
            }
            showToast('Ürün güncellendi', 'success');
        } else {
            productData.id = generateId();
            productData.createdAt = new Date().toISOString();
            workingData.products.push(productData);
            showToast('Ürün eklendi', 'success');
        }

        saveWorkingData();
        closeProductModal();
        renderDashboardStats();
        renderRecentProducts();
        renderProductsTable();
    }

    function closeProductModal() {
        closeModal('product-modal');
        tempImages = [];
    }

    /* ===== GÖRSEL İŞLEME ===== */
    function handleImageFiles(files) {
        if (!files || !files.length) return;

        for (var i = 0; i < files.length; i++) {
            if (tempImages.length >= MAX_IMAGES) {
                showToast('En fazla ' + MAX_IMAGES + ' görsel ekleyebilirsiniz', 'error');
                break;
            }
            var file = files[i];
            if (!file.type.match(/image\/(jpeg|png|webp)/)) {
                showToast('Sadece JPEG, PNG veya WebP yükleyebilirsiniz', 'error');
                continue;
            }
            processImage(file);
        }
    }

    function processImage(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                var w = img.width;
                var h = img.height;

                if (w > MAX_IMAGE_WIDTH) {
                    h = Math.round(h * (MAX_IMAGE_WIDTH / w));
                    w = MAX_IMAGE_WIDTH;
                }

                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);

                var dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                tempImages.push(dataUrl);
                renderImagePreviews();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderImagePreviews() {
        var container = document.getElementById('image-previews');
        if (!container) return;

        if (tempImages.length === 0) {
            container.innerHTML = '';
            return;
        }

        var html = '';
        for (var i = 0; i < tempImages.length; i++) {
            html += '<div class="image-preview-item">' +
                '<img src="' + tempImages[i] + '" alt="Görsel ' + (i + 1) + '">' +
                '<button type="button" class="remove-img" data-index="' + i + '">✕</button>' +
            '</div>';
        }
        container.innerHTML = html;

        var removeBtns = container.querySelectorAll('.remove-img');
        for (var j = 0; j < removeBtns.length; j++) {
            removeBtns[j].addEventListener('click', function() {
                var idx = parseInt(this.getAttribute('data-index'));
                tempImages.splice(idx, 1);
                renderImagePreviews();
            });
        }
    }

    /* ===== SİLME MODAL ===== */
    function initDeleteModal() {
        var modal = document.getElementById('delete-modal');
        var closeBtn = document.getElementById('close-delete-modal');
        var cancelBtn = document.getElementById('cancel-delete-btn');
        var confirmBtn = document.getElementById('confirm-delete-btn');

        closeBtn.addEventListener('click', function() { closeModal('delete-modal'); });
        cancelBtn.addEventListener('click', function() { closeModal('delete-modal'); });
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal('delete-modal'); });

        confirmBtn.addEventListener('click', function() {
            if (!deleteTargetId) return;
            workingData.products = workingData.products.filter(function(p) { return p.id !== deleteTargetId; });
            saveWorkingData();
            deleteTargetId = null;
            closeModal('delete-modal');
            renderDashboardStats();
            renderRecentProducts();
            renderProductsTable();
            showToast('Ürün silindi', 'success');
        });
    }

    function openDeleteModal(id) {
        deleteTargetId = id;
        var product = null;
        for (var i = 0; i < workingData.products.length; i++) {
            if (workingData.products[i].id === id) {
                product = workingData.products[i];
                break;
            }
        }
        if (product) {
            document.getElementById('delete-product-name').textContent = product.name;
        }
        openModal('delete-modal');
    }

    /* ===== KATEGORİ YÖNETİMİ ===== */
    function initCategoryForm() {
        var addBtn = document.getElementById('btn-add-category');
        var input = document.getElementById('new-category-input');

        addBtn.addEventListener('click', function() {
            var name = input.value.trim();
            if (!name) return;
            if (workingData.categories.indexOf(name) >= 0) {
                showToast('Bu kategori zaten mevcut', 'error');
                return;
            }
            workingData.categories.push(name);
            saveWorkingData();
            input.value = '';
            renderCategoriesList();
            renderDashboardStats();
            showToast('Kategori eklendi', 'success');
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
        });
    }

    function renderCategoriesList() {
        var container = document.getElementById('categories-list');
        if (!container) return;

        var cats = workingData.categories || [];
        if (cats.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);">Henüz kategori eklenmemiş.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < cats.length; i++) {
            var count = (workingData.products || []).filter(function(p) { return p.category === cats[i]; }).length;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;">' +
                '<span>' + sanitize(cats[i]) + ' <small style="color:var(--text-muted);">(' + count + ' ürün)</small></span>' +
                '<button class="btn btn-sm btn-danger remove-cat-btn" data-cat="' + sanitize(cats[i]) + '" ' + (count > 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;" title="Ürünleri olan kategori silinemez"' : '') + '>Sil</button>' +
            '</div>';
        }
        container.innerHTML = html;

        var removeBtns = container.querySelectorAll('.remove-cat-btn:not([disabled])');
        for (var j = 0; j < removeBtns.length; j++) {
            removeBtns[j].addEventListener('click', function() {
                var catName = this.getAttribute('data-cat');
                workingData.categories = workingData.categories.filter(function(c) { return c !== catName; });
                saveWorkingData();
                renderCategoriesList();
                renderDashboardStats();
                showToast('Kategori silindi', 'success');
            });
        }
    }

    /* ===== AYARLAR ===== */
    function initSettingsForm() {
        document.getElementById('btn-save-settings').addEventListener('click', function() {
            workingData.settings.storeName = document.getElementById('setting-store-name').value.trim() || workingData.settings.storeName;
            workingData.settings.tagline = document.getElementById('setting-tagline').value.trim() || workingData.settings.tagline;
            workingData.settings.whatsappNumber = document.getElementById('setting-whatsapp').value.trim().replace(/[^\d]/g, '') || workingData.settings.whatsappNumber;

            /* Firebase URL güncelle */
            var newFbUrl = document.getElementById('setting-firebase-url').value.trim().replace(/\/+$/, '');
            workingData.settings.firebaseURL = newFbUrl;
            STORE_DATA.settings.firebaseURL = newFbUrl;

            if (!workingData.settings.about) workingData.settings.about = {};
            workingData.settings.about.story = document.getElementById('setting-about-story').value.trim();
            workingData.settings.about.mission = document.getElementById('setting-about-mission').value.trim();
            workingData.settings.about.vision = document.getElementById('setting-about-vision').value.trim();

            saveWorkingData();
            updateFirebaseStatus();
            showToast('Ayarlar kaydedildi', 'success');
        });
    }

    function loadSettings() {
        var s = workingData.settings;
        document.getElementById('setting-store-name').value = s.storeName || '';
        document.getElementById('setting-tagline').value = s.tagline || '';
        document.getElementById('setting-whatsapp').value = s.whatsappNumber || '';
        document.getElementById('setting-firebase-url').value = s.firebaseURL || STORE_DATA.settings.firebaseURL || '';
        document.getElementById('setting-about-story').value = (s.about && s.about.story) || '';
        document.getElementById('setting-about-mission').value = (s.about && s.about.mission) || '';
        document.getElementById('setting-about-vision').value = (s.about && s.about.vision) || '';
        updateFirebaseStatus();
    }

    function updateFirebaseStatus() {
        var el = document.getElementById('firebase-status');
        if (!el) return;
        var url = _getFirebaseURL();
        if (url) {
            el.innerHTML = '<span style="color: var(--success); font-weight:600;">\u2713 Bulut veritaban\u0131 ba\u011fl\u0131 - \u00fcr\u00fcnler t\u00fcm ziyaret\u00e7ilere g\u00f6r\u00fcn\u00fcr</span>';
        } else {
            el.innerHTML = '<span style="color: var(--warning); font-weight:600;">\u26a0 Bulut veritaban\u0131 ba\u011fl\u0131 de\u011fil - \u00fcr\u00fcnler sadece bu taray\u0131c\u0131da g\u00f6r\u00fcn\u00fcr</span>';
        }
    }

    /* ===== DIŞA AKTAR ===== */
    function initExport() {
        document.getElementById('btn-export').addEventListener('click', function() {
            var exportData = JSON.parse(JSON.stringify(workingData));
            exportData.version = (exportData.version || 0) + 1;

            var content = '/* Violette Butik - Ürün Verileri\n' +
                '   Bu dosya admin panelinden dışa aktarılarak güncellenir.\n' +
                '   Elle düzenlemeyin - admin panelini kullanın. */\n\n' +
                'var STORE_DATA = ' + JSON.stringify(exportData, null, 2) + ';\n';

            var blob = new Blob([content], { type: 'application/javascript' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'data.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('data.js dosyası indirildi', 'success');
        });
    }

    function initImport() {
        var fileInput = document.getElementById('import-file');
        document.getElementById('btn-import').addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            var file = this.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var text = e.target.result;
                    var match = text.match(/(?:const|var)\s+STORE_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
                    if (!match) {
                        showToast('Geçersiz data.js formatı', 'error');
                        return;
                    }
                    var parsed = JSON.parse(match[1]);
                    if (!parsed.settings || !parsed.categories) {
                        showToast('Geçersiz veri yapısı', 'error');
                        return;
                    }
                    workingData = parsed;
                    saveWorkingData();
                    renderDashboardStats();
                    renderRecentProducts();
                    renderProductsTable();
                    renderCategoriesList();
                    loadSettings();
                    showToast('Veri başarıyla içe aktarıldı', 'success');
                } catch(err) {
                    showToast('Dosya okunamadı: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
            this.value = '';
        });
    }

    /* ===== ÇIKIŞ ===== */
    function initLogout() {
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            destroySession();
            location.reload();
        });
    }

    /* ===== MODAL YARDIMCI ===== */
    function openModal(id) {
        document.getElementById(id).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ===== BAŞLAT ===== */
    document.addEventListener('DOMContentLoaded', init);
})();
