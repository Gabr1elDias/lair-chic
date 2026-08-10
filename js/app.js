const App = (() => {
  const BOTTLE_SVG = `<svg class="product-card__placeholder" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="24" width="20" height="36" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M18 24V18h12v6" stroke="currentColor" stroke-width="1.5"/><circle cx="34" cy="16" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M30 16h-2" stroke="currentColor" stroke-width="1.5"/></svg>`;

  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    els.productsGrid = $("productsGrid");
    els.emptyState = $("emptyState");
    els.filterMarca = $("filterMarca");
    els.filterGenero = $("filterGenero");
    els.filterLinha = $("filterLinha");
    els.filterFamilia = $("filterFamilia");
    els.filterClear = $("filterClear");
    els.carouselTrack = $("carouselTrack");
    els.carouselDots = $("carouselDots");
    els.carouselPrev = $("carouselPrev");
    els.carouselNext = $("carouselNext");
    els.carouselCounter = $("carouselCounter");
    els.productModal = $("productModal");
    els.productModalContent = $("productModalContent");
    els.productModalClose = $("productModalClose");
    els.cartBtn = $("cartBtn");
    els.cartCount = $("cartCount");
    els.cartOverlay = $("cartOverlay");
    els.cartDrawer = $("cartDrawer");
    els.cartClose = $("cartClose");
    els.cartList = $("cartList");
    els.cartEmpty = $("cartEmpty");
    els.cartForm = $("cartForm");
    els.cartTotal = $("cartTotal");
    els.customerName = $("customerName");
    els.customerObs = $("customerObs");
    els.submitOrder = $("submitOrder");
    els.successModal = $("successModal");
    els.successClose = $("successClose");
    els.year = $("year");
  }

  function productImage(product, className = "") {
    if (product.imagem) {
      return `<img src="${product.imagem}" alt="${product.nome}" class="${className}" loading="lazy">`;
    }
    return BOTTLE_SVG;
  }

  function renderCarousel() {
    carouselSlides = [
      {
        image: "assets/Fotos%20Masculino/Brand_M_001.png",
        badge: "Novidade",
        title: "Coleção Privée",
        subtitle: "Perfumes com presença e sofisticação",
        price: "Decants premium",
      },
      {
        image: "assets/Fotos%20Masculino/Brand_M_005.png",
        badge: "Destaque",
        title: "Essência em 25ml",
        subtitle: "Seleção elegante para todos os dias",
        price: "Pronta entrega",
      },
      {
        image: "assets/carrossel1.jpg",
        badge: "Elite",
        title: "Linha Exclusiva",
        subtitle: "Estilo e sofisticação em cada detalhe",
        price: "Edição limitada",
      },
      {
        image: "assets/carrossel2.jpg",
        badge: "Clássico",
        title: "Presença Intemporal",
        subtitle: "Fragrâncias que marcam a coleção",
        price: "Disponível agora",
      },
    ];

    els.carouselTrack.innerHTML = carouselSlides
      .map((slide, i) => `
        <div class="carousel__slide" data-index="${i}">
          <img src="${slide.image}" alt="${slide.title}" class="carousel__image">
          <div class="carousel__slide-content">
            <span class="carousel__badge">${slide.badge}</span>
            <h2 class="carousel__title">${slide.title}</h2>
            <p class="carousel__subtitle">${slide.subtitle}</p>
            <p class="carousel__price">${slide.price}</p>
          </div>
        </div>`)
      .join("");

    els.carouselDots.innerHTML = carouselSlides
      .map((_, i) => `<button class="carousel__dot${i === 0 ? " carousel__dot--active" : ""}" data-dot="${i}" aria-label="Slide ${i + 1}"></button>`)
      .join("");

    carouselIndex = 0;
    updateCarousel();
    startCarouselAuto();
  }

  function updateCarousel() {
    els.carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
    els.carouselDots.querySelectorAll(".carousel__dot").forEach((dot, i) => {
      dot.classList.toggle("carousel__dot--active", i === carouselIndex);
    });
    if (els.carouselCounter) {
      els.carouselCounter.textContent = `${String(carouselIndex + 1).padStart(2, "0")} / ${String(carouselSlides.length).padStart(2, "0")}`;
    }
  }

  function startCarouselAuto() {
    clearInterval(carouselTimer);
    if (carouselSlides.length <= 1) return;
    carouselTimer = setInterval(() => {
      carouselIndex = (carouselIndex + 1) % carouselSlides.length;
      updateCarousel();
    }, 5000);
  }

  function populateBrandFilter() {
    const brands = Products.getBrands();
    brands.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      els.filterMarca.appendChild(opt);
    });
  }

  function getFilters() {
    return {
      marca: els.filterMarca.value,
      genero: els.filterGenero.value,
      linha: els.filterLinha.value,
      familia: els.filterFamilia.value,
    };
  }

  function renderProducts() {
    const filtered = Products.filter(getFilters());
    els.emptyState.hidden = filtered.length > 0;
    els.productsGrid.innerHTML = filtered.map(renderProductCard).join("");
  }

  function renderProductCard(p) {
    const out = Products.isOutOfStock(p);
    const isBestSeller = Number(p.id) <= 4;
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-card__image">
          ${productImage(p)}
          ${isBestSeller ? '<span class="product-card__badge product-card__badge--best">Best seller</span>' : ""}
          ${out ? '<span class="product-card__badge product-card__badge--out">Esgotado</span>' : ""}
        </div>
        <div class="product-card__body">
          <span class="product-card__brand">${p.marca}</span>
          <h3 class="product-card__name">${p.nome}</h3>
          <span class="product-card__volume">${CONFIG.VOLUME}</span>
          <div class="product-card__footer">
            <span class="product-card__price">${Products.formatPrice(p.preco)}</span>
            <button class="product-card__add" data-add="${p.id}" aria-label="Adicionar ao carrinho">+</button>
          </div>
        </div>
      </article>`;
  }

  function openProductModal(id) {
    const p = Products.getById(id);
    if (!p) return;

    const out = Products.isOutOfStock(p);
    els.productModalContent.innerHTML = `
      <div class="modal-product">
        ${p.imagem ? `<div style="aspect-ratio:1;background:var(--cream);margin:-2rem -2rem 1.5rem;display:flex;align-items:center;justify-content:center;">${productImage(p)}</div>` : ""}
        <span class="modal-product__brand">${p.marca}</span>
        <h2 class="modal-product__name" id="modalTitle">${p.nome}</h2>
        <div class="modal-product__tags">
          <span class="modal-product__tag">${p.genero}</span>
          <span class="modal-product__tag">${p.linha}</span>
          <span class="modal-product__tag">${p.familia}</span>
          <span class="modal-product__tag">${CONFIG.VOLUME}</span>
        </div>
        <p class="modal-product__desc">${p.descricao || "Descrição em breve."}</p>
        <p class="modal-product__stock${out ? " modal-product__stock--out" : ""}">
          ${out ? "Esgotado" : `${p.estoque} unidade${p.estoque !== 1 ? "s" : ""} em estoque`}
        </p>
        <div class="modal-product__price-row">
          <span class="modal-product__price">${Products.formatPrice(p.preco)}</span>
          <button class="btn btn--primary" data-modal-add="${p.id}">Adicionar ao carrinho</button>
        </div>
      </div>`;

    els.productModal.hidden = false;
    requestAnimationFrame(() => {
      els.productModal.classList.add("is-open");
    });
    document.body.style.overflow = "hidden";
  }

  function closeProductModal() {
    if (els.productModal.hidden) return;

    els.productModal.classList.remove("is-open");
    window.setTimeout(() => {
      els.productModal.hidden = true;
      document.body.style.overflow = "";
    }, 240);
  }

  function openCart() {
    els.cartOverlay.hidden = false;
    els.cartDrawer.classList.add("drawer--open");
    document.body.style.overflow = "hidden";
    renderCart();
  }

  function closeCart() {
    els.cartOverlay.hidden = true;
    els.cartDrawer.classList.remove("drawer--open");
    document.body.style.overflow = "";
  }

  function renderCart() {
    const items = Cart.getItems();
    const count = Cart.getCount();

    els.cartCount.textContent = count;
    els.cartCount.dataset.count = count;

    if (items.length === 0) {
      els.cartList.innerHTML = "";
      els.cartEmpty.hidden = false;
      els.cartForm.hidden = true;
      return;
    }

    els.cartEmpty.hidden = true;
    els.cartForm.hidden = false;
    els.cartTotal.textContent = Products.formatPrice(Cart.getTotal());

    els.cartList.innerHTML = items
      .map(
        (i) => `
        <li class="cart-item">
          <div class="cart-item__info">
            <p class="cart-item__name">${i.nome}</p>
            <p class="cart-item__price">${Products.formatPrice(i.preco)} cada</p>
            <div class="cart-item__qty">
              <button type="button" data-qty-minus="${i.id}" aria-label="Diminuir">−</button>
              <span>${i.qty}</span>
              <button type="button" data-qty-plus="${i.id}" aria-label="Aumentar">+</button>
            </div>
            <button class="cart-item__remove" type="button" data-remove="${i.id}">Remover</button>
          </div>
        </li>`
      )
      .join("");
  }

  function openWhatsApp(name, observation) {
    const msg = encodeURIComponent(Cart.buildWhatsAppMessage(name, observation));
    window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  async function handleSubmitOrder() {
    const name = els.customerName.value.trim();
    const observation = els.customerObs.value.trim();

    if (!name) {
      els.customerName.focus();
      els.customerName.setAttribute("aria-invalid", "true");
      return;
    }

    if (Cart.getCount() === 0) return;

    els.submitOrder.disabled = true;
    els.submitOrder.textContent = "Enviando…";

    try {
      openWhatsApp(name, observation);
      Cart.clear();
      closeCart();
      els.customerName.value = "";
      els.customerObs.value = "";
      els.successModal.hidden = false;
    } catch (err) {
      console.error(err);
      alert("Não foi possível abrir o WhatsApp. Tente novamente.");
    } finally {
      els.submitOrder.disabled = false;
      els.submitOrder.textContent = "Enviar pedido";
    }
  }

  function bindEvents() {
    [els.filterMarca, els.filterGenero, els.filterLinha, els.filterFamilia].forEach((el) => {
      el.addEventListener("change", renderProducts);
    });

    els.filterClear.addEventListener("click", () => {
      els.filterMarca.value = "";
      els.filterGenero.value = "";
      els.filterLinha.value = "";
      els.filterFamilia.value = "";
      renderProducts();
    });

    els.productsGrid.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        e.stopPropagation();
        const p = Products.getById(addBtn.dataset.add);
        if (p) Cart.add(p);
        return;
      }
      const card = e.target.closest(".product-card");
      if (card) openProductModal(card.dataset.id);
    });

    els.carouselTrack.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-carousel-add]");
      if (addBtn) openProductModal(addBtn.dataset.carouselAdd);
    });

    els.carouselPrev.addEventListener("click", () => {
      carouselIndex = (carouselIndex - 1 + carouselSlides.length) % carouselSlides.length;
      updateCarousel();
      startCarouselAuto();
    });

    els.carouselNext.addEventListener("click", () => {
      carouselIndex = (carouselIndex + 1) % carouselSlides.length;
      updateCarousel();
      startCarouselAuto();
    });

    els.carouselDots.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-dot]");
      if (!dot) return;
      carouselIndex = parseInt(dot.dataset.dot, 10);
      updateCarousel();
      startCarouselAuto();
    });

    els.productModalClose.addEventListener("click", closeProductModal);
    els.productModal.addEventListener("click", (e) => {
      if (e.target === els.productModal) closeProductModal();
    });

    els.productModalContent.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-modal-add]");
      if (btn) {
        const p = Products.getById(btn.dataset.modalAdd);
        if (p) Cart.add(p);
      }
    });

    els.cartBtn.addEventListener("click", openCart);
    els.cartClose.addEventListener("click", closeCart);
    els.cartOverlay.addEventListener("click", closeCart);

    els.cartList.addEventListener("click", (e) => {
      if (e.target.dataset.qtyPlus) Cart.updateQty(e.target.dataset.qtyPlus, 1);
      if (e.target.dataset.qtyMinus) Cart.updateQty(e.target.dataset.qtyMinus, -1);
      if (e.target.dataset.remove) Cart.remove(e.target.dataset.remove);
    });

    els.submitOrder.addEventListener("click", handleSubmitOrder);

    els.successClose.addEventListener("click", () => {
      els.successModal.hidden = true;
    });

    els.successModal.addEventListener("click", (e) => {
      if (e.target === els.successModal) els.successModal.hidden = true;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeProductModal();
        closeCart();
        els.successModal.hidden = true;
      }
    });
  }

  async function init() {
    initElements();
    els.year.textContent = new Date().getFullYear();
    Cart.load();
    Cart.onChange(renderCart);
    renderCart();

    await Products.load();
    populateBrandFilter();
    renderCarousel();
    renderProducts();
    bindEvents();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
