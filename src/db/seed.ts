import crypto from "crypto";

import { db } from ".";
import { categoryTable, productTable, productVariantTable } from "./schema";

// Imagens de exemplo (você pode substituir depois)
const productImages = {
  "Memória RAM Corsair Vengeance 16GB": {
    "DDR4 3200MHz": [
      "https://img.terabyteshop.com.br/produto/g/memoria-ddr4-corsair-vengeance-lpx-16gb-2x8gb-3200mhz-cmk16gx4m2z3200c16_259615.jpg",
    ],
    "DDR5 5600MHz": [
      "https://img.terabyteshop.com.br/produto/g/memoria-ddr4-corsair-vengeance-rgb-pro-16gb-2x8gb-3200mhz-cmw16gx4m2z3200c16_259628.jpg",
    ],
  },
  "Placa de Vídeo RTX 4060": {
    "8GB GDDR6": [
      "https://img.terabyteshop.com.br/produto/g/placa-de-video-msi-nvidia-geforce-rtx-4060-ventus-2x-black-oc-8gb-gddr6-dlss-ray-tracing-912-v516-012_172846.jpg",
    ],
    "12GB GDDR6": [
      "https://img.terabyteshop.com.br/produto/g/placa-de-video-msi-nvidia-geforce-rtx-4060-ti-gaming-x-slim-16gb-gddr6-dlss-ray-tracing-912-v517-002_174135.jpg",
    ],
  },
  "Processador Intel Core i7": {
    "14ª Geração": [
      "https://img.terabyteshop.com.br/produto/g/processador-intel-core-i7-12700k-36ghz-50ghz-turbo-12-geracao-12-cores-20-threads-lga-1700-bx8071512700k_132460.jpg",
    ],
    "13ª Geração": [
      "https://img.terabyteshop.com.br/produto/g/processador-intel-core-i7-14700k-34-ghz-56ghz-turbo-14-geracao-12-cores-28-threads-lga-1700-bx8071514700k_179830.png",
    ],
  },
  "SSD NVMe 1TB": {
    "Kingston Fury": [
      "https://img.terabyteshop.com.br/produto/g/ssd-adata-legend-710-1tb-m2-2280-nvme-leitura-2400mbs-gravacao-1800mbs-aleg-710-1tcs_175570.jpg",
    ],
    "Samsung 980 Pro": [
      "https://img.terabyteshop.com.br/produto/g/ssd-adata-legend-960-max-4tb-m2-2280-nvme-14-leitura-7400mbs-e-gravacao-6800mbs-aleg-960m-4tcs_178905.jpg",
    ],
    "WD Black": [
      "https://img.terabyteshop.com.br/produto/g/ssd-wd-green-sn350-1tb-m2-nvme-leitura-2400mbs-e-gravacao-1850mbs-wds100t2g0c_207064.jpg",
    ],
  },
  "Placa-Mãe B760": {
    "ASUS TUF Gaming": [
      "https://img.terabyteshop.com.br/produto/g/placa-mae-gigabyte-b760-gaming-x-wifi6e-gen5-chipset-b760-intel-lga-1700-atx-ddr5_250874.jpg",
    ],
    "Gigabyte AORUS": [
      "https://img.terabyteshop.com.br/produto/g/placa-mae-gigabyte-b760m-aorus-elite-chipset-b760-intel-lga-1700-matx-ddr5_168086.png",
    ],
    "MSI MAG": [
      "https://img.terabyteshop.com.br/produto/g/placa-mae-gigabyte-b760m-ds3h-wifi6e-gen5-chipset-b760-intel-lga-1700-m-atx-ddr5_250596.jpg",
    ],
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

const categories = [
  {
    name: "Memória RAM",
    description: "Memórias RAM para desktop e notebook",
  },
  {
    name: "Placas de Vídeo",
    description: "GPUs para jogos e trabalho profissional",
  },
  {
    name: "Processadores",
    description: "CPUs Intel e AMD",
  },
  {
    name: "Armazenamento",
    description: "SSDs, HDs e NVMe",
  },
  {
    name: "Placas-Mãe",
    description: "Motherboards para todas as plataformas",
  },
];

const products = [
  // Memória RAM
  {
    name: "Memória RAM Corsair Vengeance 16GB",
    description:
      "Memória RAM Corsair Vengeance RGB, alta performance para gamers e creators.",
    categoryName: "Memória RAM",
    variants: [
      { color: "DDR4 3200MHz", price: 29990 }, // R$ 299,90
      { color: "DDR5 5600MHz", price: 39990 }, // R$ 399,90
    ],
  },

  // Placas de Vídeo
  {
    name: "Placa de Vídeo RTX 4060",
    description:
      "Placa de vídeo NVIDIA GeForce RTX 4060 com DLSS 3 e ray tracing.",
    categoryName: "Placas de Vídeo",
    variants: [
      { color: "8GB GDDR6", price: 229900 }, // R$ 2.299,00
      { color: "12GB GDDR6", price: 259900 }, // R$ 2.599,00
    ],
  },

  // Processadores
  {
    name: "Processador Intel Core i7",
    description:
      "Processador Intel Core i7 de última geração para alta performance.",
    categoryName: "Processadores",
    variants: [
      { color: "14ª Geração", price: 189900 }, // R$ 1.899,00
      { color: "13ª Geração", price: 159900 }, // R$ 1.599,00
    ],
  },

  // Armazenamento
  {
    name: "SSD NVMe 1TB",
    description:
      "SSD NVMe de alta velocidade para boot rápido e carregamento de jogos.",
    categoryName: "Armazenamento",
    variants: [
      { color: "Kingston Fury", price: 44990 }, // R$ 449,90
      { color: "Samsung 980 Pro", price: 59990 }, // R$ 599,90
      { color: "WD Black", price: 52990 }, // R$ 529,90
    ],
  },

  // Placas-Mãe
  {
    name: "Placa-Mãe B760",
    description:
      "Placa-mãe chipset B760 para processadores Intel de 13ª e 14ª geração.",
    categoryName: "Placas-Mãe",
    variants: [
      { color: "ASUS TUF Gaming", price: 129900 }, // R$ 1.299,00
      { color: "Gigabyte AORUS", price: 139900 }, // R$ 1.399,00
      { color: "MSI MAG", price: 119900 }, // R$ 1.199,00
    ],
  },
];

async function main() {
  console.log("🌱 Iniciando o seeding do banco de dados...");

  try {
    // Limpar dados existentes
    console.log("🧹 Limpando dados existentes...");
    await db.delete(productVariantTable);
    await db.delete(productTable);
    await db.delete(categoryTable);
    console.log("✅ Dados limpos com sucesso!");

    // Inserir categorias primeiro
    const categoryMap = new Map<string, string>();

    console.log("📂 Criando categorias...");
    for (const categoryData of categories) {
      const categoryId = crypto.randomUUID();
      const categorySlug = generateSlug(categoryData.name);

      console.log(`  📁 Criando categoria: ${categoryData.name}`);

      await db.insert(categoryTable).values({
        id: categoryId,
        name: categoryData.name,
        slug: categorySlug,
      });

      categoryMap.set(categoryData.name, categoryId);
    }

    // Inserir produtos
    for (const productData of products) {
      const productId = crypto.randomUUID();
      const productSlug = generateSlug(productData.name);
      const categoryId = categoryMap.get(productData.categoryName);

      if (!categoryId) {
        throw new Error(
          `Categoria "${productData.categoryName}" não encontrada`,
        );
      }

      console.log(`📦 Criando produto: ${productData.name}`);

      await db.insert(productTable).values({
        id: productId,
        name: productData.name,
        slug: productSlug,
        description: productData.description,
        categoryId: categoryId,
      });

      // Inserir variantes do produto
      for (const variantData of productData.variants) {
        const variantId = crypto.randomUUID();
        const productKey = productData.name as keyof typeof productImages;
        const variantImages =
          productImages[productKey]?.[
            variantData.color as keyof (typeof productImages)[typeof productKey]
          ] || [];

        console.log(`  🎨 Criando variante: ${variantData.color}`);

        await db.insert(productVariantTable).values({
          id: variantId,
          name: variantData.color,
          productId: productId,
          color: variantData.color,
          imageUrl:
            variantImages[0] ||
            "https://via.placeholder.com/600x600/374151/FFFFFF?text=Hardware+PC",
          priceInCents: variantData.price,
          slug: generateSlug(`${productData.name}-${variantData.color}`),
        });
      }
    }

    console.log("✅ Seeding concluído com sucesso!");
    console.log(
      `📊 Foram criadas ${categories.length} categorias, ${
        products.length
      } produtos com ${products.reduce(
        (acc, p) => acc + p.variants.length,
        0,
      )} variantes.`,
    );
  } catch (error) {
    console.error("❌ Erro durante o seeding:", error);
    throw error;
  }
}

main().catch(console.error);
