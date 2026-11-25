export interface NavLink {
  label: string;
  href: string;
}

export interface TelemetryStage {
  code: string;
  label: string;
  target: string;
  range: [number, number];
}

export interface EducationItem {
  institution: string;
  credential: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  current: boolean;
  description: string;
}

export interface StackCategory {
  name: string;
  items: string[];
}

export interface ProjectItem {
  id: string;
  index: string;
  title: string;
  stackSummary: string;
  summary: string;
  context: string;
  challenge: string;
  decisions: string[];
  technologies: string[];
  repoUrl: string;
  repoLabel: string;
}

export interface ContactLink {
  label: string;
  handle: string;
  url: string;
}

export interface BackgroundConfig {
  imageSrc: string;
  videoSrc: string;
  desktopFocalX: number;
  mobileFocalX: number;
  focalY: number;
}

export interface PortfolioData {
  meta: {
    title: string;
    description: string;
    resumeUrl: string;
    resumeNotice: string;
  };
  background: BackgroundConfig;
  navigation: {
    brand: string;
    links: NavLink[];
    resumeLabel: string;
  };
  telemetry: TelemetryStage[];
  hero: {
    name: string;
    subtitle: string;
    pitch: string;
    metadata: string[];
    primaryCta: NavLink;
    secondaryCta: NavLink;
  };
  about: {
    sectionTitle: string;
    summary: string;
    educationTitle: string;
    education: EducationItem[];
  };
  experiences: ExperienceItem[];
  stackSection: {
    sectionTitle: string;
    categories: StackCategory[];
  };
  projects: ProjectItem[];
  contact: {
    sectionTitle: string;
    lead: string;
    email: string;
    copyLabel: string;
    copiedLabel: string;
    links: ContactLink[];
  };
}
