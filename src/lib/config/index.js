import userConfig from '../../../config.js';

const defaultConfig = {
  site: {
    title: 'Soustack',
    owner: null,
    tagline: 'Your recipes, organized.',
    logoUrl: null
  },
  features: {
    enableScaling: true,
    enableSharing: false,
    enableImport: true
  },
  theme: {
    primaryColor: null,
    fontFamily: null
  },
  data: {
    storageKey: 'soustack-recipes'
  },
  branding: {
    showAttribution: true,
    repoUrl: 'https://github.com/yourusername/soustack'
  }
};

const config = {
  site: mergeSection(defaultConfig.site, userConfig?.site),
  features: mergeSection(defaultConfig.features, userConfig?.features),
  theme: mergeSection(defaultConfig.theme, userConfig?.theme),
  data: mergeSection(defaultConfig.data, userConfig?.data),
  branding: mergeSection(defaultConfig.branding, userConfig?.branding)
};

function mergeSection(defaults, overrides) {
  return { ...defaults, ...(overrides || {}) };
}

export function getSiteDisplayName() {
  const owner = config.site.owner?.trim();
  if (owner) {
    return `${owner}'s Recipe Collection`;
  }
  return config.site.title;
}

export function getSiteTagline() {
  return config.site.tagline?.trim() || '';
}

export function applyThemePreferences(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return;
  if (config.theme.primaryColor) {
    doc.documentElement?.style?.setProperty('--primary-color', config.theme.primaryColor);
  }
  if (config.theme.fontFamily && doc.body) {
    doc.body.style.fontFamily = config.theme.fontFamily;
  }
}

export function shouldShowAttribution() {
  return config.branding.showAttribution !== false;
}

export function getAttributionUrl() {
  return config.branding.repoUrl || defaultConfig.branding.repoUrl;
}

export default config;
