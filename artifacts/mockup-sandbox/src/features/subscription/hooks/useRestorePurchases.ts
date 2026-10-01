import { useState } from "react";
import { revenueCat } from "../revenueCat";
import type { CustomerInfo } from "../subscriptionTypes";

export function useRestorePurchases() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async (): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> => {
    setIsRestoring(true);
    setError(null);
    try {
      const customerInfo = await revenueCat.restorePurchases();
      setIsRestoring(false);
      return { success: true, customerInfo };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to restore purchases.";
      setError(msg);
      setIsRestoring(false);
      return { success: false, error: msg };
    }
  };

  return { restore, isRestoring, error };
}
