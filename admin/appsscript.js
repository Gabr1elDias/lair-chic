/**
 * Google Apps Script da L'air Chic
 * ────────────────────────────────
 * Conecta o Painel Admin (admin.html) à planilha do Google Sheets,
 * permitindo salvar alterações direto na planilha.
 *
 * AÇÕES SUPORTADAS (via POST JSON):
 *   { action: "add", product }            → adiciona um produto
 *   { action: "update", product }         → atualiza um produto
 *   { action: "delete", id }              → exclui um produto
 *   { action: "decrementStock", cliente, items } → baixa o estoque dos itens
 *                                           comprados e registra a venda
 *                                           automaticamente na aba Financeiro
 *                                           (usado pelo site do cliente ao
 *                                           confirmar o pedido)
 *   { action: "listWarnings" }            → lista os avisos de vendas de
 *                                           produtos esgotados (aba "Avisos")
 *   { action: "resolveWarning", row }     → marca um aviso como resolvido
 *   { action: "listFinance" }             → lista os lançamentos financeiros
 *                                           (aba "Financeiro": vendas e gastos)
 *   { action: "addFinance", entry }       → adiciona uma venda ou um gasto
 *   { action: "deleteFinance", row }      → exclui um lançamento financeiro
 *
 * ESTOQUE ZERADO — AVISOS:
 * Quando um cliente compra um perfume que está com estoque zerado
 * (ou pede mais unidades do que o estoque disponível), um AVISO é
 * gravado automaticamente numa aba "Avisos" da planilha e aparece
 * no Painel Admin. Cabe a você repor o estoque / resolver o aviso.
 *
 * CONTROLE FINANCEIRO:
 * A aba "Financeiro" guarda as vendas (nome da pessoa + valor) e os
 * gastos (compras de bolsas, perfumes, embalagens, frete etc.).
 * O Painel Admin usa as actions listFinance/addFinance/deleteFinance
 * para ler e alimentar essa aba, e mostra o resumo vendas − gastos.
 *
 * VENDA AUTOMÁTICA:
 * Quando um cliente confirma um pedido no site, a action decrementStock
 * (já usada para baixar o estoque) também grava na aba "Financeiro" uma
 * linha de VENDA por item: cliente = nome digitado no site, descricao =
 * "2x Sauvage Elixir", valor = preço × quantidade. Assim você não precisa
 * lançar as vendas da loja manualmente.
 *
 * COMO CONFIGURAR:
 *   1. Abra a planilha do Google Sheets
 *   2. Menu: Extensões → Apps Script
 *   3. Cole este código no editor e salve (Ctrl+S)
 *   4. Implantar → Nova implantação → Aplicativo da web
 *      - Descrição: painel lair chic
 *      - Executar como: Eu
 *      - Quem tem acesso: Qualquer pessoa
 *   5. Copie a URL da Web App e cole em js/config.js → ADMIN_API_URL
 */

