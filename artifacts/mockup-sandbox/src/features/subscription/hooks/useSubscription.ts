import { useEffect, useState } from "react";
import { subscriptionService } from "../subscriptionService";
import type { SubscriptionSnapshot } from "../subscriptionTypes";

export function useSubscription(): SubscriptionSnapshot {
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>(() =>
    subscriptionService.getSnapshot(),
  );

  useEffect(() => {
    const unsubscribe = subscriptionService.subscribe((next) => {
      setSnapshot(next);
    });
    return unsubscribe;
  }, []);

  return snapshot;
}
