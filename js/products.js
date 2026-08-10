const Products = (() => {
  let all = [];
  const FIXED_PRICE = 70;

  function parseBool(value) {
    if (typeof value === "boolean") return value;
    const v = String(value || "").trim().toLowerCase();
    return v === "sim" || v === "true" || v === "1" || v === "yes";
  }

  function normalize(row) {
    return {
      id: String(row.id || row.ID || "").trim(),
      nome: String(row.nome || row.Nome || "").trim(),
      marca: String(row.marca || row.Marca || "").trim(),
      genero: String(row.genero || row.Genero || row.gênero || "").trim(),
      linha: String(row.linha || row.Linha || "").trim(),
      familia: String(row.familia || row.Familia || row.família || "").trim(),
      preco: FIXED_PRICE,
      estoque: parseInt(String(row.estoque || row.Estoque || "0"), 10) || 0,
      descricao: String(row.descricao || row.Descricao || row.descrição || "").trim(),
      imagem: String(row.imagem || row.Imagem || "").trim(),
      destaque: parseBool(row.destaque || row.Destaque),
      novidade: parseBool(row.novidade || row.Novidade),
      ativo: parseBool(row.ativo !== undefined ? row.ativo : row.Ativo !== undefined ? row.Ativo : true),
    };
  }

  function parseGoogleResponse(text) {
    const json = JSON.parse(text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, ""));
    const cols = json.table.cols.map((c) => c.label.toLowerCase());
    return json.table.rows.map((row) => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell ? cell.v : "";
      });
      return normalize(obj);
    });
  }

  async function fetchFromSheet(sheetId) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao carregar planilha");
    const text = await res.text();
    return parseGoogleResponse(text).filter((p) => p.ativo && p.nome);
  }

  async function fetchFallback() {
    const res = await fetch("data/products-fallback.json");
    if (!res.ok) throw new Error("Falha ao carregar produtos locais");
    const data = await res.json();
    return data.map(normalize);
  }

  async function load() {
    if (CONFIG.SHEET_ID) {
      try {
        all = await fetchFromSheet(CONFIG.SHEET_ID);
        return all;
      } catch (err) {
        console.warn("Google Sheets indisponível, usando dados locais:", err);
      }
    }
    all = await fetchFallback();
    return all;
  }

  function getAll() {
    return all;
  }

  function getById(id) {
    return all.find((p) => p.id === String(id));
  }

  function getFeatured() {
    const featured = all.filter((p) => p.destaque || p.novidade);
    return featured.length ? featured.slice(0, 4) : all.slice(0, 4);
  }

  function getBrands() {
    return [...new Set(all.map((p) => p.marca).filter(Boolean))].sort();
  }

  function filter(filters) {
    return all.filter((p) => {
      if (filters.marca && p.marca !== filters.marca) return false;
      if (filters.genero && p.genero !== filters.genero) return false;
      if (filters.linha && p.linha !== filters.linha) return false;
      if (filters.familia && p.familia !== filters.familia) return false;
      return true;
    });
  }

  function formatPrice(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function isOutOfStock(product) {
    return product.estoque <= 0;
  }

  return {
    load,
    getAll,
    getById,
    getFeatured,
    getBrands,
    filter,
    formatPrice,
    isOutOfStock,
  };
})();
