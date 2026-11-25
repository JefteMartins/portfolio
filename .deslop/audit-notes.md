# Perguntas de prioridade e estados (Etapa 6)

1. **Que tipo de visita é esta?**
   Visita de avaliação focada (30 a 90 segundos): recrutadores técnicos e líderes de engenharia entram para validar senioridade real em .NET/Full Stack, percorrem a página observando a trajetória e o acabamento técnico, abrem 1–2 projetos se quiserem profundidade arquitetural e partem para o contato ou download do currículo.

2. **O que a pessoa quer? (Job story)**
   "Quando avalio Jefté Martins para uma posição ou projeto sênior Full Stack/.NET, quero enxergar rapidamente entregas reais de alta complexidade e perceber rigor técnico na própria interface, para decidir com confiança chamá-lo para entrevista."

3. **Como entende o estado sem ler?**
   Pela mudança estrutural imediata da malha gráfica à direita conforme o scroll avança (`RAW` contínuo → pontos `BRAILLE` → caracteres `ASCII` → matriz `0/1` de alto contraste) sincronizada ao indicador de progresso na barra inferior (`01 RAW · 02 BRAILLE · 03 ASCII · 04 BIN`).

4. **Qual ação única cada estado pede?**
   - **Entrada (`01 RAW`):** Iniciar a leitura da trajetória (`Explorar trajetória ↓`), mantendo `Currículo ↗` sempre à mão no topo.
   - **Meio (`02 BRAILLE` / `03 ASCII`):** Escanear experiência em linha do tempo e abrir o modal de um projeto sob demanda.
   - **Fechamento (`04 BIN`):** Copiar `jefte.martins@hotmail.com` com feedback imediato de texto (`Copiado`) ou abrir LinkedIn/GitHub.

5. **Em que ordem vem o resto?**
   Posicionamento e senioridade (Hero) → prova cronológica em produção (Sobre & Experiência) → repertório técnico agrupado e arquitetura aplicada sob demanda (Stack & Projetos) → canal direto de contato (Contato).

6. **O que fica na periferia?**
   A barra de telemetria (`0.00 → 1.00`), os atalhos de estágio e o seletor de teste de imagem (`Alt + I`) ficam contidos no HUD inferior discreto; detalhes extensos dos projetos ficam dentro do modal acionado sob demanda.

7. **Quais ações são passos da mesma tarefa?**
   Clicar no e-mail já copia o endereço para a área de transferência e confirma no próprio item; clicar em qualquer estágio da telemetria já leva suavemente à seção correspondente.

## Estados da tela

- `01 RAW` (0%–20%): Imagem/vídeo limpo das carpas à direita, Hero à esquerda.
- `02 BRAILLE` (20%–50%): Grade Braille fina (6–8px) com matiz suave, Sobre & Linha do Tempo.
- `03 ASCII` (50%–80%): Grade ASCII (10–13px) monocromática fria, Stack & Projetos.
- `04 BINARY` (80%–100%): Matriz `0` e `1` (14–16px) P&B de alto contraste, Contato.
- **Modal de projeto aberto:** Foco contido no diálogo sobre o canvas, retorna ao card de origem ao fechar (`Esc` ou botão fechar).
- **Mídia de teste ativa (`Alt + I` / `Shift + Drop`):** Canvas processa a imagem local instantaneamente nos 4 estágios e exibe opção discreta de restaurar mídia padrão na telemetria.

## Teste dos 2 segundos

Em 2 segundos, o visitante identifica: **quem é** (Jefté Martins — Engenheiro de Software .NET Full Stack), **o diferencial técnico vivo** (as carpas em tempo real à direita) e **o próximo passo** (`Explorar trajetória ↓` ou `Currículo ↗`).
