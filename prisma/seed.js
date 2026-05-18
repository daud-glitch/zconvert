const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Seeding database...\n");

  // ─── Features ───────────────────────────────────────────────
  const existingFeatures = await prisma.featureCard.count();
  if (existingFeatures === 0) {
    const featuresData = [
      { title: "Lightning Fast", description: "Powered by native binaries — Sharp, FFmpeg, pdf-lib — for maximum throughput with zero latency.", icon: "Zap", enabled: true, order: 0 },
      { title: "Secure & Private", description: "Files are encrypted in transit via TLS 1.3 and automatically purged from our servers within 60 minutes.", icon: "Shield", enabled: true, order: 1 },
      { title: "200+ Formats", description: "From PNG to WEBP, PDF to DOCX, MP3 to WAV — we support images, audio, documents, archives, and more.", icon: "Layers", enabled: true, order: 2 },
      { title: "Batch Processing", description: "Upload up to 50 files at once. Our parallel pipeline converts them simultaneously and serves a ZIP archive.", icon: "Files", enabled: true, order: 3 },
      { title: "No Registration", description: "Start converting immediately — no sign-up, no credit card. Registered users get history sync and bookmarks.", icon: "UserPlus", enabled: true, order: 4 },
      { title: "Cloud Anywhere", description: "Works in your browser on any device. Download results or copy shareable links directly.", icon: "Globe", enabled: true, order: 5 },
    ];
    for (const f of featuresData) {
      await prisma.featureCard.create({ data: f });
    }
    console.log(`✅ ${featuresData.length} features seeded`);
  } else {
    console.log(`⏭️  ${existingFeatures} features already exist, skipping`);
  }

  // ─── Links ──────────────────────────────────────────────────
  const existingLinks = await prisma.link.count();
  if (existingLinks === 0) {
    const linksData = [
      { label: "Converter", url: "/", group: "header_nav", enabled: true, order: 0, icon: "ArrowRightLeft" },
      { label: "Formats", url: "/conversions", group: "header_nav", enabled: true, order: 1, icon: "LayoutGrid" },
      { label: "Pricing", url: "/pricing", group: "header_nav", enabled: true, order: 2, icon: "CreditCard" },
      { label: "Converter", url: "/", group: "footer_product", enabled: true, order: 0, icon: null },
      { label: "Supported Formats", url: "/conversions", group: "footer_product", enabled: true, order: 1, icon: null },
      { label: "API", url: "/api", group: "footer_product", enabled: true, order: 2, icon: null },
      { label: "About", url: "/about", group: "footer_company", enabled: true, order: 0, icon: null },
      { label: "Blog", url: "/blog", group: "footer_company", enabled: true, order: 1, icon: null },
      { label: "Contact", url: "/contact", group: "footer_company", enabled: true, order: 2, icon: null },
      { label: "Privacy Policy", url: "/privacy", group: "footer_legal", enabled: true, order: 0, icon: null },
      { label: "Terms of Service", url: "/terms", group: "footer_legal", enabled: true, order: 1, icon: null },
      { label: "Cookie Policy", url: "/cookies", group: "footer_legal", enabled: true, order: 2, icon: null },
      { label: "GitHub", url: "https://github.com", group: "social", enabled: true, order: 0, icon: "Github" },
      { label: "Twitter", url: "https://twitter.com", group: "social", enabled: true, order: 1, icon: "Twitter" },
    ];
    for (const link of linksData) {
      await prisma.link.create({ data: link });
    }
    console.log(`✅ ${linksData.length} links seeded`);
  } else {
    console.log(`⏭️  ${existingLinks} links already exist, skipping`);
  }

  // ─── Pages ──────────────────────────────────────────────────
  const pagesData = [
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: `# Privacy Policy\n\nLast updated: ${new Date().toISOString().split("T")[0]}\n\n## Information We Collect\n\nWe collect minimal information necessary to provide our file conversion service:\n\n- **Files you upload** are temporarily stored for processing and automatically deleted within 60 minutes.\n- **Account information** (email, name) if you choose to register.\n- **Usage data** such as conversion counts and file sizes for analytics.\n\n## How We Use Your Data\n\n- To provide and improve our file conversion services\n- To maintain security and prevent abuse\n- To send service-related communications (if you have an account)\n\n## Data Retention\n\nUploaded files are deleted within 60 minutes of conversion. Account data is retained until you request deletion.\n\n## Third-Party Services\n\nWe do not sell or share your data with third parties except as required by law.\n\n## Contact\n\nQuestions? Contact us at support@cloudconverter.com`,
      enabled: true,
      seoTitle: "Privacy Policy - Cloud Converter",
      seoDesc: "Our privacy policy explains how we handle your data during file conversion.",
    },
    {
      slug: "terms",
      title: "Terms of Service",
      content: `# Terms of Service\n\nLast updated: ${new Date().toISOString().split("T")[0]}\n\n## Acceptance of Terms\n\nBy using Cloud Converter, you agree to these terms of service.\n\n## Service Description\n\nCloud Converter provides online file conversion services. We support 200+ formats across images, audio, documents, archives, and more.\n\n## Acceptable Use\n\nYou agree not to:\n- Upload illegal or malicious content\n- Attempt to reverse-engineer our systems\n- Use the service for automated bulk conversion without authorization\n- Violate any applicable laws\n\n## Limitation of Liability\n\nCloud Converter is provided "as is" without warranty. We are not liable for any damages arising from use of the service.\n\n## Changes\n\nWe reserve the right to modify these terms at any time.`,
      enabled: true,
      seoTitle: "Terms of Service - Cloud Converter",
      seoDesc: "Terms of service for using Cloud Converter file conversion platform.",
    },
    {
      slug: "about",
      title: "About Us",
      content: `# About Cloud Converter\n\nCloud Converter is a universal file conversion platform built for speed, security, and simplicity.\n\n## Our Mission\n\nTo make file conversion accessible to everyone — no installs, no sign-ups, no hassle.\n\n## Technology\n\nPowered by:\n- **Sharp** for image processing\n- **FFmpeg** for audio/video\n- **pdf-lib** for PDF manipulation\n- **Next.js** & **React** for the web interface\n\n## Why Cloud Converter?\n\n- Fast conversions with native binaries\n- 200+ supported formats\n- Privacy-first: files auto-delete after processing\n- Works on any device with a browser`,
      enabled: true,
      seoTitle: "About Cloud Converter - Universal File Conversion",
      seoDesc: "Learn about Cloud Converter, the universal file conversion platform.",
    },
  ];

  for (const page of pagesData) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      create: page,
      update: {},
    });
  }
  console.log(`✅ ${pagesData.length} pages seeded`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
