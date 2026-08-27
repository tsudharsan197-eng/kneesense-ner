import { LANGUAGES, useTranslation } from '../i18n/I18nContext'
import { Icon } from './Icon'

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()

  return (
    <div className="lang-btn-row">
      <Icon name="globe" size={18} />
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
    </div>
  )
}
