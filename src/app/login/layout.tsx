import type { Metadata } from "next";

/** Auth/utility pages: keep out of search indexes. */
export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Convertek account for bookmarks and history.",
  alternates: { canonical: "/login" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
