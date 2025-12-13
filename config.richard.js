export default {
  site: {
    title: "Richard's Recipe Collection",
    pageTitle: null, // Custom page title (browser tab). If null, uses getSiteDisplayName()
    owner: 'Richard',
    tagline: 'My Recipe Collection.',
    logoUrl: '/assets/richard-logo.svg'
  },
  features: {
    enableScaling: true,
    enableSharing: true,
    enableImport: true
  },
  theme: {
    primaryColor: '#402714',
    fontFamily: "'Playfair Display', 'Georgia', serif"
  },
  data: {
    storageKey: 'richard-recipes'
  },
  branding: {
    showAttribution: true,
    repoUrl: 'https://github.com/richardherold/soustack'
  }
};
