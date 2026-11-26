import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './style.css';
import { inject } from '@vercel/analytics';
import rawPortfolioPt from './data/portfolio.json';
import rawPortfolioEn from './data/portfolio.en.json';
import type { PortfolioData, ProjectItem } from './types';
import { AsciiDeconstructor } from './engine/asciiDeconstructor';

inject();

type Locale = 'pt' | 'en';

const PORTFOLIOS: Record<Locale, PortfolioData> = {
  pt: rawPortfolioPt as PortfolioData,
  en: rawPortfolioEn as PortfolioData
};

const UI_STRINGS: Record<
  Locale,
  {
    htmlLang: string;
    navAria: string;
    langAria: string;
    currentBadge: string;
    timelineHeading: string;
    stackAria: string;
    projectsHeading: string;
    directEmail: string;
    openExternal: string;
    heroEngineHintLead: string;
    heroEngineHintBtn: string;
    modalCloseAria: string;
    modalProjectPrefix: string;
    modalFlowTitle: string;
    modalChallengeTitle: string;
    modalDecisionsTitle: string;
    modalTryImage: string;
    modalContactDefault: string;
    modalRepoDefault: string;
    telemetryAria: string;
    resetMediaLabel: string;
    resetMediaTitle: string;
    pickerTitle: string;
    pickerAria: string;
    pickerLabel: string;
    dropTitle: string;
    dropSubtitle: string;
  }
> = {
  pt: {
    htmlLang: 'pt-BR',
    navAria: 'Navegação principal',
    langAria: 'Selecionar idioma',
    currentBadge: '● Em atividade',
    timelineHeading: 'Trajetória Profissional',
    stackAria: 'Tecnologias por categoria',
    projectsHeading: 'Projetos em Destaque',
    directEmail: 'E-mail direto',
    openExternal: 'Abrir',
    heroEngineHintLead: 'Motor visual ao vivo no fundo — role para desconstruir ou',
    heroEngineHintBtn: 'testar com sua imagem (Alt+I)',
    modalCloseAria: 'Fechar detalhes do projeto',
    modalProjectPrefix: 'Projeto',
    modalFlowTitle: 'Fluxo Arquitetural',
    modalChallengeTitle: 'Desafio Técnico',
    modalDecisionsTitle: 'Decisões de Engenharia',
    modalTryImage: 'Testar imagem (Alt+I)',
    modalContactDefault: 'Entrar em contato',
    modalRepoDefault: 'Ver repositório no GitHub',
    telemetryAria: 'Telemetria de renderização e navegação de estágios',
    resetMediaLabel: 'Restaurar',
    resetMediaTitle: 'Restaurar mídia original',
    pickerTitle: 'Testar imagem local nos 5 estágios (Alt + I ou Shift + Arrastar)',
    pickerAria: 'Testar imagem local no motor de fundo (atalho Alt + I)',
    pickerLabel: 'Testar imagem · Alt+I',
    dropTitle: 'Modo de teste de imagem',
    dropSubtitle: 'Solte a imagem para testar a desconstrução em tempo real nos 5 estágios'
  },
  en: {
    htmlLang: 'en',
    navAria: 'Main navigation',
    langAria: 'Select language',
    currentBadge: '● Current',
    timelineHeading: 'Professional Experience',
    stackAria: 'Technologies by category',
    projectsHeading: 'Featured Projects',
    directEmail: 'Direct email',
    openExternal: 'Open',
    heroEngineHintLead: 'Live visual engine in the background — scroll to deconstruct or',
    heroEngineHintBtn: 'test with your image (Alt+I)',
    modalCloseAria: 'Close project details',
    modalProjectPrefix: 'Project',
    modalFlowTitle: 'Architecture Flow',
    modalChallengeTitle: 'Technical Challenge',
    modalDecisionsTitle: 'Engineering Decisions',
    modalTryImage: 'Try image (Alt+I)',
    modalContactDefault: 'Get in touch',
    modalRepoDefault: 'View on GitHub',
    telemetryAria: 'Render telemetry and stage navigation',
    resetMediaLabel: 'Reset',
    resetMediaTitle: 'Restore default media',
    pickerTitle: 'Test a local image across all 5 stages (Alt + I or Shift + Drag)',
    pickerAria: 'Test a local image on the background engine (shortcut Alt + I)',
    pickerLabel: 'Try image · Alt+I',
    dropTitle: 'Image test mode',
    dropSubtitle: 'Drop an image to test real-time deconstruction across all 5 stages'
  }
};

