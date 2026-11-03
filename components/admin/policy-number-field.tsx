'use client';

export function PolicyNumberField({
  id,
  label,
  value,
  min,
  max,
  unit,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="policy-number">
      <label htmlFor={id}>{label}</label>
      <div className="policy-number-value">
        <input
          id={id}
          className="policy-number-input"
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="policy-number-unit">{unit}</span>
      </div>
      {error ? (
        <p className="form-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
