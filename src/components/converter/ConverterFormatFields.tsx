import { ArrowRight } from "lucide-react";

type ConverterFormatFieldsProps = {
  from: string | null;
  to: string | null;
  sourceFormats: string[];
  outputFormats: string[];
  lockedSource?: boolean;
  onChange: (from: string | null, to: string | null) => void;
};

const formatSelectClass = "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-emerald-700";

export function ConverterFormatFields({
  from,
  to,
  sourceFormats,
  outputFormats,
  lockedSource = false,
  onChange,
}: ConverterFormatFieldsProps) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
      <label className="min-w-0 space-y-1.5 text-sm font-semibold">
        <span className="block">From</span>
        <select className={formatSelectClass} value={from ?? ""} disabled={lockedSource} onChange={(event) => onChange(event.target.value || null, to)}>
          {!lockedSource && <option value="">Auto-detect</option>}
          {(lockedSource && from ? [from] : sourceFormats).map((ext) => <option key={ext} value={ext}>{ext.toUpperCase()}</option>)}
        </select>
      </label>
      <ArrowRight aria-hidden="true" className="mb-3 size-4 text-muted-foreground sm:size-5" />
      <label className="min-w-0 space-y-1.5 text-sm font-semibold">
        <span className="block">To</span>
        <select className={formatSelectClass} value={to ?? ""} onChange={(event) => onChange(from, event.target.value || null)}>
          <option value="">Select format</option>
          {outputFormats.map((ext) => <option key={ext} value={ext}>{ext.toUpperCase()}</option>)}
        </select>
      </label>
    </div>
  );
}
