# Área de membros: o login (Worker) e como operá-lo

## Estado atual

O login **já está ligado**: o app OAuth da organização `kalangoos` e os segredos (`GITHUB_CLIENT_SECRET`, `SESSION_KEY`)
foram criados pelos mantenedores, o Worker `kalangoos-auth` está em `auth.kalangoos.com`, o Client ID
(`Ov23li2ofReAsPovr4nn`, público) está em `wrangler.toml` e `site/.env.production` aponta o site para o serviço.

**O que falta ao publicar este código:** o Worker no ar ainda tem a versão **anterior** à revisão de segurança (sem o
estado "GitHub indisponível", sem HSTS, com `safeNext` antigo e logs de cada pedido). Para colocar a corrigida:

```sh
cd site/worker
npm ci
npx wrangler login        # se ainda não estiver autenticado
npx wrangler deploy       # os segredos já existem e persistem; nada a recriar
```

Depois, rode as verificações da seção "5. Conferir" e, se algo sair errado, volte com `npx wrangler rollback`
(restaura a versão anterior do Worker). Para desligar só a interface sem mexer no Worker, apague `site/.env.production`
e publique o site: `/membros/` volta a "em breve" e não chama o serviço.

As seções 1 a 4 abaixo registram **como o serviço foi criado**, para refazê-lo (outra conta, outro domínio) ou conferir
o que existe. As seções 5a, 5b e 5 valem sempre.

## 1. App OAuth no GitHub (da organização): já criado

GitHub › organização **kalangoos** › Settings › Developer settings › OAuth Apps › **New OAuth App**
(`https://github.com/organizations/kalangoos/settings/applications/new`).

| Campo | Valor |
|---|---|
| Application name | `KalangoOS · área de membros` |
| Homepage URL | `https://kalangoos.com` |
| Application description | `Login da área de membros do kalangoos.com (só leitura).` |
| Authorization callback URL | `https://auth.kalangoos.com/callback` |
| Enable Device Flow | desligado |

Os escopos não se configuram no app: o Worker pede `read:org read:project` em cada login (veja `SCOPES` em
`src/index.ts`).

Por que um app OAuth e não um GitHub App: o quadro lê o GitHub Projects (v2) da organização com a permissão de quem
entrou, e o escopo `read:project` é o caminho direto para isso; um GitHub App precisaria ser instalado na
organização com a permissão "Projects: read" e ainda assim usaria o token da pessoa.

## 2. Client ID e segredo: já feitos

Na página do app: copie o **Client ID** e clique em **Generate a new client secret** (o GitHub mostra o segredo uma
vez só; não o cole em nenhum arquivo do repositório).

- Client ID: público. Coloque em `site/worker/wrangler.toml`, em `GITHUB_CLIENT_ID = "..."` (num pull request).
- Client secret: vai para a Cloudflare no passo 4.

## 3. Publicar o Worker (primeira vez; depois, só `wrangler deploy`)

```sh
cd site/worker
npm install                       # wrangler (só neste diretório)
npx wrangler login                # abre o navegador na conta da Cloudflare de kalangoos.com
npx wrangler deploy               # cria o Worker "kalangoos-auth" e o domínio auth.kalangoos.com
```

O `wrangler.toml` já declara `auth.kalangoos.com` como **Custom Domain** do Worker: a Cloudflare cria sozinha o
registro DNS (proxied) e o certificado. Confira em Cloudflare › Workers & Pages › kalangoos-auth › Settings ›
Domains & Routes. Se preferir criar à mão: DNS › Add record › tipo `AAAA`, nome `auth`, conteúdo `100::`, proxy
ligado, e uma rota `auth.kalangoos.com/*` para o Worker.

Variáveis públicas (já no `wrangler.toml`): `ORG = "kalangoos"`, `SITE_ORIGIN = "https://kalangoos.com"`,
`AUTH_ORIGIN = "https://auth.kalangoos.com"`, `GITHUB_CLIENT_ID`, e opcionalmente `PROJECT_NUMBER` (o número do
projeto da organização que o quadro mostra; vazio = o projeto aberto atualizado por último).

## 4. Segredos: já guardados

```sh
npx wrangler secret put GITHUB_CLIENT_SECRET     # cole o client secret do passo 2
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put SESSION_KEY
```

| Segredo | O quê |
|---|---|
| `GITHUB_CLIENT_SECRET` | O segredo do app OAuth |
| `SESSION_KEY` | 32 bytes aleatórios em base64url; cifram os cookies. Trocar a chave desloga todo mundo |

