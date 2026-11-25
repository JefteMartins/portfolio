import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './style.css';
import rawPortfolio from './data/portfolio.json';
import type { PortfolioData, ProjectItem } from './types';
import { AsciiDeconstructor } from './engine/asciiDeconstructor';

const data = rawPortfolio as PortfolioData;

// Suporte opcional a ?finish=none|light|medium para inspeção das doses de acabamento (Parada 4)
const finishParam = new URLSearchParams(window.location.search).get('finish');
if (finishParam === 'none' || finishParam === 'light' || finishParam === 'medium') {
  document.documentElement.setAttribute('data-finish', finishParam);
}

document.title = data.meta.title;

// SVGs próprios minimalistas (grade 16x16, stroke 1.5px, currentColor)
const ICONS = {
  external: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 11L11 5M11 5H6M11 5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrowDown: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.5V12.5M8 12.5L4.5 9M8 12.5L11.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrowRight: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8H12.5M12.5 8L9 4.5M12.5 8L9 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V4C3 3.44772 3.44772 3 4 3H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  imageTest: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.75" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="6.25" r="1.1" fill="currentColor"/><path d="M3 11.75L6.5 8.5L9.25 11L11.25 9.25L13.25 11.25" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const navLinksHtml = data.navigation.links
    .map(
      (link) =>
        `<li><a class="site-nav__link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
    )
    .join('');

  const heroMetaHtml = data.hero.metadata
    .map((item, idx) =>
      idx === 0
        ? `<span>${escapeHtml(item)}</span>`
        : `<span class="hero-meta__sep" aria-hidden="true">•</span><span>${escapeHtml(item)}</span>`
    )
    .join('');

  const experiencesHtml = data.experiences
    .map(
      (exp) => `
      <li class="timeline-item">
        <div class="timeline-period">${escapeHtml(exp.period)}</div>
        <div>
          <div class="timeline-role-row">
            <h3 class="timeline-company">${escapeHtml(exp.company)}</h3>
            <span class="timeline-sep" aria-hidden="true">—</span>
            <span class="timeline-role">${escapeHtml(exp.role)}</span>
            ${exp.current ? `<span class="timeline-current">● Em curso</span>` : ''}
          </div>
          <p class="timeline-desc">${escapeHtml(exp.description)}</p>
        </div>
      </li>
    `
    )
    .join('');

  const educationHtml = data.about.education
    .map(
      (edu) => `
      <li class="education-item">
        <span class="education-credential">${escapeHtml(edu.credential)}</span>
        <span class="education-inst">${escapeHtml(edu.institution)}</span>
      </li>
    `
    )
    .join('');

  const stackHtml = data.stackSection.categories
    .map(
      (cat) => `
      <div class="stack-row">
        <span class="stack-cat">${escapeHtml(cat.name)}</span>
        <div class="stack-items">
          ${cat.items
            .map((item, idx) =>
              idx === 0
                ? `${escapeHtml(item)}`
                : ` <span class="stack-dot" aria-hidden="true">·</span> ${escapeHtml(item)}`
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');

  const projectsHtml = data.projects
    .map(
      (proj) => `
      <button
        type="button"
        class="project-item"
        data-project-id="${escapeHtml(proj.id)}"
        aria-haspopup="dialog"
      >
        <div class="project-item__top">
          <div class="project-item__title-wrap">
            <span class="project-item__idx">${escapeHtml(proj.index)}</span>
            <h3 class="project-item__title">${escapeHtml(proj.title)}</h3>
          </div>
          <span class="project-item__action">Arquitetura ${ICONS.arrowRight}</span>
        </div>
        <div class="project-item__stack">${escapeHtml(proj.stackSummary)}</div>
        <p class="project-item__summary">${escapeHtml(proj.summary)}</p>
      </button>
    `
    )
    .join('');

  const externalContactsHtml = data.contact.links
    .map(
      (link) => `
      <a
        class="contact-row"
        href="${escapeHtml(link.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="contact-row__main">
          <span class="contact-row__kind">${escapeHtml(link.label)}</span>
          <span class="contact-row__value">${escapeHtml(link.handle)}</span>
        </span>
        <span class="contact-row__status">Abrir ${ICONS.external}</span>
      </a>
    `
    )
    .join('');

  const telemetryButtonsHtml = data.telemetry
    .map(
      (st, idx) => `
      ${idx > 0 ? '<span class="stage-sep" aria-hidden="true">•</span>' : ''}
      <button
        type="button"
        class="stage-btn"
        data-stage-idx="${idx}"
        data-target="${escapeHtml(st.target)}"
        aria-current="${idx === 0 ? 'true' : 'false'}"
      >
        <span class="stage-btn__code">${escapeHtml(st.code)}</span>
        <span>${escapeHtml(st.label)}</span>
      </button>
    `
    )
    .join('');

  app.innerHTML = `
    <header class="site-header floating-glass">
      <div class="site-header__inner">
        <a class="brand-link" href="#hero">${escapeHtml(data.navigation.brand)}</a>
        <nav class="site-nav" aria-label="Navegação principal">
          <ul class="site-nav__links">
            ${navLinksHtml}
          </ul>
          <a
            class="resume-btn"
            href="${escapeHtml(data.meta.resumeUrl)}"
            download="Jefte-Martins-Curriculo.pdf"
            title="${escapeHtml(data.meta.resumeNotice)}"
          >
            <span>${escapeHtml(data.navigation.resumeLabel)}</span>
            ${ICONS.external}
          </a>
        </nav>
      </div>
    </header>

    <main class="page-shell">
      <div class="editorial-column">
        <!-- Seção 1: Hero (RAW) -->
        <section id="hero" class="section-block hero-section">
          <div class="hero-meta">${heroMetaHtml}</div>
          <h1 class="hero-name">${escapeHtml(data.hero.name)}</h1>
          <p class="hero-subtitle">${escapeHtml(data.hero.subtitle)}</p>
          <p class="hero-pitch">${escapeHtml(data.hero.pitch)}</p>
          <div class="hero-actions">
            <a class="btn-primary" href="${escapeHtml(data.hero.primaryCta.href)}">
              <span>${escapeHtml(data.hero.primaryCta.label)}</span>
              ${ICONS.arrowDown}
            </a>
            <a
              class="btn-secondary-link"
              href="${escapeHtml(data.hero.secondaryCta.href)}"
              download="Jefte-Martins-Curriculo.pdf"
              title="${escapeHtml(data.meta.resumeNotice)}"
            >
              <span>${escapeHtml(data.hero.secondaryCta.label)}</span>
              ${ICONS.external}
            </a>
          </div>
        </section>

        <!-- Seção 2: Sobre & Experiência (DRIFT -> PARTICLE) -->
        <section id="sobre" class="section-block">
          <div class="section-header">
            <h2 class="section-title">${escapeHtml(data.about.sectionTitle)}</h2>
            <span class="mono-label">02 · DRIFT</span>
          </div>
          <p class="about-summary">${escapeHtml(data.about.summary)}</p>

          <div id="experiencia">
            <div class="timeline-heading timeline-heading--split">
              <span class="mono-label">Trajetória Profissional</span>
              <span class="mono-label">03 · PARTICLE</span>
            </div>
            <ol class="timeline-list">
              ${experiencesHtml}
            </ol>
          </div>

          <div class="education-block">
            <span class="mono-label">${escapeHtml(data.about.educationTitle)}</span>
            <ul class="education-list">
              ${educationHtml}
            </ul>
          </div>
        </section>

        <!-- Seção 3: Stack & Projetos (HYBRID) -->
        <section id="projetos" class="section-block">
          <div class="section-header">
            <h2 class="section-title">${escapeHtml(data.stackSection.sectionTitle)}</h2>
            <span class="mono-label">04 · HYBRID</span>
          </div>

          <div class="stack-matrix" aria-label="Tecnologias por categoria">
            ${stackHtml}
          </div>

          <div class="projects-subhead">
            <span class="mono-label">Projetos em Destaque</span>
          </div>
          <div class="projects-list">
            ${projectsHtml}
          </div>
        </section>

        <!-- Seção 4: Contato (BINARY) -->
        <section id="contato" class="section-block contact-section">
          <div class="section-header">
            <h2 class="section-title">${escapeHtml(data.contact.sectionTitle)}</h2>
            <span class="mono-label">05 · BIN</span>
          </div>
          <p class="contact-lead">${escapeHtml(data.contact.lead)}</p>

          <div class="contact-links">
            <button type="button" id="copy-email-btn" class="contact-row">
              <span class="contact-row__main">
                <span class="contact-row__kind">E-mail direto</span>
                <span class="contact-row__value">${escapeHtml(data.contact.email)}</span>
              </span>
              <span id="copy-email-status" class="contact-row__status" data-copied="false">
                <span>${escapeHtml(data.contact.copyLabel)}</span>
                ${ICONS.copy}
              </span>
            </button>
            ${externalContactsHtml}
          </div>
        </section>
      </div>
    </main>

    <!-- Modal de Detalhes do Projeto -->
    <div id="project-modal" class="modal-backdrop" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-panel floating-glass">
        <div class="modal-top">
          <div>
            <span id="modal-index" class="mono-label"></span>
            <h3 id="modal-title" class="modal-title"></h3>
          </div>
          <button type="button" id="modal-close-btn" class="modal-close" aria-label="Fechar detalhes do projeto">
            ${ICONS.close}
          </button>
        </div>

        <div class="modal-section">
          <h4>Desafio Técnico</h4>
          <p id="modal-challenge"></p>
        </div>

        <div class="modal-section">
          <h4>Decisões de Engenharia</h4>
          <ul id="modal-decisions" class="modal-decisions"></ul>
        </div>

        <div id="modal-tech" class="modal-tech"></div>

        <div class="modal-footer">
          <span id="modal-context" class="modal-context-note"></span>
          <a id="modal-repo-link" class="resume-btn" href="#" target="_blank" rel="noopener noreferrer">
            <span id="modal-repo-label"></span>
            ${ICONS.external}
          </a>
        </div>
      </div>
    </div>

    <!-- Barra de Telemetria Fixa -->
    <aside class="telemetry-bar floating-glass" aria-label="Telemetria de renderização e navegação de estágios">
      <div class="telemetry-bar__inner">
        <div class="telemetry-stages">
          ${telemetryButtonsHtml}
        </div>

        <div class="telemetry-progress" aria-hidden="true">
          <div class="progress-track">
            <div id="telemetry-fill" class="progress-fill"></div>
          </div>
          <span id="telemetry-readout" class="progress-readout">Scroll 0%</span>
        </div>

        <div class="telemetry-tools">
          <button type="button" id="reset-media-btn" class="reset-media-btn" hidden title="Restaurar mídia original das carpas">
            Restaurar
          </button>
          <button
            type="button"
            id="img-picker-trigger"
            class="img-picker-btn"
            data-custom="false"
            title="Testar imagem local nos 4 estágios (Alt + I ou Shift + Arrastar)"
            aria-label="Testar imagem local no motor de fundo (atalho Alt + I)"
          >
            ${ICONS.imageTest}
            <span class="img-picker-btn__label">Alt+I</span>
          </button>
        </div>
      </div>
    </aside>
  `;
}

renderApp();

// Inicializa o motor de desconstrução
const canvasEl = document.getElementById('bg-canvas') as HTMLCanvasElement;
const progressFillEl = document.getElementById('telemetry-fill') as HTMLElement;
const progressReadoutEl = document.getElementById('telemetry-readout') as HTMLElement;
const stageButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.stage-btn'));
const pickerInput = document.getElementById('image-picker') as HTMLInputElement;
const pickerTrigger = document.getElementById('img-picker-trigger') as HTMLButtonElement;
const resetMediaBtn = document.getElementById('reset-media-btn') as HTMLButtonElement;
const dropOverlay = document.getElementById('drop-overlay') as HTMLElement;

let lastStageIndex = -1;

const engine = new AsciiDeconstructor(canvasEl, data.background, (telemetry) => {
  const pct = (telemetry.progress * 100).toFixed(2);
  progressFillEl.style.width = `${pct}%`;
  progressReadoutEl.textContent = `Scroll ${Math.round(telemetry.progress * 100)}%`;

  if (telemetry.stageIndex !== lastStageIndex) {
    lastStageIndex = telemetry.stageIndex;
    stageButtons.forEach((btn, idx) => {
      btn.setAttribute('aria-current', idx === telemetry.stageIndex ? 'true' : 'false');
    });
  }

  pickerTrigger.setAttribute('data-custom', telemetry.isCustomMedia ? 'true' : 'false');
  resetMediaBtn.hidden = !telemetry.isCustomMedia;
});

function updateScrollProgress(): void {
  const maxScroll = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1
  );
  const p = window.scrollY / maxScroll;
  engine.setScrollProgress(p);
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress, { passive: true });
engine.start();
updateScrollProgress();

// Clique nos estágios da barra de telemetria faz scroll suave direto para a seção
stageButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const selector = btn.dataset.target;
    if (!selector) return;
    if (selector === '#contato') {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
      return;
    }
    const targetEl = document.querySelector(selector);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Modo de Teste Rápido de Imagens: botão, Alt + I e Shift + Drag & Drop
function openImagePicker(): void {
  pickerInput.value = '';
  pickerInput.click();
}

pickerTrigger.addEventListener('click', openImagePicker);

resetMediaBtn.addEventListener('click', () => {
  engine.resetToDefaultMedia();
});

pickerInput.addEventListener('change', () => {
  const file = pickerInput.files?.[0];
  if (file && file.type.startsWith('image/')) {
    engine.loadCustomFile(file);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'i' || e.key === 'I' || e.code === 'KeyI')) {
    e.preventDefault();
    openImagePicker();
  }
});

window.addEventListener('dragover', (e) => {
  if (e.shiftKey && e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dropOverlay.hidden = false;
  } else {
    dropOverlay.hidden = true;
  }
});

window.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) {
    dropOverlay.hidden = true;
  }
});

