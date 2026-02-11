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
  "Memória RAM Kingston Fury Beast 32GB": {
    "DDR4 3600MHz": [
      "https://img.terabyteshop.com.br/produto/g/memoria-kingston-fury-beast-rgb-16gb-1x16gb-ddr4-3200mhz-kf432c16b1a16_259615.jpg",
    ],
    "DDR5 6000MHz": [
      "https://img.terabyteshop.com.br/produto/g/memoria-kingston-fury-beast-rgb-16gb-1x16gb-ddr5-6000mhz-kf560c36b1a16_259628.jpg",
    ],
  },
  "Placa de Vídeo RTX 4070 Super": {
    "12GB GDDR6X": [
      "https://img.terabyteshop.com.br/produto/g/placa-de-video-msi-nvidia-geforce-rtx-4070-super-ventus-2x-12gb-gddr6x-dlss-ray-tracing_179830.jpg",
    ],
    "16GB GDDR6X": [
      "https://img.terabyteshop.com.br/produto/g/placa-de-video-gigabyte-nvidia-geforce-rtx-4070-super-windforce-oc-12gb-gddr6x_179831.jpg",
    ],
  },
  "Processador AMD Ryzen 7 7800X3D": {
    "8 Núcleos": [
      "https://img.terabyteshop.com.br/produto/g/processador-amd-ryzen-7-7800x3d-42-ghz-50ghz-turbo-am5-8-cores-16-threads-100-100000910wof_174135.jpg",
    ],
    "Com Cooler": [
      "https://img.terabyteshop.com.br/produto/g/processador-amd-ryzen-7-7700-38ghz-54ghz-turbo-am5-8-cores-16-threads-com-cooler_172846.jpg",
    ],
  },
  "Water Cooler Deepcool LS720": {
    "360mm RGB": [
      "https://img.terabyteshop.com.br/produto/g/water-cooler-deepcool-ls720-360mm-rgb-preto-r-ls720-bkammn-g-1_175570.jpg",
    ],
    "240mm ARGB": [
      "https://img.terabyteshop.com.br/produto/g/water-cooler-deepcool-ls520-240mm-argb-preto-r-ls520-bkammn-g-1_178905.jpg",
    ],
  },
  "Fonte Corsair RM850x": {
    "850W 80 Plus Gold": [
      "https://img.terabyteshop.com.br/produto/g/fonte-corsair-rm850x-850w-80-plus-gold-modular-cp-9020188-na_207064.jpg",
    ],
    "750W 80 Plus Gold": [
      "https://img.terabyteshop.com.br/produto/g/fonte-corsair-rm750x-750w-80-plus-gold-modular-cp-9020187-na_250874.jpg",
    ],
  },
  "Gabinete Gamer NZXT H9 Flow": {
    "Branco RGB": [
      "https://img.terabyteshop.com.br/produto/g/gabinete-nzxt-h9-flow-branco-mid-tower-atx-3-fans-inclusos-ca-h9fb-w1_168086.png",
    ],
    "Preto RGB": [
      "https://img.terabyteshop.com.br/produto/g/gabinete-nzxt-h9-flow-preto-mid-tower-atx-3-fans-inclusos-ca-h9fb-b1_250596.jpg",
    ],
  },
  "Monitor Gamer Samsung Odyssey G5": {
    '27" 144Hz': [
      "https://img.terabyteshop.com.br/produto/g/monitor-gamer-samsung-odyssey-g5-27-va-165hz-1ms-freesync-premium-hdr10-lc27g55tqwlxzd_259615.jpg",
    ],
    '32" 165Hz': [
      "https://img.terabyteshop.com.br/produto/g/monitor-gamer-samsung-odyssey-g5-32-va-165hz-1ms-freesync-premium-lc32g55tqwmxzd_259628.jpg",
    ],
  },
  "Teclado Mecânico Redragon Kumara": {
    "RGB Switch Red": [
      "https://img.terabyteshop.com.br/produto/g/teclado-mecanico-gamer-redragon-kumara-k552-rgb-switch-outemu-red-abnt2-preto-k552-rgb-1_179830.jpg",
    ],
    "Switch Blue": [
      "https://img.terabyteshop.com.br/produto/g/teclado-mecanico-gamer-redragon-kumara-k552-switch-outemu-blue-abnt2-preto-k552-1_179831.jpg",
    ],
  },
  "Mouse Gamer Logitech G Pro X Superlight": {
    "Preto 25K DPI": [
      "https://img.terabyteshop.com.br/produto/g/mouse-gamer-logitech-g-pro-x-superlight-25k-dpi-rgb-6-botoes-preto-910-005631_174135.jpg",
    ],
    "Branco Wireless": [
      "https://img.terabyteshop.com.br/produto/g/mouse-gamer-logitech-g-pro-x-superlight-2-wireless-32k-dpi-rgb-6-botoes-branco-910-006026_172846.jpg",
    ],
  },
  "Headset Gamer HyperX Cloud II": {
    "7.1 Surround": [
      "https://img.terabyteshop.com.br/produto/g/headset-gamer-hyperx-cloud-ii-71-surround-sound-hx-hsc2-bkna_175570.jpg",
    ],
    Wireless: [
      "https://img.terabyteshop.com.br/produto/g/headset-gamer-hyperx-cloud-ii-wireless-71-surround-sound-hx-hsc2-wl-bkna_178905.jpg",
    ],
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  {
    name: "Refrigeração",
    description: "Coolers, water coolers e sistemas de refrigeração",
  },
  {
    name: "Fontes",
    description: "Fontes de alimentação para PC",
  },
  {
    name: "Gabinetes",
    description: "Gabinetes para montagem de PC",
  },
  {
    name: "Monitores",
    description: "Monitores gamers e profissionais",
  },
  {
    name: "Periféricos",
    description: "Teclados, mouses e headsets gamers",
  },
];

