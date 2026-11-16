import { FileIllustration } from "@/components/common/FileIllustration";
import { cn } from "@/lib/utils";

const tints: Record<string, string> = {
  image: "bg-indigo-50 dark:bg-indigo-950/55",
  pdf: "bg-rose-50 dark:bg-rose-950/55",
  video: "bg-amber-50 dark:bg-amber-950/55",
  audio: "bg-sky-50 dark:bg-sky-950/55",
  data: "bg-emerald-50 dark:bg-emerald-950/55",
};

export function FileIconTile({ type, extension }: { type?: string; extension?: string }) {
  const tint = tints[extension === "pdf" ? "pdf" : type ?? ""];
  return (
    <span aria-hidden="true" className={cn("grid size-12 shrink-0 place-items-center rounded-xl sm:size-13", tint ?? "bg-slate-100 dark:bg-slate-800")}>
      <FileIllustration type={type} extension={extension} className="h-8 w-6.5" />
    </span>
  );
}
