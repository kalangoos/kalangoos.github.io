# Site do KalangoOS (kalangoos.com)

Site público do KalangoOS (início, baixar, segurança, documentação, notas da versão, contribuir e 404), em português e inglês, mais a área de membros (`/membros/`, com login pelo GitHub). React 19 + Vite 8 + TypeScript,
pré-renderizada no build: o `dist/` é só HTML, CSS, JS e imagens estáticos, e o conteúdo aparece mesmo sem
JavaScript.

O desenho vem primeiro do FigCraft: página **"Site · Landing page"** de `design/KalangoOS-DesignSystem.figcraft`
(quadros desktop 1440 e celular 390, escuro e claro, inglês, estados e os componentes do site, com anotações de
comportamento e movimento). O código espelha esses quadros.

## Rodar

```sh
cd site
npm ci                 # dependências exatas do package-lock.json
npm run dev            # desenvolvimento em http://localhost:5173 (sem pré-renderização)
npm test               # testes de unidade (node --test, Node 24): quadro, leitura do repositório, rotas, Worker de login
npm run build          # conteúdo, typecheck (site e Worker), testes, build e pré-renderização → dist/
npm run preview        # serve o dist/ em http://127.0.0.1:18900
```

Dependências de execução: `react`, `react-dom` e `marked` (só na área de membros, MIT; carregada só nessa página). De desenvolvimento: `vite`, `@vitejs/plugin-react`,
`typescript` e os tipos do React. Nada de bibliotecas de i18n, animação ou CSS: o dicionário é JSON e as molas são
CSS gerado dos tokens.

## Páginas

Cada página existe em português e em inglês, pré-renderizada (`src/routes.json` tem os caminhos):

| Página | pt-BR | outros (en, es, fr, de, zh, ja) |
|---|---|---|
| Início | `/` | `/<lang>/` |
| Baixar | `/baixar/` | `/<lang>/download/` |
| Segurança | `/seguranca/` | `/<lang>/security/` |
| Documentação | `/documentacao/` | `/<lang>/docs/` |
| Notas 0.1.0 | `/notas/0-1-0/` | `/<lang>/notes/0-1-0/` |
| Contribuir | `/contribuir/` | `/<lang>/contribute/` |
| Membros (`noindex`) | `/membros/` | `/<lang>/members/` |

Idiomas publicados: ver `src/locales.json`. Prefixos: `en`, `es`, `fr`, `de`, `it`, `ru`, `zh` (zh-Hans), `ja`. Para adicionar um idioma: entrada em `locales.json`, `src/content/<id>.json` (mesmas chaves que pt-BR), `npm run locales`.

Os arquivos de locale novos partem do inglês e vão sendo traduzidos (mesma estrutura); revise o texto nativo quando puder. O seletor e o `hreflang` já os publicam.
| 404 (bilíngue) | `/404.html` | |

Também saem `sitemap.xml` (com `hreflang`) e `robots.txt`. As páginas que não são o início usam blocos de conteúdo
(`pages.*` nos dois JSON; os tipos de bloco estão em `src/sections/SubPages.tsx`), com o menu e o rodapé do início.
O desenho do início está no FigCraft; as outras páginas ainda não têm quadros próprios no Design System.

## Área de membros (`/membros/`, `/en/members/`)

Quadro de tarefas da organização `kalangoos` (GitHub Projects) e, por conveniência de leitura, a documentação técnica e
a especificação (OpenSpec) do repositório público. Desenho: quadros "Site · Barra alta" e "Site · Membros · …" da
página "Site · Landing page" do Design System. A página tem `noindex, nofollow`, não está no `sitemap.xml` e leva uma
Content-Security-Policy em `<meta>` (script por hash, `connect-src` só `auth.kalangoos.com`, `api.github.com` e
`raw.githubusercontent.com`, imagens só do site e do GitHub, fontes só do próprio site: nada de Google Fonts nem de outros terceiros além do GitHub).

