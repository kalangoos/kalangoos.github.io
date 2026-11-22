# Serviço de login (auth.kalangoos.com)

Um Cloudflare Worker pequeno que faz a única coisa que um site estático não pode fazer: guardar o segredo do app
OAuth do GitHub e trocar o código de autorização por um token. Ele também decide quem entra na área de membros
(`kalangoos.com/membros/`): **só membros ativos da organização `kalangoos` no GitHub**.

**Está no ar** em `auth.kalangoos.com` (app OAuth e segredos criados pelos mantenedores). O estado atual, como publicar
a versão corrigida (`npx wrangler deploy`), como conferir e como reverter estão em [SETUP.md](SETUP.md).

## Fluxo

```
kalangoos.com/membros/  ──"Entrar com o GitHub"──▶  auth.kalangoos.com/login
                                                     │ gera state + PKCE (S256), guarda os dois selados num cookie
                                                     ▼
                                       github.com/login/oauth/authorize  (read:org read:project)
                                                     │
                                                     ▼
                                     auth.kalangoos.com/callback?code&state
                                                     │ confere o state (cookie selado, 10 min, comparação em tempo constante)
                                                     │ troca o código + code_verifier pelo token (com o segredo)
                                                     │ GET /user  e  GET /user/memberships/orgs/kalangoos
                                       membro ativo? ├── sim ▶ cookie de sessão selado ▶ kalangoos.com/membros/
                                                     └── não ▶ revoga o token na hora ▶ kalangoos.com/membros/#/fora
```

Depois disso a página só faz três chamadas, todas com `credentials: 'include'`:

| Rota | O quê |
|---|---|
| `GET /session` | Quem está logado (login, nome, avatar). Confere a participação na organização **a cada chamada**: quem sai da organização perde o acesso na hora seguinte em que a página abrir. Se o GitHub não puder responder (403 de SAML SSO, 429 ou limite secundário, 5xx, rede), responde **503 sem apagar o cookie**: ninguém é desconectado por uma falha do GitHub |
| `GET /project` | O projeto da organização no GitHub Projects (v2), por consultas GraphQL **fixas** (`src/project-query.ts`); o Worker não repassa consultas arbitrárias com o token de ninguém. Pagina até 500 itens. A resposta também confere `viewerIsAMember` |
| `POST /logout` | Revoga o token no GitHub e apaga o cookie (exige `Origin: https://kalangoos.com`; de outra origem responde 403 e não toca no token) |

A conferência de participação tem **quatro** respostas, não duas: membro, não é membro (404 ou convite pendente), token
expirado (401) e **indisponível** (403, 429, 5xx, rede). Só as duas do meio tiram a sessão; no `/callback`, "indisponível"
vai para `#/erro` ("tente de novo"), e só "não é membro" vai para `#/fora`.

## Por que este desenho

- **O token nunca chega ao navegador.** Ele fica dentro do cookie de sessão, cifrado e autenticado com AES-256-GCM
  (`SESSION_KEY`, 32 bytes aleatórios), num cookie `__Host-kos_session` com `HttpOnly; Secure; SameSite=Strict;
  Path=/`, só do host `auth.kalangoos.com`. Nada vai para `localStorage` ou `sessionStorage`, e nenhum JavaScript da
  página consegue ler o cookie.
- **Sem banco de dados.** O cookie selado carrega a sessão (token, login, validade de 8 horas); não há KV nem D1 para
  configurar, e não há lista de sessões para vazar. O preço: uma sessão só termina antes das 8 horas pelo "Sair"
  (que revoga o token) ou quando a pessoa sai da organização (a conferência a cada chamada derruba a sessão).
- **Mesmo site, cookie estrito.** `auth.kalangoos.com` e `kalangoos.com` são o mesmo "site" para o navegador, então
  um cookie `SameSite=Strict` vai nas chamadas da página e em nenhuma vinda de outro site. Além disso, toda rota
  chamada pela página exige o cabeçalho `Origin: https://kalangoos.com` (CORS só para essa origem, com credenciais).
  Não é cookie de terceiros: navegadores que bloqueiam esses cookies não afetam o login.
