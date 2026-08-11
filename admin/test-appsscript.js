/**
 * Teste local do admin/appsscript.js (sem precisar do Google).
 * Rode com: node admin/test-appsscript.js
 */
const fs = require("fs");
const path = require("path");

// ── Mock do ambiente Google Apps Script ──
const spreadsheet = {
  order: [],
  sheets: {},
  getSheets: () => spreadsheet.order.map((k) => spreadsheet.sheets[k]),
  insertSheet: (name, index) => {
    const s = makeSheet(name);
    spreadsheet.sheets[name] = s;
    const pos = typeof index === "number" && index >= 0 ? index : spreadsheet.order.length;
    spreadsheet.order.splice(Math.min(pos, spreadsheet.order.length), 0, name);
    return s;
  },
  getSheetByName: (name) => spreadsheet.sheets[name] || null,
};

function makeSheet(name, rows = []) {
  const data = rows.map((r) => [...r]);
  return {
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => (data[0] ? data[0].length : 0),
    getDataRange: () => ({ getValues: () => data.map((r) => [...r]) }),
    getRange: (row, col, numRows, numCols) => {
      const range = {
        getValues: () => {
          const rowsSel = data.slice(row - 1, numRows ? row - 1 + numRows : row);
          return rowsSel.map((r) => r.slice(col - 1, numCols ? col - 1 + numCols : col));
        },
        setValue: (v) => {
          while (data.length < row) data.push([]);
          if (!data[row - 1]) data[row - 1] = [];
          data[row - 1][col - 1] = v;
          return range;
        },
        setValues: (arr) => {
          arr.forEach((r, i) => {
            while (data.length < row + i) data.push([]);
            data[row - 1 + i] = r.slice();
          });
          return range;
        },
      };
      return range;
    },
    appendRow: (r) => data.push([...r]),
    deleteRow: (r) => data.splice(r - 1, 1),
    _dump: () => data.map((r) => [...r]),
  };
}

spreadsheet.sheets["Produtos"] = makeSheet("Produtos", [
  ["id", "nome", "marca", "genero", "linha", "familia", "preco", "estoque", "descricao", "imagem", "destaque", "novidade", "ativo"],
  ["1", "Sauvage Elixir", "Dior", "Masculino", "Designer", "Amadeirado", 189.9, 0, "", "", "sim", "nao", "sim"],
  ["2", "Baccarat Rouge", "MFK", "Unisex", "Nicho", "Ambarado", 299.9, 5, "", "", "sim", "nao", "sim"],
]);
spreadsheet.order.push("Produtos");

global.SpreadsheetApp = { getActiveSpreadsheet: () => spreadsheet };
global.ContentService = {
  MimeType: { JSON: "application/json" },
  createTextOutput: (s) => ({ setMimeType: () => ({ getText: () => s }) }),
};
global.Utilities = { formatDate: () => "11/08/2026 10:30:00" };
global.Session = { getScriptTimeZone: () => "America/Sao_Paulo" };

// Carrega o appsscript.js (funções globais doGet/doPost)
eval(fs.readFileSync(path.join(__dirname, "appsscript.js"), "utf8"));

// ── Helpers ──
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log("  ✅ " + msg);
  } else {
    failed++;
    console.log("  ❌ " + msg);
  }
}
function callDoPost(obj) {
  const out = doPost({ postData: { contents: JSON.stringify(obj) } });
  return JSON.parse(out.getText());
}
function dumpSheet(name) {
  return (spreadsheet.sheets[name] && spreadsheet.sheets[name]._dump()) || null;
}
function stockOf(id) {
  const rows = dumpSheet("Produtos");
  const head = rows[0];
  const i = rows.findIndex((r) => String(r[0]) === String(id));
  return rows[i][head.indexOf("estoque")];
}

// ── Testes ──
console.log("── doGet ──");
assert(JSON.parse(doGet().getText()).ok === true, "doGet responde ok:true");

console.log("── listWarnings sem avisos ──");
let res = callDoPost({ action: "listWarnings" });
assert(res.ok === true && res.warnings.length === 0, "lista vazia quando não há aba Avisos");

console.log("── decrementStock: produto esgotado (estoque 0) ──");
res = callDoPost({ action: "decrementStock", items: [{ id: "1", qty: 2 }] });
assert(res.ok === true && res.updated === 1, "atualizou 1 item");
assert(res.warnings === 1, "retornou warnings:1 (venda de esgotado)");
assert(stockOf("1") === 0, "estoque continua 0 (Math.max)");
const avisos = dumpSheet("Avisos");
assert(avisos && avisos.length === 2, "aba Avisos criada com cabeçalho + 1 aviso");
assert(avisos && avisos[1][2] === "Sauvage Elixir", "aviso registrou o nome do produto");
assert(avisos && String(avisos[1][5]).toLowerCase() === "pendente", "aviso com status pendente");
assert(spreadsheet.getSheets()[0].getName() === "Produtos", "aba Produtos continua na 1ª posição (o site lê a primeira aba)");