**Estado de hoje: login LIGADO.** O app OAuth da organização e os segredos do Worker já existem (criados pelos
mantenedores) e `.env.production` (versionado, valor público) tem `VITE_AUTH_URL=https://auth.kalangoos.com`, então a
página pede o login do GitHub e mostra o quadro a quem é da organização. Para **desligar a interface**, apague
`site/.env.production` e publique de novo: sem `VITE_AUTH_URL` a página mostra o cartão "A área de membros ainda não
está conectada", não faz nenhuma chamada ao Worker e o botão da barra ganha o selo "em breve" (o build não precisa de
segredo em nenhum dos dois casos). O Worker em si só sai do ar com `npx wrangler delete`. Os textos da página (cartões,
barra, menus, rótulos do quadro) estão nos dois JSON (`members.*`, `bar.*`); o leitor de documentos e a especificação
ficam em português, como o conteúdo que mostram.

- **Barreira de interface, não cofre.** A documentação e a especificação vêm do repositório público (a árvore numa
  chamada da API, sem token; os arquivos pelo `raw.githubusercontent.com`) e qualquer pessoa as lê. Só o quadro é
  protegido de fato, pelo Worker (`GET /project`, consultas GraphQL fixas, conferência de participação no servidor). O
  texto da página não diz que os documentos são privados e não deve passar a dizer.
- **Markdown seguro.** O Markdown vira componentes React (`marked` só como lexer); o HTML dos documentos passa por uma
  lista fechada de tags e atributos, sem `dangerouslySetInnerHTML`. Imagens só de `raw.githubusercontent.com`,
  `github.com` e `camo.githubusercontent.com` (nada de pixel de rastreamento); links só `http(s)` e `mailto`.
- **Rotas no hash** (`#/docs/…`, `#/spec/…`, `#/quadro`, `#/fora`, `#/erro`), porque o GitHub Pages não tem
  reescritas. Endereços malformados (`#/%`) não quebram a página, e `#/fora?login=` só nomeia a conta se ela tiver o
  formato de um login do GitHub (`[A-Za-z0-9-]{1,39}`).
- **Prévia local** sem sessão (só a parte pública): `VITE_MEMBERS_PREVIEW=1 npx vite build --outDir /tmp/previa` e
  `npx vite preview --outDir /tmp/previa`. O build da CI nunca liga essa opção.

### Operar o login

O serviço de login é um Cloudflare Worker em `worker/` (desenho em [worker/README.md](worker/README.md), passos e
verificações em [worker/SETUP.md](worker/SETUP.md)). **O que falta fazer depois de publicar este código:** o Worker no ar
ainda roda a versão anterior; a corrigida entra com `cd site/worker && npm ci && npx wrangler deploy` (os segredos
`GITHUB_CLIENT_SECRET` e `SESSION_KEY` persistem). Depois, as verificações do SETUP.md, passo 5. Para reverter:
`npx wrangler rollback` (volta o Worker) ou apagar `site/.env.production` (desliga só a interface).

