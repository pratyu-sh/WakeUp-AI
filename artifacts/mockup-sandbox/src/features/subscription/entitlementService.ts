import { revenueCat } from "./revenueCat";
import {
  FEATURE_ENTITLEMENT_MAP,
  FREE_LIMITS,
  PRIMARY_ENTITLEMENT,
} from "./subscriptionConstants";
import type { EntitlementId, FeatureGate } from "./subscriptionTypes";
import type { Exercise } from "../../lib/alarm-store";

/**
 * Entitlement Resolver
 *
 * Serves as the authoritative bridge between RevenueCat entitlements and WakeUp AI product features.
 * Decouples the underlying store/billing system from internal product feature gates.
 */
class EntitlementService {
  /**
   * Directly verifies whether the primary RevenueCat entitlement (wakeup_ai_plus) is active.
   */
  public hasRawEntitlement(entitlementId: EntitlementId = PRIMARY_ENTITLEMENT): boolean {
    const customerInfo = revenueCat.getCustomerInfo();
    const ent = customerInfo.entitlements.active[entitlementId];
    return Boolean(ent && ent.isActive);
  }

  /**
   * Resolves whether an application feature is permitted based on the active entitlement.
   *
   * Supported feature gates:
   * - "unlimited_alarms"
   * - "advanced_exercises"
   * - "adaptive_ai"
   * - "advanced_statistics"
   * - "premium_sounds"
   * - "goal_insights"
   * - "multiple_routines"
   * - "premium_themes"
   */
  public hasEntitlement(feature: FeatureGate): boolean {
    const requiredEntitlement = FEATURE_ENTITLEMENT_MAP[feature];
    if (!requiredEntitlement) return true;
    return this.hasRawEntitlement(requiredEntitlement);
  }

  /**
   * Exercise gating rule:
   * Push-ups are 100% free for all users.
   * Squats, Burpees, and Plank require AI+ entitlement.
   */
  public isExerciseUnlocked(exercise: Exercise): boolean {
    if (exercise === "pushups") return true;
    return this.hasEntitlement("advanced_exercises");
  }

  /**
   * Alarm limit rule (Section 15 & 18):
   * Free tier users are permitted up to 2 active alarms.
   * AI+ subscribers have unlimited alarms.
   */
  public isAlarmLimitReached(currentActiveAlarms: number): boolean {
    if (this.hasEntitlement("unlimited_alarms")) return false;
    return currentActiveAlarms >= FREE_LIMITS.MAX_ACTIVE_ALARMS;
  }

  /**
   * Returns the maximum active alarms allowed for free tier (2).
   */
  public getFreeAlarmLimit(): number {
    return FREE_LIMITS.MAX_ACTIVE_ALARMS;
  }
}

export const entitlementService = new EntitlementService();