console.log("── decrementStock: estoque suficiente (sem aviso) ──");
res = callDoPost({ action: "decrementStock", items: [{ id: "2", qty: 2 }] });
assert(res.ok === true && res.warnings === 0, "sem aviso quando há estoque");
assert(stockOf("2") === 3, "estoque 5 → 3");

console.log("── decrementStock: pedido maior que o estoque ──");
res = callDoPost({ action: "decrementStock", items: [{ id: "2", qty: 5 }] });
assert(res.ok === true && res.warnings === 1, "aviso quando pedido ultrapassa o estoque");
assert(stockOf("2") === 0, "estoque vai a 0");
assert(dumpSheet("Avisos").length === 3, "segundo aviso gravado");

console.log("── decrementStock: item inexistente (seguro) ──");
res = callDoPost({ action: "decrementStock", items: [{ id: "999", qty: 1 }] });
assert(res.ok === true && res.updated === 0 && res.warnings === 0, "não quebra e não altera nada");

console.log("── listWarnings com pendentes ──");
res = callDoPost({ action: "listWarnings" });
assert(res.ok === true && res.warnings.length === 2, "retorna os 2 avisos");
assert(res.warnings[0].nome === "Sauvage Elixir", "aviso 1 com nome correto");
assert(res.warnings[0].quantidade === 2, "aviso 1 com quantidade 2");

console.log("── resolveWarning ──");
res = callDoPost({ action: "resolveWarning", row: 2 });
assert(res.ok === true, "resolve linha 2");
res = callDoPost({ action: "listWarnings" });
assert(res.warnings[0].status === "resolvido", "aviso 1 ficou resolvido");
assert(res.warnings[1].status === "pendente", "aviso 2 continua pendente");
res = callDoPost({ action: "resolveWarning", row: 1 });
assert(res.ok === false, "linha inválida (row 1) retorna erro");

console.log("── ações antigas continuam funcionando ──");
res = callDoPost({ action: "add", product: { id: "3", nome: "Novo", marca: "Teste", estoque: 1 } });
assert(res.ok === true, "add ok");
res = callDoPost({ action: "update", product: { id: "3", nome: "Novo Editado", marca: "Teste", estoque: 2 } });
assert(res.ok === true, "update ok");
assert(dumpSheet("Produtos").find((r) => r[0] === "3")[1] === "Novo Editado", "update aplicado na planilha");
res = callDoPost({ action: "delete", id: "3" });
assert(res.ok === true, "delete ok");
res = callDoPost({ action: "coisaDesconhecida" });
assert(res.ok === false, "ação desconhecida retorna erro");

console.log("── listFinance (sem aba Financeiro ainda) ──");
res = callDoPost({ action: "listFinance" });
assert(res.ok === true && Array.isArray(res.finance), "listFinance responde ok:true");
assert(res.finance.length === 0, "sem lançamentos ainda");
const fin0 = dumpSheet("Financeiro");
assert(fin0 && fin0.length === 1, "aba Financeiro criada com apenas o cabeçalho");
assert(fin0[0][0] === "data" && fin0[0][5] === "valor", "cabeçalho da aba Financeiro correto");
assert(spreadsheet.getSheets().at(-1).getName() === "Financeiro", "aba Financeiro fica no FINAL da planilha");

console.log("── addFinance: venda ──");
res = callDoPost({ action: "addFinance", tipo: "venda", cliente: "Maria Silva", descricao: "Sauvage Elixir 100ml", valor: 189.9 });
assert(res.ok === true, "venda adicionada (valor numérico 189.9)");
let fin = dumpSheet("Financeiro");
assert(fin.length === 2, "1 lançamento gravado");
assert(fin[1][1] === "venda", "tipo venda");
assert(fin[1][2] === "Maria Silva", "cliente registrado");
assert(fin[1][5] === 189.9, "valor mantém 189.9 (não vira 1899)");

console.log("── addFinance: venda com valor em string pt-BR ──");
res = callDoPost({ action: "addFinance", tipo: "venda", cliente: "João", valor: "1.890,90" });
assert(res.ok === true, "venda adicionada com string pt-BR");
fin = dumpSheet("Financeiro");
assert(fin[2][5] === 1890.9, "1.890,90 convertido para 1890.9");

