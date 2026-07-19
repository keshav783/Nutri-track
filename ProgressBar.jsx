export default function ProgressBar({ label, value, target, unit = '' }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const over = target > 0 && value > target;

  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span>
          {Math.round(value)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${over ? 'over' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
