# D’Leite Vegetal – Sistema Social

Aplicação web moderna (Node.js + SQLite) para coordenar a distribuição social do D’Leite Vegetal. Suporta múltiplos perfis (i9, Associações de Bairro e Consumidores via QR) e é multilíngue (Português/Inglês).

## Sumário
- Visão Geral
- Funcionalidades por Perfil
- Arquitetura & Tecnologias
- Instalação e Execução
- Banco de Dados & Esquema
- Comandos Úteis
- Rotas Principais (UI)
- Fluxo dos QRs
- Internacionalização (i18n)
- Validações & Segurança
- Estrutura do Projeto
- Solução de Problemas (FAQ)
- Roadmap
- Licença

## Visão Geral
O sistema conecta i9 (administração), Associações de Bairro e Consumidores finais para garantir a produção, alocação e consumo do D’Leite Vegetal com transparência (QR codes), rastreabilidade e foco social.

## Funcionalidades por Perfil
- i9 (administração):
  - Criar associações e usuários (i9/associação)
  - Criar produtores (CNPJ) e lotes (validade e quantidade)
  - Visualizar pedidos e alocar parcial/totalmente a partir de lotes
  - Gerar e visualizar QR codes (modo informação no i9: não consome)
- Associações de Bairro:
  - Solicitar pedidos de leite vegetal
  - Acompanhar status (pending / partial / fulfilled)
- Consumidor:
  - Ler QR em `http://localhost:3000/scan/<token>` para marcar consumo (sem login)

## Arquitetura & Tecnologias
- Node.js + Express 5 (servidor HTTP e rotas)
- SQLite (`sqlite3`) para persistência
- Sessões com `express-session` + `connect-sqlite3`
- EJS para views server-side
- i18next (FS backend + middleware) para i18n
- `qrcode` para gerar imagens DataURL (QRs)

## Instalação e Execução
Pré‑requisito: Node.js 18+

1) Instalar dependências
```bash
npm install
```

2) Ambiente de desenvolvimento (watch)
```bash
npm run dev
```

3) Produção simples
```bash
npm start
```

4) Acessar
- http://localhost:3000

5) Contas de Demonstração
- i9: `admin@example.com` / `admin123`
- Associação: `assoc@example.com` / `assoc123`

## Banco de Dados & Esquema
- Arquivos: `data/app.sqlite` (principal) e `data/sessions.sqlite` (sessões).
- Seed inicial ao primeiro start:
  - Associação: Bairro Central
  - Produtor: VerdeLeite
  - Lote: BATCH-001 (100 unidades)
  - Pedido: 40 unidades (parcialmente atendido ~30% = 12 QRs)

Tabelas (resumo):
- users: id, name, email, password_hash, role (i9/association), association_id
- associations: id, neighborhood_name, president_name, email, phone
- producers: id, cnpj, name
- batches: id, batch_number, producer_id, expiry_date, quantity_produced
- orders: id, association_id, quantity_requested, status (pending/partial/fulfilled)
- fulfillments: id, order_id, batch_id, quantity_allocated
- qr_codes: id, token, batch_id, order_id, association_id, status (issued/consumed), consumed_at

## Comandos Úteis
- Desenvolvimento com watch: `npm run dev`
- Forçar reinício do watch: `npm run dev:restart`
- Resetar banco (remove `data/*.sqlite`): `npm run db:reset`
- Listar usuários: `npm run users:list`
- Adicionar dados extras (associações/produtores/lotes/pedidos/QRs): `npm run seed:more`

## Rotas Principais (UI)
- Público
  - `/` (início) – apresentação e CTAs
  - `/consume` – leitor rápido (câmera + token manual)
  - `/scan-test` – leitor fullscreen (público)
  - `/scan/:token` – consumo (marca como consumido e exibe informações)
  - `/scan/info/:token` – somente informações (não consome)
- i9
  - `/admin` – painel i9 (dashboard)
  - `/admin/associations`, `/admin/users`, `/admin/producers`, `/admin/batches`, `/admin/orders`
  - `/admin/orders/:id/qrcodes` – visualizar QRs gerados
  - `/admin/qrtest` – teste de leitura (somente informação)
  - `/admin/settings` – seleção de idioma e ajustes
- Associação
  - `/assoc` e `/assoc/orders` – criar pedidos e acompanhar status

## Fluxo dos QRs
1) i9 aloca N unidades de um lote para um pedido de associação → gera N tokens/QRs.
2) A página de QRs permite baixar/imprimir e compartilhar para o consumidor final.
3) Consumidor acessa `/scan/<token>` → status muda para “consumed” e exibe informações do lote.
4) No i9, o teste usa `/scan/info/<token>` (somente leitura, sem consumo).

## Internacionalização (i18n)
- Padrão: Português (pt).
- Alternar via querystring `?lng=pt`/`?lng=en` ou pela página de Configurações no i9.
- Arquivos de tradução: `src/locales/pt.json`, `src/locales/en.json`.

## Validações & Segurança
- Telefone (Associações): somente dígitos (10–15) – validado no servidor e `pattern` no input.
- CNPJ (Produtores): validação completa de CNPJ no servidor + `pattern` no input (14 dígitos).
- Senhas com `bcryptjs`. Em produção, aplique HTTPS e troque o segredo de sessão em `src/server.js`.
- Sessões em SQLite; ajuste tempo de expiração conforme demanda.

## Estrutura do Projeto
```
src/
  server.js              # Express, sessões, i18n e estáticos
  db.js                  # SQLite, schema e seed
  locales/               # Traduções (pt/en)
  middleware/auth.js     # Autenticação e papéis (i9/associação)
  routes/                # auth, admin (i9), assoc, scan
  views/                 # EJS (páginas e parciais)
  public/
    css/styles.css       # Tema claro esverdeado e layout responsivo
    js/ui.js             # Ripple, sidebar (mobile/desktop), seleção de idioma
data/
  app.sqlite             # Criado em runtime
  sessions.sqlite        # Criado em runtime
```

## Solução de Problemas (FAQ)
- “Leitor de câmera não abre no navegador” → verifique permissões de câmera, use `https` quando for necessário (alguns navegadores exigem).
- “Token já consumido e sem dados” → recarregue a página; o sistema agora recarrega informações do lote mesmo em “consumed”.
- “Depois de mudar o idioma, não aplicou” → a seleção usa cookie; navegue para outra página ou recarregue (Ctrl/Cmd+R).
- “CSS não atualiza” → use hard refresh (Ctrl/Cmd+Shift+R).
- “Quero recomeçar do zero” → `npm run db:reset && npm run dev`.

## Roadmap
- Exportação/planilha de QRs (PDF/CSV) com layout de impressão
- Restrições de alocação por estoque do lote e relatórios
- Dashboard com métricas e gráficos mais ricos
- Recuperação de senha e política de senhas fortes
- Upload/armazenamento de comprovantes e auditoria

## Licença
ISC (veja `package.json`).