const products = [
  // ========== MEMÓRIA RAM ==========
  {
    name: "Memória RAM Corsair Vengeance 16GB",
    brand: "Corsair", // ✅ MARCA ADICIONADA
    description:
      "Memória RAM Corsair Vengeance RGB, alta performance para gamers e creators.",
    categoryName: "Memória RAM",
    variants: [
      { color: "DDR4 3200MHz", price: 29990 },
      { color: "DDR5 5600MHz", price: 39990 },
    ],
  },
  {
    name: "Memória RAM Kingston Fury Beast 32GB",
    brand: "Kingston", // ✅ MARCA ADICIONADA
    description:
      "Memória RAM Kingston Fury Beast RGB, alta performance e overclocking fácil.",
    categoryName: "Memória RAM",
    variants: [
      { color: "DDR4 3600MHz", price: 59990 },
      { color: "DDR5 6000MHz", price: 79990 },
    ],
  },

  // ========== PLACAS DE VÍDEO ==========
  {
    name: "Placa de Vídeo RTX 4060",
    brand: "NVIDIA", // ✅ MARCA ADICIONADA
    description:
      "Placa de vídeo NVIDIA GeForce RTX 4060 com DLSS 3 e ray tracing.",
    categoryName: "Placas de Vídeo",
    variants: [
      { color: "8GB GDDR6", price: 229900 },
      { color: "12GB GDDR6", price: 259900 },
    ],
  },
  {
    name: "Placa de Vídeo RTX 4070 Super",
    brand: "NVIDIA", // ✅ MARCA ADICIONADA
    description:
      "Placa de vídeo NVIDIA GeForce RTX 4070 Super com performance excepcional para 4K.",
    categoryName: "Placas de Vídeo",
    variants: [
      { color: "12GB GDDR6X", price: 359900 },
      { color: "16GB GDDR6X", price: 389900 },
    ],
  },

  // ========== PROCESSADORES ==========
  {
    name: "Processador Intel Core i7",
    brand: "Intel", // ✅ MARCA ADICIONADA
    description:
      "Processador Intel Core i7 de última geração para alta performance.",
    categoryName: "Processadores",
    variants: [
      { color: "14ª Geração", price: 189900 },
      { color: "13ª Geração", price: 159900 },
    ],
  },
  {
    name: "Processador AMD Ryzen 7 7800X3D",
    brand: "AMD", // ✅ MARCA ADICIONADA
    description:
      "Processador AMD Ryzen 7 com tecnologia 3D V-Cache para jogos de alta performance.",
    categoryName: "Processadores",
    variants: [
      { color: "8 Núcleos", price: 249900 },
      { color: "Com Cooler", price: 259900 },
    ],
  },

  // ========== ARMAZENAMENTO ==========
  {
    name: "SSD NVMe 1TB",
    brand: "Kingston", // ✅ MARCA ADICIONADA (marca principal)
    description:
      "SSD NVMe de alta velocidade para boot rápido e carregamento de jogos.",
    categoryName: "Armazenamento",
    variants: [
      { color: "Kingston Fury", price: 44990 },
      { color: "Samsung 980 Pro", price: 59990 },
      { color: "WD Black", price: 52990 },
    ],
  },

  // ========== PLACAS-MÃE ==========
  {
    name: "Placa-Mãe B760",
    brand: "Gigabyte", // ✅ MARCA ADICIONADA (marca principal)
    description:
      "Placa-mãe chipset B760 para processadores Intel de 13ª e 14ª geração.",
    categoryName: "Placas-Mãe",
    variants: [
      { color: "ASUS TUF Gaming", price: 129900 },
      { color: "Gigabyte AORUS", price: 139900 },
      { color: "MSI MAG", price: 119900 },
    ],
  },

  // ========== REFRIGERAÇÃO ==========
  {
    name: "Water Cooler Deepcool LS720",
    brand: "Deepcool", // ✅ MARCA ADICIONADA
    description:
      "Water cooler all-in-one de 360mm com iluminação RGB e performance silenciosa.",
    categoryName: "Refrigeração",
    variants: [
      { color: "360mm RGB", price: 89990 },
      { color: "240mm ARGB", price: 69990 },
    ],
  },

  // ========== FONTES ==========
  {
    name: "Fonte Corsair RM850x",
    brand: "Corsair", // ✅ MARCA ADICIONADA
    description:
      "Fonte modular 80 Plus Gold da Corsair, eficiente e silenciosa para builds de alta performance.",
    categoryName: "Fontes",
    variants: [
      { color: "850W 80 Plus Gold", price: 109900 },
      { color: "750W 80 Plus Gold", price: 89990 },
    ],
  },

  // ========== GABINETES ==========
  {
    name: "Gabinete Gamer NZXT H9 Flow",
    brand: "NZXT", // ✅ MARCA ADICIONADA
    description:
      "Gabinete mid-tower com design de vidro duplo, excelente fluxo de ar e iluminação RGB.",
    categoryName: "Gabinetes",
    variants: [
      { color: "Branco RGB", price: 149900 },
      { color: "Preto RGB", price: 139900 },
    ],
  },

  // ========== MONITORES ==========
  {
    name: "Monitor Gamer Samsung Odyssey G5",
    brand: "Samsung", // ✅ MARCA ADICIONADA
    description:
      "Monitor gamer curvado com alta taxa de atualização e tecnologia FreeSync Premium.",
    categoryName: "Monitores",
    variants: [
      { color: '27" 144Hz', price: 129900 },
      { color: '32" 165Hz', price: 159900 },
    ],
  },

  // ========== PERIFÉRICOS ==========
  {
    name: "Teclado Mecânico Redragon Kumara",
    brand: "Redragon", // ✅ MARCA ADICIONADA
    description:
      "Teclado mecânico gamer com switches Outemu, iluminação RGB e construção em metal.",
    categoryName: "Periféricos",
    variants: [
      { color: "RGB Switch Red", price: 29990 },
      { color: "Switch Blue", price: 27990 },
    ],
  },
  {
    name: "Mouse Gamer Logitech G Pro X Superlight",
    brand: "Logitech", // ✅ MARCA ADICIONADA
    description:
      "Mouse gamer wireless ultraleve com sensor HERO 25K e design profissional para eSports.",
    categoryName: "Periféricos",
    variants: [
      { color: "Preto 25K DPI", price: 69990 },
      { color: "Branco Wireless", price: 74990 },
    ],
  },
  {
    name: "Headset Gamer HyperX Cloud II",
    brand: "HyperX", // ✅ MARCA ADICIONADA
    description:
      "Headset gamer com som surround 7.1, microfone removível e construção em alumínio.",
    categoryName: "Periféricos",
    variants: [
      { color: "7.1 Surround", price: 49990 },
      { color: "Wireless", price: 59990 },
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

      console.log(
        `📦 Criando produto: ${productData.name} [${productData.brand}]`,
      );

      await db.insert(productTable).values({
        id: productId,
        name: productData.name,
        brand: productData.brand, // ✅ CAMPO BRAND SENDO INSERIDO!
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

    // Listar marcas únicas inseridas
    const uniqueBrands = [...new Set(products.map((p) => p.brand))];
    console.log(`🏷️ Marcas inseridas: ${uniqueBrands.join(", ")}`);
  } catch (error) {
    console.error("❌ Erro durante o seeding:", error);
    throw error;
  }
}

main().catch(console.error);
