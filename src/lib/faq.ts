/** Homepage FAQ — visible copy + JSON-LD must stay in sync (Google FAQ guidelines). */
export const HOME_FAQS = [
  {
    question: "Is Convertek free to use?",
    answer:
      "Yes. Convertek is free to use with fair upload limits (typically 30 MB per non-video file and 100 MB for video). Converted files have no watermarks.",
  },
  {
    question: "Can I convert mixed file types in one batch?",
    answer:
      "Yes. Drop different types (for example PNG, PDF, and MP3) into one queue and choose a separate output format for each file.",
  },
  {
    question: "Do you keep my uploaded files?",
    answer:
      "Files are processed temporarily on the server. Converted downloads stay in your browser storage. We do not keep a permanent personal cloud library of your files.",
  },
  {
    question: "What formats does Convertek support?",
    answer:
      "Convertek supports 100+ formats across images, documents, data, audio, video, archives, fonts, subtitles, presentations, and ebooks. Browse the full list at /conversions.",
  },
] as const;
