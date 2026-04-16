/* ============================================
   VIOLETTE BUTIK - ÜRÜN DETAY MANTIĞI
   ============================================ */

'use strict';

(function() {
    var currentProduct = null;
    var currentQty = 1;

    function loadProduct() {
        var productId = getUrlParam('id');
        if (!productId) {
            showNotFound();
            return;
        }

        currentProduct = findProduct(productId);
        if (!currentProduct) {
            showNotFound();
            return;
        }

        renderProduct();
        renderRelated();
        document.title = currentProduct.name + ' | Violette Butik';
    }

    function showNotFound() {
        document.getElementById('product-detail').style.display = 'none';
        document.getElementById('product-not-found').style.display = 'block';
    }

    function renderProduct() {
        var p = currentProduct;

        document.getElementById('breadcrumb-category').textContent = p.category || 'Ürünler';
        document.getElementById('breadcrumb-name').textContent = p.name;
        document.getElementById('detail-category').textContent = p.category || '';
        document.getElementById('detail-name').textContent = p.name;
        document.getElementById('detail-description').textContent = p.description || '';

        /* Fiyat */
        var priceBlock = document.getElementById('detail-price-block');
        var hasDiscount = p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price;

        if (hasDiscount) {
            priceBlock.innerHTML =
                '<span class="price-current">' + formatPrice(p.discountPrice) + '</span>' +
                '<span class="price-original">' + formatPrice(p.price) + '</span>' +
                '<span class="price-discount-pct">%' + calcDiscount(p.price, p.discountPrice) + ' İndirim</span>';
        } else {
            priceBlock.innerHTML = '<span class="price-current">' + formatPrice(p.price) + '</span>';
        }

        /* Galeri */
        var mainGallery = document.getElementById('gallery-main');
        var thumbsContainer = document.getElementById('gallery-thumbs');

        if (p.images && p.images.length > 0) {
            mainGallery.innerHTML = '<img src="' + sanitize(p.images[0]) + '" alt="' + sanitize(p.name) + '">';

            if (p.images.length > 1) {
                var thumbsHtml = '';
                for (var i = 0; i < p.images.length; i++) {
                    thumbsHtml += '<img src="' + sanitize(p.images[i]) + '" alt="' + sanitize(p.name) + ' ' + (i + 1) + '" class="' + (i === 0 ? 'active' : '') + '" data-index="' + i + '">';
                }
                thumbsContainer.innerHTML = thumbsHtml;

                var thumbs = thumbsContainer.querySelectorAll('img');
                for (var j = 0; j < thumbs.length; j++) {
                    thumbs[j].addEventListener('click', function() {
                        var idx = parseInt(this.getAttribute('data-index'));
                        mainGallery.innerHTML = '<img src="' + sanitize(p.images[idx]) + '" alt="' + sanitize(p.name) + '">';
                        var allThumbs = thumbsContainer.querySelectorAll('img');
                        for (var k = 0; k < allThumbs.length; k++) {
                            allThumbs[k].classList.remove('active');
                        }
                        this.classList.add('active');
                    });
                }
            }
        }
    }

    function renderRelated() {
        var container = document.getElementById('related-products');
        var section = document.getElementById('related-section');
        if (!container || !section) return;

        var related = (STORE_DATA.products || []).filter(function(p) {
            return p.category === currentProduct.category && p.id !== currentProduct.id;
        }).slice(0, 4);

        if (related.length === 0) return;

        section.style.display = 'block';
        var html = '';
        for (var i = 0; i < related.length; i++) {
            html += createProductCard(related[i]);
        }
        container.innerHTML = html;
    }

    function initQuantity() {
        var input = document.getElementById('qty-input');
        var minusBtn = document.getElementById('qty-minus');
        var plusBtn = document.getElementById('qty-plus');

        if (!input || !minusBtn || !plusBtn) return;

        minusBtn.addEventListener('click', function() {
            if (currentQty > 1) {
                currentQty--;
                input.value = currentQty;
            }
        });

        plusBtn.addEventListener('click', function() {
            if (currentQty < 99) {
                currentQty++;
                input.value = currentQty;
            }
        });
    }

    function initAddToCart() {
        var btn = document.getElementById('btn-add-to-cart');
        if (!btn) return;

        btn.addEventListener('click', function() {
            if (!currentProduct) return;
            addToCart(currentProduct.id, currentQty);
        });
    }

    function init() {
        initQuantity();
        initAddToCart();
    }

    document.addEventListener('DOMContentLoaded', init);
    onCloudDataReady(loadProduct);
})();
