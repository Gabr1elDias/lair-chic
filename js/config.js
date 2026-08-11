/**
 * Configuração da L'air Chic
 * ─────────────────────────────────────────────────────────
 * GOOGLE SHEETS
 * 1. Crie uma planilha com as colunas do arquivo data/produtos-exemplo.csv
 * 2. Arquivo → Compartilhar → "Qualquer pessoa com o link" → Leitor
 * 3. Copie o ID da URL: docs.google.com/spreadsheets/d/ESTE_ID/edit
 * 4. Cole em SHEET_ID abaixo
 *
 * EMAILJS (grátis — emailjs.com)
 * 1. Crie conta e adicione serviço de e-mail (Gmail)
 * 2. Crie template com variáveis: customer_name, order_items, order_total, observation
 * 3. Destino do template: lairchicperfumes@gmail.com
 * 4. Preencha PUBLIC_KEY, SERVICE_ID e TEMPLATE_ID abaixo
 */
const CONFIG = {
  SHEET_ID: "1EwGkle7zBDobu2S2OO8sztV9ckpT9LV3-GO3jfE16nU",

  EMAILJS: {
    PUBLIC_KEY: "",
    SERVICE_ID: "",
    TEMPLATE_ID: "",
  },

  // Senha de acesso ao Painel Admin (admin.html).
  // ⚠️ Proteção simples e provisória: por ser um site estático, quem
  // inspecionar o código no navegador consegue ver a senha. A segurança
  // de verdade será definida depois (SETUP.txt, seção 6).
  // Troque pelo valor que desejar.
  ADMIN_PASSWORD: "lairchic2025",

  // URL do Google Apps Script (conexão do Painel Admin com a planilha).
  // Como configurar: veja admin/appsscript.js e SETUP.txt (seção 6).
  // ⚠️ Necessária também para o site do cliente baixar o estoque
  // automaticamente na planilha quando um pedido é confirmado.
  // Enquanto estiver vazio, o estoque não é atualizado automaticamente.
  ADMIN_API_URL: "https://script.google.com/macros/s/AKfycbyHuCbJ9fyjOIa-7jz_LpkT2_AoaT3flRd1LQBQ1b_RM-WPMKBS82k-A4xKVMeU2-0i/exec",

  STORE_EMAIL: "lairchicperfumes@gmail.com",
  WHATSAPP: "5521964173559",
  INSTAGRAM: "https://www.instagram.com/lairchic/",
  VOLUME: "25ml",
};
