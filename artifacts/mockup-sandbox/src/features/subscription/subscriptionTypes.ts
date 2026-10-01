export type SubscriptionStatus =
  | "LOADING"
  | "FREE"
  | "TRIAL"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "BILLING_ISSUE"
  | "EXPIRED"
  | "ERROR";

export type EntitlementId = "wakeup_ai_plus";

export type FeatureGate =
  | "unlimited_alarms"
  | "advanced_exercises"
  | "adaptive_ai"
  | "advanced_statistics"
  | "premium_sounds"
  | "goal_insights"
  | "multiple_routines"
  | "premium_themes";

export interface PackageProduct {
  identifier: string;
  packageType: "MONTHLY" | "ANNUAL" | "LIFETIME" | "CUSTOM";
  title: string;
  description: string;
  priceString: string;
  priceValue: number;
  currencyCode: string;
  periodUnit: "month" | "year" | "lifetime";
  periodCount: number;
  trialPeriodDays?: number;
  introPriceString?: string;
  isBestValue?: boolean;
}

export interface Offering {
  identifier: string;
  serverDescription: string;
  monthly: PackageProduct | null;
  annual: PackageProduct | null;
  lifetime?: PackageProduct | null;
  availablePackages: PackageProduct[];
}

export interface CustomerInfo {
  originalAppUserId: string;
  entitlements: {
    active: Record<
      string,
      {
        identifier: string;
        isActive: boolean;
        willRenew: boolean;
        periodType: "NORMAL" | "TRIAL" | "INTRO";
        latestPurchaseDate: string;
        originalPurchaseDate: string;
        expirationDate: string | null;
        productIdentifier: string;
      }
    >;
    all: Record<string, unknown>;
  };
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  firstSeen: string;
  originalPurchaseDate: string | null;
  managementURL: string | null;
}

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  isPlus: boolean;
  activeOffering: Offering | null;
  customerInfo: CustomerInfo | null;
  expirationDate: string | null;
  willRenew: boolean;
  isInGracePeriod: boolean;
  hasBillingIssue: boolean;
  error?: string | null;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo: CustomerInfo | null;
  productIdentifier?: string;
  userCancelled?: boolean;
  error?: string;
}

export interface SubscriptionError {
  code: string;
  message: string;
  userCancelled?: boolean;
}