Até os três (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_KEY`) existirem, o Worker responde 503 a tudo.

## 5a. Permitir o app na organização (OAuth e SAML SSO)

- **Restrição de apps OAuth.** Se a organização usa "OAuth app access restrictions" (Settings › Third-party access ›
  OAuth application policy), o app precisa ser aprovado lá; senão o GitHub esconde a participação na organização e
  **ninguém** entra. Como o app é da própria organização, normalmente ele já é permitido: confira mesmo assim.
- **SAML single sign-on.** Se a organização (ou a empresa/enterprise dela) exige SAML SSO, o token OAuth de cada
  pessoa precisa ser **autorizado para o SSO** (na tela de autorização do app o GitHub mostra "Authorize" ao lado da
  organização, ou a pessoa autoriza em Settings › Applications › Authorized OAuth Apps). Sem isso o GitHub responde
  403 à conferência de participação. O Worker trata o 403 como "não deu para conferir": não derruba a sessão de quem
  já entrou e, no login, manda para a página de erro ("tente de novo"), nunca para "você não é da organização". Se
  todas as pessoas caírem nesse erro, é este passo.

## 5b. Limitar pedidos ao Worker (regra de rate limit da Cloudflare)

O Worker não limita pedidos por conta própria, e `/login`, `/callback` e `/session` falam com o GitHub. Crie uma
regra de limite na zona `kalangoos.com`: Cloudflare › Security › WAF › **Rate limiting rules** › Create rule:

| Campo | Valor |
|---|---|
| Se | Hostname igual a `auth.kalangoos.com` |
| Características | IP |
| Limite | 30 pedidos por 1 minuto (o plano gratuito aceita 10 s ou 1 min; ajuste ao plano) |
| Ação | Block por 10 minutos |

Uma sessão normal faz poucos pedidos (um `/session` por abertura da página, um `/project` por abertura do quadro).
Sem esta regra o pior caso é alguém esgotar o limite de 5.000 pedidos/hora do app no GitHub, o que derruba os logins
por um tempo (a página mostra "não deu para conferir", sem desconectar ninguém), e consumir a cota de pedidos do
Worker.

## 5. Conferir (depois de cada `wrangler deploy`)

No Worker:

1. `curl -i https://auth.kalangoos.com/session -H 'Origin: https://kalangoos.com'` → `401 {"error":"no session"}` com
   `Access-Control-Allow-Origin: https://kalangoos.com` e `Strict-Transport-Security` (este último é a prova de que a
   versão corrigida está no ar; a antiga não o envia).
2. `curl -i https://auth.kalangoos.com/session -H 'Origin: https://outro.example'` → `403`, sem
   `Access-Control-Allow-Origin`.
3. Em Cloudflare › Workers & Pages › kalangoos-auth › Observability, os registros novos **não** trazem o endereço dos
   pedidos (`invocation_logs = false` no `wrangler.toml`; veja o README, "Logs").

No site, em `kalangoos.com/membros/` e `kalangoos.com/en/members/`:

4. Entrar com uma conta da organização: volta para a Documentação, com o avatar na barra.
5. Abrir o Quadro: mostra as colunas do projeto. Se aparecer "Nenhum projeto aberto", crie um projeto na organização ou
   defina `PROJECT_NUMBER` em `wrangler.toml`.
6. Entrar com uma conta de fora: "O quadro de tarefas é só para quem é da organização kalangoos", e em GitHub ›
   Settings › Applications › Authorized OAuth Apps dessa conta o app **não** fica com token ativo.
7. "Sair" no menu da conta: volta à página inicial; `/session` volta a responder 401.

## O que a área de membros protege (e o que não)

- A **documentação** e a **especificação** vêm do repositório PÚBLICO `kalangoos/kalangoos` (a árvore pela API sem
  token e os arquivos por `raw.githubusercontent.com`). Qualquer pessoa as lê, com ou sem login: a página é uma
  conveniência de leitura, não um cofre. O login (a barreira de interface) não protege esses textos.
- Só o **quadro de tarefas** (GitHub Projects v2 da organização) é protegido de fato: o Worker só o entrega a quem é
  membro ativo e a conferência é feita no servidor, a cada pedido.
- Não coloque nada confidencial no repositório público nem espere que "/membros/" o esconda.

## Alcance do token (e o que fica de fora)

- O app pede `read:org` e `read:project`. Esses escopos do GitHub valem para **todas** as organizações e projetos da
  pessoa, não só para `kalangoos`: se o Worker fosse invadido, o token de quem estivesse logado leria o que a pessoa
  consegue ler em outras organizações (só leitura; nada de escrita nem de código). O token vive 8 horas dentro do
  cookie selado e é revogado em "Sair" e para quem não é da organização.
- **Limite de 10 tokens por pessoa e app.** O GitHub mantém até 10 tokens ativos por usuário e app OAuth; o 11º
  revoga o mais antigo (que pode ser o de outro navegador da própria pessoa: ela cai e entra de novo). Um login em que
  o Worker não conseguiu conferir a participação revoga o token novo; se a revogação em si falhar, o token fica
  vivo até o GitHub o expirar (OAuth sem validade) ou ser o mais antigo a sair. Quem quiser cortar tudo de uma vez:
  GitHub › Settings › Applications › Authorized OAuth Apps › Revoke.
- Para reduzir o alcance no futuro, o caminho é um **GitHub App** instalado só na organização `kalangoos` (permissões
  "Members: read" e "Projects: read", tokens de usuário que expiram em 8 horas e vêm com refresh token), no lugar do
  app OAuth. Fica como evolução; não bloqueia ligar o login.

## Desfazer

- Só a interface: apagar `site/.env.production` e publicar (o site volta a "em breve").
- Voltar o Worker à versão anterior: `npx wrangler rollback`.
- Tudo: `npx wrangler delete` (remove o Worker e o domínio), apagar o app OAuth no GitHub e `site/.env.production`.
  Os cookies que sobrarem nos navegadores ficam inúteis (a chave some com o Worker).
