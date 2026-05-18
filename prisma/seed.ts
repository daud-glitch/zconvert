import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Features
  console.log('📦 Seeding features...');
  const features = [
    { title: 'File Conversion', description: 'Convert files between different formats', icon: 'FileIcon', enabled: true, order: 1 },
    { title: 'Batch Processing', description: 'Convert multiple files at once', icon: 'LayersIcon', enabled: true, order: 2 },
    { title: 'API Access', description: 'Programmatic access to conversion API', icon: 'CodeIcon', enabled: true, order: 3 },
  ];

  for (const feature of features) {
    await prisma.featureCard.upsert({
      where: { id: feature.title.toLowerCase().replace(/\s+/g, '-') }, // Need a unique identifier, assume schema might change or ID is required
      update: feature,
      create: {
        ...feature,
        id: feature.title.toLowerCase().replace(/\s+/g, '-')
      },
    });
  }
  console.log(`✅ Created ${features.length} features`);

  // Seed Pages
  console.log('📄 Seeding pages...');
  const pages = [
    { title: 'About Us', slug: 'about', content: 'About us content...', enabled: true },
    { title: 'Privacy Policy', slug: 'privacy', content: 'Privacy policy content...', enabled: true },
    { title: 'Terms of Service', slug: 'terms', content: 'Terms of service content...', enabled: true },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: page,
      create: page,
    });
  }
  console.log(`✅ Created ${pages.length} pages`);

  // Seed Links
  console.log('🔗 Seeding links...');
  const links = [
    { label: 'Home', url: '/', group: 'header_nav', enabled: true, order: 1 },
    { label: 'Terms', url: '/terms', group: 'footer_legal', enabled: true, order: 1 },
    { label: 'Privacy', url: '/privacy', group: 'footer_legal', enabled: true, order: 2 },
  ];

  for (const link of links) {
    await prisma.link.create({ data: link });
  }
  console.log(`✅ Created ${links.length} links`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
