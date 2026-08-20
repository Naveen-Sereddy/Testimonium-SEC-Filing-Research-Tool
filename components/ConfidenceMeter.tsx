import type { Confidence } from '@/lib/rag';

export interface ConfidenceMeterProps {
  confidence: Confidence;
}

const CONFIDENCE_STYLES: Record<Confidence, { color: string; width: string; label: string }> = {
  High: { color: 'bg-success', width: 'w-full', label: 'High' },
  Medium: { color: 'bg-warning', width: 'w-2/3', label: 'Medium' },
  Low: { color: 'bg-error', width: 'w-1/3', label: 'Low' },
};

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const { color, width, label } = CONFIDENCE_STYLES[confidence];

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-hover">
        <div className={`h-full ${width} ${color} transition-all duration-300`} />
      </div>
      <span className="font-ui text-[11px] text-tertiary">{label}</span>
    </div>
  );
}
