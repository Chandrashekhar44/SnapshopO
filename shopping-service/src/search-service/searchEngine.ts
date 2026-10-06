
import { tokenize } from "./tokenizer";
import type { Product, IndexEntry, SearchResult } from "./types";
 

const FIELD_WEIGHTS = {
  name: 10,
  category: 5,
} as const;
 
export class ProductSearchIndex {
  private index = new Map<string, IndexEntry[]>();
  private wordsByProduct = new Map<number, string[]>();
 
  addProduct(product: Product): void {
    this.removeProduct(product.id); 
 
    const nameWords = tokenize(product.name);
    const categoryWords = tokenize(product.category);
 
    for (const word of nameWords) {
      this.addEntry(word, product, FIELD_WEIGHTS.name);
    }
    for (const word of categoryWords) {
      this.addEntry(word, product, FIELD_WEIGHTS.category);
    }
 
    this.wordsByProduct.set(product.id, [...nameWords, ...categoryWords]);
  }
 
  removeProduct(productId: number): void {
    const words = this.wordsByProduct.get(productId);
    if (!words) return;
 
    for (const word of words) {
      const entries = this.index.get(word);
      if (!entries) continue;
 
      const filtered = entries.filter((entry) => entry.productId !== productId);
      if (filtered.length > 0) {
        this.index.set(word, filtered);
      } else {
        this.index.delete(word);
      }
    }
 
    this.wordsByProduct.delete(productId);
  }
 
  search(query: string): SearchResult[] {
    const words = tokenize(query);
    const scoreByProduct = new Map<number, SearchResult>();
 
    for (const word of words) {
      const entries = this.index.get(word);
      if (!entries) continue;
 
      for (const entry of entries) {
        const existing = scoreByProduct.get(entry.productId);
        if (existing) {
          existing.score += entry.weight;
        } else {
          scoreByProduct.set(entry.productId, {
            productId: entry.productId,
            sellerId: entry.sellerId,
            score: entry.weight,
          });
        }
      }
    }
 
    return [...scoreByProduct.values()].sort((a, b) => b.score - a.score);
  }
 
  get size(): number {
    return this.wordsByProduct.size;
  }
 
  clear(): void {
    this.index.clear();
    this.wordsByProduct.clear();
  }
 
  private addEntry(word: string, product: Product, weight: number): void {
    const entries = this.index.get(word) ?? [];
    entries.push({ productId: product.id, sellerId: product.sellerId, weight });
    this.index.set(word, entries);
  }
}
 
export const productSearchIndex = new ProductSearchIndex();