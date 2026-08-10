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
  SHEET_ID: "",

  EMAILJS: {
    PUBLIC_KEY: "",
    SERVICE_ID: "",
    TEMPLATE_ID: "",
  },

  STORE_EMAIL: "lairchicperfumes@gmail.com",
  WHATSAPP: "5521964173559",
  INSTAGRAM: "https://www.instagram.com/lairchic/",
  VOLUME: "25ml",
};
