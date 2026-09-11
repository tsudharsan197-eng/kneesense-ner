export interface ScaleOption {
  value: number;
  label: string;
}

interface ScaleButtonsProps {
  label: string;
  min?: number;
  max?: number;
  value: number | null;
  onChange: (value: number) => void;
  labels?: string[]; // optional text under each value, e.g. ['None','Mild','Moderate','Severe']
  options?: ScaleOption[]; // when given, renders these labeled buttons instead of a numeric min..max row
}

export function ScaleButtons({ label, min, max, value, onChange, labels, options }: ScaleButtonsProps) {
  if (options) {
    return (
      <div className="scale">
        <div className="scale-label">{label}</div>
        <div className="scale-row">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={value === opt.value}
              className={`scale-btn scale-btn-text${value === opt.value ? ' is-selected' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const numericOptions = Array.from({ length: (max ?? 0) - (min ?? 0) + 1 }, (_, i) => (min ?? 0) + i);

  return (
    <div className="scale">
      <div className="scale-label">{label}</div>
      <div className="scale-row">
        {numericOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
            className={`scale-btn${value === opt ? ' is-selected' : ''}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {labels && (
        <div className="scale-legend">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
