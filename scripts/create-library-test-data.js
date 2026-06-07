#!/usr/bin/env node
require('dotenv').config();

const path = require('path');
const module_ = require('module');
const originalRequire = module_.prototype.require;

// Make sure we're in the right directory
process.chdir(__dirname + '/..');

// Load the prisma client from the project
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

async function createTestData() {
  try {
    console.log('📍 Finding lingostar brand...');

    // Find lingostar brand
    const brand = await prisma.brandProfile.findUnique({
      where: { slug: 'lingostar' }
    });

    if (!brand) {
      console.error('❌ Brand "lingostar" not found');
      console.log('\n📋 Available brands:');
      const brands = await prisma.brandProfile.findMany();
      brands.forEach(b => console.log(`   - ${b.name} (${b.slug})`));
      process.exit(1);
    }

    console.log(`✓ Found brand: ${brand.name} (${brand.id})\n`);

    // Create root folder
    console.log('📁 Creating folders...');
    const rootFolder = await prisma.brandLibraryFolder.create({
      data: {
        brandProfileId: brand.id,
        name: 'Unterrichtsmaterialien',
        slug: 'unterrichtsmaterialien',
        parentId: null
      }
    });
    console.log(`   ✓ ${rootFolder.name}`);

    // Create subfolders
    const grammarFolder = await prisma.brandLibraryFolder.create({
      data: {
        brandProfileId: brand.id,
        name: 'Grammatik',
        slug: 'grammatik',
        parentId: rootFolder.id
      }
    });
    console.log(`   ✓ ${grammarFolder.name}`);

    const vocabularyFolder = await prisma.brandLibraryFolder.create({
      data: {
        brandProfileId: brand.id,
        name: 'Wortschatz',
        slug: 'wortschatz',
        parentId: rootFolder.id
      }
    });
    console.log(`   ✓ ${vocabularyFolder.name}\n`);

    // Create categories
    console.log('🏷️  Creating categories...');
    const categories = [
      { name: 'A1 Anfänger' },
      { name: 'A2 Anfänger' },
      { name: 'B1 Mittelstufe' },
      { name: 'B2 Oberstufe' }
    ];

    const createdCategories = [];
    for (const cat of categories) {
      const created = await prisma.brandLibraryCategory.create({
        data: {
          brandProfileId: brand.id,
          name: cat.name
        }
      });
      createdCategories.push(created);
      console.log(`   ✓ ${created.name}`);
    }
    console.log();

    // Create tags
    console.log('🔖 Creating tags...');
    const tags = [
      { name: 'Verben' },
      { name: 'Nomen' },
      { name: 'Adjektive' },
      { name: 'Präpositionen' },
      { name: 'Präsens' },
      { name: 'Präteritum' },
      { name: 'Perfekt' },
      { name: 'Imperativ' }
    ];

    const createdTags = [];
    for (const tag of tags) {
      const created = await prisma.brandLibraryTag.create({
        data: {
          brandProfileId: brand.id,
          name: tag.name
        }
      });
      createdTags.push(created);
      console.log(`   ✓ ${created.name}`);
    }

    console.log('\n✅ Test data created successfully!\n');
    console.log(`📊 Summary:`);
    console.log(`   Folders: 3 (1 root + 2 subfolders)`);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Tags: ${createdTags.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
