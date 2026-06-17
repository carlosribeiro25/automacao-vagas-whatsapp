# Frontend - Mapa de Implementacoes

## 1) Objetivo do frontend
- [ ] Criar um painel web para autenticar usuarios, gerenciar perfil, consultar vagas, processar imagem com IA e operar conexoes WhatsApp (QR + grupos + status em tempo real).
- [ ] Garantir compatibilidade com API atual (JWT de 30m + refresh token em cookie httpOnly, SSE para eventos WhatsApp, regras de role).

## 2) Stack e arquitetura base (prioridade alta)
- [ ] Criar app com React + Vite + TypeScript.
- [ ] Configurar React Router com layout publico e layout autenticado.
- [ ] Configurar React Query (ou SWR) para cache, retry, invalidação e estados de carregamento.
- [ ] Configurar cliente HTTP com `baseURL`, `withCredentials: true` e injeção de `Authorization: Bearer <accessToken>`.
- [ ] Implementar camada `services/api` separada por dominio: `auth`, `users`, `vagas`, `vision`, `whatsapp`.
- [ ] Criar pasta de tipos compartilhados para contratos de request/response da API.
- [ ] Configurar Zod no frontend para validacao de formularios e parse seguro de respostas criticas.

## 3) Modelo de estado global (auth + sessao)
- [ ] Criar store de autenticacao contendo: `accessToken`, `user`, `isAuthenticated`, `isRefreshing`, `sessionExpired`.
- [ ] Persistir somente `accessToken` e `user` (nao persistir refresh token, pois ele e cookie httpOnly).
- [ ] Implementar bootstrap da sessao ao abrir o app:
- [ ] 1. Tentar usar `accessToken` atual.
- [ ] 2. Se token ausente/expirado, chamar `POST /refresh` com credenciais.
- [ ] 3. Em sucesso, salvar novo `accessToken`; em falha, limpar sessao e redirecionar login.
- [ ] Implementar fila de retry para requests que falharam com 401 enquanto refresh esta em andamento.

## 4) Rotas e paginas (mapa completo)

### 4.1 Publicas
- [ ] `/login` - formulario email/senha.
- [ ] `/cadastro` - formulario de criacao de usuario.
- [ ] `/esqueci-senha` - solicita token de reset por email.
- [ ] `/reset-senha?token=...` - define nova senha com token.

### 4.2 Privadas
- [ ] `/dashboard` - resumo geral (atalhos para Vagas, Vision e WhatsApp).
- [ ] `/perfil` - edicao de email, phone, picture e senha.
- [ ] `/vagas` - listagem paginada com busca e filtros.
- [ ] `/vagas/:id` - detalhe da vaga.
- [ ] `/vision` - upload de imagem para extracao de vaga.
- [ ] `/whatsapp` - central de conexoes WhatsApp.
- [ ] `/whatsapp/:connectionId` - detalhe da conexao, QR/status/eventos e selecao de grupos.

## 5) Fluxos de autenticacao e usuario

### 5.1 Login
- [ ] Integrar `POST /login`.
- [ ] Salvar `token` retornado como access token.
- [ ] Salvar `user` retornado (id, name, email, phone, picture).
- [ ] Tratar erro 400 com mensagem de credenciais invalidas.

### 5.2 Cadastro
- [ ] Integrar `POST /registerUser` com campos: `name`, `email`, `phone`, `password`.
- [ ] Opcional para admin: permitir envio de `role` (`user` ou `manager`).
- [ ] Tratar `409` (email duplicado) e `400` (dados invalidos).

### 5.3 Refresh e expiracao de sessao
- [ ] Integrar `POST /refresh` sem body, usando cookie automaticamente.
- [ ] Atualizar access token com `accessToken` retornado.
- [ ] Tratar `401` (refresh invalido/expirado) com logout forçado.

### 5.4 Logout
- [ ] Integrar `POST /logout`.
- [ ] Limpar estado local da sessao e redirecionar para login.
- [ ] Considerar resposta `204` sem body como sucesso.

### 5.5 Recuperacao de senha
- [ ] Integrar `POST /forgot-password`.
- [ ] Exibir sempre mensagem neutra de sucesso (endpoint sempre retorna 200 para evitar enumeracao de email).
- [ ] Integrar `POST /reset-password` com `token` e `newPassword`.
- [ ] Tratar erro `400` para token invalido/expirado.

### 5.6 Atualizacao de perfil
- [ ] Integrar `PATCH /updateUser/:id` (rota protegida).
- [ ] Permitir atualizar `email`, `phone`, `picture` e `password`.
- [ ] Tratar `404` (usuario nao encontrado), `409` (email ja cadastrado) e `400`.

## 6) Modulo de vagas

