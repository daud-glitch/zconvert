import { Archive, AudioLines, BookOpen, FileText, ImageIcon, Play, Presentation, Subtitles, Table2, Type } from "lucide-react";
import { cn } from "@/lib/utils";

const fileIcons = {
  document: { Icon: FileText, color: "from-blue-400 to-blue-600" },
  archive: { Icon: Archive, color: "from-slate-400 to-slate-600" },
  ebook: { Icon: BookOpen, color: "from-teal-400 to-teal-600" },
  presentation: { Icon: Presentation, color: "from-orange-400 to-orange-600" },
  subtitle: { Icon: Subtitles, color: "from-cyan-500 to-cyan-700" },
  font: { Icon: Type, color: "from-fuchsia-400 to-fuchsia-600" },
  image: { Icon: ImageIcon, color: "from-indigo-400 to-indigo-600" },
  pdf: { Icon: FileText, color: "from-red-400 to-rose-600" },
  video: { Icon: Play, color: "from-amber-300 to-amber-500" },
  audio: { Icon: AudioLines, color: "from-cyan-400 to-sky-600" },
  data: { Icon: Table2, color: "from-emerald-400 to-emerald-600" },
};

export function FileIllustration({ type, extension, className }: { type?: string; extension?: string; className?: string }) {
  const style = extension === "pdf" ? "pdf" : type;
  const { Icon, color } = style && Object.hasOwn(fileIcons, style)
    ? fileIcons[style as keyof typeof fileIcons]
    : fileIcons.document;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid h-11 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-linear-to-br text-white shadow-sm [clip-path:polygon(0_0,69%_0,100%_27%,100%_100%,0_100%)]",
        color,
        className,
      )}
    >
      <span className="absolute right-0 top-0 h-[28%] w-[32%] rounded-bl-sm bg-white/45" />
      <Icon className="mt-[16%] size-1/2" strokeWidth={2.25} />
    </span>
  );
}
