# Gosto do usuário

## Papéis de tela

- **Portfólio (Tela única):** Esta tela existe para provar engenharia sólida (.NET/React + motor visual ao vivo) a recrutadores e líderes técnicos e conduzir ao contato ou download do currículo; não é um blog, nem vitrine genérica de freelas, nem painel decorativo de métricas. (2026-11-23)

## Escolhas

- **Condução:** Seguir as Paradas de validação da skill `deslop` antes de avançar entre etapas críticas. (2026-11-23)
- **Mídia do motor:** Usar o vídeo das duas carpas brancas em água escura em loop no canvas em tempo real E extrair frame em `public/assets/background.jpg` como fallback estático, mantendo `Alt+I` e `Shift + arrastar` para testar imagens locais. (2026-11-23)
- **Tipografia:** `Switzer` (títulos e corpo) + `JetBrains Mono` (telemetria e metadados), evitando `Plus Jakarta Sans`. (2026-11-23)
- **Ícones:** SVGs próprios minimalistas, sem bibliotecas genéricas. (2026-11-23)
- **Organização espacial (Parada 3):** Aprovada a **Organização A** — coluna editorial contínua à esquerda (`57%`) mantendo a janela direita (`43%`) livre em todos os 4 estágios para visualizar a desconstrução das carpas sem sobreposição de cards largos. (2026-11-23)
- **Dose de acabamento (Parada 4):** Aprovada a **Dose leve (`light`)** — aresta superior iluminada por uma única fonte de luz, sombra curta apenas nas camadas flutuantes e volume tonal discreto nos painéis de projeto, sem grão extra. (2026-11-23)
- **Correções da 2ª checagem e olhar externo (Parada 5):** Aprovados todos os 7 ajustes — `color-scheme: dark`, Hero em `100vh` sem linha divisória órfã na dobra inicial, consolidação em 2 pesos (`400`/`600`) sem caixa alta + cor apagada juntas, indicador explícito `Scroll X%`, botão `[Ícone] Alt+I` no desktop, ganho de contraste secundário (`#B4BCC8`) e link secundário subordinado `Baixar Currículo` no Hero. (2026-11-23)
- **Refinamentos de verificação técnica final:** `JetBrains Mono` empacotada localmente (`@fontsource/jetbrains-mono`), correção de quebra na matriz de Stack em `390px` (`minmax(0, 1fr)`) e otimização do rasterizador de glifos com cache esparso em `Uint32Array` cravando 60 FPS nos 4 estágios (`RAW`, `BRAILLE`, `ASCII`, `BIN`). (2026-11-23)
- **Separação figura/fundo no estágio `04 BIN` (Ajuste pontual / Tweak):** Rejeitado o limiar binário baixo (`p92`) que transformava as ondulações da água e os peixes em uma mancha única de `0` e `1`. Adotada normalização pelo pico real (`p99.5`) em 3 faixas P&B usando apenas `0` e `1`: água em `0` esparso de baixa luminância (`6%–20%`), nadadeiras/contornos em cinza médio e corpo das carpas em `1` branco puro (`peso 600`), preservando a silhueta reconhecível a `100%` de scroll. (2026-11-23)
- **Pipeline de 5 estágios:** Aprovada a progressão `01 RAW` (normal) → `02 DRIFT` (malha fina micro-ASCII com água azul-ardósia e rastro real de partículas se desprendendo do movimento das carpas, referência `drift.mp4`) → `03 PARTICLE` (nuvem densa de grãos finos luminosos sobre preto puro, referência `particle.mp4`) → `04 HYBRID` (transição cristalizando para código monocromático) → `05 BIN` (binário P&B com alta legibilidade). (2026-11-24)
- **Favicon SVG próprio (`public/favicon.svg`):** Carpas em órbita + desconstrução — arco contínuo branco (`RAW`) espelhado por arco em partículas/bits progressivos sobre quadrado `#07080A` com borda hairline. (2026-11-24)

## Rejeições / vetos

- Rejeitado `Plus Jakarta Sans` por remeter a template de SaaS gerado por IA. (2026-11-23)

## Exceções do checklist

- **Movimento contínuo do canvas (ondulação/vídeo + paralaxe sutil no mouse + cintilação discreta de bits):** Aprovado apenas no `<canvas>` de fundo como efeito temático único de assinatura (prova viva de engenharia gráfica), respeitando `prefers-reduced-motion: reduce`. (2026-11-23)
- **Camada única de vidro (`backdrop-filter`):** Restrita ao sistema flutuante (Header fixo, Barra de Telemetria inferior e Modal de Projeto); cards/painéis de leitura usam superfície escura quase opaca sem empilhar blur. (2026-11-23)
- **Ação de currículo sem peso duplicado:** `Currículo ↗` permanece fixo no Header e `Baixar Currículo` entra no Hero apenas como link textual subordinado ao botão primário `Explorar trajetória ↓` (sem dois botões cheios equivalentes lado a lado). (2026-11-23)
- **Itens provisórios autorizados:** `public/curriculo.pdf` gerado automaticamente com os dados reais do briefing (substituível pelo PDF final) e descrições técnicas dos 3 modais baseadas na experiência real sem métricas inventadas. (2026-11-23)

## Referências trazidas pelo usuário

- Referências de sobriedade citadas no briefing: Linear, Vercel, Stripe (modo escuro editorial, bordas hairline, tipografia limpa).
- Vídeo autoral anexado (`gemini_generated_video_dd80dc13.mp4`): duas carpas brancas nadando em círculo à direita sobre água escura profunda, deixando espaço negativo escuro à esquerda.