### 6.1 Listagem e paginacao
- [ ] Integrar `GET /vagas?page=&limit=`.
- [ ] Tratar retorno `404` como estado vazio (sem vagas).
- [ ] Usar `hasMore`, `total` e `page` para paginação/infinite scroll.

### 6.2 Filtros
- [ ] Integrar `GET /vagas/filtros` com query params opcionais:
- [ ] `category`, `modality`, `tipo_vaga`, `location`, `publisheAt`.
- [ ] Criar UI com filtros combinados e botao limpar filtros.
- [ ] Tratar `404` como "nenhuma vaga para o filtro aplicado".

### 6.3 Busca textual
- [ ] Integrar `GET /search?q=&page=&limit=`.
- [ ] Aplicar debounce no campo de busca.
- [ ] Tratar `404` como "nenhum resultado encontrado".

### 6.4 Detalhe
- [ ] Integrar `GET /vagas/:id`.
- [ ] Tratar `404` com estado de nao encontrado.

### 6.5 Criacao manual (opcional no MVP)
- [ ] Criar tela/formulario para `POST /register` com campos completos da vaga.
- [ ] Validar `is_job` obrigatorio.

### 6.6 Exclusao por role
- [ ] Integrar `DELETE /vagas/:id`.
- [ ] Exibir botao de excluir somente para `role=manager`.
- [ ] Tratar `401` como falta de permissao.

## 7) Modulo Vision (upload de imagem)
- [ ] Criar formulario com upload multipart (`file`).
- [ ] Integrar `POST /vision/test`.
- [ ] Tratar `400` quando arquivo nao enviado.
- [ ] Se `success=false` e mensagem "Nao e vaga", exibir feedback claro sem quebrar fluxo.
- [ ] Se `success=true`, mostrar dados extraidos e confirmar que a vaga foi processada.
- [ ] Exibir preview da imagem enviada e estado de processamento.

## 8) Modulo WhatsApp (core do produto)

### 8.1 Listagem e criacao de conexoes
- [ ] Integrar `GET /whatsapp/connections`.
- [ ] Integrar `POST /whatsapp/connections`.
- [ ] Exibir status por conexao: `pending`, `qr_ready`, `authenticated`, `ready`, `disconnected`, `failed`.

### 8.2 Inicializacao da conexao
- [ ] Integrar `POST /whatsapp/connections/:id/start`.
- [ ] Mostrar transicao de estado apos iniciar (normalmente volta `pending` inicialmente).
- [ ] Tratar `404` para conexao inexistente/sem ownership do usuario.

### 8.3 Eventos em tempo real via SSE
- [ ] Integrar `GET /whatsapp/connections/:id/events` com EventSource autenticado.
- [ ] Interpretar eventos:
- [ ] `event: status` com payload de status.
- [ ] `event: qr` com payload contendo QR.
- [ ] `event: error` com mensagem de falha (auth_failure etc).
- [ ] No evento inicial, renderizar status atual e ultimo QR (`lastQr`) quando existir.
- [ ] Implementar reconexao automatica do SSE em queda de rede.
- [ ] Fechar stream ao sair da tela para evitar leaks.

### 8.4 Sincronizacao e selecao de grupos
- [ ] Integrar `GET /whatsapp/connections/:id/groups`.
- [ ] Tratar `409` para conexao nao iniciada ou ainda nao pronta.
- [ ] Exibir lista de grupos/canais elegiveis com checkbox de `selected`.
- [ ] Integrar `POST /whatsapp/connections/:id/groups/select` com array `groupIds`.
- [ ] Atualizar UI local apos salvar selecao com feedback de sucesso.

### 8.5 Desconectar conexao
- [ ] Integrar `POST /whatsapp/connections/:id/disconnect`.
- [ ] Atualizar status para `disconnected` na UI.

## 9) Controle de acesso e seguranca no frontend
- [ ] Proteger rotas privadas por autenticacao.
- [ ] Implementar guard de role para recursos de manager.
- [ ] Nao expor refresh token (ele deve ficar apenas em cookie httpOnly).
- [ ] Garantir envio de credenciais em requests que dependem de cookie (`withCredentials`).
- [ ] Em 401 recorrente, invalidar sessao local e redirecionar para login.

## 10) UX, estados e feedback visual
- [ ] Criar estados padrao por tela: loading, vazio, erro e sucesso.
- [ ] Padronizar mensagens para 400/401/404/409.
- [ ] Adotar toasts para acao de criar/atualizar/excluir/conectar.
- [ ] Adicionar confirmacao para acoes destrutivas (exclusao e desconexao).
- [ ] Melhorar acessibilidade: labels, foco, teclado, contraste.
- [ ] Garantir responsividade desktop/mobile nas telas principais.

## 11) Observabilidade e qualidade de codigo
- [ ] Criar logger central de erros da camada HTTP no frontend.
- [ ] Monitorar erros de SSE e reconexoes do WhatsApp.
- [ ] Padronizar tratamento de erro de API com utilitario unico.

