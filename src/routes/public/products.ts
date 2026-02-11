import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { and, desc, eq, ilike, or, inArray, not, count } from "drizzle-orm";
import { categoryTable, productTable } from "../../db/schema.js";

const publicProductsRouter = Router();

// GET /api/products - List all products
publicProductsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      brand,
      capacity,
      memoryType,
      sort = "createdAt_desc",
      limit = 20,
      offset = 0,
    } = req.query;

    const whereConditions = [];

    // filter by category
    if (category && typeof category === "string") {
      whereConditions.push(eq(productTable.categoryId, category));
    }

    // filter by text search
    if (search && typeof search === "string") {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereConditions.push(
        or(
          ilike(productTable.name, searchTerm),
          ilike(productTable.description, searchTerm),
        ),
      );
    }

    // filter by brand
    if (brand && typeof brand === "string") {
      const brands = brand
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      if (brands.length === 1 && brands[0]) {
        whereConditions.push(eq(productTable.brand, brands[0]));
      } else if (brands.length > 1) {
        whereConditions.push(inArray(productTable.brand, brands));
      }
    }

    const products = await db.query.productTable.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        category: true,
        variants: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
            priceInCents: true,
            imageUrl: true,
          },
        },
      },
      orderBy: (products, { desc, asc }) => {
        switch (sort) {
          case "price_asc":
            return [asc(products.id)];
          case "price_desc":
            return [desc(products.id)];
          case "name_asc":
            return [asc(products.name)];
          case "name_desc":
            return [desc(products.name)];
          case "createdAt_asc":
            return [asc(products.createdAt)];
          case "createdAt_desc":
          default:
            return [desc(products.createdAt)];
        }
      },
      limit: Number(limit),
      offset: Number(offset),
    });

    let filteredProducts = products.map((product) => {
      const prices = product.variants.map((v) => v.priceInCents);
      const minProductPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxProductPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        slug: product.slug,
        description: product.description,
        createdAt: product.createdAt,
        category: product.category,
        variants: product.variants,
        priceRange: {
          min: minProductPrice,
          max: maxProductPrice,
        },
        variantCount: product.variants.length,
      };
    });

    // filter by min price
    if (minPrice && !isNaN(Number(minPrice))) {
      filteredProducts = filteredProducts.filter(
        (p) => p.priceRange.min >= Number(minPrice),
      );
    }

    // filter by max price
    if (maxPrice && !isNaN(Number(maxPrice))) {
      filteredProducts = filteredProducts.filter(
        (p) => p.priceRange.max <= Number(maxPrice),
      );
    }

    // filter by capacity
    if (capacity && typeof capacity === "string") {
      const capacities = capacity.split(",").map((c) => c.trim().toLowerCase());
      filteredProducts = filteredProducts.filter((product) =>
        product.variants.some((variant) =>
          capacities.some(
            (cap) =>
              variant.name.toLowerCase().includes(cap) ||
              variant.color.toLowerCase().includes(cap),
          ),
        ),
      );
    }

    // filter by memory type
    if (memoryType && typeof memoryType === "string") {
      const types = memoryType.split(",").map((t) => t.trim().toLowerCase());
      filteredProducts = filteredProducts.filter((product) =>
        product.variants.some((variant) =>
          types.some(
            (type) =>
              variant.name.toLowerCase().includes(type) ||
              variant.color.toLowerCase().includes(type),
          ),
        ),
      );
    }

    if (sort === "price_asc") {
      filteredProducts.sort((a, b) => a.priceRange.min - b.priceRange.min);
    } else if (sort === "price_desc") {
      filteredProducts.sort((a, b) => b.priceRange.min - a.priceRange.min);
    }

    const total = await db.$count(
      productTable,
      whereConditions.length > 0 ? and(...whereConditions) : undefined,
    );

    const availableBrands = await db
      .select({
        brand: productTable.brand,
        count: count(),
      })
      .from(productTable)
      .groupBy(productTable.brand)
      .orderBy(desc(count()))
      .limit(20);

    const allVariants = await db.query.productVariantTable.findMany({
      columns: {
        priceInCents: true,
      },
    });

    const allPrices = allVariants.map((v) => v.priceInCents);
    const globalMinPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const globalMaxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

    const currentPage = Math.floor(Number(offset) / Number(limit)) + 1;
    const totalPages = Math.ceil(total / Number(limit));

    const formattedProducts = filteredProducts.map(
      ({ variants, ...product }) => ({
        ...product,
      }),
    );

    res.json({
      success: true,
      data: formattedProducts,
      filters: {
        brands: availableBrands,
        priceRange: {
          min: globalMinPrice,
          max: globalMaxPrice,
        },
      },
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        page: currentPage,
        totalPages,
        hasNext: Number(offset) + Number(limit) < total,
        hasPrev: Number(offset) > 0,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar produtos",
    });
  }
});

