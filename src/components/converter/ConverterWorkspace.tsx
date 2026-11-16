import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { FileIllustration } from "@/components/common/FileIllustration";
import { cn } from "@/lib/utils";

export type ConverterWorkspaceIntro = {
  title: string;
  description: string;
  files?: { type: string; extension: string }[];
};

const defaultFiles = [
  { type: "image", extension: "jpg" },
  { type: "document", extension: "pdf" },
  { type: "video", extension: "mp4" },
];

export const homeWorkspace: ConverterWorkspaceIntro = {
  title: "Convert your files",
  description: "Convert images, PDFs, video, audio, and more in one place.",
};

const filePositions = [
  "-rotate-6 md:-translate-y-1 md:-rotate-12",
  "rotate-6 md:translate-y-3",
  "-rotate-6 md:-translate-y-3 md:rotate-10",
];

export function ConverterWorkspace({
  intro,
  children,
}: {
  intro: ConverterWorkspaceIntro;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="converter-workspace-title"
      className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]"
    >
      <div className="relative isolate overflow-hidden border-b border-emerald-200/65 bg-[#effaf5] px-5 py-6 sm:px-7 md:flex md:flex-col md:justify-center md:border-r md:border-b-0 md:px-8 lg:px-10 dark:border-emerald-900/70 dark:bg-emerald-950/45">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_84%_18%,white,transparent_53%),radial-gradient(#05966924_1px,transparent_1px)] bg-size-[100%_100%,18px_18px] mask-[linear-gradient(135deg,transparent_24%,black)] dark:opacity-15"
        />
        <div aria-hidden="true" className="mb-3 flex h-10 items-center gap-1.5 md:order-last md:mt-9 md:mb-0 md:h-18 md:gap-3">
          {(intro.files ?? defaultFiles).map(({ type, extension }, index) => (
            <span key={`${extension}-${index}`} className={cn("inline-flex md:drop-shadow-[0_8px_8px_#065f4633]", filePositions[index])}>
              <FileIllustration type={type} extension={extension} className="h-8 w-7 md:h-15 md:w-12 lg:h-18 lg:w-15" />
            </span>
          ))}
        </div>
        <h1 id="converter-workspace-title" className="text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-slate-950 md:text-4xl lg:text-5xl dark:text-white">
          {intro.title}
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700 md:text-base dark:text-slate-300">
          {intro.description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function ConverterWorkspaceLoading({ intro }: { intro: ConverterWorkspaceIntro }) {
  return (
    <ConverterWorkspace intro={intro}>
      <div role="status" className="grid min-h-60 place-content-center gap-2 p-5 text-center text-sm text-muted-foreground md:min-h-72">
        <Loader2 aria-hidden="true" className="mx-auto size-5 animate-spin text-emerald-700" />
        Loading converter…
      </div>
    </ConverterWorkspace>
  );
}
