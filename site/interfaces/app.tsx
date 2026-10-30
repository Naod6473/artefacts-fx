// Page Interfaces : la documentation d'Inkra (https://github.com/inkrajs/docs, MIT), reprise telle quelle sous l'en-tête
// du site. Les pages, exemples, codes et textes viennent de inkra-docs/ sans retouche ; seuls changent l'adresse
// (?p=/components/button au lieu de /docs/components/button, voir build.mjs) et l'en-tête : celui du site remplace le leur.
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, PencilSurface, Resizable } from '@inkra/react';
import '@inkra/react/tokens.css';
import '@inkra/react/styles.css';
import { LocaleProvider, useLocale } from './inkra-docs/src/i18n';
import './inkra-docs/src/styles.css';
import {
  ButtonPage, DesignStandardPage, DocsNavigationPanel, DocumentPageNavigation, GettingStartedPage, MobileDrawer,
  SideNavigation, SidebarPreferences, readInitialTheme, validPath,
} from './inkra-docs/src/App';
import { FoundationPage } from './inkra-docs/src/components/FoundationPages';
import { InternationalizationExamples } from './inkra-docs/src/components/InternationalizationExamples';
import { ThemeExamples } from './inkra-docs/src/components/ThemeExamples';
import { UsageGuide } from './inkra-docs/src/components/UsageGuide';
import { PageHeading } from './inkra-docs/src/components/PageHeading';
import { readComponentPageTab, scrollToDocumentAnchor } from './inkra-docs/src/documentAnchors';
import './interfaces.css';

type Theme = 'auto' | 'light' | 'dark';
type Tab = 'preview' | 'api' | 'accessibility';
// pas d'accueil, de blog ni d'écosystème ici : ces adresses ramènent au guide de démarrage
const docsPath = (p: string | null) => {
  const path = validPath(p ?? '/getting-started');
  return path === '/' || path === '/blog' || path === '/ecosystem' || path.startsWith('/blog/') ? '/getting-started' : path;
};
const lire = () => ({ path: docsPath(new URLSearchParams(location.search).get('p')), tab: readComponentPageTab(location.hash) as Tab });
const adresse = (path: string, tab?: string) => `?p=${path}${tab ? `#${tab}` : ''}`;

function Interfaces() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [{ path: route, tab }, setLieu] = useState(lire);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.inkraTheme = theme;
    try { localStorage.setItem('inkra-docs-theme', theme); } catch { /* facultatif */ }
  }, [theme]);

  // la barre latérale colle sous l'en-tête du site
  useEffect(() => {
    const entete = document.querySelector('header.entete');
    if (!entete) return;
    const maj = () => document.documentElement.style.setProperty('--docs-header-height', `${getComputedStyle(entete).position === 'sticky' ? entete.getBoundingClientRect().height : 0}px`);
    maj();
    const obs = new ResizeObserver(maj);
    obs.observe(entete);
    addEventListener('resize', maj);
    return () => { obs.disconnect(); removeEventListener('resize', maj); };
  }, []);

  useEffect(() => {
    const annuler = scrollToDocumentAnchor(location.hash);
    const retour = () => { setLieu(lire()); window.scrollTo({ top: 0 }); };
    addEventListener('popstate', retour);
    return () => { annuler(); removeEventListener('popstate', retour); };
  }, []);

  const navigate = (path: string, nextTab?: Tab) => {
    const p = docsPath(path), onglet = p.startsWith('/components/') ? nextTab ?? 'preview' : undefined;
    history.pushState(null, '', adresse(p, onglet));
    setLieu({ path: p, tab: onglet ?? 'preview' });
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const changeTab = (next: Tab) => {
    history.pushState(null, '', adresse(route, next));
    setLieu({ path: route, tab: next });
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const page = route === '/components/button' ? <ButtonPage activeTab={tab} onTabChange={changeTab} />
    : route.startsWith('/components/') ? <FoundationPage key={route} component={route.slice('/components/'.length) as never} activeTab={tab} onTabChange={changeTab} />
    : route === '/internationalization' ? <article className="documentation"><PageHeading title="国际化" description="换种语言打招呼，别让用户自己翻译。" /><InternationalizationExamples /></article>
    : route === '/theming' ? <article className="documentation"><PageHeading title="主题定制" description="颜色、笔触都能改，不用和我长得一样。" /><ThemeExamples /></article>
    : route === '/design-standard' ? <DesignStandardPage theme={theme} />
    : route === '/usage-guide' ? <article className="documentation"><PageHeading title="使用指南" /><section className="content-section"><UsageGuide theme={theme} /></section></article>
    : <GettingStartedPage onNavigate={navigate} />;

  return (
    <div className="app-shell">
      <PencilSurface aria-hidden="true" className="page-paper" seed="docs-viewport-paper" variant="full" />
      <Layout.Root className="site-shell docs-shell" collapseAt="never" sidebarWidth={sidebarWidth}>
        <button ref={menuButtonRef} type="button" className="ifx-menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>☰ {t('组件')}</button>
        <Layout.Body className="docs-layout">
          <Resizable.Root className="docs-resizable" style={{ overflow: 'visible' }}>
            <DocsNavigationPanel width={sidebarWidth} onWidthChange={setSidebarWidth}>
              <Layout.Sidebar className="desktop-sidebar" width="100%" padding={0} divided><SideNavigation currentPath={route} onNavigate={navigate} /><SidebarPreferences theme={theme} onThemeChange={setTheme} /></Layout.Sidebar>
            </DocsNavigationPanel>
            <Resizable.Handle className="docs-sidebar-resize" />
            <Resizable.Panel id="docs-content" className="docs-content-panel" minSize="40%" style={{ overflow: 'visible' }}>
              <Layout.Content as="main" id="main-content" className="docs-main" padding={0}>
                {page}
                <DocumentPageNavigation currentPath={route} onNavigate={navigate} />
              </Layout.Content>
            </Resizable.Panel>
          </Resizable.Root>
        </Layout.Body>
      </Layout.Root>
      <MobileDrawer currentPath={route} onClose={closeDrawer} onNavigate={navigate} onThemeChange={setTheme} open={drawerOpen} theme={theme} />
    </div>
  );
}

// la langue de la documentation suit celle de la page (fr ou en), tant que le visiteur n'en a pas choisi une autre dans le panneau
try {
  const langue = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  if (sessionStorage.getItem('ifx-langue') !== langue) { localStorage.setItem('inkra-docs-locale', langue); sessionStorage.setItem('ifx-langue', langue); }
} catch { /* facultatif */ }

createRoot(document.getElementById('interfaces')!).render(<StrictMode><LocaleProvider><Interfaces /></LocaleProvider></StrictMode>);
