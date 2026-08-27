/**
 * Painel Admin — L'air Chic
 * ─────────────────────────
 * Lê a MESMA planilha do Google Sheets usada pelo site do cliente.
 *
 * Conexão de escrita (salvar direto na planilha):
 *   1. Configure o Google Apps Script (veja admin/appsscript.js)
 *   2. Cole a URL da Web App em js/config.js → ADMIN_API_URL
 * Sem isso, use "Baixar CSV" e importe na planilha.
 */
// Debug: confirm admin.js carregou
console.log('[Admin] admin.js carregado - versão com debug de login');

const Admin = (() => {
  const COLS = [
    "id", "nome", "marca", "genero", "linha", "familia", "volume", "preco",
    "estoque", "descricao", "imagem", "destaque", "novidade", "ativo",
  ];

  const els = {};
  let products = [];
  let editingId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    console.log('[Admin] initElements chamado');
    els.productsBody = $("productsBody");
    els.adminEmpty = $("adminEmpty");
    els.productCount = $("productCount");
    els.addProductBtn = $("addProductBtn");
    els.exportCsvBtn = $("exportCsvBtn");
    els.connectionNotice = $("connectionNotice");
    els.adminWarnings = $("adminWarnings");
    els.adminWarningsList = $("adminWarningsList");
    els.adminToolbar = $("adminToolbar");
    els.adminTableWrap = $("adminTableWrap");

    // Controle financeiro
    els.financeBtn = $("financeBtn");
    els.financeView = $("financeView");
    els.backToProductsBtn = $("backToProductsBtn");
    els.financeBody = $("financeBody");
    els.financeEmpty = $("financeEmpty");
    els.financeFilters = $("financeFilters");
    els.finTotalVendas = $("finTotalVendas");
    els.finTotalGastos = $("finTotalGastos");
    els.finLucro = $("finLucro");
    els.finLucroCard = $("finLucroCard");
    els.saleForm = $("saleForm");
    els.saleCliente = $("saleCliente");
    els.saleValor = $("saleValor");
    els.saleDescricao = $("saleDescricao");
    els.expenseForm = $("expenseForm");
    els.expenseCategoria = $("expenseCategoria");
    els.expenseDescricao = $("expenseDescricao");
    els.expenseValor = $("expenseValor");
    els.productFormModal = $("productFormModal");
    els.productForm = $("productForm");
    els.formTitle = $("formTitle");
    els.formHint = $("formHint");
    els.closeFormBtn = $("closeFormBtn");
    els.cancelFormBtn = $("cancelFormBtn");

    // Login
    els.loginScreen = $("loginScreen");
    els.adminApp = $("adminApp");
    els.loginForm = $("loginForm");
    els.loginPassword = $("loginPassword");
    els.loginError = $("loginError");
    els.loginNotice = $("loginNotice");
    els.logoutBtn = $("logoutBtn");
  }

  const AUTH_KEY = "lairchic_admin_authed";

  function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function showLogin() {
    els.adminApp.hidden = true;
    els.loginScreen.hidden = false;
    els.loginPassword.value = "";
    els.loginError.hidden = true;
    els.loginPassword.focus();
  }

  function showFileWarning() {
    if (window.location.protocol === "file:") {
      const msg = "⚠️ Você abriu o admin.html pelo duplo clique no arquivo (modo file://). Nesse modo o navegador bloqueia o carregamento da planilha. Para testar, abra um terminal na pasta do projeto e rode: npx serve . — depois acesse http://localhost:3000/admin.html";
      if (els.loginNotice) {
        els.loginNotice.textContent = msg;
        els.loginNotice.hidden = false;
      }
      if (els.connectionNotice) {
        els.connectionNotice.textContent = msg;
        els.connectionNotice.hidden = false;
      }
    }
  }

  function showAdmin() {
    els.loginScreen.hidden = true;
    els.adminApp.hidden = false;
  }

  function handleLogin(e) {
    e.preventDefault();
    console.log('[Admin] handleLogin chamado', { typed: els.loginPassword.value });
    
    const typed = els.loginPassword.value;
    const expected = (typeof CONFIG !== "undefined" && CONFIG.ADMIN_PASSWORD) ? CONFIG.ADMIN_PASSWORD : "";
    console.log('[Admin] Expected password:', expected);

    if (expected && typed === expected) {
      console.log('[Admin] Senha correta, logando...');
      sessionStorage.setItem(AUTH_KEY, "1");
      showAdmin();
      initApp();
    } else {
      console.log('[Admin] Senha incorreta');
      els.loginError.hidden = false;
      els.loginPassword.value = "";
      els.loginPassword.focus();
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY);
    showLogin();
  }

  function sheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json`;
  }

  function bool(v) {
    return (
      v === true ||
      String(v).toLowerCase() === "sim" ||
      String(v).toLowerCase() === "true" ||
      String(v) === "1"
    );
  }

  function formatPrice(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return "R$ 0,00";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  async function loadProducts() {
    if (!CONFIG.SHEET_ID) {
      showNotice("⚠️ A planilha não está configurada. Preencha SHEET_ID em js/config.js.");
      renderTable();
      return;
    }
    try {
      const res = await fetch(sheetUrl());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const json = JSON.parse(text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, ""));
      const cols = json.table.cols.map((c) => c.label);
      products = json.table.rows.map((row) => {
        const obj = {};
        row.c.forEach((cell, i) => {
          obj[cols[i]] = cell ? cell.v : "";
        });
        return obj;
      });
      console.log('[Admin] Produtos carregados da planilha:', products);
      renderTable();
    } catch (err) {
      console.error(err);
      if (window.location.protocol === "file:") {
        showNotice("❌ Você abriu o admin.html pelo DUPLO CLIQUE no arquivo (modo file://). Nesse modo o navegador bloqueia o acesso à planilha. Para testar, abra um terminal na pasta do projeto e rode: npx serve . — depois acesse http://localhost:3000/admin.html");
      } else {
        showNotice("❌ Não consegui carregar a planilha. Confira o SHEET_ID em js/config.js e se ela está compartilhada como 'Qualquer pessoa com o link → Leitor'.");
      }
    }
  }

  function renderTable() {
    els.productsBody.innerHTML = products
      .map((p) => `
        <tr>
          <td class="admin-table__img">
            ${p.imagem ? `<img src="${p.imagem}" alt="">` : `<span class="admin-table__noimg">sem foto</span>`}
          </td>
          <td><strong>${p.nome || "—"}</strong></td>
          <td>${p.marca || "—"}</td>
          <td>${p.genero || "—"}</td>
          <td>${formatPrice(p.preco)}</td>
          <td>${p.estoque}</td>
          <td>
            ${bool(p.destaque) ? '<span class="admin-badge admin-badge--best">BEST SELLER</span>' : ""}
            ${bool(p.novidade) ? '<span class="admin-badge admin-badge--new">Novidade</span>' : ""}
            ${!bool(p.ativo) ? '<span class="admin-badge admin-badge--off">Desativado</span>' : ""}
          </td>
          <td class="admin-table__actions">
            <button type="button" class="btn-admin btn-admin--small" data-edit="${p.id}">Editar</button>
            <button type="button" class="btn-admin btn-admin--small btn-admin--danger" data-del="${p.id}">Excluir</button>
          </td>
        </tr>`)
      .join("");

    els.adminEmpty.hidden = products.length > 0;
    els.productCount.textContent = `${products.length} perfume${products.length === 1 ? "" : "s"}`;
  }

  function showNotice(msg) {
    els.connectionNotice.textContent = msg;
    els.connectionNotice.hidden = false;
  }

  /* ── Avisos de estoque esgotado ── */

  async function loadWarnings() {
    if (!CONFIG.ADMIN_API_URL) return;
    try {
      const res = await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        // text/plain evita o preflight OPTIONS (CORS) que o Apps Script não responde.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "listWarnings" }),
      });
      const data = await res.json().catch(() => null);
      const warnings = (data && data.warnings) || [];
      renderWarnings(warnings.filter((w) => w.status !== "resolvido"));
    } catch (err) {
      console.error("Falha ao carregar avisos:", err);
    }
  }

  function renderWarnings(warnings) {
    if (!els.adminWarnings) return;
    if (!warnings.length) {
      els.adminWarnings.hidden = true;
      els.adminWarningsList.innerHTML = "";
      return;
    }
    els.adminWarningsList.innerHTML = warnings
      .map(
        (w) => `
        <div class="admin-warning">
          <div class="admin-warning__info">
            <strong>${w.nome || w.id}</strong>
            <span>${w.data} — ${w.quantidade}x comprado${Number(w.quantidade) > 1 ? "s" : ""} com estoque ${w.estoqueAnterior}</span>
          </div>
          <button type="button" class="btn-admin btn-admin--small btn-admin--primary" data-resolve="${w.row}">Resolver</button>
        </div>`
      )
      .join("");
    els.adminWarnings.hidden = false;
  }

  async function resolveWarning(row) {
    if (!CONFIG.ADMIN_API_URL) return;
    try {
      await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "resolveWarning", row: Number(row) }),
      });
      showNotice("✅ Aviso resolvido. Estoque do perfume deve ser reposto na planilha.");
      await loadWarnings();
    } catch (err) {
      console.error(err);
    }
  }

  /* ── Controle financeiro ── */

  let finance = [];
  let financeFilter = "todos";

  function showFinance() {
    if (!els.financeView) return;
    els.adminToolbar.hidden = true;
    els.adminTableWrap.hidden = true;
    els.financeView.hidden = false;
    loadFinance();
  }

  function showProducts() {
    if (!els.financeView) return;
    els.financeView.hidden = true;
    els.adminToolbar.hidden = false;
    els.adminTableWrap.hidden = false;
  }

  async function loadFinance() {
    if (!CONFIG.ADMIN_API_URL) {
      finance = [];
      renderFinance();
      return;
    }
    try {
      const res = await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        // text/plain evita o preflight OPTIONS (CORS) que o Apps Script não responde.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "listFinance" }),
      });
      const data = await res.json().catch(() => null);
      finance = (data && data.finance) || [];
      renderFinance();
    } catch (err) {
      console.error("Falha ao carregar financeiro:", err);
    }
  }

  function brl(v) {
    return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFinance() {
    if (!els.financeBody) return;

    const totalVendas = finance
      .filter((f) => f.tipo === "venda")
      .reduce((s, f) => s + (Number(f.valor) || 0), 0);
    const totalGastos = finance
      .filter((f) => f.tipo === "gasto")
      .reduce((s, f) => s + (Number(f.valor) || 0), 0);

    els.finTotalVendas.textContent = brl(totalVendas);
    els.finTotalGastos.textContent = brl(totalGastos);

    const lucro = totalVendas - totalGastos;
    els.finLucro.textContent = brl(lucro);
    els.finLucroCard.classList.toggle("is-negative", lucro < 0);

    const rows =
      financeFilter === "todos"
        ? finance.slice()
        : finance.filter((f) => f.tipo === financeFilter);
    rows.sort((a, b) => String(b.data).localeCompare(String(a.data)));

    els.financeBody.innerHTML = rows
      .map((f) => {
        const isVenda = f.tipo === "venda";
        const quem = isVenda ? f.cliente || f.descricao : f.categoria;
        return `
        <tr>
          <td>${esc(f.data)}</td>
          <td><span class="finance-badge ${isVenda ? "finance-badge--venda" : "finance-badge--gasto"}">${isVenda ? "Venda" : "Gasto"}</span></td>
          <td>${esc(quem || "—")}</td>
          <td>${esc(f.descricao || "—")}</td>
          <td class="finance-valor ${isVenda ? "finance-valor--venda" : "finance-valor--gasto"}">${isVenda ? "+" : "−"} ${brl(f.valor)}</td>
          <td class="admin-table__actions"><button type="button" class="btn-admin btn-admin--small btn-admin--danger" data-fdel="${f.row}">Excluir</button></td>
        </tr>`;
      })
      .join("");

    els.financeEmpty.hidden = rows.length > 0;
  }

  function parseValor(str) {
    let s = String(str || "").trim().replace("R$", "").replace(/\s/g, "");
    if (s.includes(",")) {
      // padrão brasileiro: 1.890,90 ou 189,90
      s = s.replace(/\./g, "").replace(",", ".");
    }
    return parseFloat(s) || 0;
  }

  async function addSale(e) {
    e.preventDefault();
    if (!CONFIG.ADMIN_API_URL) {
      showNotice("⚠️ Configure a URL do Apps Script (js/config.js → ADMIN_API_URL) para salvar o financeiro.");
      return;
    }
    const valor = parseValor(els.saleValor.value);
    if (!(valor > 0)) {
      showNotice("⚠️ Informe um valor de venda válido.");
      return;
    }
    try {
      await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "addFinance",
          tipo: "venda",
          cliente: els.saleCliente.value.trim(),
          descricao: els.saleDescricao.value.trim(),
          valor,
        }),
      });
      els.saleForm.reset();
      showNotice("✅ Venda registrada no financeiro.");
      await loadFinance();
    } catch (err) {
      console.error(err);
      showNotice("⚠️ Não consegui salvar a venda. Tente novamente.");
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    if (!CONFIG.ADMIN_API_URL) {
      showNotice("⚠️ Configure a URL do Apps Script (js/config.js → ADMIN_API_URL) para salvar o financeiro.");
      return;
    }
    const valor = parseValor(els.expenseValor.value);
    if (!(valor > 0)) {
      showNotice("⚠️ Informe um valor de gasto válido.");
      return;
    }
    try {
      await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "addFinance",
          tipo: "gasto",
          categoria: els.expenseCategoria.value,
          descricao: els.expenseDescricao.value.trim(),
          valor,
        }),
      });
      els.expenseForm.reset();
      showNotice("✅ Gasto registrado no financeiro.");
      await loadFinance();
    } catch (err) {
      console.error(err);
      showNotice("⚠️ Não consegui salvar o gasto. Tente novamente.");
    }
  }

  async function deleteFinance(row) {
    if (!CONFIG.ADMIN_API_URL) return;
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await fetch(CONFIG.ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteFinance", row: Number(row) }),
      });
      showNotice("🗑️ Lançamento excluído.");
      await loadFinance();
    } catch (err) {
      console.error(err);
    }
  }

  function openForm(p) {
    editingId = p ? String(p.id) : null;
    els.formTitle.textContent = p ? "Editar perfume" : "Adicionar perfume";
    $("fId").value = p ? p.id : "";
    $("fNome").value = p ? p.nome : "";
    $("fMarca").value = p ? p.marca : "";
    $("fGenero").value = p && p.genero ? p.genero : "Masculino";
    $("fLinha").value = p && p.linha ? p.linha : "Designer";
    $("fFamilia").value = p ? p.familia : "";
    $("fVolume").value = p && p.volume ? p.volume : (CONFIG.DEFAULT_VOLUME || "25ml");
    $("fPreco").value = p ? p.preco : 70;
    $("fEstoque").value = p ? p.estoque : 0;
    $("fDescricao").value = p ? p.descricao : "";
    $("fImagem").value = p ? p.imagem : "";
    $("fDestaque").checked = p ? bool(p.destaque) : false;
    $("fNovidade").checked = p ? bool(p.novidade) : false;
    // "Desativado" é o inverso de "ativo" - se ativo=false, desativado=true
    $("fDesativado").checked = p ? !bool(p.ativo) : false;

    els.formHint.textContent = CONFIG.ADMIN_API_URL
      ? "🔌 Salva direto na planilha → o site do cliente atualiza na hora."
      : "Conexão de escrita pendente: salve aqui e depois use 'Baixar CSV' para atualizar a planilha (veja SETUP.txt, seção 6).";

    els.productFormModal.hidden = false;
    requestAnimationFrame(() => els.productFormModal.classList.add("is-open"));
    $("fNome").focus();
  }

  function closeForm() {
    els.productFormModal.classList.remove("is-open");
    setTimeout(() => {
      els.productFormModal.hidden = true;
    }, 200);
  }

  function formValues() {
    return {
      id: $("fId").value.trim(),
      nome: $("fNome").value.trim(),
      marca: $("fMarca").value.trim(),
      genero: $("fGenero").value,
      linha: $("fLinha").value,
      familia: $("fFamilia").value.trim(),
      volume: $("fVolume").value,
      preco: parseFloat(String($("fPreco").value).replace(",", ".")) || 70,
      estoque: parseInt($("fEstoque").value, 10) || 0,
      descricao: $("fDescricao").value.trim(),
      imagem: $("fImagem").value.trim(),
      // Apps Script buildRow espera booleanos (true/false), não strings
      destaque: $("fDestaque").checked,
      novidade: $("fNovidade").checked,
      // "Desativado" é o inverso - planilha espera "ativo"
      ativo: !$("fDesativado").checked,
    };
  }

  function nextId() {
    const max = products.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0);
    return max + 1;
  }

  async function saveProduct(e) {
    e.preventDefault();
    const data = formValues();
    console.log('[Admin] Salvando produto:', data);

    if (editingId) {
      data.id = editingId;
      const idx = products.findIndex((p) => String(p.id) === String(editingId));
      if (idx > -1) products[idx] = { ...products[idx], ...data };
    } else {
      data.id = String(data.id || nextId());
      products.push(data);
    }

    closeForm();
    renderTable();

    if (CONFIG.ADMIN_API_URL) {
      try {
        const payload = { action: editingId ? "update" : "add", product: data };
        console.log('[Admin] Payload para API:', payload);
        const res = await fetch(CONFIG.ADMIN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({ ok: false, error: "Resposta inválida" }));
        console.log('[Admin] Resposta da API:', result);
        if (result.ok) {
          showNotice("✅ Salvo na planilha. O site do cliente já está atualizado.");
        } else {
          console.error("Erro da API:", result.error);
          showNotice("⚠️ Falha ao salvar: " + (result.error || "Erro desconhecido"));
        }
      } catch (err) {
        console.error(err);
        showNotice("⚠️ Erro de rede ao salvar. Use 'Baixar CSV' para atualizar manualmente.");
      }
    } else {
      showNotice("💾 Alteração registrada. Use 'Baixar CSV' e importe na planilha para o site do cliente atualizar.");
    }
  }

  async function deleteProduct(id) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (!confirm(`Excluir "${p.nome}"?`)) return;

    products = products.filter((x) => String(x.id) !== String(id));
    renderTable();

    if (CONFIG.ADMIN_API_URL) {
      try {
        const res = await fetch(CONFIG.ADMIN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "delete", id: String(id) }),
        });
        const result = await res.json().catch(() => ({ ok: false, error: "Resposta inválida" }));
        if (result.ok) {
          showNotice("🗑️ Excluído da planilha.");
        } else {
          console.error("Erro da API:", result.error);
          showNotice("⚠️ Falha ao excluir: " + (result.error || "Erro desconhecido"));
        }
      } catch (err) {
        console.error(err);
        showNotice("⚠️ Erro de rede ao excluir. Use 'Baixar CSV' para aplicar na planilha.");
      }
    } else {
      showNotice("🗑️ Removido. Use 'Baixar CSV' para aplicar na planilha.");
    }
  }

  function toCSV(rows) {
    const escape = (v) => {
      v = String(v ?? "");
      return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const lines = [COLS.map(escape).join(",")];
    rows.forEach((r) => lines.push(COLS.map((k) => escape(r[k] ?? "")).join(",")));
    return lines.join("\n");
  }

  function exportCSV() {
    const csv = toCSV(products);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "produtos-lairchic.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function bindEvents() {
    console.log('[Admin] bindEvents chamado');
    els.addProductBtn.addEventListener("click", () => openForm(null));
    els.closeFormBtn.addEventListener("click", closeForm);
    els.cancelFormBtn.addEventListener("click", closeForm);
    els.productForm.addEventListener("submit", saveProduct);
    els.exportCsvBtn.addEventListener("click", exportCSV);

    // Login / Logout
    els.loginForm.addEventListener("submit", handleLogin);
    els.logoutBtn.addEventListener("click", handleLogout);

    els.productFormModal.addEventListener("click", (e) => {
      if (e.target === els.productFormModal) closeForm();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeForm();
    });

    els.productsBody.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) {
        const p = products.find((x) => String(x.id) === String(edit.dataset.edit));
        if (p) openForm(p);
        return;
      }
      const del = e.target.closest("[data-del]");
      if (del) deleteProduct(del.dataset.del);
    });

    if (els.adminWarningsList) {
      els.adminWarningsList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-resolve]");
        if (btn) resolveWarning(btn.dataset.resolve);
      });
    }

    // Controle financeiro
    if (els.financeBtn) els.financeBtn.addEventListener("click", showFinance);
    if (els.backToProductsBtn) els.backToProductsBtn.addEventListener("click", showProducts);
    if (els.saleForm) els.saleForm.addEventListener("submit", addSale);
    if (els.expenseForm) els.expenseForm.addEventListener("submit", addExpense);

    if (els.financeFilters) {
      els.financeFilters.addEventListener("click", (e) => {
        const tab = e.target.closest("[data-ftab]");
        if (!tab) return;
        financeFilter = tab.dataset.ftab;
        els.financeFilters.querySelectorAll("[data-ftab]").forEach((t) =>
          t.classList.toggle("is-active", t === tab)
        );
        renderFinance();
      });
    }

    if (els.financeBody) {
      els.financeBody.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-fdel]");
        if (btn) deleteFinance(btn.dataset.fdel);
      });
    }
  }

  async function initApp() {
    if (CONFIG.ADMIN_API_URL) {
      showNotice("🔌 Conexão de escrita ativa: alterações salvam direto na planilha.");
      await loadWarnings();
    }
    await loadProducts();
  }

  async function init() {
    console.log('[Admin] init chamado');
    initElements();
    bindEvents();
    showFileWarning();

    if (isAuthed()) {
      showAdmin();
      await initApp();
    } else {
      showLogin();
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => Admin.init());