window.addEventListener('drop', (e) => {
  dropOverlay.hidden = true;
  if (!e.shiftKey) return;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    e.preventDefault();
    engine.loadCustomFile(file);
  }
});

// Copiar e-mail com feedback imediato no próprio elemento
const copyEmailBtn = document.getElementById('copy-email-btn') as HTMLButtonElement;
const copyEmailStatus = document.getElementById('copy-email-status') as HTMLElement;
let copyTimer = 0;

copyEmailBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(data.contact.email);
  } catch {
    const temp = document.createElement('textarea');
    temp.value = data.contact.email;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
  }

  window.clearTimeout(copyTimer);
  copyEmailStatus.setAttribute('data-copied', 'true');
  copyEmailStatus.innerHTML = `<span>${escapeHtml(data.contact.copiedLabel)}</span>${ICONS.check}`;

  copyTimer = window.setTimeout(() => {
    copyEmailStatus.setAttribute('data-copied', 'false');
    copyEmailStatus.innerHTML = `<span>${escapeHtml(data.contact.copyLabel)}</span>${ICONS.copy}`;
  }, 2400);
});

// Modal de Projetos (retorna o foco ao gatilho original ao fechar)
const modalBackdrop = document.getElementById('project-modal') as HTMLElement;
const modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;
const modalIndex = document.getElementById('modal-index') as HTMLElement;
const modalTitle = document.getElementById('modal-title') as HTMLElement;
const modalChallenge = document.getElementById('modal-challenge') as HTMLElement;
const modalDecisions = document.getElementById('modal-decisions') as HTMLElement;
const modalTech = document.getElementById('modal-tech') as HTMLElement;
const modalContext = document.getElementById('modal-context') as HTMLElement;
const modalRepoLink = document.getElementById('modal-repo-link') as HTMLAnchorElement;
const modalRepoLabel = document.getElementById('modal-repo-label') as HTMLElement;

