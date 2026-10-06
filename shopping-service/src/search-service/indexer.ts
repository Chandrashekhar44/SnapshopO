import { prisma } from "..";
import { tokenize } from "./tokenizer";

interface IndexableProduct {
  id: number;
  name: string;
  category: string;
  sellerId: number;
}



export async function addProductIndex(
  product: IndexableProduct
): Promise<void> {

  const words = [
    ...new Set([
      ...tokenize(product.name),
      ...tokenize(product.category),
    ]),
  ];


  if (words.length === 0) return;


  await prisma.searchIndex.createMany({

    data: words.map((keyword) => ({
      keyword,
      productId: product.id,
      sellerId: product.sellerId, // <-- add this
    })),

    skipDuplicates: true,

  });
}

export async function removeProductIndex(productId: number): Promise<void> {
  await prisma.searchIndex.deleteMany({
    where: { productId },
  });
}