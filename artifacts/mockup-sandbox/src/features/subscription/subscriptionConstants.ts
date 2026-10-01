import type { EntitlementId, FeatureGate, Offering, PackageProduct } from "./subscriptionTypes";

export const PRIMARY_ENTITLEMENT: EntitlementId = "wakeup_ai_plus";

export const PRODUCT_IDS = {
  MONTHLY: "wakeup_ai_monthly",
  YEARLY: "wakeup_ai_yearly",
  LIFETIME: "lifetime",
} as const;

export const FREE_LIMITS = {
  MAX_ACTIVE_ALARMS: 2, // Maximum 2 active alarms on Free plan per specification (Section 15 & 18)
  ALLOWED_EXERCISES: ["pushups"] as const,
  PREMIUM_EXERCISES: ["squats", "burpees", "plank"] as const,
} as const;

export const DEFAULT_MONTHLY_PACKAGE: PackageProduct = {
  identifier: PRODUCT_IDS.MONTHLY,
  packageType: "MONTHLY",
  title: "WakeUp AI+ Monthly",
  description: "Unlimited alarms, all exercises, and adaptive AI challenges.",
  priceString: "$4.99/mo",
  priceValue: 4.99,
  currencyCode: "USD",
  periodUnit: "month",
  periodCount: 1,
  trialPeriodDays: 7,
};

export const DEFAULT_ANNUAL_PACKAGE: PackageProduct = {
  identifier: PRODUCT_IDS.YEARLY,
  packageType: "ANNUAL",
  title: "WakeUp AI+ Annual",
  description: "Best value. Wake up consistent every morning.",
  priceString: "$29.99/yr",
  priceValue: 29.99,
  currencyCode: "USD",
  periodUnit: "year",
  periodCount: 1,
  trialPeriodDays: 7,
  isBestValue: true,
  introPriceString: "$2.50/mo equivalent",
};

export const DEFAULT_LIFETIME_PACKAGE: PackageProduct = {
  identifier: PRODUCT_IDS.LIFETIME,
  packageType: "LIFETIME",
  title: "WakeUp AI+ Lifetime",
  description: "Pay once. Never worry about waking up again.",
  priceString: "$59.99",
  priceValue: 59.99,
  currencyCode: "USD",
  periodUnit: "lifetime",
  periodCount: 1,
};

export const DEFAULT_OFFERING: Offering = {
  identifier: "default",
  serverDescription: "Standard WakeUp AI+ offerings",
  monthly: DEFAULT_MONTHLY_PACKAGE,
  annual: DEFAULT_ANNUAL_PACKAGE,
  lifetime: DEFAULT_LIFETIME_PACKAGE,
  availablePackages: [DEFAULT_ANNUAL_PACKAGE, DEFAULT_MONTHLY_PACKAGE, DEFAULT_LIFETIME_PACKAGE],
};

export const PREMIUM_FEATURES_LIST = [
  "Unlimited alarms",
  "All exercises (Squats, Burpees, Plank)",
  "Adaptive AI challenges",
  "Advanced statistics & trends",
  "Premium wake-up sounds",
  "Goal consistency insights",
] as const;

export const FEATURE_ENTITLEMENT_MAP: Record<FeatureGate, EntitlementId> = {
  unlimited_alarms: PRIMARY_ENTITLEMENT,
  advanced_exercises: PRIMARY_ENTITLEMENT,
  adaptive_ai: PRIMARY_ENTITLEMENT,
  advanced_statistics: PRIMARY_ENTITLEMENT,
  premium_sounds: PRIMARY_ENTITLEMENT,
  goal_insights: PRIMARY_ENTITLEMENT,
  multiple_routines: PRIMARY_ENTITLEMENT,
  premium_themes: PRIMARY_ENTITLEMENT,
};