function doGet() {
  // Ajuda a testar a URL da Web App direto no navegador:
  // abra https://script.google.com/macros/s/.../exec e veja { "ok": true }
  return jsonResponse({ ok: true, api: "lairchic", message: "API conectada" });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getProductSheet(ss);

    // Se a planilha estiver vazia, cria o cabeçalho
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["id", "nome", "marca", "genero", "linha", "familia", "preco", "estoque", "descricao", "imagem", "destaque", "novidade", "ativo"]);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const values = sheet.getDataRange().getValues();

    if (data.action === "add") {
      sheet.appendRow(buildRow(headers, data.product));
    } else if (data.action === "update") {
      const idCol = headers.indexOf("id");
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idCol]) === String(data.product.id)) {
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers, data.product)]);
          break;
        }
      }
    } else if (data.action === "delete") {
      const idCol = headers.indexOf("id");
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][idCol]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    } else if (data.action === "decrementStock") {
      // Usado pelo site do cliente: ao confirmar um pedido, baixa o estoque
      // dos itens comprados direto na planilha.
      // Espera: { action: "decrementStock", cliente: "Nome do cliente",
      //           items: [{ id, qty, nome, preco }, ...] }
      // Além de baixar o estoque, registra CADA item automaticamente na aba
      // "Financeiro" como uma VENDA (cliente + o que comprou + valor).
      const idCol = headers.indexOf("id");
      const estoqueCol = headers.indexOf("estoque");
      const nomeCol = headers.indexOf("nome");
      if (idCol < 0 || estoqueCol < 0) throw new Error("Coluna id/estoque não encontrada");

      let updated = 0;
      const warnings = []; // vendas de produtos esgotados
      const sales = []; // vendas registradas automaticamente no Financeiro

      for (const item of data.items || []) {
        const id = String(item.id);
        const qty = parseInt(item.qty, 10) || 0;

        // Venda automática: só registra se souber o valor (preço do item).
        // Itens sem preço (versão antiga do site) são ignorados para não
        // criar lançamentos de R$ 0,00 na aba Financeiro.
        const price = parseFloat(item.preco) || 0;
        if (price > 0) {
          sales.push([
            nowStamp(),
            "venda",
            String(data.cliente || "Cliente site").trim(),
            "",
            `${qty}x ${String(item.nome || id)}`,
            Math.round(price * qty * 100) / 100,
          ]);
        }

        for (let i = 1; i < values.length; i++) {
          if (String(values[i][idCol]) === id) {
            const current = parseInt(values[i][estoqueCol], 10) || 0;
            sheet.getRange(i + 1, estoqueCol + 1).setValue(Math.max(0, current - qty));
            updated++;

            // AVISO: produto esgotado (estoque zerado) e mesmo assim venderam,
            // ou o pedido ultrapassou o estoque disponível.
            if (current <= 0 || qty > current) {
              warnings.push({
                data: nowStamp(),
                id: id,
                nome: nomeCol >= 0 ? String(values[i][nomeCol] || id) : id,
                quantidade: qty,
                estoqueAnterior: current,
              });
            }
            break;
          }
        }
      }

      if (sales.length) {
        const financeSheet = getFinanceSheet(ss);
        sales.forEach((row) => financeSheet.appendRow(row));
      }

      if (warnings.length) {
        const warningsSheet = getWarningsSheet(ss);
        warnings.forEach((w) =>
          warningsSheet.appendRow([w.data, w.id, w.nome, w.quantidade, w.estoqueAnterior, "pendente"])
        );
      }

      return jsonResponse({ ok: true, updated, items: data.items ? data.items.length : 0, warnings: warnings.length, sales: sales.length });
    } else if (data.action === "listWarnings") {
      // Retorna todos os avisos da aba "Avisos".
      const ws = ss.getSheetByName("Avisos");
      if (!ws || ws.getLastRow() <= 1) return jsonResponse({ ok: true, warnings: [] });
      const vals = ws.getDataRange().getValues();
      const warnings = [];
      for (let i = 1; i < vals.length; i++) {
        const row = vals[i];
        if (!row.some((c) => String(c || "").trim() !== "")) continue;
        warnings.push({
          row: i + 1,
          data: String(row[0] || ""),
          id: String(row[1] || ""),
          nome: String(row[2] || ""),
          quantidade: row[3],
          estoqueAnterior: row[4],
          status: String(row[5] || "pendente").toLowerCase(),
        });
      }
      return jsonResponse({ ok: true, warnings });
    } else if (data.action === "resolveWarning") {
      // Marca um aviso como resolvido. Espera: { action, row: número da linha }
      const ws = ss.getSheetByName("Avisos");
      if (!ws) throw new Error("Aba Avisos não encontrada");
      const row = parseInt(data.row, 10);
      if (!row || row <= 1) throw new Error("Linha inválida");
      ws.getRange(row, 6).setValue("resolvido");
      return jsonResponse({ ok: true });
    } else if (data.action === "listFinance") {
      // Retorna todos os lançamentos da aba "Financeiro" (vendas e gastos).
      return jsonResponse({ ok: true, finance: readFinance(getFinanceSheet(ss)) });
    } else if (data.action === "addFinance") {
      // Adiciona um lançamento. Espera: { action, tipo: "venda"|"gasto",
      // cliente, categoria, descricao, valor }
      const fs = getFinanceSheet(ss);
      const tipo = String(data.tipo || "venda").toLowerCase() === "gasto" ? "gasto" : "venda";
      // Aceita número (189.9) ou string pt-BR ("189,90" / "1.890,90")
      let v = data.valor;
      if (typeof v === "string") {
        const s = String(v).trim().replace("R$", "").replace(/\s/g, "");
        if (s.includes(",")) v = s.replace(/\./g, "").replace(",", ".");
        else v = s;
      }
      const valor = Math.max(0, parseFloat(v) || 0);
      fs.appendRow([
        data.data || nowStamp(),
        tipo,
        String(data.cliente || "").trim(),
        String(data.categoria || "").trim(),
        String(data.descricao || "").trim(),
        valor,
      ]);
      return jsonResponse({ ok: true, row: fs.getLastRow() });
    } else if (data.action === "deleteFinance") {
      // Exclui um lançamento pelo número da linha.
      const fs = getFinanceSheet(ss);
      const row = parseInt(data.row, 10);
      if (!row || row <= 1) throw new Error("Linha inválida");
      fs.deleteRow(row);
      return jsonResponse({ ok: true });
    } else {
      throw new Error("Ação desconhecida: " + data.action);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

/**
 * Encontra a aba de produtos (a que tem colunas id/estoque no cabeçalho).
 * Funciona mesmo se a aba "Avisos" estiver antes na lista de abas.
 */
function getProductSheet(ss) {
  const all = ss.getSheets();
  for (const s of all) {
    if (s.getLastRow() === 0) continue;
    const first = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0] || [];
    if (first.indexOf("id") > -1 && first.indexOf("estoque") > -1) {
      return s;
    }
  }
  return all[0] || ss.insertSheet();
}

