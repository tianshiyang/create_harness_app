export class AnchorNotFoundError extends Error {
  constructor(anchor: string, file: string) {
    super(`Anchor not found in "${file}": ${JSON.stringify(anchor)}`)
    this.name = 'AnchorNotFoundError'
  }
}

export function insertAfter(
  source: string,
  anchor: string,
  insertion: string,
  filePath = '<unknown>'
): string {
  const idx = source.indexOf(anchor)
  if (idx === -1) throw new AnchorNotFoundError(anchor, filePath)
  const end = idx + anchor.length
  return source.slice(0, end) + insertion + source.slice(end)
}

export function insertBefore(
  source: string,
  anchor: string,
  insertion: string,
  filePath = '<unknown>'
): string {
  const idx = source.indexOf(anchor)
  if (idx === -1) throw new AnchorNotFoundError(anchor, filePath)
  return source.slice(0, idx) + insertion + source.slice(idx)
}

export function hasMarker(source: string, marker: string): boolean {
  return source.includes(marker)
}
