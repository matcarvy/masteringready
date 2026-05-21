// html2canvas collapses regular spaces; replace them with non-breaking spaces
export function nbsp(s: string): string {
  return s.replace(/ /g, '\u00A0')
}