let lastFocusedTrigger: HTMLElement | null = null;

function openProjectModal(proj: ProjectItem, trigger: HTMLElement): void {
  lastFocusedTrigger = trigger;
  modalIndex.textContent = `Projeto ${proj.index}`;
  modalTitle.textContent = proj.title;
  modalChallenge.textContent = proj.challenge;
  modalDecisions.innerHTML = proj.decisions
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('');
  modalTech.textContent = proj.technologies.join(' · ');
  modalContext.textContent = proj.context;
  modalRepoLink.href = proj.repoUrl;
  modalRepoLabel.textContent = proj.repoLabel;

  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  modalCloseBtn.focus();
}

function closeProjectModal(): void {
  if (modalBackdrop.hidden) return;
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedTrigger) {
    lastFocusedTrigger.focus();
    lastFocusedTrigger = null;
  }
}

document.querySelectorAll<HTMLButtonElement>('.project-item').forEach((card) => {
  card.addEventListener('click', () => {
    const proj = data.projects.find((p) => p.id === card.dataset.projectId);
    if (proj) {
      openProjectModal(proj, card);
    }
  });
});

modalCloseBtn.addEventListener('click', closeProjectModal);

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) {
    closeProjectModal();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalBackdrop.hidden) {
    closeProjectModal();
  }
});
