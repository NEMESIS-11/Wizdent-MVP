import { Product, SoldProduct, DemoProduct, FreeProduct, DiscussedProduct } from '../types';

export const calculateDuration = (start: string, end: string): number => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / (1000 * 60));
};

export const createSoldItemTemplate = (): Partial<SoldProduct> => ({
  productId: '', quantity: 1, price: 0, listPrice: 0, resellerCost: 0
});

export const createDemoItemTemplate = (): Partial<DemoProduct> => ({
  productId: '', quantity: 1, remarks: ''
});

export const createFreeItemTemplate = (): Partial<FreeProduct> => ({
  productId: '', quantity: 1, type: 'SAMPLE'
});

export const createDiscussedItemTemplate = (): Partial<DiscussedProduct> => ({
  productId: '', remarks: ''
});

export function updateSoldItemLogic(
  items: Partial<SoldProduct>[],
  idx: number,
  field: string,
  val: any,
  products: Product[]
): Partial<SoldProduct>[] {
  const news = [...items];
  news[idx] = { ...news[idx], [field]: val };
  if (field === 'productId') {
    const p = products.find(p => p.id === val);
    if (p) {
      news[idx].productName = p.name;
      news[idx].brandName = p.brand;
      news[idx].price = p.dentistPrice || 0;
      news[idx].listPrice = p.standardPrice || 0;
      news[idx].resellerCost = p.resellerPrice || 0;
    }
  }
  return news;
}

export function updateProductItemLogic<T extends { productId?: string; productName?: string }>(
  items: T[],
  idx: number,
  field: string,
  val: any,
  products: Product[]
): T[] {
  const news = [...items];
  news[idx] = { ...news[idx], [field]: val } as T;
  if (field === 'productId') {
    const p = products.find(p => p.id === val);
    if (p) news[idx].productName = p.name as any;
  }
  return news;
}