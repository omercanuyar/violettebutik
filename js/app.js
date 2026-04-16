/* ============================================
   VIOLETTE BUTIK - ANA SAYFA MANTIĞI
   ============================================ */

'use strict';

(function() {
    var categoryIcons = {
        'Elbise': '👗',
        'Bluz & Gömlek': '👚',
        'Etek': '👘',
        'Pantolon': '👖',
        'Dış Giyim': '🧥',
        'Çanta': '👜',
        'Aksesuar': '💍'
    };

    function getProductsByCategory(category) {
        if (!STORE_DATA.products) return [];
        return STORE_DATA.products.filter(function(p) { return p.category === category; });
    }

    function renderCategories() {
        var container = document.getElementById('categories-container');
        if (!container) return;

        var categories = STORE_DATA.categories || [];
        var html = '';

        for (var i = 0; i < categories.length; i++) {
            var cat = categories[i];
            var count = getProductsByCategory(cat).length;
            var icon = categoryIcons[cat] || '🏷️';
            html += '<div class="category-card" onclick="filterByCategory(\'' + sanitize(cat) + '\')">' +
                '<span class="cat-icon">' + icon + '</span>' +
                '<div class="cat-name">' + sanitize(cat) + '</div>' +
                '<div class="cat-count">' + count + ' ürün</div>' +
            '</div>';
        }

        container.innerHTML = html;
    }

    function renderNewProducts() {
        var container = document.getElementById('new-products-container');
        var emptyState = document.getElementById('new-products-empty');
        if (!container) return;

        var products = (STORE_DATA.products || []).filter(function(p) { return p.isNew; });

        if (products.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        var html = '';
        for (var i = 0; i < products.length; i++) {
            html += createProductCard(products[i]);
        }
        container.innerHTML = html;
    }

    function renderBestSellers() {
        var container = document.getElementById('bestseller-products-container');
        var emptyState = document.getElementById('bestseller-products-empty');
        if (!container) return;

        var products = (STORE_DATA.products || []).filter(function(p) { return p.isBestSeller; });

        if (products.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        var html = '';
        for (var i = 0; i < products.length; i++) {
            html += createProductCard(products[i]);
        }
        container.innerHTML = html;
    }

    function renderAllProducts(filterCat) {
        var container = document.getElementById('all-products-container');
        var emptyState = document.getElementById('all-products-empty');
        var filterBar = document.getElementById('filter-bar');
        if (!container) return;

        var products = STORE_DATA.products || [];

        if (products.length > 0 && filterBar) {
            filterBar.style.display = 'block';
        }

        if (filterCat) {
            products = products.filter(function(p) { return p.category === filterCat; });
        }

        if (products.length === 0 && !(STORE_DATA.products || []).length) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        if (products.length === 0 && filterCat) {
            container.innerHTML = '<div class="empty-state"><h3>Bu kategoride ürün bulunamadı</h3></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < products.length; i++) {
            html += createProductCard(products[i]);
        }
        container.innerHTML = html;
    }

    function populateCategoryFilter() {
        var select = document.getElementById('category-filter');
        if (!select) return;

        var categories = STORE_DATA.categories || [];
        for (var i = 0; i < categories.length; i++) {
            var opt = document.createElement('option');
            opt.value = categories[i];
            opt.textContent = categories[i];
            select.appendChild(opt);
        }

        select.addEventListener('change', function() {
            renderAllProducts(this.value || null);
        });
    }

    window.filterByCategory = function(cat) {
        var select = document.getElementById('category-filter');
        if (select) select.value = cat;
        renderAllProducts(cat);

        var target = document.getElementById('tum-urunler');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    function renderAll() {
        renderCategories();
        renderNewProducts();
        renderBestSellers();
        renderAllProducts();
        populateCategoryFilter();
        initScrollAnimation();
    }

    onCloudDataReady(renderAll);
})();
