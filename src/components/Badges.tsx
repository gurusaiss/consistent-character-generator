import { modelLabel } from '../utils/models';

export function scoreTone(score: number): { text: string; border: string } {
  if (score >= 85) return { text: 'text-emerald-400', border: 'border-emerald-500/50' };
  if (score >= 70) return { text: 'text-yellow-400', border: 'border-yellow-500/50' };
  if (score >= 55) return { text: 'text-orange-400', border: 'border-orange-500/50' };
  return { text: 'text-red-400', border: 'border-red-500/50' };
}

export function ScoreBadge({ score, className = '' }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null;
  const tone = scoreTone(score);
  return (
    <span
      title="How closely this frame matches your reference character"
      className={`font-mono text-[10px] leading-none px-1.5 py-1 bg-ink/90 border ${tone.text} ${tone.border} ${className}`}
    >
      {score}%
    </span>
  );
}

export function ModelBadge({ model, className = '' }: { model: string | null | undefined; className?: string }) {
  const label = modelLabel(model);
  if (!label) return null;
  return (
    <span
      title="Model that produced this frame"
      className={`font-mono text-[10px] leading-none uppercase tracking-wider px-1.5 py-1 bg-ink/90 border border-white/15 text-slate-300 ${className}`}
    >
      {label}
    </span>
  );
}