// Suporte opcional a ?finish=none|light|medium para inspeção das doses de acabamento (Parada 4)
const initialParams = new URLSearchParams(window.location.search);
const finishParam = initialParams.get('finish');
if (finishParam === 'none' || finishParam === 'light' || finishParam === 'medium') {
  document.documentElement.setAttribute('data-finish', finishParam);
}

function resolveInitialLocale(): Locale {
  const param = initialParams.get('lang')?.toLowerCase();
  if (param === 'en' || param === 'pt') return param;
  try {
    const saved = window.localStorage.getItem('portfolio_lang');
    if (saved === 'en' || saved === 'pt') return saved;
  } catch {
    // ignore storage errors
  }
  return 'pt';
}

let currentLocale: Locale = resolveInitialLocale();
let data: PortfolioData = PORTFOLIOS[currentLocale];

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

// Referências persistentes fora do #app
const canvasEl = document.getElementById('bg-canvas') as HTMLCanvasElement;
const pickerInput = document.getElementById('image-picker') as HTMLInputElement;
const dropOverlay = document.getElementById('drop-overlay') as HTMLElement;

// Referências dinâmicas dentro do #app (atualizadas a cada renderApp)
let progressFillEl!: HTMLElement;
let progressReadoutEl!: HTMLElement;
let stageButtons: HTMLButtonElement[] = [];
let pickerTrigger!: HTMLButtonElement;
let resetMediaBtn!: HTMLButtonElement;
let modalBackdrop!: HTMLElement;
let modalCloseBtn!: HTMLButtonElement;
let modalIndex!: HTMLElement;
let modalScope!: HTMLElement;
let modalTitle!: HTMLElement;
let modalFlow!: HTMLElement;
let modalChallenge!: HTMLElement;
let modalDecisions!: HTMLElement;
let modalTech!: HTMLElement;
let modalContext!: HTMLElement;
let modalPreviewWrap!: HTMLElement;
let modalPreviewImg!: HTMLImageElement;
let modalTryImageBtn!: HTMLButtonElement;
let modalRepoLink!: HTMLAnchorElement;
let modalRepoLabel!: HTMLElement;
let modalContactLink!: HTMLAnchorElement;
let modalContactLabel!: HTMLElement;

let lastStageIndex = -1;
let lastProgress = 0;
let lastIsCustomMedia = false;
let copyTimer = 0;
let lastFocusedTrigger: HTMLElement | null = null;
let engine: AsciiDeconstructor | null = null;

function openImagePicker(): void {
  pickerInput.value = '';
  pickerInput.click();
}

function closeProjectModal(): void {
  if (!modalBackdrop || modalBackdrop.hidden) return;
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedTrigger) {
    lastFocusedTrigger.focus();
    lastFocusedTrigger = null;
  }
}

function openProjectModal(proj: ProjectItem, trigger: HTMLElement): void {
  const ui = UI_STRINGS[currentLocale];
  lastFocusedTrigger = trigger;
  modalIndex.textContent = `${ui.modalProjectPrefix} ${proj.index}`;
  modalScope.textContent = proj.scopeTag;
  modalTitle.textContent = proj.title;

  if (proj.imageSrc) {
    modalPreviewImg.src = proj.imageSrc;
    modalPreviewImg.alt = proj.imageAlt ?? proj.title;
    modalPreviewWrap.hidden = false;
  } else {
    modalPreviewWrap.hidden = true;
    modalPreviewImg.removeAttribute('src');
    modalPreviewImg.alt = '';
  }

  modalFlow.innerHTML = proj.architectureFlow
    .map(
      (step, idx) =>
        `<li class="modal-flow__step"><span class="modal-flow__node">${escapeHtml(step)}</span>${idx < proj.architectureFlow.length - 1 ? `<span class="modal-flow__sep" aria-hidden="true">${ICONS.arrowRight}</span>` : ''}</li>`
    )
    .join('');
  modalChallenge.textContent = proj.challenge;
  modalDecisions.innerHTML = proj.decisions
    .map((d) => `<li>${escapeHtml(d)}</li>`)
    .join('');
  modalTech.textContent = proj.technologies.join(' · ');
  modalContext.textContent = proj.context;
  modalTryImageBtn.hidden = proj.interactiveAction !== 'image-picker';

  const isPrivate = proj.visibility === 'private' || !proj.repoUrl;
  if (isPrivate) {
    modalRepoLink.hidden = true;
    modalRepoLink.removeAttribute('href');
    modalContactLink.hidden = false;
    modalContactLabel.textContent = proj.contactCtaLabel ?? ui.modalContactDefault;
  } else {
    modalRepoLink.hidden = false;
    modalRepoLink.href = proj.repoUrl!;
    modalRepoLabel.textContent = proj.repoLabel ?? ui.modalRepoDefault;
    modalContactLink.hidden = true;
  }

  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  modalCloseBtn.focus();
}

