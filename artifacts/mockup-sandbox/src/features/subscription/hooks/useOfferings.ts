import { useEffect, useState } from "react";
import { DEFAULT_OFFERING } from "../subscriptionConstants";
import { revenueCat } from "../revenueCat";
import type { Offering } from "../subscriptionTypes";

export function useOfferings() {
  const [offering, setOffering] = useState<Offering>(DEFAULT_OFFERING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void revenueCat.getOfferings().then((res) => {
      if (isMounted) {
        setOffering(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { offering, loading };
}
