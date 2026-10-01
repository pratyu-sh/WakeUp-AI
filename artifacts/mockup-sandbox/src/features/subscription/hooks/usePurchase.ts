import { useState } from "react";
import { revenueCat } from "../revenueCat";
import type { CustomerInfo, PackageProduct, PurchaseResult } from "../subscriptionTypes";

export function usePurchase() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchasePackage = async (
    pkg: PackageProduct,
  ): Promise<PurchaseResult> => {
    setIsPurchasing(true);
    setError(null);
    try {
      const res = await revenueCat.purchasePackage(pkg);
      setIsPurchasing(false);
      if (res.userCancelled) {
        return { success: false, customerInfo: null, userCancelled: true };
      }
      return {
        success: res.success,
        customerInfo: res.customerInfo,
        productIdentifier: res.productIdentifier,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "We couldn't complete the purchase. Please try again.";
      setError(msg);
      setIsPurchasing(false);
      return { success: false, customerInfo: null, error: msg };
    }
  };

  return { purchasePackage, isPurchasing, error };
}
