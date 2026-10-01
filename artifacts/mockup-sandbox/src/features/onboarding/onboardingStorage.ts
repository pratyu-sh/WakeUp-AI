export const ONBOARDING_STORAGE_KEY = "wakeup-ai-onboarding-completed";

export function isOnboardingCompleted(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
  } catch {
    // Storage unavailable
  }
}

export function resetOnboarding(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable
  }
}
