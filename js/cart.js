/* ============================================
   VIOLETTE BUTIK - SEPET SAYFA MANTIĞI
   WhatsApp Sipariş Entegrasyonu
   ============================================ */

'use strict';

(function() {
    function renderCart() {
        var cart = getCart();
        var emptyEl = document.getElementById('cart-empty');
        var layoutEl = document.getElementById('cart-layout');
        var itemsEl = document.getElementById('cart-items');

        if (!emptyEl || !layoutEl || !itemsEl) return;

        /* Sepetteki geçersiz ürünleri temizle */
        var validCart = [];
        for (var i = 0; i < cart.length; i++) {
            if (findProduct(cart[i].id)) {
                validCart.push(cart[i]);
            }
        }
        if (validCart.length !== cart.length) {
            saveCart(validCart);
            cart = validCart;
        }

        if (cart.length === 0) {
            emptyEl.style.display = 'block';
            layoutEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        layoutEl.style.display = '';

        var html = '';
        for (var j = 0; j < cart.length; j++) {
            var item = cart[j];
            var product = findProduct(item.id);
            if (!product) continue;

            var price = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
                ? product.discountPrice : product.price;
            var lineTotal = price * item.qty;

            var imgHtml = '';
            if (product.images && product.images.length > 0) {
                imgHtml = '<img src="' + sanitize(product.images[0]) + '" alt="' + sanitize(product.name) + '">';
            } else {
                imgHtml = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-alt);font-size:1.5rem;">🛍️</div>';
            }

            html += '<div class="cart-item" data-id="' + sanitize(product.id) + '">' +
                '<div class="cart-item-img">' + imgHtml + '</div>' +
                '<div class="cart-item-details">' +
                    '<h4>' + sanitize(product.name) + '</h4>' +
                    '<div class="item-category">' + sanitize(product.category) + '</div>' +
                    '<div class="item-price">' + formatPrice(price) + '</div>' +
                '</div>' +
                '<div class="cart-item-actions">' +
                    '<button class="cart-item-remove" data-id="' + sanitize(product.id) + '" title="Kaldır">✕ Kaldır</button>' +
                    '<div class="quantity-selector">' +
                        '<button type="button" class="cart-qty-btn" data-id="' + sanitize(product.id) + '" data-action="minus">−</button>' +
                        '<input type="number" value="' + item.qty + '" min="1" max="99" readonly class="cart-qty-input" data-id="' + sanitize(product.id) + '">' +
                        '<button type="button" class="cart-qty-btn" data-id="' + sanitize(product.id) + '" data-action="plus">+</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        itemsEl.innerHTML = html;
        updateSummary();
        bindCartEvents();
    }

    function updateSummary() {
        var total = getCartTotal();
        var subtotalEl = document.getElementById('summary-subtotal');
        var totalEl = document.getElementById('summary-total');
        if (subtotalEl) subtotalEl.textContent = formatPrice(total);
        if (totalEl) totalEl.textContent = formatPrice(total);
    }

    function bindCartEvents() {
        /* Kaldır butonları */
        var removeBtns = document.querySelectorAll('.cart-item-remove');
        for (var i = 0; i < removeBtns.length; i++) {
            removeBtns[i].addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                removeFromCart(id);
                renderCart();
                showToast('Ürün sepetten kaldırıldı', 'success');
            });
        }

        /* Miktar butonları */
        var qtyBtns = document.querySelectorAll('.cart-qty-btn');
        for (var j = 0; j < qtyBtns.length; j++) {
            qtyBtns[j].addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var action = this.getAttribute('data-action');
                var input = document.querySelector('.cart-qty-input[data-id="' + id + '"]');
                var current = parseInt(input.value) || 1;

                if (action === 'minus') {
                    if (current <= 1) {
                        removeFromCart(id);
                        renderCart();
                        showToast('Ürün sepetten kaldırıldı', 'success');
                        return;
                    }
                    current--;
                } else {
                    if (current >= 99) return;
                    current++;
                }

                input.value = current;
                updateCartItemQty(id, current);
                updateSummary();
                updateCartBadge();
            });
        }
    }

    /* ===== ADRES MODAL ===== */
    function initCheckout() {
        var checkoutBtn = document.getElementById('btn-checkout');
        var modal = document.getElementById('address-modal');
        var closeBtn = document.getElementById('close-address-modal');
        var form = document.getElementById('address-form');

        if (!checkoutBtn || !modal || !form) return;

        checkoutBtn.addEventListener('click', function() {
            var cart = getCart();
            if (cart.length === 0) {
                showToast('Sepetiniz boş', 'error');
                return;
            }
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            var name = document.getElementById('addr-name').value.trim();
            var phone = document.getElementById('addr-phone').value.trim();
            var city = document.getElementById('addr-city').value.trim();
            var district = document.getElementById('addr-district').value.trim();
            var detail = document.getElementById('addr-detail').value.trim();
            var note = document.getElementById('addr-note').value.trim();

            /* Doğrulama */
            if (!name || !phone || !city || !district || !detail) {
                showToast('Lütfen zorunlu alanları doldurun', 'error');
                return;
            }

            if (name.length < 3) {
                showToast('Lütfen geçerli bir ad soyad girin', 'error');
                return;
            }

            var phoneClean = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
            if (phoneClean.length < 10) {
                showToast('Lütfen geçerli bir telefon numarası girin', 'error');
                return;
            }

            /* WhatsApp mesajı oluştur */
            var message = buildWhatsAppMessage(name, phone, city, district, detail, note);
            var whatsappUrl = 'https://wa.me/' + STORE_DATA.settings.whatsappNumber + '?text=' + encodeURIComponent(message);

            window.open(whatsappUrl, '_blank');
            closeModal();
        });
    }

    function buildWhatsAppMessage(name, phone, city, district, detail, note) {
        var cart = getCart();
        var lines = [];

        lines.push('🛍️ *VIOLETTE BUTIK - YENİ SİPARİŞ*');
        lines.push('');
        lines.push('📦 *Ürünler:*');

        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            var product = findProduct(cart[i].id);
            if (!product) continue;
            var price = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
                ? product.discountPrice : product.price;
            var lineTotal = price * cart[i].qty;
            total += lineTotal;

            lines.push((i + 1) + '. ' + product.name + ' x' + cart[i].qty + ' — ' + formatPrice(lineTotal));
        }

        lines.push('');
        lines.push('💰 *Toplam:* ' + formatPrice(total));
        lines.push('');
        lines.push('👤 *Müşteri:* ' + name);
        lines.push('📱 *Telefon:* ' + phone);
        lines.push('');
        lines.push('📍 *Teslimat Adresi:*');
        lines.push(detail);
        lines.push(district + ' / ' + city);

        if (note) {
            lines.push('');
            lines.push('📝 *Not:* ' + note);
        }

        lines.push('');
        lines.push('---');
        lines.push('_Bu sipariş Violette Butik web sitesinden oluşturulmuştur._');

        return lines.join('\n');
    }

    document.addEventListener('DOMContentLoaded', function() {
        initCheckout();
    });
    onCloudDataReady(renderCart);
})();
