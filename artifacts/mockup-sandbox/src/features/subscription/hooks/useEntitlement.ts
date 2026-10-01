import { useCallback } from "react";
import { PRIMARY_ENTITLEMENT } from "../subscriptionConstants";
import { subscriptionService } from "../subscriptionService";
import type { EntitlementId, FeatureGate } from "../subscriptionTypes";
import { useSubscription } from "./useSubscription";
import type { Exercise } from "../../../lib/alarm-store";

export function useEntitlement() {
  const sub = useSubscription();

  const hasEntitlement = useCallback(
    (entitlementId: EntitlementId = PRIMARY_ENTITLEMENT): boolean => {
      return Boolean(sub.customerInfo?.entitlements.active[entitlementId]?.isActive);
    },
    [sub.customerInfo],
  );

  const canUse = useCallback(
    (feature: FeatureGate): boolean => {
      return subscriptionService.canUse(feature);
    },
    [sub],
  );

  const isExerciseLocked = useCallback(
    (exercise: Exercise): boolean => {
      return subscriptionService.isExerciseLocked(exercise);
    },
    [sub],
  );

  const isAlarmLimitReached = useCallback(
    (currentActiveAlarms: number): boolean => {
      return subscriptionService.isAlarmLimitReached(currentActiveAlarms);
    },
    [sub],
  );

  return {
    isPlus: sub.isPlus,
    status: sub.status,
    hasEntitlement,
    canUse,
    isExerciseLocked,
    isAlarmLimitReached,
  };
}
