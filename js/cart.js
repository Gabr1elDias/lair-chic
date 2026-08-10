const Cart = (() => {
  const STORAGE_KEY = "lairchic_cart";
  let items = [];
  let listeners = [];

  function load() {
    try {
      items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      items = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notify();
  }

  function notify() {
    listeners.forEach((fn) => fn(getItems()));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function getItems() {
    return [...items];
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.qty, 0);
  }

  function getTotal() {
    return items.reduce((sum, i) => sum + i.preco * i.qty, 0);
  }

  function add(product) {
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id: product.id,
        nome: product.nome,
        preco: product.preco,
        qty: 1,
      });
    }
    save();
  }

  function updateQty(id, delta) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      items = items.filter((i) => i.id !== id);
    }
    save();
  }

  function remove(id) {
    items = items.filter((i) => i.id !== id);
    save();
  }

  function clear() {
    items = [];
    save();
  }

  function buildWhatsAppMessage(name, observation) {
    const lines = items.map(
      (i) => `${i.qty}x ${i.nome} (${Products.formatPrice(i.preco)})`
    );
    const total = Products.formatPrice(getTotal());
    let msg = `Olá! Sou ${name}. Fiz um pedido de: ${lines.join(", ")}. Total: ${total}.`;
    if (observation && observation.trim()) {
      msg += ` Obs: ${observation.trim()}`;
    }
    return msg;
  }

  function buildEmailItems() {
    return items
      .map((i) => `${i.qty}x ${i.nome} — ${Products.formatPrice(i.preco)}`)
      .join("\n");
  }

  return {
    load,
    onChange,
    getItems,
    getCount,
    getTotal,
    add,
    updateQty,
    remove,
    clear,
    buildWhatsAppMessage,
    buildEmailItems,
  };
})();
