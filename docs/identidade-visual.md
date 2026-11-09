# Identidade Visual e Guia de Marca — Trilha

> **Conceito Central:** _Escuta que vira caminho._  
> A Trilha adota uma abordagem editorial, humana e pedagógica, afastando-se da frieza de painéis analíticos tradicionais ou de mecânicas punitivas de notas/rankings.

---

## 1. Ativos de Marca (Logotipos)

Os logotipos oficiais do projeto estão centralizados e otimizados na pasta [`public/`](file:///public/) para consumo direto da aplicação web, com cópias originais em alta resolução preservadas em [`docs/assets/`](file:///docs/assets/):

| Arquivo em `public/` | Arquivo em `docs/assets/`    | Descrição                                         | Uso Recomendado                                      |
| -------------------- | ---------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `logo-completo.png`  | `logo-completo-original.png` | Símbolo gráfico + tipografia "Trilha." horizontal | Cabeçalho principal, hero e documentos               |
| `logo-simbolo.png`   | `logo-simbolo-original.png`  | Livro estilizado com trilha ascendente            | Favicon, avatares, cartões e formato compacto/mobile |
| `logo-texto.png`     | `logo-texto-original.png`    | Logotipia serifada "Trilha."                      | Rodapé sobre fundo escuro e assinaturas              |

### Componente de Logo no Frontend

Para renderizar o logotipo de forma padronizada, utilize o componente [`Logo.tsx`](file:///src/components/Logo.tsx):

```tsx
import { Logo } from "@/components/Logo";

// Variante padrão ("completo")
<Logo className="h-11 md:h-12" />

// Variante apenas símbolo
<Logo variant="simbolo" className="h-12 md:h-14" />

// Variante apenas texto
<Logo variant="texto" className="h-9 md:h-10" />
```

---

## 2. Paleta de Cores (Design Tokens)

As cores da Trilha combinam tons terrosos, quentes e botânicos, configurados em formato Oklch em [`src/styles.css`](file:///src/styles.css) para máxima fidelidade cromática:

| Nome do Token                    | Cor Hex Aproximada | Propósito / Aplicação                                     |
| -------------------------------- | ------------------ | --------------------------------------------------------- |
| `cream` / `background`           | `#FAF6EE`          | Fundo principal da página e base de leitura               |
| `warm-sand` / `secondary`        | `#F0E9DA`          | Fundo de seções alternadas (Estudantes, Escolas, FAQ)     |
| `deep-green` / `primary`         | `#216B58`          | Botões primários de ação, seções em destaque e acentos    |
| `dark-green` / `foreground`      | `#243A31`          | Tipografia de alto contraste para leitura confortável     |
| `forest`                         | `#1A2F26`          | Rodapé e faixas profundas                                 |
| `pale-green` / `accent`          | `#DCE8D4`          | Fundos de suporte, badges e sombras deslocadas sutis      |
| `sage`                           | `#9DBBA1`          | Barras de gráficos, ilustrações e elementos visuais       |
| `mustard`                        | `#E6A447`          | Traços de destaque (eyebrows), estrelas e sombras quentes |
| `body-gray` / `muted-foreground` | `#718078`          | Parágrafos de apoio e legendas secundárias                |
| `line-gray` / `border`           | `#D7D2C7`          | Linhas divisórias finas e bordas de cartões               |

---

## 3. Tipografia

- **Títulos & Citações:** `Fraunces` (Google Fonts)
  - Família serifada contemporânea, com peso óptico e personalidade editorial acolhedora.
  - Aplicada automaticamente em `h1, h2, h3, h4` e citações (`font-serif`).
- **Corpo & Interface:** `Manrope` (Google Fonts)
  - Família sans-serif geométrica moderna e legível.
  - Aplicada em todo o corpo textual (`body`), menus, botões e campos de formulário (`font-sans`).

---

## 4. Estilo e Elementos Gráficos

- **Eyebrow:** Rótulo em caixa alta com traço mostarda à esquerda:
  ```tsx
  <p className="eyebrow flex items-center gap-3">
    <span className="h-px w-8 bg-mustard" />
    Escuta que vira caminho
  </p>
  ```
- **Sombras Deslocadas (Brutalismo Editorial):**
  - `.shadow-sage`: Sombra sólida em verde pálido (`box-shadow: 14px 14px 0 0 var(--accent)`).
  - `.shadow-mustard`: Sombra sólida em mostarda (`box-shadow: 12px 12px 0 0 var(--mustard)`).
  - `.shadow-duo`: Camada dupla de sombras (`primary` + `mustard`).
- **Botões:** Bordas suaves (`rounded-md`), texto em semibold/bold e seta à direita com microanimação de hover (`group-hover:translate-x-1`).
- **Cartões:** Fundos limpos (`bg-card`), bordas finas (`border-border`) e tipografia espaçada.
