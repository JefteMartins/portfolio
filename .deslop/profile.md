# Perfil do projeto

## Idioma do produto

Português (Brasil) — `pt-BR`.

## Destino de saída

Código próprio do projeto em **Vite + TypeScript** (Vanilla TS para máxima leveza e 60 FPS estáveis), com dados isolados em `src/data/portfolio.json` e motor em `src/engine/asciiDeconstructor.ts`.

## Fontes

- **Títulos e corpo:** `Switzer` (Fontshare — grotesca suíça independente, pesos 400 e 600).
- **Telemetria, datas e metadados técnicos:** `JetBrains Mono` (pesos 400 e 500, números tabulares).

## Ícones

SVGs próprios minimalistas no estilo do produto (traço `1.5px`, grade `16×16`, cor herdada de `currentColor`), sem bibliotecas prontas nem ícones genéricos de IA (✦, varinhas, brilhos).

## Ilustração e mídia

Vídeo autoral fornecido pelo usuário (`gemini_generated_video_dd80dc13.mp4` — duas carpas brancas nadando em água escura à direita) processado em tempo real no `<canvas>`, com frame em alta definição extraído em `public/assets/background.jpg` como fallback estático e fallback procedural em canvas caso ausente.

## Vetos iniciais

- Switches decorativos ou pílulas coloridas sem função de estado.
- Gradientes em textos ou múltiplos gradientes espalhados pela tela.
- Brilho externo (`box-shadow` neon / aura sem fonte de luz) e manchas coloridas borradas (`blur blobs`).
- Mesmo layout de cards repetido em todas as seções ("cara de template").
- Animações de entrada `fade-up` escalonadas em todo bloco.
- Textos com voz de IA em PT-BR ("potencialize", "de forma simples e intuitiva", "revolucione").
