# Ligar a área de membros: passo a passo

Estes passos mexem em contas (GitHub, Cloudflare) e criam segredos. **Precisam da aprovação de quem administra a
organização `kalangoos` e o domínio `kalangoos.com`.** Nada disso foi feito automaticamente.

Requisitos: ser dono (owner) da organização `kalangoos` no GitHub e ter acesso à conta da Cloudflare onde está a
zona DNS de `kalangoos.com`. Node 24 para rodar o `wrangler`.

## 1. Criar o app OAuth no GitHub (da organização)

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

## 2. Anotar o Client ID e gerar o segredo

Na página do app: copie o **Client ID** e clique em **Generate a new client secret** (o GitHub mostra o segredo uma
vez só; não o cole em nenhum arquivo do repositório).

- Client ID: público. Coloque em `worker/wrangler.toml`, em `GITHUB_CLIENT_ID = "..."` (num pull request).
- Client secret: vai para a Cloudflare no passo 4.

## 3. Publicar o Worker

```sh
cd worker
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

## 4. Guardar os segredos

```sh
npx wrangler secret put GITHUB_CLIENT_SECRET     # cole o client secret do passo 2
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put SESSION_KEY
```

| Segredo | O quê |
|---|---|
| `GITHUB_CLIENT_SECRET` | O segredo do app OAuth |
| `SESSION_KEY` | 32 bytes aleatórios em base64url; cifram os cookies. Trocar a chave desloga todo mundo |

Até os três (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_KEY`) existirem, o Worker responde 503 a tudo.

## 5. Permitir o app na organização (se houver restrição)

Se a organização usa "OAuth app access restrictions" (Settings › Third-party access › OAuth application policy),
o app precisa ser aprovado lá; senão o GitHub esconde a participação na organização e **ninguém** entra. Como o app
é da própria organização, normalmente ele já é permitido — confira mesmo assim.

## 6. Ligar o site ao serviço

Num pull request no `kalangoos.github.io`, crie o arquivo `.env.production` na raiz com:

```
VITE_AUTH_URL=https://auth.kalangoos.com
```

(É um endereço público, não um segredo; o build do Vite lê esse arquivo, então o workflow não muda.) Depois do
merge, o botão Entrar perde o selo "em breve" e `/membros/` passa a oferecer "Entrar com o GitHub".

## 7. Conferir

1. `curl -i https://auth.kalangoos.com/session -H 'Origin: https://kalangoos.com'` → `401 {"error":"no session"}`
   com `Access-Control-Allow-Origin: https://kalangoos.com`.
2. Em `kalangoos.com/membros/`, entrar com uma conta da organização: volta para a Documentação, com o avatar na barra.
3. Abrir o Quadro: mostra as colunas do projeto. Se aparecer "Nenhum projeto aberto", crie um projeto na
   organização ou defina `PROJECT_NUMBER`.
4. Entrar com uma conta de fora: aparece "Esta área é só para quem é da organização kalangoos", e em
   GitHub › Settings › Applications › Authorized OAuth Apps dessa conta o app **não** fica com token ativo.
5. "Sair" no menu da conta: volta à página inicial; `/session` volta a responder 401.

## Desfazer

`npx wrangler delete` (remove o Worker e o domínio), apagar o app OAuth no GitHub e remover `.env.production` do
site. Os cookies que sobrarem nos navegadores ficam inúteis (a chave some com o Worker).
