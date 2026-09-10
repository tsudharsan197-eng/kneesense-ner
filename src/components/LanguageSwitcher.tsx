import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useTranslation, type Language } from '../i18n/I18nContext'
import { Icon } from './Icon'

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  function onSelect(code: Language) {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div className="lang-dropdown" ref={containerRef}>
      <button
        type="button"
        className="lang-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon name="globe" size={16} />
        <span>{current.label}</span>
        <span className={`lang-dropdown-caret${open ? ' is-open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="lang-dropdown-menu" role="listbox">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={language === lang.code}
              className={`lang-dropdown-item${language === lang.code ? ' is-selected' : ''}`}
              onClick={() => onSelect(lang.code)}
            >
              {lang.label}
              {language === lang.code && <Icon name="check-circle" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