Com o login ligado, toda página do site pede `GET /session` ao Worker uma vez (para mostrar a conta na barra): isso
envia o cookie de sessão, se houver, e o endereço IP do visitante ao `auth.kalangoos.com` (Cloudflare). O cartão
"Sem rastreadores" da página Segurança diz isso. O alcance do token (`read:org read:project` cobrem todas as
organizações da pessoa), o limite de 10 tokens por pessoa e a opção de um GitHub App ficam no SETUP.md ("Alcance do
token").

## Publicar

O site é publicado pelo repositório `kalangoos/kalangoos.github.io` (GitHub Pages, domínio `kalangoos.com`), cujo
workflow `pages.yml` roda `npm ci` e `npm run build` na raiz e publica o `dist/`. Para publicar uma versão nova:

```sh
git clone https://github.com/kalangoos/kalangoos.github.io.git pages && cd pages    # um clone limpo, do main
git switch -c site-0-1-0
rsync -a --delete --exclude .git --exclude .github --exclude node_modules --exclude dist /caminho/do/kalangoos/site/ ./
# --exclude .github: o .github/workflows/pages.yml existe só no repositório do Pages; sem isso o --delete o apaga
git status        # confira: arquivos velhos (design-tokens/…) devem aparecer como removidos; o worker/ e os tests/ agora fazem parte do site/
```

Nunca copie por cima de uma cópia local com ramos antigos (como `membros-e-barra-alta`, que não foi publicado e já foi trazido para cá): o
`--delete` é o que faz sumirem os arquivos que o site não tem mais. O `robots.txt` e o `sitemap.xml` (gerado no
build) são novos. Depois, abra o pull request (ou faça o push no `main` dele) e confira a execução do workflow.
O domínio e o HTTPS já estão configurados no repositório (Settings › Pages); não há CNAME porque a publicação é
por Actions. Qualquer hospedagem estática também serve: o `dist/` é só arquivos (`/x/` é `x/index.html`, e o
`404.html` é o que o GitHub Pages mostra).

As URLs canônicas, `hreflang`, o sitemap e a imagem do Open Graph apontam para `https://kalangoos.com/`; para
outro endereço, troque `origin` em `src/routes.json` (o `og:image` também usa essa origem).

## Antes de publicar uma versão

- `pages.notes.pending` (nos dois JSON) é a linha "ainda não incluído na 0.1.0" das notas: edite-a ou apague-a
  conforme o que entrou. `npm run check:placeholders`, que o `npm run build` também roda, falha se sobrar um
  marcador `[PREENCHER` ou `[FILL IN` em qualquer texto.
- Os nomes dos arquivos da página Baixar (`kalangoos-0.1.0-amd64.iso`, `SHA256SUMS-iso.txt`,
  `kalangoos-0.1.0-linux-x86_64.tar.gz`, `SHA256SUMS.txt`) vêm do `.github/workflows/release.yml`: confira com o
  lançamento real e troque a versão nas notas e na página Baixar a cada lançamento.
- A página Baixar e as notas dizem que os arquivos estão anexados ao lançamento v0.1.0 (publicado). Publique o
  lançamento antes de publicar o site; não publique o site com o lançamento ainda em rascunho.
- Repita as verificações abaixo.

## Verificações

- `npm run build` confere que cada locale publicado espelha `pt-BR.json`, faz o typecheck (site e Worker), roda os testes
  (`npm test`) e pré-renderiza. A pré-renderização falha se o `VITE_AUTH_URL` não for vazio nem `https://auth.kalangoos.com`.
- Pedidos a terceiros: as páginas do site não fazem nenhum (fontes de pacotes `@fontsource/*`, OFL, no
  `ATTRIBUTION.md`; sem scripts de análise; os links externos são `<a>` para o GitHub). Com o login ligado, **toda**
  página consulta `auth.kalangoos.com` uma vez, e a página de membros também fala com `api.github.com` e
  `raw.githubusercontent.com` e mostra imagens de `raw`, `github.com`, `camo` e `avatars.githubusercontent.com`. Esse é o
  conjunto documentado; qualquer outro é um defeito (a CSP da página de membros bloqueia).
- A página guarda no navegador a escolha de tema (`localStorage`, `kalangoos-theme`); a sessão fica só num cookie
  `HttpOnly` do Worker (8 horas) para quem entra.

## Conteúdo

Todo o texto está em `src/content/<locale>.json` (lista em `src/locales.json`), com a mesma estrutura (o TypeScript
reclama se faltar uma chave no inglês). Cada afirmação tem origem no repositório: `docs/VISAO.md`,
`docs/PLANO.md`, `docs/ARQUITETURA.md`, `docs/SEGURANCA.md`, `docs/REQUISITOS.md`, `docs/LANCAMENTO.md`,
`docs/LICENCAS.md` e `docs/telas.md`. O que é plano aparece como "planejado" ou "a confirmar".

As telas da página inicial são quadros do Design System do KalangoOS (`design/KalangoOS-DesignSystem.figcraft`,
exportados com `figcraft-cli export --node <id>`), em `public/img/ds/` (1920×1080 e uma cópia de 960, `<nome>.webp`
no escuro e `<nome>-light.webp` no claro, cada uma do quadro do tema claro do próprio DS). Os vídeos (`public/video/`)
são feitos no Remotion só com esses quadros: câmera, transições, cursor e anéis de destaque, sem interface nova. As
legendas e os textos alternativos descrevem o que o quadro mostra; a galeria avisa que são telas do design.

## Estrutura

```
site/
  index.html, en/index.html     páginas (meta, Open Graph, tema antes da pintura)
  src/content/*.json            texto em vários idiomas (pt-BR, en, es, fr, de, it, ru, zh-Hans, ja)
  src/landing/                  a página inicial (Landing v3), o menu e o rodapé de todas as páginas, vídeos
  src/sections/                 blocos das outras páginas
  src/members/                  área de membros: página, documentação, especificação, quadro, Markdown, rotas
  worker/                       serviço de login (Cloudflare Worker): código, README do desenho, SETUP, wrangler.toml
  tests/                        testes de unidade (node --test): quadro, repositório, rotas, Worker
  src/components/               barra superior e conta (área de membros), capturas, ícones
  src/styles/tokens.css         GERADO de design/tokens/tokens.json (npm run tokens)
  src/styles/motion.css         GERADO: as molas do Design System em CSS linear() (npm run springs)
  src/lib/icons.generated.ts    ícones simbólicos exportados do FigCraft (componentes sym/*)
  public/img/                   capturas, papéis de parede, marca e ícones de apps, otimizados (WebP)
  public/og.png, favicon*       imagem de compartilhamento e ícones
  scripts/                      geração de tokens, molas, imagens, Open Graph e a pré-renderização
```

Cada tela tem a versão do tema escuro e a do claro: o site mostra a do tema da página (`<nome>.webp` no escuro,
`<nome>-light.webp` no claro). As duas
ficam no HTML pré-renderizado e o CSS esconde a do outro tema, pelo `data-theme` do botão ou pelo
`prefers-color-scheme` do sistema, então a troca funciona também sem JavaScript; a escondida é `loading="lazy"` com
`display: none`, e o navegador não a baixa.

Regenerar as imagens: `KALANGO_CAPTURES=<repo>/target/captura/ KALANGO_CAPTURES_CLARO=<pasta da rodada clara>/
python3 scripts/prepare-images.py` e
`python3 scripts/make-og.py` (Pillow; a imagem do Open Graph usa URW Gothic e JetBrains Mono instaladas).

## Decisões de design

- **Página de produto (Landing v3 · Produto):** faixa de aviso, menu fixo (que desfoca e encolhe ao rolar), herói
  centrado com o logo e o tour em vídeo, destaques com clipes, capturas em abas, baixar, notas, comunidade, apoio e
  rodapé completo, em painéis de cantos arredondados. As outras páginas públicas usam o mesmo menu e rodapé; a
  área de membros mantém a barra superior do sistema.
- **Logo em destaque:** o logo principal (mascote e nome) abre o herói, grande (216 px; 150 no celular; o mínimo da
  marca é 96 px), sempre sobre o fundo liso: a regra da marca pede só a versão de uma cor sobre papel de parede, então
  o papel de parede fica atrás da captura, que flutua sobre o céu do sistema. No claro, o logo do tema claro.
- **Largura:** o conteúdo vai até 1840 px (respiro lateral de 20 a 80 px); títulos e textos mantêm a largura de
  leitura. As capturas vão no máximo até o tamanho em que foram feitas (1280×800), sem esticar; nas grades, duas por
  linha no desktop.
- **Tokens:** cores dos dois modos, raios e espaços vêm de `design/tokens/tokens.json`. Escuro é o padrão; o claro
  segue `prefers-color-scheme` ou o botão da barra (guardado no navegador). Nenhuma sombra.
- **Contraste:** no modo Claro, `cor/accent_text` (#248F55) fica em 3,6:1 sobre o fundo. O site usa #277955
  (mistura 80/20 com `cor/text`, 4,68:1) e texto escuro sobre o verde. Nenhum texto usa `cor/dim`. Vale levar a
  correção para o Design System.
- **Fontes:** Inter e JetBrains Mono, servidas pelo próprio site (pacotes `@fontsource/*`, WOFF2 latino; nada de Google Fonts); no claro, Roboto e Ubuntu, como nos tokens. A fonte de
  títulos do escuro, URW Gothic, não é servida pelo site (a licença AGPL com exceção para PDF/PostScript não cobre
  claramente a web): o site usa a Jost, a mais próxima, também servida por ele.
- **Movimento:** molas do Design System (suave, rápida, elástica, lenta) como curvas `linear()`; entradas em cascata
  de 24 ms. Com "reduzir animações", tudo vira um esmaecer de 90 ms. Se o JavaScript não carregar, nada fica
  escondido.
- **Acessibilidade:** HTML semântico, link para pular ao conteúdo, foco visível em tudo, abas com o padrão ARIA
  (setas, Home, End), diálogos nativos (`<dialog>`, Esc fecha, o foco volta), textos alternativos em todas as
  capturas (no inglês, dizem que a interface está em português), alvos de toque de 44 px.
