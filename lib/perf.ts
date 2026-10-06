export function initializePerformanceMode() {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowHardware = (navigator.hardwareConcurrency ?? 8) <= 4 || (deviceMemory !== undefined && deviceMemory <= 4);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (lowHardware || reducedMotion) {
    document.documentElement.dataset.perf = 'lite';
    return true;
  }

  delete document.documentElement.dataset.perf;
  return false;
}

export function markLitePerformanceMode() {
  document.documentElement.dataset.perf = 'lite';
}
