# Etapa Final - Validacao Visual em Runtime (Tela por Tela)

## Objetivo

Validar UX e comportamento visual do app em runtime para fechar 100% da entrega.

## Ambiente de Execucao

1. Subir backend na pasta backend:
   - npm run dev
2. Confirmar API ativa:
   - GET http://localhost:3333/api/health retorna status ok
3. Rodar app Flutter na raiz do projeto:
   - flutter run
4. Para emulador Android, base URL esperada:
   - http://10.0.2.2:3333/api

## Regras de Aprovacao Geral

- Nenhuma tela pode travar ou fechar inesperadamente.
- Nenhum erro visual grave (overflow, flicker continuo, layout quebrado).
- Feedback claro para sucesso/erro (snackbar, loading, estados vazios).
- Navegacao consistente entre telas (voltar, abrir modal, fechar modal).
- Dados persistem apos refresh e reabertura de tela.

## Evidencias Minimas por Item

Para cada teste marcado como OK, registrar:

- Plataforma: Android emulator / Web / Desktop
- Resultado: OK ou NOK
- Evidencia: print ou video curto
- Observacao: descricao curta se houver ajuste sugerido

## Checklist por Tela

## 1) Autenticacao

1. Tela de login abre sem erros visuais.
2. Cadastro com dados validos cria conta e autentica.
3. Login com usuario valido entra no app.
4. Login com senha invalida mostra erro amigavel.
5. Token persistido: fechar e abrir app mantem sessao.
6. Logout retorna para tela de autenticacao.

Criterio de aprovacao:
- Fluxo cadastro/login/logout funcional com mensagens corretas.

## 2) Dashboard Principal

1. Cards de resumo carregam valores sem quebrar layout.
2. Graficos renderizam corretamente com dados reais.
3. Pull-to-refresh atualiza dados sem congelar UI.
4. Estado vazio (usuario novo) aparece com mensagem coerente.
5. Tema/cores/contraste legiveis em toda tela.

Criterio de aprovacao:
- Dashboard informativo e responsivo, sem erro de renderizacao.

## 3) Transacoes

1. Listagem carrega com skeleton/loading e resultado final.
2. Criar transacao (entrada e saida) funciona.
3. Editar transacao atualiza na lista.
4. Excluir transacao remove da lista.
5. Filtros por tipo e periodo funcionam.
6. Gerenciar categorias (criar/editar/excluir personalizada) funciona.
7. Categorias padrao aparecem como somente leitura.

Criterio de aprovacao:
- CRUD completo de transacoes e categorias operando sem inconsistencias.

## 4) Metas

1. Criar meta com valor e prazo.
2. Editar progresso/valor da meta.
3. Excluir meta.
4. Percentual/progresso exibe valor coerente.
5. Estado vazio amigavel quando nao houver metas.

Criterio de aprovacao:
- Fluxo de metas completo e visualmente consistente.

## 5) Familia

1. Criar grupo familiar.
2. Entrar em grupo por codigo de convite (com segunda conta).
3. Listagem de grupos atualiza apos criar/entrar.
4. Dashboard do grupo abre com totais corretos.
5. Ranking de membros renderiza sem quebra.
6. Filtros de tipo e periodo em ultimas transacoes funcionam.
7. Botao Nova transacao do grupo cria transacao com sucesso.
8. Dashboard recarrega apos criar transacao no grupo.
9. Botao de refresh manual do dashboard funciona.

Criterio de aprovacao:
- Fluxo colaborativo de familia funcional e atualizado em tempo real.

## 6) Modulos Inteligentes

1. Analytics abre com totais e insights.
2. Prediction exibe futureBalance.
3. Alerts apresenta alerta ou estado saudavel.
4. Profile financeiro retorna classificacao.
5. Gamification exibe nivel/pontos.
6. Simulation responde a parametros.
7. Advisor retorna recomendacoes.

Criterio de aprovacao:
- Todas as views inteligentes carregam sem falha de UX.

## 7) Responsividade e Navegacao

1. Testar em pelo menos 2 tamanhos de tela.
2. Verificar wraps, chips, cards e modais sem overflow.
3. Confirmar scroll em listas longas.
4. Confirmar navegacao de ida e volta sem perda indevida de estado.

Criterio de aprovacao:
- Experiencia estavel em tamanhos diferentes de viewport.

## 8) Teste de Regressao Rapida

1. Criar categoria personalizada.
2. Criar transacao com essa categoria.
3. Criar meta.
4. Criar grupo e abrir dashboard.
5. Rodar refresh geral do app.

Criterio de aprovacao:
- Nenhuma funcionalidade critica quebrada apos sequencia completa.

## Relatorio Final de Fechamento

Ao concluir o checklist, emitir resumo com:

- Itens OK: quantidade
- Itens NOK: quantidade
- Bugs criticos: lista curta
- Bugs medios: lista curta
- Decisao: Aprovado para deploy ou Pendente de correcao

## Observacao Importante

Este checklist valida UX em runtime. Ele complementa (nao substitui) as validacoes tecnicas ja executadas:

- flutter analyze
- flutter test
- npm run build
- smoke test de API ponta a ponta