// GET /api/products/:id - products details
publicProductsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID do produto não fornecido",
      });
    }

    const product = await db.query.productTable.findFirst({
      where: eq(productTable.id, id),
      with: {
        category: true,
        variants: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
            priceInCents: true,
            imageUrl: true,
            createdAt: true,
          },
          orderBy: (variants, { asc }) => [asc(variants.priceInCents)],
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    const prices = product.variants.map((v) => v.priceInCents);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        slug: product.slug,
        description: product.description,
        createdAt: product.createdAt,
        category: product.category,
        variants: product.variants,
        variantCount: product.variants.length,
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
      },
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar produto",
    });
  }
});

// GET /api/products/slug/:slug - get products by slug
publicProductsRouter.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Slug não fornecido",
      });
    }

    const product = await db.query.productTable.findFirst({
      where: eq(productTable.slug, slug),
      with: {
        category: true,
        variants: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
            priceInCents: true,
            imageUrl: true,
            createdAt: true,
          },
          orderBy: (variants, { asc }) => [asc(variants.priceInCents)],
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    const prices = product.variants.map((v) => v.priceInCents);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        slug: product.slug,
        description: product.description,
        createdAt: product.createdAt,
        category: product.category,
        variants: product.variants,
        variantCount: product.variants.length,
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
      },
    });
  } catch (error) {
    console.error("Get product by slug error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar produto",
    });
  }
});

// GET /api/products/category/:slug - get products by category
publicProductsRouter.get(
  "/category/:slug",
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!slug) {
        return res.status(404).json({
          success: false,
          error: "Slug não encontrada",
        });
      }

      const category = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.slug, slug),
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Categoria não encontrada",
        });
      }

      const products = await db.query.productTable.findMany({
        where: eq(productTable.categoryId, category.id),
        with: {
          category: true,
          variants: {
            columns: {
              priceInCents: true,
            },
          },
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
        limit: Number(limit),
        offset: Number(offset),
      });

      const formattedProducts = products.map((product) => {
        const prices = product.variants.map((v) => v.priceInCents);
        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          slug: product.slug,
          description: product.description,
          createdAt: product.createdAt,
          category: product.category,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0,
          },
          variantCount: product.variants.length,
        };
      });

      const total = await db.$count(
        productTable,
        eq(productTable.categoryId, category.id),
      );

      const currentPage = Math.floor(Number(offset) / Number(limit)) + 1;
      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: formattedProducts,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
        },
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          page: currentPage,
          totalPages,
          hasNext: Number(offset) + Number(limit) < total,
          hasPrev: Number(offset) > 0,
        },
      });
    } catch (error) {
      console.error("Get products by category error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao listar produtos da categoria",
      });
    }
  },
);

// GET /api/products/:id/related - related products
publicProductsRouter.get(
  "/:id/related",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 4 } = req.query;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "Id não encontrada",
        });
      }

      const currentProduct = await db.query.productTable.findFirst({
        where: eq(productTable.id, id),
        columns: {
          categoryId: true,
        },
      });

      if (!currentProduct) {
        return res.status(404).json({
          success: false,
          error: "Produto não encontrado",
        });
      }

      const relatedProducts = await db.query.productTable.findMany({
        where: and(
          eq(productTable.categoryId, currentProduct.categoryId),
          not(eq(productTable.id, id)),
        ),
        with: {
          category: true,
          variants: {
            columns: {
              priceInCents: true,
            },
          },
        },
        limit: Number(limit),
      });

      const formattedProducts = relatedProducts.map((product) => {
        const prices = product.variants.map((v) => v.priceInCents);
        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          slug: product.slug,
          description: product.description,
          createdAt: product.createdAt,
          category: product.category,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0,
          },
          variantCount: product.variants.length,
        };
      });

      res.json({
        success: true,
        data: formattedProducts,
      });
    } catch (error) {
      console.error("Get related products error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar produtos relacionados",
      });
    }
  },
);

export default publicProductsRouter;
