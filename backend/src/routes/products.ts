import { Router, Request, Response } from 'express';
import { validators } from '../middleware/validators';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/cache';

const router = Router();

interface ProductQuery {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  includeInactive?: string;
}

// Get all products with filters
router.get('/', validators.pagination, async (req: Request<unknown, unknown, unknown, ProductQuery>, res: Response) => {
  try {
    const { 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
      includeInactive = 'false'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    // Only filter by isActive if not including inactive products
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (brand) {
      where.brand = brand;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Always fetch fresh data to reflect admin changes immediately
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: order },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        reviews: {
          where: { isPublished: true },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Increment view count
    await prisma.product.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (Admin)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, price, stock, images, brand, volume, abv, description, tags } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Generate unique slug
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and make it unique
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        images: images || ['/placeholder.png'],
        brand: brand || 'Soora',
        volume: volume || 'BOT',
        abv: abv || '0%',
        description: description || '',
        tags: tags || [],
        slug,
        isActive: true,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update product (Admin)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, category, price, stock, images, brand, volume, abv, description, tags } = req.body;

    const updateData: any = {
      ...(category && { category }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(images && { images }),
      ...(brand && { brand }),
      ...(volume && { volume }),
      ...(abv && { abv }),
      ...(description !== undefined && { description }),
      ...(tags && { tags }),
    };

    // If name is being updated, regenerate slug
    if (name) {
      let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      
      // Check if slug exists (excluding current product)
      while (await prisma.product.findFirst({ 
        where: { 
          slug,
          NOT: { id: req.params.id }
        } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      updateData.name = name;
      updateData.slug = slug;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (Admin)
// Delete product permanently (Admin) with cascading cleanup
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const [, , , productResult] = await prisma.$transaction([
      // Remove dependent records to satisfy foreign keys
      prisma.orderItem.deleteMany({ where: { productId } }),
      prisma.cartItem.deleteMany({ where: { productId } }),
      prisma.review.deleteMany({ where: { productId } }),
      // Finally delete the product (deleteMany avoids throwing if not found)
      prisma.product.deleteMany({ where: { id: productId } }),
    ]);

    if (!productResult.count) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted permanently' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured products
router.get('/featured/list', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'products:featured:list';
    const cached = await cache.get<any[]>(cacheKey);
    let products: any[];

    if (cached) {
      products = cached;
    } else {
      products = await prisma.product.findMany({
        where: { isFeatured: true, isActive: true },
        take: 12,
        orderBy: { salesCount: 'desc' },
      });
      await cache.set(cacheKey, products, 600);
    }

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/categories/list', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
