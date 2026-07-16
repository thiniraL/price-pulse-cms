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
