// Solid status colors for share-card metric bars.
// html2canvas renders gradients unreliably, so bars use solid fills.
export function getBarColor(status: string): string {
  switch (status) {
    case 'excellent': return '#10b981'
    case 'good': return '#3b82f6'
    case 'warning': return '#f59e0b'
    case 'critical': return '#ef4444'
    default: return '#6b7280'
  }
}
