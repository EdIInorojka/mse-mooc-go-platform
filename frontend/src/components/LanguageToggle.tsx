import { useI18n } from '../i18n/I18nContext';

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="language-toggle" role="tablist" aria-label="Language switcher">
      <button
        type="button"
        className={language === 'ru' ? 'language-toggle__item language-toggle__item--active' : 'language-toggle__item'}
        onClick={() => setLanguage('ru')}
      >
        RU
      </button>
      <button
        type="button"
        className={language === 'en' ? 'language-toggle__item language-toggle__item--active' : 'language-toggle__item'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}
