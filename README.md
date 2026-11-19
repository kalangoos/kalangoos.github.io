# Site do KalangoOS (kalangoos.com)

Landing page pública do KalangoOS, em português (`/`) e inglês (`/en/`). React 19 + Vite 8 + TypeScript,
pré-renderizada no build: o `dist/` é só HTML, CSS, JS e imagens estáticos, e o conteúdo aparece mesmo sem
JavaScript.

O desenho vem primeiro do FigCraft: página **"Site · Landing page"** do Design System do KalangoOS
(quadros desktop 1440 e celular 390, escuro e claro, inglês, estados e os componentes do site, com anotações de
comportamento e movimento). O código espelha esses quadros.

## Rodar

```sh
npm ci                 # dependências exatas do package-lock.json
npm run dev            # desenvolvimento em http://localhost:5173 (sem pré-renderização)
npm run build          # typecheck + build + pré-renderização → dist/
npm run preview        # serve o dist/ em http://127.0.0.1:18900
```

Dependências de execução: só `react` e `react-dom`. De desenvolvimento: `vite`, `@vitejs/plugin-react`,
`typescript` e os tipos do React. Nada de bibliotecas de i18n, animação ou CSS: o dicionário é JSON e as molas são
CSS gerado dos tokens.

## Publicar

O workflow `.github/workflows/pages.yml` compila cada pull request e publica no GitHub Pages a cada push no `main`.
Para outra hospedagem: `npm run build` e copiar o conteúdo de `dist/` para a raiz de qualquer hospedagem estática do domínio
`kalangoos.com` (não precisa de servidor de aplicação, nem de regra de reescrita: `/` e `/en/` são arquivos
`index.html` de verdade). Sugestões para o servidor: `Cache-Control` longo para `/assets/*` (os nomes têm hash) e
curto para os `index.html`; HTTPS; `Content-Type: image/webp` para `.webp`.

As URLs canônicas, `hreflang` e a imagem do Open Graph já apontam para `https://kalangoos.com/`. Se o site for para
outro endereço, troque nos dois `index.html` (raiz e `en/`).

## Antes de tornar público (placeholders)

Nada abaixo foi inventado: o que não existe ainda está marcado como "em breve" ou "a confirmar" na própria página.

| O quê | Onde | O que fazer |
|---|---|---|
| Formulário "Avise-me" (lista de e-mails) | `src/sections/Sections.tsx`, `Follow` (comentário `TODO(lista)`) | Está desativado: não existe lista. Ligar ao serviço escolhido (ação e método do form), tirar o `disabled` e a nota "Em breve" (`follow.formNote` nos dois JSON). Revisar a política de privacidade do serviço |
| Repositório público, fórum, chat da comunidade | `follow.text` nos dois JSON | A página diz que ainda não existem. Quando existirem, acrescentar os links em `follow.links` |
| Canal de segurança | `security.disclosure` | Diz que será publicado em `kalangoos.com/seguranca` (como em `docs/SEGURANCA.md`). Criar a página e o contato antes de divulgar o site |
| Licenças | `footer.license`, FAQ "É software livre?" | Seguem `docs/LICENCAS.md`: GPL-3.0-or-later e CC BY-SA 4.0 "a confirmar". Atualizar quando a fase 0 decidir |
| Marca e recursos gerados por IA | `footer.ai` | Registro da marca e termos de uso do serviço de imagens ainda a verificar (`docs/PLANO.md`, D7) |
| Situação e roteiro | `roadmap.*`, `hero.note`, `bar.*`, FAQ | Retrato de 19/11/2026 (`docs/PLANO.md`). Atualizar a cada passo concluído; a data está em `roadmap.updated` |
| Requisitos de hardware | FAQ "Que computador vou precisar?" | São os **planejados** de `docs/REQUISITOS.md`; só NVIDIA foi testada |
| Análise de visitas | — | Não há nenhum script de terceiros além do Google Fonts. Se for usar, escolher algo sem cookies e citar no rodapé |

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
- **Fontes:** Inter e JetBrains Mono (Google Fonts); no claro, Roboto e Ubuntu, como nos tokens. A fonte de
  títulos do escuro, URW Gothic, não é servida pelo site (a licença AGPL com exceção para PDF/PostScript não cobre
  claramente a web): quem não a tem instalada vê Jost, a mais próxima no Google Fonts.
- **Movimento:** molas do Design System (suave, rápida, elástica, lenta) como curvas `linear()`; entradas em cascata
  de 24 ms. Com "reduzir animações", tudo vira um esmaecer de 90 ms. Se o JavaScript não carregar, nada fica
  escondido.
- **Acessibilidade:** HTML semântico, link para pular ao conteúdo, foco visível em tudo, abas com o padrão ARIA
  (setas, Home, End), diálogos nativos (`<dialog>`, Esc fecha, o foco volta), textos alternativos em todas as
  capturas (no inglês, dizem que a interface está em português), alvos de toque de 44 px.

## Tokens do Design System

`design-tokens/tokens.json` é a cópia dos tokens exportados do Design System (cores, raios, molas). `npm run tokens` e
`npm run springs` regeneram `src/styles/tokens.css` e `motion.css` a partir dela.