function syncDocumentMetadata(): void {
  const ui = UI_STRINGS[currentLocale];
  document.documentElement.lang = ui.htmlLang;
  document.title = data.meta.title;
  const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = data.meta.description;
  }

  const dropTitle = dropOverlay.querySelector('.mono-label');
  const dropP = dropOverlay.querySelector('p');
  if (dropTitle) dropTitle.textContent = ui.dropTitle;
  if (dropP) dropP.textContent = ui.dropSubtitle;
}

function setLocale(next: Locale): void {
  if (next === currentLocale) return;
  currentLocale = next;
  data = PORTFOLIOS[next];

  try {
    window.localStorage.setItem('portfolio_lang', next);
  } catch {
    // ignore storage errors
  }

  const url = new URL(window.location.href);
  if (next === 'en') {
    url.searchParams.set('lang', 'en');
  } else {
    url.searchParams.delete('lang');
  }
  window.history.replaceState({}, '', url.toString());

  closeProjectModal();
  renderApp();
  syncTelemetryDom();
  updateScrollProgress();
}

function syncTelemetryDom(): void {
  if (!progressFillEl || !progressReadoutEl) return;
  const pct = (lastProgress * 100).toFixed(2);
  progressFillEl.style.width = `${pct}%`;
  progressReadoutEl.textContent = `Scroll ${Math.round(lastProgress * 100)}%`;

  const activeIdx = lastStageIndex >= 0 ? lastStageIndex : 0;
  stageButtons.forEach((btn, idx) => {
    btn.setAttribute('aria-current', idx === activeIdx ? 'true' : 'false');
  });

  if (pickerTrigger) {
    pickerTrigger.setAttribute('data-custom', lastIsCustomMedia ? 'true' : 'false');
  }
  if (resetMediaBtn) {
    resetMediaBtn.hidden = !lastIsCustomMedia;
  }
}