## 12) Testes frontend
- [ ] Unitarios de hooks/services (auth refresh, parser de erros, SSE handlers).
- [ ] Testes de componentes para formularios (login, cadastro, reset, filtros).
- [ ] Testes de integracao para guardas de rota e fluxo de refresh.
- [ ] E2E dos fluxos criticos:
- [ ] login -> dashboard.
- [ ] criar conexao WhatsApp -> iniciar -> receber QR via SSE.
- [ ] sincronizar grupos -> selecionar grupos.
- [ ] buscar e filtrar vagas.

## 13) Checklist de pronto para deploy do frontend
- [ ] Variaveis de ambiente definidas (`VITE_API_URL`, etc.).
- [ ] Confirmar CORS + credentials funcionando com dominio real do frontend.
- [ ] Build de producao sem erros de tipagem/lint.
- [ ] Revisar fallback de sessao expirada em todas as rotas privadas.
- [ ] Homologar fluxo completo de WhatsApp em ambiente real.

## 14) Ordem sugerida de implementacao (roadmap)
- [ ] Fase 1: base do projeto + auth + guards + refresh.
- [ ] Fase 2: vagas (lista, busca, filtros, detalhe).
- [ ] Fase 3: recuperacao de senha + perfil.
- [ ] Fase 4: vision upload.
- [ ] Fase 5: WhatsApp completo (connections, SSE, groups, disconnect).
- [ ] Fase 6: testes E2E + hardening de UX e erros.

## 15) Plano de sprint (implementacao sugerida)

### Sprint 0 - Setup tecnico (2 a 3 dias)
- [ ] Criar base React + Vite + TypeScript.
- [ ] Configurar roteamento, estrutura de pastas e padrao de componentes.
- [ ] Configurar cliente HTTP com `baseURL`, `withCredentials` e header bearer.
- [ ] Configurar React Query e tratamento de erro central.
- [ ] Definir tema visual, componentes base e layout responsivo.

Entregaveis da sprint:
- [ ] App inicia com layout publico/privado.
- [ ] Camada de API pronta para consumo.
- [ ] Infra minima de UX (loading/erro/toast) funcionando.

### Sprint 1 - Auth + sessao (4 a 5 dias)
- [ ] Tela de login integrada ao `POST /login`.
- [ ] Tela de cadastro integrada ao `POST /registerUser`.
- [ ] Fluxo de refresh com `POST /refresh` + fila de retry para 401.
- [ ] Logout integrado ao `POST /logout`.
- [ ] Guards de rota privada e controle por role (`user`/`manager`).

Entregaveis da sprint:
- [ ] Usuario autentica e navega em rotas privadas.
- [ ] Sessao se recupera automaticamente apos expirar access token.
- [ ] Sessao invalida redireciona corretamente para login.

### Sprint 2 - Vagas (4 a 6 dias)
- [ ] Listagem paginada com `GET /vagas`.
- [ ] Filtros com `GET /vagas/filtros`.
- [ ] Busca com debounce usando `GET /search`.
- [ ] Tela de detalhe com `GET /vagas/:id`.
- [ ] Acao de exclusao para manager com `DELETE /vagas/:id`.

Entregaveis da sprint:
- [ ] Fluxo completo de consulta de vagas funcionando.
- [ ] Estados vazio/erro carregando padronizados.
- [ ] Role manager habilita exclusao com confirmacao.

### Sprint 3 - Usuario (2 a 3 dias)
- [ ] Tela de esqueci senha com `POST /forgot-password`.
- [ ] Tela de reset senha com `POST /reset-password`.
- [ ] Tela de perfil com `PATCH /updateUser/:id`.

Entregaveis da sprint:
- [ ] Recuperacao de senha ponta a ponta.
- [ ] Atualizacao de perfil validada e com feedback de erro/sucesso.

### Sprint 4 - Vision (2 a 3 dias)
- [ ] Tela de upload multipart para `POST /vision/test`.
- [ ] Renderizacao do retorno `success=true` com dados extraidos.
- [ ] Tratamento explicito para `success=false` (Nao e vaga).

Entregaveis da sprint:
- [ ] Fluxo de analise por imagem operacional.
- [ ] Mensageria clara para cenarios sem vaga.

### Sprint 5 - WhatsApp (5 a 7 dias)
- [ ] Lista e criacao de conexoes (`GET/POST /whatsapp/connections`).
- [ ] Start de conexao (`POST /whatsapp/connections/:id/start`).
- [ ] SSE de eventos (`GET /whatsapp/connections/:id/events`) com reconexao.
- [ ] Sincronizacao de grupos (`GET /whatsapp/connections/:id/groups`).
- [ ] Selecao de grupos (`POST /whatsapp/connections/:id/groups/select`).
- [ ] Disconnect (`POST /whatsapp/connections/:id/disconnect`).

