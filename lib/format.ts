export function formatLargeNumber(num: number): string {
  if (num === 0) return '0';
  if (num < 1000) return num.toFixed(2);

  const units = ["K", "M", "B", "T"];
  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);

  if (tier === 0) return String(num);

  const suffix = units[tier - 1];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;

  return scaled.toFixed(2) + suffix;
}

export function formatTimeLeft(unlockDate: Date): string {
  const now = new Date();
  const diff = unlockDate.getTime() - now.getTime();

  if (diff <= 0) return "Unlocked";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export function getDurationLabel(days: number): string {
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    return `${minutes} min`;
  }
  return `${days} days`;
}