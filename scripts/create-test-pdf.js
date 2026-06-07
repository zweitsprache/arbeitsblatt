const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.brandProfile.findUnique({
    where: { slug: 'lingostar' },
  });

  if (!brand) {
    console.error('Brand lingostar not found');
    process.exit(1);
  }

  console.log('Creating test PDF for brand:', brand.slug);

  // Get a folder
  const folder = await prisma.brandLibraryFolder.findFirst({
    where: { brandProfileId: brand.id },
  });

  if (!folder) {
    console.error('No folder found. Creating one...');
    const newFolder = await prisma.brandLibraryFolder.create({
      data: {
        brandProfileId: brand.id,
        name: 'Test Materials',
        slug: 'test-materials-' + Date.now(),
      },
    });
    console.log('Created folder:', newFolder.name);
  }

  // Get a category
  const category = await prisma.brandLibraryCategory.findFirst({
    where: { brandProfileId: brand.id },
  });

  if (!category) {
    console.error('No category found');
    process.exit(1);
  }

  // Get a tag
  const tag = await prisma.brandLibraryTag.findFirst({
    where: { brandProfileId: brand.id },
  });

  // Create approved PDF
  const pdf = await prisma.brandLibraryPDF.create({
    data: {
      brandProfileId: brand.id,
      folderId: folder.id,
      categoryId: category.id,
      title: 'German Grammar Basics - Test PDF',
      description: 'A test PDF to verify the library system is working',
      blobPath: `library/${brand.id}/test-pdf-${Date.now()}.pdf`,
      status: 'approved',
      createdBy: 'system',
      approvedBy: 'system',
      approvedAt: new Date(),
      pdfGeneratedAt: new Date(),
      ...(tag && {
        tags: {
          create: [{ tagId: tag.id }],
        },
      }),
    },
    include: {
      tags: { include: { tag: true } },
      category: true,
      folder: true,
    },
  });

  console.log('✓ Created approved PDF:', pdf.title);
  console.log('  ID:', pdf.id);
  console.log('  Status:', pdf.status);
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
