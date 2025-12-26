import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Admin User
  const adminEmail = (process.env.ADMIN_EMAIL || 'soora@admin.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@soora';
  const adminName = process.env.ADMIN_NAME || 'Soora Administrator';

  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: Role.ADMIN,
      ageVerified: true,
      emailVerified: true,
      isActive: true,
      tier: 'Platinum',
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create Categories
  console.log('📁 Creating categories...');
  
  const categories = [
    { name: 'Whisky', slug: 'whisky', description: 'Premium whisky collection', sortOrder: 1 },
    { name: 'Vodka', slug: 'vodka', description: 'Fine vodka selection', sortOrder: 2 },
    { name: 'Gin', slug: 'gin', description: 'Craft gin varieties', sortOrder: 3 },
    { name: 'Rum', slug: 'rum', description: 'Caribbean and premium rums', sortOrder: 4 },
    { name: 'Tequila', slug: 'tequila', description: 'Authentic Mexican tequila', sortOrder: 5 },
    { name: 'Wine', slug: 'wine', description: 'Red, white, and sparkling wines', sortOrder: 6 },
    { name: 'Beer', slug: 'beer', description: 'Craft and international beers', sortOrder: 7 },
    { name: 'Champagne', slug: 'champagne', description: 'Luxury champagne collection', sortOrder: 8 },
    { name: 'Bourbon', slug: 'bourbon', description: 'American bourbon whiskey', sortOrder: 9 },
    { name: 'Single Malt', slug: 'singlemalt', description: 'Single malt Scotch whisky', sortOrder: 10 },
    { name: 'Liqueurs', slug: 'liqueurs', description: 'Sweet and flavored liqueurs', sortOrder: 11 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`✅ Created ${categories.length} categories`);

  // Create Sample Products
  console.log('🍾 Creating sample products...');

  const whiskyCat = await prisma.category.findUnique({ where: { slug: 'whisky' } });
  const vodkaCat = await prisma.category.findUnique({ where: { slug: 'vodka' } });
  const ginCat = await prisma.category.findUnique({ where: { slug: 'gin' } });

  const sampleProducts = [
    {
      name: 'Johnnie Walker Black Label',
      brand: 'Johnnie Walker',
      slug: 'johnnie-walker-black-label',
      description: 'Blended Scotch whisky with rich, smooth taste',
      category: 'whisky',
      price: 68.00,
      stock: 50,
      volume: '700ml',
      abv: '40%',
      origin: 'Scotland',
      isFeatured: true,
      isActive: true,
      images: ['/images/whisky/johnnie-walker-black.jpg'],
      tags: ['whisky', 'scotch', 'blended'],
      categoryId: whiskyCat?.id,
    },
    {
      name: 'Grey Goose Vodka',
      brand: 'Grey Goose',
      slug: 'grey-goose-vodka',
      description: 'Premium French vodka made from finest ingredients',
      category: 'vodka',
      price: 89.00,
      stock: 30,
      volume: '700ml',
      abv: '40%',
      origin: 'France',
      isFeatured: true,
      isActive: true,
      images: ['/images/vodka/grey-goose.jpg'],
      tags: ['vodka', 'premium', 'french'],
      categoryId: vodkaCat?.id,
    },
    {
      name: 'Hendricks Gin',
      brand: 'Hendricks',
      slug: 'hendricks-gin',
      description: 'Unusual gin infused with cucumber and rose',
      category: 'gin',
      price: 75.00,
      stock: 25,
      volume: '700ml',
      abv: '41.4%',
      origin: 'Scotland',
      isFeatured: true,
      isActive: true,
      images: ['/images/gin/hendricks.jpg'],
      tags: ['gin', 'craft', 'botanical'],
      categoryId: ginCat?.id,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log(`✅ Created ${sampleProducts.length} sample products`);

  // Create Promotions
  console.log('🎉 Creating promotions...');

  const promotion = await prisma.promotion.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      description: 'Welcome discount - 10% off first order',
      type: 'PERCENTAGE',
      value: 10,
      minPurchase: 50,
      maxDiscount: 20,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      isActive: true,
      usageLimit: 1000,
      usageCount: 0,
    },
  });

  console.log(`✅ Created promotion: ${promotion.code}`);

  console.log('✨ Database seeding completed successfully!');
  console.log('\n📝 Admin Credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n⚠️  Please change the admin password after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