Entregaveis da sprint:
- [ ] Fluxo completo QR -> status -> grupos selecionados.
- [ ] UI resiliente a status `pending`, `qr_ready`, `authenticated`, `ready`, `disconnected`, `failed`.

### Sprint 6 - Qualidade + go-live (3 a 5 dias)
- [ ] Testes unitarios de hooks/services.
- [ ] Testes de integracao de auth/guard.
- [ ] E2E dos fluxos criticos (login, vagas, WhatsApp).
- [ ] Revisao final de acessibilidade, responsividade e mensagens de erro.
- [ ] Checklist de producao validado com ambiente real.

Entregaveis da sprint:
- [ ] Frontend com cobertura de fluxos criticos.
- [ ] Release pronta para homologacao/production.

## 16) Estimativa macro (visao executiva)
- [ ] Cenario enxuto (1 dev): 22 a 32 dias uteis.
- [ ] Cenario ideal (2 devs): 12 a 18 dias uteis.
- [ ] Buffer recomendado para ajustes de integracao WhatsApp/SSE: +15%.

## 17) Definicao de pronto (DoD)
- [ ] Cada tela com loading, erro e estado vazio.
- [ ] Todas as chamadas autenticadas com refresh funcional.
- [ ] Sem erros de lint/typecheck no build.
- [ ] Fluxos criticos validados em ambiente de homologacao.
- [ ] QA basico de mobile/desktop concluido.

## 18) Sprint 1 detalhada por dia (Auth + sessao)

### D1 - Base de autenticacao
- [ ] Criar store de auth com estado minimo: `accessToken`, `user`, `isAuthenticated`, `isRefreshing`.
- [ ] Implementar cliente HTTP com injeção de bearer token.
- [ ] Configurar `withCredentials` para rotas que dependem de cookie de refresh.
- [ ] Criar utilitario de logout local para limpar sessao.

Criterio de pronto do D1:
- [ ] Requests autenticadas saem com bearer quando token existir.
- [ ] Sessao pode ser limpa de forma centralizada.

### D2 - Login e persistencia de sessao
- [ ] Implementar tela `/login` com validacao de formulario.
- [ ] Integrar `POST /login`.
- [ ] Salvar `token` e `user` retornados.
- [ ] Redirecionar usuario autenticado para rota privada inicial.
- [ ] Tratar erro de credenciais invalidas (status 400) com mensagem amigavel.

Criterio de pronto do D2:
- [ ] Login completo funcionando ponta a ponta.
- [ ] Reload da pagina mantem sessao quando access token existir.

### D3 - Cadastro + guardas de rota
- [ ] Implementar tela `/cadastro` com validacoes de nome, email, telefone e senha.
- [ ] Integrar `POST /registerUser`.
- [ ] Tratar `409` (email duplicado) e `400` (dados invalidos).
- [ ] Implementar componente de rota privada (guard) com redirecionamento para login.
- [ ] Implementar guard de role para recursos de manager.

Criterio de pronto do D3:
- [ ] Usuario cria conta e consegue logar em seguida.
- [ ] Rotas privadas bloqueiam acesso sem sessao.

### D4 - Refresh token e retry de 401
- [ ] Implementar chamada `POST /refresh` sem body.
- [ ] Implementar interceptador para tentar refresh ao receber 401.
- [ ] Criar fila para evitar multiplos refresh simultaneos.
- [ ] Repetir request original apos refresh bem-sucedido.
- [ ] Encerrar sessao quando refresh falhar com 401.

Criterio de pronto do D4:
- [ ] Sessao recupera automaticamente quando access token expira.
- [ ] Nao ocorre loop infinito de refresh.

### D5 - Logout + estabilizacao da sprint
- [ ] Integrar `POST /logout` e limpar sessao local.
- [ ] Ajustar UX de auth: loading, disable de botao e mensagens padronizadas.
- [ ] Revisar casos de erro (400/401/409) em login/cadastro/refresh.
- [ ] Criar testes unitarios minimos para store auth e interceptador.
- [ ] Criar smoke test de navegacao para rota privada.

Criterio de pronto do D5:
- [ ] Fluxo login -> rota privada -> refresh -> logout validado.
- [ ] Sprint 1 pronta para iniciar Sprint 2 (modulo vagas).

## 19) Importacao no Notion
- [ ] Arquivo pronto para import: `notion-sprint1-backlog.csv`.
- [ ] Colunas do CSV: Tarefa, Sprint, Dia, Tipo, Status, Prioridade, EstimativaHoras, Responsavel, Dependencias, Endpoint, Observacoes.
- [ ] Sugestao de status no Notion: Todo, Doing, Review, Done.