console.log("── addFinance: gasto ──");
res = callDoPost({ action: "addFinance", tipo: "gasto", categoria: "Bolsa", descricao: "Compra de bolsas no fornecedor", valor: 350 });
assert(res.ok === true, "gasto adicionado");
fin = dumpSheet("Financeiro");
assert(fin[3][1] === "gasto" && fin[3][3] === "Bolsa", "tipo gasto + categoria Bolsa");
assert(fin[3][5] === 350, "valor do gasto 350");
assert(fin[3][2] === "", "gasto não tem cliente (campo vazio)");

console.log("── listFinance retorna tudo ──");
res = callDoPost({ action: "listFinance" });
assert(res.ok === true && res.finance.length === 3, "retorna os 3 lançamentos");
const maria = res.finance.find((f) => f.cliente === "Maria Silva");
assert(maria && maria.tipo === "venda" && maria.valor === 189.9, "lançamento da Maria com valores corretos");
const bolsa = res.finance.find((f) => f.categoria === "Bolsa");
assert(bolsa && bolsa.tipo === "gasto" && bolsa.valor === 350, "gasto da Bolsa com valores corretos");

console.log("── deleteFinance ──");
res = callDoPost({ action: "deleteFinance", row: 4 });
assert(res.ok === true, "exclui linha 4 (gasto)");
fin = dumpSheet("Financeiro");
assert(fin.length === 3, "aba ficou com 3 linhas (cabeçalho + 2)");
res = callDoPost({ action: "listFinance" });
assert(res.finance.length === 2, "listFinance retorna 2 lançamentos");
res = callDoPost({ action: "deleteFinance", row: 1 });
assert(res.ok === false, "linha 1 (cabeçalho) não pode ser excluída");

console.log("── decrementStock registra venda automática no Financeiro ──");
res = callDoPost({ action: "add", product: { id: "4", nome: "Teste Venda Auto", marca: "Teste", preco: 50, estoque: 10 } });
assert(res.ok === true, "produto de teste (id 4) criado");
const finLinhasAntes = dumpSheet("Financeiro").length;
res = callDoPost({
  action: "decrementStock",
  cliente: "Douglas",
  items: [
    { id: "4", qty: 1, nome: "Teste Venda Auto", preco: 50 },
    { id: "2", qty: 2, nome: "Baccarat Rouge", preco: 299.9 },
  ],
});
assert(res.ok === true, "decrementStock ok");
assert(res.sales === 2, "2 vendas registradas automaticamente");
assert(res.warnings === 1, "só o item sem estoque (Baccarat) gera aviso");
assert(stockOf("4") === 9, "estoque do item 4 baixou para 9");
fin = dumpSheet("Financeiro");
assert(fin.length === finLinhasAntes + 2, "aba Financeiro recebeu 2 novas linhas");
const va1 = fin[fin.length - 2];
const va2 = fin[fin.length - 1];
assert(va1[1] === "venda" && va1[2] === "Douglas" && va1[4] === "1x Teste Venda Auto" && va1[5] === 50, "venda automática 1: Douglas, 1x Teste Venda Auto, R$ 50");
assert(va2[1] === "venda" && va2[2] === "Douglas" && va2[4] === "2x Baccarat Rouge" && va2[5] === 599.8, "venda automática 2: Douglas, 2x Baccarat Rouge, R$ 599,80");

console.log("── decrementStock sem preço não gera venda de R$ 0,00 ──");
res = callDoPost({ action: "decrementStock", cliente: "Cliente Antigo", items: [{ id: "4", qty: 1, nome: "Teste Venda Auto" }] });
assert(res.ok === true && res.sales === 0, "pedido sem preço não cria lançamento financeiro");
assert(dumpSheet("Financeiro").length === fin.length, "aba Financeiro inalterada");

console.log("── listFinance mostra as vendas automáticas ──");
res = callDoPost({ action: "listFinance" });
const doug = res.finance.filter((f) => f.cliente === "Douglas");
assert(doug.length === 2, "2 vendas do Douglas visíveis no listFinance");
assert(doug.some((f) => f.valor === 50) && doug.some((f) => f.valor === 599.8), "valores das vendas automáticas corretos");

res = callDoPost({ action: "delete", id: "4" });
assert(res.ok === true, "produto de teste (id 4) removido");

console.log("── Produtos continua intacta e na 1ª posição ──");
assert(spreadsheet.getSheets()[0].getName() === "Produtos", "aba Produtos segue na 1ª posição");
assert(dumpSheet("Produtos").length === 3, "produtos não foram alterados");

console.log("\n── Resultado ──");
console.log(`Passou: ${passed} | Falhou: ${failed}`);
process.exit(failed ? 1 : 0);
