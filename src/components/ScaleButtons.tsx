interface ScaleButtonsProps {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
  labels?: string[]; // optional text under each value, e.g. ['None','Mild','Moderate','Severe']
}

export function ScaleButtons({ label, min, max, value, onChange, labels }: ScaleButtonsProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="scale">
      <div className="scale-label">{label}</div>
      <div className="scale-row">
        {options.map((opt) => (
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
