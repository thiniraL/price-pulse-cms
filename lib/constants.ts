/** Values match production `content.page_sections."PageName"` (lowercase). */
export const PAGE_NAMES = [
  'home',
  'dashboard',
  'productfilter',
  'product',
  'favourites',
  'homes',
  'product-no',
] as const;

export const SECTION_STYLES = [
  'CarouselBanners',
  'HorizontalScrollProductCards',
  'HorizontalScrollProductCardsWithAdPlaceholder',
  'AdPlaceholderWithHorizontalScrollProductCards',
  'NewsletterSignupForm',
  'HorizontalScrollCircularCategoryIcons',
  'CategoryShowcaseCards',
  'CallToActionButton',
  'ProductListSection',
  'SponsoredProductsSection',
  'PriceDropsSection',
] as const;

export const ADS_POSITIONS = [
  'None',
  'TopOfPage',
  'InlineLeft',
  'InlineRight',
  'BottomOfPage',
] as const;

export type PageName = (typeof PAGE_NAMES)[number];
export type SectionStyle = (typeof SECTION_STYLES)[number];
export type AdsPosition = (typeof ADS_POSITIONS)[number];
