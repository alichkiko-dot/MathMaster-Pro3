import { LanguageCode, NavSection } from '../types/calculator';

export interface TranslationDictionary {
  appName: string;
  subtitle: string;
  nav: Record<NavSection, string>;
  common: {
    evaluate: string;
    clear: string;
    copy: string;
    copied: string;
    steps: string;
    showSteps: string;
    hideSteps: string;
    exact: string;
    approximate: string;
    symbolic: string;
    exportCsv: string;
    exportPdf: string;
    exportPng: string;
    reset: string;
    save: string;
    delete: string;
    search: string;
    offlineMode: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    appName: 'MathMaster Pro',
    subtitle: 'Advanced Scientific & Graphing Calculator',
    nav: {
      home: 'Home',
      calculator: 'Calculator',
      algebra: 'Algebra',
      graphing: 'Graphing',
      calculus: 'Calculus',
      'linear-algebra': 'Matrices',
      statistics: 'Statistics',
      complex: 'Complex Numbers',
      numerical: 'Numerical & Discrete',
      history: 'History',
      settings: 'Settings',
    },
    common: {
      evaluate: 'Evaluate',
      clear: 'Clear',
      copy: 'Copy',
      copied: 'Copied',
      steps: 'Step-by-Step Solution',
      showSteps: 'Show Steps',
      hideSteps: 'Hide Steps',
      exact: 'Exact Value',
      approximate: 'Numerical Approximation',
      symbolic: 'Symbolic Form',
      exportCsv: 'Export CSV',
      exportPdf: 'Export PDF',
      exportPng: 'Export PNG',
      reset: 'Reset',
      save: 'Save',
      delete: 'Delete',
      search: 'Search',
      offlineMode: 'Offline Mode — Local Engine Active',
    },
  },
  fr: {
    appName: 'MathMaster Pro',
    subtitle: 'Calculatrice Scientifique & Graphique Avancée',
    nav: {
      home: 'Accueil',
      calculator: 'Calculatrice',
      algebra: 'Algèbre',
      graphing: 'Graphiques',
      calculus: 'Analyse',
      'linear-algebra': 'Matrices',
      statistics: 'Statistiques',
      complex: 'Nombres Complexes',
      numerical: 'Méthodes Numériques',
      history: 'Historique',
      settings: 'Paramètres',
    },
    common: {
      evaluate: 'Calculer',
      clear: 'Effacer',
      copy: 'Copier',
      copied: 'Copié',
      steps: 'Solution détaillée',
      showSteps: 'Afficher les étapes',
      hideSteps: 'Masquer les étapes',
      exact: 'Valeur exacte',
      approximate: 'Approximation numérique',
      symbolic: 'Forme symbolique',
      exportCsv: 'Exporter CSV',
      exportPdf: 'Exporter PDF',
      exportPng: 'Exporter PNG',
      reset: 'Réinitialiser',
      save: 'Enregistrer',
      delete: 'Supprimer',
      search: 'Rechercher',
      offlineMode: 'Mode hors ligne — Moteur local actif',
    },
  },
  es: {
    appName: 'MathMaster Pro',
    subtitle: 'Calculadora Científica y Gráfica Avanzada',
    nav: {
      home: 'Inicio',
      calculator: 'Calculadora',
      algebra: 'Álgebra',
      graphing: 'Gráficos',
      calculus: 'Cálculo',
      'linear-algebra': 'Matrices',
      statistics: 'Estadística',
      complex: 'Números Complejos',
      numerical: 'Métodos Numéricos',
      history: 'Historial',
      settings: 'Ajustes',
    },
    common: {
      evaluate: 'Calcular',
      clear: 'Limpiar',
      copy: 'Copiar',
      copied: 'Copiado',
      steps: 'Solución paso a paso',
      showSteps: 'Mostrar pasos',
      hideSteps: 'Ocultar pasos',
      exact: 'Valor exacto',
      approximate: 'Aproximación numérica',
      symbolic: 'Forma simbólica',
      exportCsv: 'Exportar CSV',
      exportPdf: 'Exportar PDF',
      exportPng: 'Exportar PNG',
      reset: 'Restablecer',
      save: 'Guardar',
      delete: 'Eliminar',
      search: 'Buscar',
      offlineMode: 'Modo sin conexión — Motor local activo',
    },
  },
  de: {
    appName: 'MathMaster Pro',
    subtitle: 'Erweiterter Wissenschaftlicher & Grafikrechner',
    nav: {
      home: 'Startseite',
      calculator: 'Rechner',
      algebra: 'Algebra',
      graphing: 'Grafik',
      calculus: 'Analysis',
      'linear-algebra': 'Matrizen',
      statistics: 'Statistik',
      complex: 'Komplexe Zahlen',
      numerical: 'Numerik & Diskrete',
      history: 'Verlauf',
      settings: 'Einstellungen',
    },
    common: {
      evaluate: 'Berechnen',
      clear: 'Löschen',
      copy: 'Kopieren',
      copied: 'Kopiert',
      steps: 'Schrittweise Lösung',
      showSteps: 'Schritte zeigen',
      hideSteps: 'Schritte ausblenden',
      exact: 'Exakter Wert',
      approximate: 'Numerische Näherung',
      symbolic: 'Symbolische Form',
      exportCsv: 'CSV exportieren',
      exportPdf: 'PDF exportieren',
      exportPng: 'PNG exportieren',
      reset: 'Zurücksetzen',
      save: 'Speichern',
      delete: 'Löschen',
      search: 'Suchen',
      offlineMode: 'Offline-Modus — Lokale Engine aktiv',
    },
  },
};
