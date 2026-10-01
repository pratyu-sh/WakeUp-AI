import {
  PRIMARY_ENTITLEMENT,
} from "./subscriptionConstants";
import { revenueCat } from "./revenueCat";
import { entitlementService } from "./entitlementService";
import type {
  CustomerInfo,
  EntitlementId,
  FeatureGate,
  SubscriptionSnapshot,
  SubscriptionStatus,
} from "./subscriptionTypes";
import type { Exercise } from "../../lib/alarm-store";

/**
 * Subscription Service
 *
 * Authoritative subscription state manager listening to RevenueCat customer updates.
 * Delegates feature resolution to EntitlementService.
 */
class SubscriptionService {
  private snapshot: SubscriptionSnapshot;
  private listeners: Set<(snapshot: SubscriptionSnapshot) => void> = new Set();

  constructor() {
    this.snapshot = this.computeSnapshot(revenueCat.getCustomerInfo());

    // Reactively listen to RevenueCat customer info updates
    revenueCat.addCustomerInfoUpdateListener((customerInfo) => {
      this.snapshot = this.computeSnapshot(customerInfo);
      this.notifyListeners();
    });
  }

  public getSnapshot(): SubscriptionSnapshot {
    return this.snapshot;
  }

  public getSubscriptionStatus(): SubscriptionStatus {
    return this.snapshot.status;
  }

  public subscribe(
    listener: (snapshot: SubscriptionSnapshot) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.snapshot);
      } catch (err) {
        console.error("Error in subscription listener:", err);
      }
    });
  }

  public computeSnapshot(customerInfo: CustomerInfo): SubscriptionSnapshot {
    const activePlus = customerInfo.entitlements.active[PRIMARY_ENTITLEMENT];
    const isPlus = Boolean(activePlus && activePlus.isActive);

    let status: SubscriptionStatus = "FREE";
    let expirationDate: string | null = null;
    let willRenew = false;

    if (isPlus && activePlus) {
      status = activePlus.periodType === "TRIAL" ? "TRIAL" : "ACTIVE";
      expirationDate = activePlus.expirationDate;
      willRenew = activePlus.willRenew;
    } else if (customerInfo.allPurchasedProductIdentifiers.length > 0) {
      status = "EXPIRED";
      expirationDate = customerInfo.latestExpirationDate;
    }

    return {
      status,
      isPlus,
      activeOffering: null, // hydrated asynchronously
      customerInfo,
      expirationDate,
      willRenew,
      isInGracePeriod: false,
      hasBillingIssue: false,
    };
  }

  /**
   * Primary entitlement check matching RevenueCat authority rule:
   * RevenueCat -> wakeup_ai_plus -> premium features
   */
  public hasEntitlement(entitlementId: EntitlementId = PRIMARY_ENTITLEMENT): boolean {
    return entitlementService.hasRawEntitlement(entitlementId);
  }

  /**
   * Feature gate verification delegated to EntitlementService.
   */
  public canUse(feature: FeatureGate): boolean {
    return entitlementService.hasEntitlement(feature);
  }

  /**
   * Exercise unlocking rule:
   * Push-ups are always free; Squats, Burpees, and Plank require AI+.
   */
  public isExerciseLocked(exercise: Exercise): boolean {
    return !entitlementService.isExerciseUnlocked(exercise);
  }

  /**
   * Alarm limit check:
   * Free users are limited to 2 active alarms.
   */
  public isAlarmLimitReached(currentActiveAlarms: number): boolean {
    return entitlementService.isAlarmLimitReached(currentActiveAlarms);
  }
}

export const subscriptionService = new SubscriptionService();
