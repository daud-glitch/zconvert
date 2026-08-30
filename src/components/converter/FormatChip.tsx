import { getFormatChipClass } from "@/lib/format-chips";

export function FormatChip({ ext }: { ext: string }) {
  return (
    <span
      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getFormatChipClass(ext)}`}
    >
      {ext}
    </span>
  );
}
