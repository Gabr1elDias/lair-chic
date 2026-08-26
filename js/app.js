const App = (() => {
  const BOTTLE_SVG = `<svg class="product-card__placeholder" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="24" width="20" height="36" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M18 24V18h12v6" stroke="currentColor" stroke-width="1.5"/><circle cx="34" cy="16" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M30 16h-2" stroke="currentColor" stroke-width="1.5"/></svg>`;

  let carouselIndex = 0;
  let carouselSlides = [];
  let carouselTimer = null;
  let toastTimer = null;

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
    els.searchInput = $("searchInput");
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
    els.successStockNote = $("successStockNote");
    els.cartToast = $("cartToast");
    els.year = $("year");
    // Filter drawer (mobile)
    els.filterToggle = $("filterToggle");
    els.filterOverlay = $("filterOverlay");
    els.filterDrawer = $("filterDrawer");
    els.filterDrawerClose = $("filterDrawerClose");
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
      busca: els.searchInput ? els.searchInput.value.trim() : "",
    };
  }

  function renderProducts() {
    const filtered = Products.filter(getFilters());
    els.emptyState.hidden = filtered.length > 0;
    els.productsGrid.innerHTML = filtered.map(renderProductCard).join("");
  }

  function renderProductCard(p) {
    const out = Products.isOutOfStock(p);
    const isBestSeller = p.destaque; // usa o campo "destaque" = BEST SELLER
    const isNovidade = p.novidade;
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-card__image">
          ${productImage(p)}
          ${isBestSeller ? '<span class="product-card__badge product-card__badge--best">Best seller</span>' : ""}
          ${isNovidade ? '<span class="product-card__badge product-card__badge--new">Novidade</span>' : ""}
          ${out ? '<span class="product-card__badge product-card__badge--out">Esgotado</span>' : ""}
        </div>
        <div class="product-card__body">
          <span class="product-card__brand">${p.marca}</span>
          <h3 class="product-card__name">${p.nome}</h3>
          <span class="product-card__volume">${p.volume || CONFIG.DEFAULT_VOLUME || "25ml"}</span>
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
        <div class="modal-product__badges">
          ${p.destaque ? '<span class="modal-product__badge modal-product__badge--best">Best seller</span>' : ""}
          ${p.novidade ? '<span class="modal-product__badge modal-product__badge--new">Novidade</span>' : ""}
        </div>
        <div class="modal-product__tags">
          <span class="modal-product__tag">${p.genero}</span>
          <span class="modal-product__tag">${p.linha}</span>
          <span class="modal-product__tag">${p.familia}</span>
          <span class="modal-product__tag">${p.volume || CONFIG.DEFAULT_VOLUME || "25ml"}</span>
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

  // Filter drawer (mobile)
  function openFilterDrawer() {
    els.filterOverlay.hidden = false;
    els.filterDrawer.hidden = false;
    document.body.style.overflow = "hidden";
    els.filterToggle.setAttribute("aria-expanded", "true");
  }

  function closeFilterDrawer() {
    els.filterOverlay.hidden = true;
    els.filterDrawer.hidden = true;
    document.body.style.overflow = "";
    els.filterToggle.setAttribute("aria-expanded", "false");
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
      .map((i) => {
        const p = Products.getById(i.id);
        const src = (p && p.imagem) || i.imagem || "";
        const thumb = src
          ? `<img src="${src}" alt="${i.nome}" class="cart-item__img" loading="lazy">`
          : BOTTLE_SVG;
        return `
        <li class="cart-item">
          <div class="cart-item__thumb">${thumb}</div>
          <div class="cart-item__info">
            <p class="cart-item__name">${i.nome}</p>
            ${i.volume ? `<p class="cart-item__volume">${i.volume}</p>` : ''}
            <p class="cart-item__price">${Products.formatPrice(i.preco)} cada</p>
            <div class="cart-item__qty">
              <button type="button" data-qty-minus="${i.id}" aria-label="Diminuir">−</button>
              <span>${i.qty}</span>
              <button type="button" data-qty-plus="${i.id}" aria-label="Aumentar">+</button>
            </div>
            <button class="cart-item__remove" type="button" data-remove="${i.id}">Remover</button>
          </div>
        </li>`;
      })
      .join("");
  }

  function openWhatsApp(name, observation) {
    const msg = encodeURIComponent(Cart.buildWhatsAppMessage(name, observation));
    window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  function animateAddToCart(name) {
    // Bump no ícone do carrinho no header
    els.cartBtn.classList.remove("is-bumping");
    void els.cartBtn.offsetWidth; // reinicia a animação
    els.cartBtn.classList.add("is-bumping");

    // Toast "adicionado ao carrinho"
    if (!els.cartToast) return;
    els.cartToast.textContent = `✓ ${name} adicionado ao carrinho`;
    els.cartToast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.cartToast.classList.remove("is-visible");
    }, 2000);
  }

  /**
   * Baixa o estoque na planilha e registra a venda automaticamente
   * na aba "Financeiro" (nome do cliente + itens + valor).
   * Devolve { ok } com o motivo se falhar.
   */
  async function updateStockAfterOrder(cliente) {
    const items = Cart.getItems();
    if (!items.length) return { ok: true };

    if (!CONFIG.ADMIN_API_URL) {
      console.warn("ADMIN_API_URL não configurado — estoque não atualizado automaticamente.");
      return { ok: false, reason: "not-configured" };
    }

    try {
      const res = await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        // ⚠️ text/plain (não application/json): evita o preflight OPTIONS,
        // que o Google Apps Script não responde e bloquearia a chamada (CORS).
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "decrementStock",
          // cliente + nome/preco de cada item: usados pela API para gravar a
          // venda automaticamente na aba "Financeiro" do painel admin.
          cliente: cliente || "",
          items: items.map((i) => ({
            id: i.id,
            qty: i.qty,
            nome: i.nome,
            preco: i.preco,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data || !data.ok) {
        console.warn("Falha ao atualizar estoque na planilha:", data);
        return { ok: false, reason: "api-error" };
      }
      // Estoque atualizado na planilha: reflete no site sem recarregar
      items.forEach((i) => {
        const p = Products.getById(i.id);
        if (p) p.estoque = Math.max(0, (p.estoque || 0) - i.qty);
      });
      renderProducts();
      return { ok: true };
    } catch (err) {
      console.error("Erro ao atualizar estoque:", err);
      return { ok: false, reason: "network" };
    }
  }

  function showStockNote(result) {
    const note = els.successStockNote;
    if (!note) return;
    if (result && result.ok) {
      note.hidden = true;
      return;
    }
    const reason = (result && result.reason) || "network";
    note.hidden = false;
    note.textContent =
      reason === "not-configured"
        ? "⚠️ Estoque não foi atualizado automaticamente: a conexão com a planilha (ADMIN_API_URL) ainda não está configurada. Veja SETUP.txt, seção 6."
        : "⚠️ Não foi possível atualizar o estoque na planilha automaticamente. Ajuste o estoque manualmente.";
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
      const stock = await updateStockAfterOrder(name);
      Cart.clear();
      closeCart();
      els.customerName.value = "";
      els.customerObs.value = "";
      showStockNote(stock);
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

    if (els.searchInput) {
      els.searchInput.addEventListener("input", renderProducts);
    }

    els.filterClear.addEventListener("click", () => {
      els.filterMarca.value = "";
      els.filterGenero.value = "";
      els.filterLinha.value = "";
      els.filterFamilia.value = "";
      if (els.searchInput) els.searchInput.value = "";
      renderProducts();
    });

    els.productsGrid.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        e.stopPropagation();
        const p = Products.getById(addBtn.dataset.add);
        if (p) {
          Cart.add(p);
          animateAddToCart(p.nome);
        }
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
        if (p) {
          Cart.add(p);
          animateAddToCart(p.nome);
        }
      }
    });

    els.cartBtn.addEventListener("click", openCart);
    els.cartClose.addEventListener("click", closeCart);
    els.cartOverlay.addEventListener("click", closeCart);

    // Filter drawer (mobile)
    els.filterToggle.addEventListener("click", openFilterDrawer);
    els.filterOverlay.addEventListener("click", closeFilterDrawer);
    els.filterDrawerClose.addEventListener("click", closeFilterDrawer);

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
        closeFilterDrawer();
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

    // Polling automático: recarrega produtos da planilha a cada 60s
    // para refletir alterações do admin (BEST SELLER, Novidade, volume, etc.) sem refresh manual
    setInterval(async () => {
      try {
        const oldProducts = [...Products.getAll()];
        await Products.load();
        const newProducts = Products.getAll();
        
        // Verifica se houve mudanças relevantes
        const hasChanges = JSON.stringify(oldProducts) !== JSON.stringify(newProducts);
        
        if (hasChanges) {
          console.log('[LairChic] Produtos atualizados automaticamente da planilha');
          populateBrandFilter();
          renderCarousel();
          renderProducts();
        }
      } catch (err) {
        console.warn('[LairChic] Falha no polling automático:', err);
      }
    }, 60000); // 60 segundos
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
