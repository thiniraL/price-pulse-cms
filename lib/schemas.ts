import { z } from 'zod';
import { ADS_POSITIONS, PAGE_NAMES, SECTION_STYLES } from './constants';

export const merchantSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  supportsMintpay: z.boolean().optional().default(false),
  supportsKokopay: z.boolean().optional().default(false),
  sellingProbability: z.number().nullable().optional(),
  probabilityNote: z.string().nullable().optional(),
  campaignType: z.string().nullable().optional(),
  campaignStartDate: z.string().nullable().optional(),
  campaignEndDate: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  logoUrl: z.string().nullable().optional(),
});

export const headerNavSchema = z.object({
  title: z.string().min(1),
  slug: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const headerSubNavSchema = z.object({
  headerNavigationId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const pageSectionSchema = z.object({
  pageName: z.enum(PAGE_NAMES),
  sectionTitle: z.string().min(1),
  componentKey: z.enum(SECTION_STYLES),
  adsEnabled: z.boolean().optional().default(false),
  adsPosition: z.enum(ADS_POSITIONS).optional().default('None'),
  dataSourceKey: z.string().nullable().optional(),
  dataSourceTable: z.string().nullable().optional(),
  exploreEnabled: z.boolean().optional().default(false),
  exploreText: z.string().nullable().optional(),
  exploreUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().optional().default(1),
  itemCount: z.number().int().nullable().optional(),
});

export const PRODUCT_STATUSES = ['Active', 'Inactive', 'Discontinued'] as const;

const searchTagsSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(40)
  .optional();

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(1000),
  slug: z.string().max(500).nullable().optional(),
  status: z.enum(PRODUCT_STATUSES),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  searchTags: searchTagsSchema,
});

export const variantSchema = z.object({
  sku: z.string().max(500).nullable().optional(),
  barcode: z.string().max(500).nullable().optional(),
  attrsKey: z.string().min(1).max(500).optional().default('default'),
  attrsJson: z.string().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  searchTags: searchTagsSchema,
});

export const imagesUpdateSchema = z.object({
  images: z.array(z.string().min(1).max(2000)).max(40),
});

export const imageDeleteSchema = z.object({
  url: z.string().min(1).max(2000),
  deleteFromS3: z.boolean().optional().default(true),
});

const nullableNumber = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const merchantPriceSchema = z.object({
  merchantId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  price: nullableNumber,
  originalPrice: nullableNumber,
  inStock: z.boolean().optional().default(true),
  productUrl: z.string().max(2000).nullable().optional(),
  currencyCode: z.string().max(10).nullable().optional(),
});

export const merchantPriceUpdateSchema = z.object({
  price: nullableNumber,
  originalPrice: nullableNumber,
  inStock: z.boolean(),
  productUrl: z.string().max(2000).nullable().optional(),
  currencyCode: z.string().max(10).nullable().optional(),
});
