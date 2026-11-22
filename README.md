# Site do KalangoOS (kalangoos.com)

Site público do KalangoOS (início, baixar, segurança, documentação, notas da versão, contribuir e 404), em português e inglês, mais a área de
membros (`/membros/`). React 19 + Vite 8 + TypeScript,
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
npm test               # testes de unidade (node --test): quadro, leitura do repositório, serviço de login
npm run build          # typecheck (site e worker) + testes + build + pré-renderização → dist/
npm run preview        # serve o dist/ em http://127.0.0.1:18900
```

Dependências de execução: `react`, `react-dom` e `marked` (só na área de membros, MIT). De desenvolvimento: `vite`, `@vitejs/plugin-react`,
`typescript` e os tipos do React. Nada de bibliotecas de i18n, animação ou CSS: o dicionário é JSON e as molas são
CSS gerado dos tokens.

## Páginas públicas

Cada página existe em português e em inglês, pré-renderizada (`src/routes.json` tem os caminhos):

| Página | pt-BR | en |
|---|---|---|
| Início (landing, desenhada no FigCraft) | `/` | `/en/` |
| Baixar e instalar, com somas de verificação | `/baixar/` | `/en/download/` |
| Segurança e privacidade | `/seguranca/` | `/en/security/` |
| Documentação | `/documentacao/` | `/en/docs/` |
| Notas da versão 0.1.0 | `/notas/0-1-0/` | `/en/notes/0-1-0/` |
| Contribuir | `/contribuir/` | `/en/contribute/` |
| 404 (bilíngue) | `/404.html` | |

Também saem `sitemap.xml` (com `hreflang`) e `robots.txt`. As páginas que não são o início usam blocos de conteúdo
(`pages.*` nos dois JSON; os tipos de bloco estão em `src/sections/SubPages.tsx`) com os mesmos componentes do início.
O desenho do início está no FigCraft; as outras páginas ainda não têm quadros próprios no Design System.

## Área de membros (`/membros/`)

Documentação técnica, especificação (OpenSpec) e quadro de tarefas, só para quem é da organização `kalangoos` no
GitHub. Desenho: quadros "Site · Barra alta" e "Site · Membros · …" da página "Site · Landing page" do Design System.

- **Entrada:** login com o GitHub por um Cloudflare Worker em `auth.kalangoos.com` (código em `worker/`, desenho em
  [worker/README.md](worker/README.md)). O token fica num cookie `HttpOnly` cifrado do Worker; a página nunca o vê.
  O endereço do serviço entra no build por `VITE_AUTH_URL` (num `.env.production`); **sem ele a área aparece como
  "ainda não conectada"**, que é o estado de hoje. Para ligar: [worker/SETUP.md](worker/SETUP.md) (precisa de
  aprovação: app OAuth, Worker, domínio e segredos).
- **Documentação e especificação:** lidas do repositório público `kalangoos/kalangoos` (a árvore numa chamada da
  API, sem token; os arquivos pelo `raw.githubusercontent.com`). O Markdown vira componentes React (`marked` só como
  lexer); o HTML dos documentos passa por uma lista fechada de tags e atributos, sem `dangerouslySetInnerHTML`.
- **Quadro:** GitHub Projects (v2) da organização, pelo Worker (`GET /project`, consultas GraphQL fixas). Sem sessão
  ou sem projeto, diz isso; nunca mostra cartões de exemplo.
- **Prévia local** sem sessão (só a parte pública): `VITE_MEMBERS_PREVIEW=1 npx vite build --outDir /tmp/previa`
  e `npx vite preview --outDir /tmp/previa`. O build da CI nunca liga essa opção.

## Publicar

O site é publicado pelo repositório `kalangoos/kalangoos.github.io` (GitHub Pages, domínio `kalangoos.com`), cujo
workflow `pages.yml` roda `npm ci` e `npm run build` na raiz e publica o `dist/`. Para publicar uma versão nova:

```sh
git clone https://github.com/kalangoos/kalangoos.github.io.git pages && cd pages    # um clone limpo, do main
git switch -c site-0-1-0
rsync -a --delete --exclude .git --exclude node_modules --exclude dist /caminho/do/kalangoos/site/ ./
git status        # confira: arquivos velhos (design-tokens/, membros/, worker/…) devem aparecer como removidos
```

Nunca copie por cima de uma cópia local com ramos antigos (como `membros-e-barra-alta`, que não foi publicado): o
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

- `npm run build` confere que `en.json` tem as chaves de `pt-BR.json`, faz o typecheck e pré-renderiza.
- Sem pedidos a terceiros: as fontes vêm de pacotes `@fontsource/*` (OFL, registradas no `ATTRIBUTION.md`), não há
  scripts de análise e os únicos links externos são `<a>` para o GitHub.
- A página só guarda no navegador a escolha de tema (`localStorage`, `kalangoos-theme`).

## Conteúdo

Todo o texto está em `src/content/pt-BR.json` e `src/content/en.json`, com a mesma estrutura (o TypeScript
reclama se faltar uma chave no inglês). Cada afirmação tem origem no repositório: `docs/VISAO.md`,
`docs/PLANO.md`, `docs/ARQUITETURA.md`, `docs/SEGURANCA.md`, `docs/REQUISITOS.md`, `docs/LANCAMENTO.md`,
`docs/LICENCAS.md` e `docs/telas.md`. O que é plano aparece como "planejado" ou "a confirmar".

As capturas são da sessão de teste (`target/captura/`, com dados de teste). Antes de trocar ou acrescentar uma,
leia todo o texto dela: nada de nomes reais, nomes de rede Wi-Fi, e-mails, caminhos `/home/...` ou notificações de
apps reais. Ficaram de fora, por isso: `sessao-instalador.png` (nome de rede com nome de pessoa),
`sessao-avisos.png` (nome de pessoa numa notificação), `sessao-controles.png` (o mesmo nome de rede),
`sessao-aprovacao.png`, `sessao-voz.png` e `sessao-sugestao-layout.png` (cartão de erro e o chamador de teste).

## Estrutura

```
site/
  index.html, en/index.html     páginas (meta, Open Graph, tema antes da pintura)
  src/content/*.json            texto em pt-BR e inglês
  src/sections/                 seções da página
  membros/index.html            a área de membros (pt-BR, noindex)
  src/members/                  área de membros: entrada, documentação, especificação, quadro, Markdown
  worker/                       serviço de login (Cloudflare Worker), README do desenho e SETUP
  tests/                        testes de unidade (node --test)
  src/components/               barra (a barra superior do sistema), dock, painel do agente, aprovação,
                                capturas, ampliação, laboratório de molas, ícones
  src/styles/tokens.css         GERADO de design/tokens/tokens.json (npm run tokens)
  src/styles/motion.css         GERADO: as molas do Design System em CSS linear() (npm run springs)
  src/lib/icons.generated.ts    ícones simbólicos exportados do FigCraft (componentes sym/*)
  public/img/                   capturas, papéis de parede, marca e ícones de apps, otimizados (WebP)
  public/og.png, favicon*       imagem de compartilhamento e ícones
  scripts/                      geração de tokens, molas, imagens, Open Graph e a pré-renderização
```

Cada tela também foi capturada com o sistema no tema claro (a mesma sessão de teste, com o `tema.json` em
`"claro"`): o site mostra a captura do tema da página (`<nome>.webp` no escuro, `<nome>-light.webp` no claro). As duas
ficam no HTML pré-renderizado e o CSS esconde a do outro tema, pelo `data-theme` do botão ou pelo
`prefers-color-scheme` do sistema, então a troca funciona também sem JavaScript; a escondida é `loading="lazy"` com
`display: none`, e o navegador não a baixa. A tela "Tema claro" (Aparência) é a mesma nos dois temas.

Regenerar as imagens: `KALANGO_CAPTURES=<repo>/target/captura/ KALANGO_CAPTURES_CLARO=<pasta da rodada clara>/
python3 scripts/prepare-images.py` e
`python3 scripts/make-og.py` (Pillow; a imagem do Open Graph usa URW Gothic e JetBrains Mono instaladas).

## Decisões de design

- **O site é a área de trabalho do sistema:** o cabeçalho é a barra superior (com a ilha mostrando a situação do
  projeto), a navegação é a dock única (um item por seção, a grade abre todas), as seções aparecem como janelas e
  cartões sobre o papel de parede, e o herói mostra o painel do agente montado com os componentes reais
  (rotulado como ilustração) ao lado de uma captura real.
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
