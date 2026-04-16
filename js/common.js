/* ============================================
   VIOLETTE BUTIK - ORTAK FONKSİYONLAR
   ============================================ */

'use strict';

/* ===== GÜVENLİK: XSS TEMİZLEME ===== */
function sanitize(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ===== FİYAT FORMATLAMA ===== */
function formatPrice(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0,00 ₺';
    return amount.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ₺';
}

/* ===== İNDİRİM YÜZDE HESAPLAMA ===== */
function calcDiscount(original, discounted) {
    if (!original || !discounted || discounted >= original) return 0;
    return Math.round(((original - discounted) / original) * 100);
}

/* ===== ÜRÜN BULMA ===== */
function findProduct(id) {
    if (!window.STORE_DATA || !STORE_DATA.products) return null;
    return STORE_DATA.products.find(function(p) { return p.id === id; }) || null;
}

/* ===== SEPET İŞLEMLERİ ===== */
var CART_KEY = 'violette_cart';

function getCart() {
    try {
        var data = localStorage.getItem(CART_KEY);
        if (!data) return [];
        var cart = JSON.parse(data);
        if (!Array.isArray(cart)) return [];
        return cart.filter(function(item) {
            return item && typeof item.id === 'string' && typeof item.qty === 'number' && item.qty > 0;
        });
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error('Sepet kaydedilemedi');
    }
    updateCartBadge();
}

function addToCart(productId, quantity) {
    quantity = parseInt(quantity) || 1;
    if (quantity < 1) quantity = 1;
    var product = findProduct(productId);
    if (!product) return false;

    var cart = getCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === productId) {
            existing = cart[i];
            break;
        }
    }

    if (existing) {
        existing.qty += quantity;
    } else {
        cart.push({ id: productId, qty: quantity });
    }

    saveCart(cart);
    showToast('Ürün sepete eklendi', 'success');
    animateCartIcon();
    return true;
}

function removeFromCart(productId) {
    var cart = getCart().filter(function(item) { return item.id !== productId; });
    saveCart(cart);
}

function updateCartItemQty(productId, qty) {
    qty = parseInt(qty) || 0;
    if (qty < 1) {
        removeFromCart(productId);
        return;
    }
    var cart = getCart();
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === productId) {
            cart[i].qty = qty;
            break;
        }
    }
    saveCart(cart);
}

function getCartCount() {
    var cart = getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
        count += cart[i].qty;
    }
    return count;
}

function getCartTotal() {
    var cart = getCart();
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        var product = findProduct(cart[i].id);
        if (product) {
            var price = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
                ? product.discountPrice : product.price;
            total += price * cart[i].qty;
        }
    }
    return total;
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
}

/* ===== SEPET BADGE GÜNCELLEME ===== */
function updateCartBadge() {
    var badges = document.querySelectorAll('.cart-badge');
    var count = getCartCount();
    for (var i = 0; i < badges.length; i++) {
        badges[i].textContent = count > 0 ? count : '';
        badges[i].setAttribute('data-count', count);
    }
}

/* ===== SEPET İKON ANİMASYONU ===== */
function animateCartIcon() {
    var btns = document.querySelectorAll('.cart-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.add('cart-bounce');
        (function(btn) {
            setTimeout(function() { btn.classList.remove('cart-bounce'); }, 300);
        })(btns[i]);
    }
}

/* ===== TOAST BİLDİRİM ===== */
function showToast(message, type) {
    type = type || 'success';
    var container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.textContent = icon + '  ' + message;

    container.appendChild(toast);

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            toast.classList.add('show');
        });
    });

    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3000);
}

/* ===== HEADER SCROLL EFEKT ===== */
function initHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;
    var onScroll = function() {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ===== MOBİL MENÜ ===== */
function initMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var mobileNav = document.querySelector('.mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.addEventListener('click', function(e) {
        if (e.target === mobileNav) {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    var links = mobileNav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function() {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

/* ===== ÜRÜN KART HTML OLUŞTURMA ===== */
function createProductCard(product) {
    if (!product) return '';

    var imageHtml = '';
    if (product.images && product.images.length > 0) {
        imageHtml = '<img src="' + sanitize(product.images[0]) + '" alt="' + sanitize(product.name) + '" loading="lazy">';
    } else {
        imageHtml = '<div class="placeholder-img">🛍️</div>';
    }

    var badgesHtml = '<div class="product-badges">';
    if (product.isNew) badgesHtml += '<span class="badge badge-new">Yeni</span>';
    if (product.isBestSeller) badgesHtml += '<span class="badge badge-bestseller">Çok Satan</span>';
    if (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) {
        badgesHtml += '<span class="badge badge-sale">%' + calcDiscount(product.price, product.discountPrice) + '</span>';
    }
    badgesHtml += '</div>';

    var priceHtml = '';
    if (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price) {
        priceHtml = '<div class="product-card-price">' +
            '<span class="price-current">' + formatPrice(product.discountPrice) + '</span>' +
            '<span class="price-original">' + formatPrice(product.price) + '</span>' +
            '</div>';
    } else {
        priceHtml = '<div class="product-card-price">' +
            '<span class="price-current">' + formatPrice(product.price) + '</span>' +
            '</div>';
    }

    var productUrl = 'urun.html?id=' + encodeURIComponent(product.id);

    return '<div class="product-card animate-in">' +
        '<div class="product-card-image" onclick="location.href=\'' + productUrl + '\'" style="cursor:pointer">' +
            imageHtml +
            badgesHtml +
            '<button class="product-card-quick" onclick="addToCart(\'' + sanitize(product.id) + '\', 1); event.stopPropagation();">Sepete Ekle</button>' +
        '</div>' +
        '<a href="' + productUrl + '" class="product-card-info" style="display:block">' +
            '<div class="product-card-category">' + sanitize(product.category) + '</div>' +
            '<h4 class="product-card-name">' + sanitize(product.name) + '</h4>' +
            priceHtml +
        '</a>' +
    '</div>';
}

/* ===== SVG İKONLAR ===== */
var ICONS = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    emptyCart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="m1 1 4 0 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="10" y1="11" x2="16" y2="11"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
};

/* ===== URL PARAMETRE OKUMA ===== */
function getUrlParam(key) {
    var params = new URLSearchParams(window.location.search);
    return params.get(key);
}

/* ===== SCROLL ANİMASYON ===== */
function initScrollAnimation() {
    var elements = document.querySelectorAll('.animate-in');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = (entry.target.dataset.delay || '0') + 's';
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    for (var i = 0; i < elements.length; i++) {
        observer.observe(elements[i]);
    }
}

/* ===== SAYFA BAŞLATMA ===== */
function initCommon() {
    initHeaderScroll();
    initMobileMenu();
    updateCartBadge();
}

document.addEventListener('DOMContentLoaded', initCommon);