/** Garante que a aba "Avisos" existe e tem cabeçalho (no final da planilha). */
function getWarningsSheet(ss) {
  let ws = ss.getSheetByName("Avisos");
  if (!ws) {
    // Insere no FINAL para não virar a primeira aba (o site do cliente
    // lê a primeira aba via gviz; a aba Avisos não pode "roubar" esse lugar).
    ws = ss.insertSheet("Avisos", ss.getSheets().length);
    ws.appendRow(["data", "id", "nome", "quantidade", "estoque_anterior", "status"]);
  } else if (ws.getLastRow() === 0) {
    ws.appendRow(["data", "id", "nome", "quantidade", "estoque_anterior", "status"]);
  }
  return ws;
}

function nowStamp() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

/** Garante que a aba "Financeiro" existe (no final da planilha). */
function getFinanceSheet(ss) {
  let fs = ss.getSheetByName("Financeiro");
  if (!fs) {
    // Insere no FINAL para não virar a primeira aba (o site do cliente
    // lê a primeira aba via gviz; a aba Financeiro não pode "roubar" esse lugar).
    fs = ss.insertSheet("Financeiro", ss.getSheets().length);
    fs.appendRow(["data", "tipo", "cliente", "categoria", "descricao", "valor"]);
  } else if (fs.getLastRow() === 0) {
    fs.appendRow(["data", "tipo", "cliente", "categoria", "descricao", "valor"]);
  }
  return fs;
}

/** Lê todos os lançamentos da aba Financeiro (ignora linhas vazias). */
function readFinance(fs) {
  const vals = fs.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (!r.some((c) => String(c || "").trim() !== "")) continue;
    out.push({
      row: i + 1,
      data: String(r[0] || ""),
      tipo: String(r[1] || "venda").toLowerCase(),
      cliente: String(r[2] || ""),
      categoria: String(r[3] || ""),
      descricao: String(r[4] || ""),
      valor: parseFloat(r[5]) || 0,
    });
  }
  return out;
}

/** Monta a linha da planilha na ordem das colunas. */
function buildRow(headers, p) {
  const order = ["id", "nome", "marca", "genero", "linha", "familia", "preco", "estoque", "descricao", "imagem", "destaque", "novidade", "ativo"];
  return order.map((k) => {
    if (k === "destaque" || k === "novidade" || k === "ativo") {
      return p[k] ? "sim" : "nao";
    }
    return p[k] !== undefined ? p[k] : "";
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
