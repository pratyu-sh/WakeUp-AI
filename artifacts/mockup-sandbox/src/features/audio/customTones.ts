export interface CustomTone {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
  sizeBytes?: number;
}

const STORAGE_KEY = "wakeup-ai-custom-tones";

export function getStoredCustomTones(): CustomTone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomTone[];
  } catch (err) {
    console.error("Failed to load custom tones:", err);
    return [];
  }
}

export function saveCustomTone(
  name: string,
  dataUrl: string,
  sizeBytes?: number,
): CustomTone {
  const tones = getStoredCustomTones();
  // Strip file extension if present (e.g., .mp3, .wav)
  const cleanName = name.replace(/\.[^/.]+$/, "").trim() || "Custom Tone";
  const newTone: CustomTone = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    dataUrl,
    createdAt: new Date().toISOString(),
    sizeBytes,
  };

  // Avoid duplicate names by appending a suffix if needed
  const nameExists = tones.some(
    (t) => t.name.toLowerCase() === newTone.name.toLowerCase(),
  );
  if (nameExists) {
    newTone.name = `${newTone.name} (${tones.length + 1})`;
  }

  const updated = [newTone, ...tones];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save custom tone:", err);
    }
  }
  return newTone;
}

export function deleteCustomTone(id: string): CustomTone[] {
  const tones = getStoredCustomTones();
  const updated = tones.filter((t) => t.id !== id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete custom tone:", err);
    }
  }
  return updated;
}

export function findCustomToneByName(name: string): CustomTone | undefined {
  const tones = getStoredCustomTones();
  return tones.find((t) => t.name.toLowerCase() === name.toLowerCase());
}
