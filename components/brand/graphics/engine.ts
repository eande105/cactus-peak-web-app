/** Parse "16/9", "16:9" or a number (width ÷ height). */
export function parseRatio(r: string | number): number {
  if (typeof r === "number") return r
  const [a, b] = r.split(/[/:]/).map(Number)
  return b ? a / b : a
}
