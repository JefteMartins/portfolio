# Receitas do projeto (Régua)

## Paleta

- **Canvas (fundo base):** `#07080A`
- **Superfície elevada (painel / card sóbrio):** `#0C0E12` (ou `rgba(12, 14, 18, 0.86)` sobre a vinheta esquerda)
- **Superfície rebaixada (well / código / metadado):** `#050608`
- **Tinta 1 (texto principal):** `#F3F4F6`
- **Tinta 2 (texto secundário / leitura):** `#9CA3AF`
- **Tinta 3 (metadados discretos / rótulos técnicos):** `#6B7280`
- **Borda hairline:** `rgba(255, 255, 255, 0.08)` (hover ativo: `rgba(255, 255, 255, 0.18)`)
- **Acento funcional:** `#E5E7EB` (prata fria de alto contraste; sem neon arbitrário)
- **Estado de confirmação (ex.: e-mail copiado):** `#34D399` apenas no texto/indicador pontual de status.

## Fontes

- **Display / Nome Hero:** `Switzer` 600, `clamp(2.5rem, 5vw, 4rem)`, tracking `-0.03em`, line-height `1.06`.
- **Título de seção:** `Switzer` 600, `clamp(1.5rem, 2.6vw, 2rem)`, tracking `-0.02em`, line-height `1.2`.
- **Subtítulo / Cargo:** `Switzer` 500, `1.0625rem` (`17px`), line-height `1.45`.
- **Corpo de leitura:** `Switzer` 400, `1rem` (`16px`), line-height `1.65`, largura máxima `60ch`.
- **Telemetria / Datas / Stack tags técnicas:** `JetBrains Mono` 400/500, `0.75rem`–`0.8125rem` (`12px`–`13px`), `font-variant-numeric: tabular-nums`.

## Superfícies

```css
/* Vinheta direcional única à esquerda para garantir contraste AA+ sobre o canvas vivo */
.reading-scrim {
  background: linear-gradient(
    90deg,
    rgba(7, 8, 10, 0.94) 0%,
    rgba(7, 8, 10, 0.84) 48%,
    rgba(7, 8, 10, 0.28) 78%,
    rgba(7, 8, 10, 0.08) 100%
  );
}

/* Camada flutuante única de vidro real (header, barra de telemetria e modal) */
.floating-glass {
  background: linear-gradient(180deg, rgba(16, 19, 24, 0.78), rgba(10, 12, 16, 0.68));
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  backdrop-filter: blur(14px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 12px 32px rgba(0, 0, 0, 0.40);
}

/* Superfície sólida/sóbria para itens interativos de conteúdo (sem empilhar blur) */
.surface-panel {
  background: rgba(12, 14, 18, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
```

## Componentes

- **Header fixo:** marca tipográfica à esquerda, navegação âncora enxuta e link direto do currículo à direita.
- **Barra de telemetria (HUD inferior):** indicador em tempo real do estágio do motor (`01 RAW` · `02 BRAILLE` · `03 ASCII` · `04 BIN`), linha contínua de progresso (`0.00 → 1.00`), navegação direta por estágio e gatilho discreto `Alt+I` para troca de mídia.
- **Linha do tempo de experiência:** coluna tabular de período à esquerda + cargo/empresa e impacto técnico à direita, sem cards repetidos.
- **Matriz de stack:** agrupamento tipográfico limpo em 3 colunas/linhas sem pílulas coloridas decorativas.
- **Lista/grade de projetos selecionados:** 3 itens clicáveis com índice monoespaçado, arquitetura resumida e abertura de modal de detalhes.
- **Modal de projeto:** painel flutuante com contexto real do problema, decisões de engenharia, stack e link para o GitHub, fechando com `Esc` ou clique fora e devolvendo o foco ao gatilho.

## Regras locais

- **Escala de espaçamento:** múltiplos estritos de `4px` (`4, 8, 12, 16, 24, 32, 48, 64, 96, 128`).
- **Escala de raios:** `12px` para painéis/modal; `8px` para botões internos (`12 - 4`); `6px` para controles compactos da telemetria.
- **Alinhamento:** sempre alinhado à esquerda na coluna editorial principal (deixando o terço direito mais aberto no desktop para respirar a arte das carpas em desconstrução).
- **Dose de acabamento aprovada:** `light` (uma única luz superior `inset 0 1px 0`, sombra curta realista restrita a Header, Telemetria, Modal e botão primário, volume tonal discreto nos painéis de projeto).
- **Acessibilidade de movimento:** respeitar `prefers-reduced-motion: reduce` (pausar ondulação/cintilação contínua, mantendo a desconstrução controlada pelo scroll).
