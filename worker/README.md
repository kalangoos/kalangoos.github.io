# Serviço de login (auth.kalangoos.com)

Um Cloudflare Worker pequeno que faz a única coisa que um site estático não pode fazer: guardar o segredo do app
OAuth do GitHub e trocar o código de autorização por um token. Ele também decide quem entra na área de membros
(`kalangoos.com/membros/`): **só membros ativos da organização `kalangoos` no GitHub**.

Nada aqui está no ar ainda. O que precisa ser criado (app OAuth, Worker, domínio, segredos) está em
[SETUP.md](SETUP.md), para ser aprovado e feito por quem administra as contas.

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
| `GET /session` | Quem está logado (login, nome, avatar). Confere a participação na organização **a cada chamada**: quem sai da organização perde o acesso na hora seguinte em que a página abrir |
| `GET /project` | O projeto da organização no GitHub Projects (v2), por consultas GraphQL **fixas** (`src/project-query.ts`); o Worker não repassa consultas arbitrárias com o token de ninguém. Pagina até 500 itens. A resposta também confere `viewerIsAMember` |
| `POST /logout` | Revoga o token no GitHub e apaga o cookie |

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
- **Sem redirecionamento aberto.** Depois do login, só caminhos dentro de `/membros/` são aceitos (`safeNext`).

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

O endereço do serviço entra no build como `VITE_AUTH_URL` (público, não é segredo). Sem ele, o site mostra a área
de membros como "ainda não conectada" e o botão Entrar com o selo "em breve" — é o estado de hoje.
