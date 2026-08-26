import { LANGUAGES, useTranslation } from '../i18n/I18nContext'

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={`choice-btn${language === lang.code ? ' is-selected' : ''}`}
          style={{ minHeight: 40, width: 'auto', padding: '0 14px', fontSize: 14 }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