function renderApp(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const ui = UI_STRINGS[currentLocale];

  syncDocumentMetadata();

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
            ${exp.current ? `<span class="timeline-current">${escapeHtml(ui.currentBadge)}</span>` : ''}
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
          <div class="project-item__meta-right">
            <span
              class="project-item__scope"
              data-live="${proj.interactiveAction === 'image-picker' ? 'true' : 'false'}"
              data-private="${proj.visibility === 'private' ? 'true' : 'false'}"
            >${escapeHtml(proj.scopeTag)}</span>
            <span class="project-item__arrow" aria-hidden="true">${ICONS.external}</span>
          </div>
        </div>
        <div class="project-item__stack">${escapeHtml(proj.stackSummary)}</div>
        <div class="project-item__body">
          ${
            proj.imageSrc
              ? `<div class="project-item__thumb-wrap">
                  <img
                    class="project-item__thumb"
                    src="${escapeHtml(proj.imageSrc)}"
                    alt="${escapeHtml(proj.imageAlt ?? proj.title)}"
                    loading="lazy"
                    decoding="async"
                  />
                </div>`
              : ''
          }
          <p class="project-item__summary">${escapeHtml(proj.summary)}</p>
        </div>
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
        <span class="contact-row__status">${escapeHtml(ui.openExternal)} ${ICONS.external}</span>
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
        <nav class="site-nav" aria-label="${escapeHtml(ui.navAria)}">
          <ul class="site-nav__links">
            ${navLinksHtml}
          </ul>
          <div class="lang-switch" role="group" aria-label="${escapeHtml(ui.langAria)}">
            <button type="button" class="lang-switch__btn" data-lang="pt" aria-pressed="${currentLocale === 'pt' ? 'true' : 'false'}">PT</button>
            <button type="button" class="lang-switch__btn" data-lang="en" aria-pressed="${currentLocale === 'en' ? 'true' : 'false'}">EN</button>
          </div>
          <a
            class="resume-btn"
            href="${escapeHtml(data.meta.resumeUrl)}"
            download="Jefte-Martins-Resume.pdf"
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
              download="Jefte-Martins-Resume.pdf"
              title="${escapeHtml(data.meta.resumeNotice)}"
            >
              <span>${escapeHtml(data.hero.secondaryCta.label)}</span>
              ${ICONS.external}
            </a>
          </div>
          <p class="hero-engine-hint">
            <span>${escapeHtml(ui.heroEngineHintLead)}</span>
            <button type="button" id="hero-try-image-btn" class="hero-engine-hint__btn">
              ${escapeHtml(ui.heroEngineHintBtn)}
            </button>
          </p>
        </section>

        <!-- Seção 2: Sobre & Experiência (DRIFT -> PARTICLE) -->
        <section id="sobre" class="section-block">
          <div class="section-header">
            <h2 class="section-title">${escapeHtml(data.about.sectionTitle)}</h2>
          </div>
          <p class="about-summary">${escapeHtml(data.about.summary)}</p>

          <div id="experiencia">
            <div class="timeline-heading">
              <span class="mono-label">${escapeHtml(ui.timelineHeading)}</span>
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
          </div>

          <div class="stack-matrix" aria-label="${escapeHtml(ui.stackAria)}">
            ${stackHtml}
          </div>

          <div class="projects-subhead">
            <span class="mono-label">${escapeHtml(ui.projectsHeading)}</span>
          </div>
          <div class="projects-list">
            ${projectsHtml}
          </div>
        </section>

        <!-- Seção 4: Contato (BINARY) -->
        <section id="contato" class="section-block contact-section">
          <div class="section-header">
            <h2 class="section-title">${escapeHtml(data.contact.sectionTitle)}</h2>
          </div>
          <p class="contact-lead">${escapeHtml(data.contact.lead)}</p>

          <div class="contact-links">
            <button type="button" id="copy-email-btn" class="contact-row">
              <span class="contact-row__main">
                <span class="contact-row__kind">${escapeHtml(ui.directEmail)}</span>
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
            <div class="modal-eyebrow">
              <span id="modal-index" class="mono-label"></span>
              <span class="hero-meta__sep" aria-hidden="true">·</span>
              <span id="modal-scope" class="mono-label"></span>
            </div>
            <h3 id="modal-title" class="modal-title"></h3>
          </div>
          <button type="button" id="modal-close-btn" class="modal-close" aria-label="${escapeHtml(ui.modalCloseAria)}">
            ${ICONS.close}
          </button>
        </div>

        <figure id="modal-preview-wrap" class="modal-preview" hidden>
          <img id="modal-preview-img" class="modal-preview__img" src="" alt="" />
        </figure>

        <div class="modal-section">
          <h4>${escapeHtml(ui.modalFlowTitle)}</h4>
          <ol id="modal-flow" class="modal-flow"></ol>
        </div>

        <div class="modal-section">
          <h4>${escapeHtml(ui.modalChallengeTitle)}</h4>
          <p id="modal-challenge"></p>
        </div>

        <div class="modal-section">
          <h4>${escapeHtml(ui.modalDecisionsTitle)}</h4>
          <ul id="modal-decisions" class="modal-decisions"></ul>
        </div>

        <div id="modal-tech" class="modal-tech"></div>

        <div class="modal-footer">
          <span id="modal-context" class="modal-context-note"></span>
          <div class="modal-footer__actions">
            <button type="button" id="modal-try-image-btn" class="resume-btn" hidden>
              ${ICONS.imageTest}
              <span>${escapeHtml(ui.modalTryImage)}</span>
            </button>
            <a id="modal-repo-link" class="resume-btn" href="#" target="_blank" rel="noopener noreferrer">
              <span id="modal-repo-label"></span>
              ${ICONS.external}
            </a>
            <a id="modal-contact-link" class="resume-btn" href="#contato" hidden>
              <span id="modal-contact-label">${escapeHtml(ui.modalContactDefault)}</span>
              ${ICONS.arrowDown}
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de Telemetria Fixa -->
    <aside class="telemetry-bar floating-glass" aria-label="${escapeHtml(ui.telemetryAria)}">
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
          <button type="button" id="reset-media-btn" class="reset-media-btn" hidden title="${escapeHtml(ui.resetMediaTitle)}">
            ${escapeHtml(ui.resetMediaLabel)}
          </button>
          <button
            type="button"
            id="img-picker-trigger"
            class="img-picker-btn"
            data-custom="false"
            title="${escapeHtml(ui.pickerTitle)}"
            aria-label="${escapeHtml(ui.pickerAria)}"
          >
            ${ICONS.imageTest}
            <span class="img-picker-btn__label">${escapeHtml(ui.pickerLabel)}</span>
          </button>
        </div>
      </div>
    </aside>
  `;

  bindAppEvents();
}

function bindAppEvents(): void {
  progressFillEl = document.getElementById('telemetry-fill') as HTMLElement;
  progressReadoutEl = document.getElementById('telemetry-readout') as HTMLElement;
  stageButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.stage-btn'));
  pickerTrigger = document.getElementById('img-picker-trigger') as HTMLButtonElement;
  resetMediaBtn = document.getElementById('reset-media-btn') as HTMLButtonElement;

  modalBackdrop = document.getElementById('project-modal') as HTMLElement;
  modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;
  modalIndex = document.getElementById('modal-index') as HTMLElement;
  modalScope = document.getElementById('modal-scope') as HTMLElement;
  modalTitle = document.getElementById('modal-title') as HTMLElement;
  modalFlow = document.getElementById('modal-flow') as HTMLElement;
  modalChallenge = document.getElementById('modal-challenge') as HTMLElement;
  modalDecisions = document.getElementById('modal-decisions') as HTMLElement;
  modalTech = document.getElementById('modal-tech') as HTMLElement;
  modalContext = document.getElementById('modal-context') as HTMLElement;
  modalPreviewWrap = document.getElementById('modal-preview-wrap') as HTMLElement;
  modalPreviewImg = document.getElementById('modal-preview-img') as HTMLImageElement;
  modalTryImageBtn = document.getElementById('modal-try-image-btn') as HTMLButtonElement;
  modalRepoLink = document.getElementById('modal-repo-link') as HTMLAnchorElement;
  modalRepoLabel = document.getElementById('modal-repo-label') as HTMLElement;
  modalContactLink = document.getElementById('modal-contact-link') as HTMLAnchorElement;
  modalContactLabel = document.getElementById('modal-contact-label') as HTMLElement;

  // Seletor de idioma PT / EN
  document.querySelectorAll<HTMLButtonElement>('.lang-switch__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === 'pt' || lang === 'en') {
        setLocale(lang);
      }
    });
  });

  // Clique nos estágios da barra de telemetria
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

  const heroTryImageBtn = document.getElementById('hero-try-image-btn') as HTMLButtonElement;
  pickerTrigger.addEventListener('click', openImagePicker);
  heroTryImageBtn.addEventListener('click', openImagePicker);

  resetMediaBtn.addEventListener('click', () => {
    engine?.resetToDefaultMedia();
  });

  // Copiar e-mail
  const copyEmailBtn = document.getElementById('copy-email-btn') as HTMLButtonElement;
  const copyEmailStatus = document.getElementById('copy-email-status') as HTMLElement;
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

  // Modal de projetos
  document.querySelectorAll<HTMLButtonElement>('.project-item').forEach((card) => {
    card.addEventListener('click', () => {
      const proj = data.projects.find((p) => p.id === card.dataset.projectId);
      if (proj) {
        openProjectModal(proj, card);
      }
    });
  });

  modalTryImageBtn.addEventListener('click', () => {
    closeProjectModal();
    openImagePicker();
  });

  modalContactLink.addEventListener('click', (e) => {
    e.preventDefault();
    closeProjectModal();
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  });

  modalCloseBtn.addEventListener('click', closeProjectModal);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeProjectModal();
    }
  });
}

function updateScrollProgress(): void {
  const maxScroll = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1
  );
  const p = window.scrollY / maxScroll;
  engine?.setScrollProgress(p);
}

// Render inicial e inicialização única do motor + listeners globais
renderApp();

engine = new AsciiDeconstructor(canvasEl, data.background, (telemetry) => {
  lastProgress = telemetry.progress;
  lastIsCustomMedia = telemetry.isCustomMedia;

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

window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress, { passive: true });
engine.start();
updateScrollProgress();

pickerInput.addEventListener('change', () => {
  const file = pickerInput.files?.[0];
  if (file && file.type.startsWith('image/')) {
    engine?.loadCustomFile(file);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'i' || e.key === 'I' || e.code === 'KeyI')) {
    e.preventDefault();
    openImagePicker();
  } else if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.hidden) {
    closeProjectModal();
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
    engine?.loadCustomFile(file);
  }
});