- **Estado e PKCE.** O `state` aleatório (contra CSRF no login) e o `code_verifier` (PKCE S256) ficam num cookie
  `__Host-kos_oauth` selado para outro propósito (dados associados diferentes, então um não serve como o outro),
  `SameSite=Lax` porque precisa voltar na navegação do github.com para o `/callback`, e vale 10 minutos.
- **Escopos mínimos.** `read:org` (ver a própria participação na organização) e `read:project` (ler os projetos).
  Nenhum escopo de escrita, nem `repo`: a documentação e a especificação vêm do repositório público sem token.
- **Quem não é da organização não deixa rastro.** O token é revogado antes do redirecionamento e nenhuma sessão é
  gravada.
- **Sem redirecionamento aberto.** Depois do login, só caminhos de `/membros/` e `/en/members/` são aceitos
  (`safeNext`): lista fechada de caracteres (sem `\`, sem `%..`), sem `//` e sem segmentos `.` ou `..`.
- **Cabeçalhos.** Toda resposta leva `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  no-referrer` e `Strict-Transport-Security` (1 ano).
- **Logs.** O que vem de fora (o parâmetro `error` do GitHub, mensagens de exceção) é limpo e cortado em 60
  caracteres antes de ir para o log (`logSafe`). No `wrangler.toml`, `invocation_logs = false` desliga o registro de cada
  pedido, que traria a URL completa do `/callback` (com o `code` de uso único e o `state`); só ficam as linhas do próprio
  Worker.
- **Sem limite de pedidos próprio.** Use a regra de rate limit da Cloudflare (SETUP.md, 5b).

## O que a área de membros protege

A página é uma barreira de **interface** sobre conteúdo **público**: a documentação e a especificação vêm do repositório
público `kalangoos/kalangoos`, e qualquer pessoa as lê sem login. Só o quadro de tarefas (GitHub Projects) é protegido
de verdade, e essa conferência é feita aqui, no servidor. O texto da página não deve sugerir que os documentos são
privados.

## Alcance do token

`read:org` e `read:project` valem para todas as organizações e projetos da pessoa, não só os da `kalangoos`; o GitHub só
deixa escolher escopos, não organizações, num app OAuth. O token fica 8 horas num cookie selado e é revogado em "Sair" e
para quem não é da organização. O GitHub guarda até 10 tokens por pessoa e app: o 11º revoga o mais antigo, e um token
cuja revogação falhou continua válido até isso acontecer. Um **GitHub App** instalado só na organização (tokens de
usuário que expiram em 8 horas) reduziria o alcance; é a evolução a considerar (SETUP.md, "Alcance do token").

## Código

| Arquivo | O quê |
|---|---|
| `src/index.ts` | Rotas, CORS, conferência de participação, troca do código, revogação |
| `src/session.ts` | Cookies selados (AES-GCM), PKCE, leitura de cookies, comparação em tempo constante |
| `src/project-query.ts` | As duas consultas GraphQL (por número, ou o projeto aberto mais recente). Foram validadas contra o esquema real da API do GitHub em 19/11/2026: o único erro devolvido sem `read:project` é a falta do escopo |
| `wrangler.toml` | Nome, domínio e variáveis públicas. **Sem segredos** |

Testes: `npm test` na raiz do site roda `tests/worker.test.ts` (selagem, o fluxo de login com o GitHub substituído
por um stub HTTP, CORS, quem recebe sessão) e `tests/project.test.ts` (o mapeamento da resposta do Projects para as
colunas do quadro). O typecheck do Worker roda no `npm run build` do site.

## O que o site precisa

O endereço do serviço entra no build como `VITE_AUTH_URL` (público, não é segredo), no `site/.env.production`. Sem ele o
site mostra a área de membros como "ainda não conectada" e o botão Entrar com o selo "em breve".
