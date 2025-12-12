// Central place to define Excel export rules used by the frontend "Build Excel" flow.
// (SheetJS / `xlsx` library)

export const EXCEL_EXPORT_RULES = {
  // Excel display formats (SheetJS uses Excel-style format strings)
  dateFormat: 'yyyy-mm-dd',
  numberFormat: '_-* #,##0.00_-;[Red]( #,##0.00)_-;_-* "-"??_-;_-@_-',

  // Column auto-fit rules
  autoFitColumns: true,
  // Force fixed width from Column B onwards (B = 2nd column).
  // This keeps labels readable in column A while keeping all value/period columns consistent.
  fixedWidthFromColumnIndex: 1,
  fixedWidthCharsFromColumnIndex: 14,
  minColumnWidthChars: 10,
  maxColumnWidthChars: 60,
  columnWidthPaddingChars: 2,

  // Writing options
  writeOptions: {
    // Ensures date cells are written as dates instead of raw numbers/strings where possible.
    cellDates: true,
  },
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

export function coerceISODateStringsToExcelDates(XLSX, worksheet, rules = EXCEL_EXPORT_RULES) {
  if (!worksheet || !worksheet['!ref']) return

  const range = XLSX.utils.decode_range(worksheet['!ref'])
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = worksheet[addr]
      if (!cell) continue

      // Only coerce strings that look like ISO-ish dates.
      if (typeof cell.v !== 'string') continue
      const raw = cell.v.trim()
      if (!ISO_DATE_RE.test(raw)) continue

      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) continue

      cell.t = 'd'
      cell.v = d
      cell.z = rules.dateFormat
    }
  }
}

function cellDisplayString(cell) {
  if (!cell) return ''

  // Prefer formatted text if provided.
  if (typeof cell.w === 'string' && cell.w.length) return cell.w

  const v = cell.v
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') return Number.isFinite(v) ? v.toString() : ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

export function autoFitWorksheetColumns(XLSX, worksheet, rules = EXCEL_EXPORT_RULES) {
  if (!worksheet || !worksheet['!ref']) return

  const range = XLSX.utils.decode_range(worksheet['!ref'])
  const colCount = range.e.c - range.s.c + 1

  const minWch = rules.minColumnWidthChars ?? 10
  const maxWch = rules.maxColumnWidthChars ?? 60
  const pad = rules.columnWidthPaddingChars ?? 2
  const fixedFrom = rules.fixedWidthFromColumnIndex ?? null
  const fixedWch = rules.fixedWidthCharsFromColumnIndex ?? null

  const widths = new Array(colCount).fill(minWch)

  for (let c = range.s.c; c <= range.e.c; c++) {
    const localColIndex = c - range.s.c
    if (
      fixedFrom !== null &&
      fixedFrom !== undefined &&
      fixedWch !== null &&
      fixedWch !== undefined &&
      localColIndex >= fixedFrom
    ) {
      widths[localColIndex] = fixedWch
      continue
    }

    let maxLen = 0
    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = worksheet[addr]
      const s = cellDisplayString(cell)
      if (!s) continue
      // Use a conservative approximation for width in characters.
      maxLen = Math.max(maxLen, s.length)
    }

    const wch = Math.min(maxWch, Math.max(minWch, maxLen + pad))
    widths[localColIndex] = wch
  }

  worksheet['!cols'] = widths.map((wch) => ({ wch }))
}

export function applyNumberFormatToWorksheet(XLSX, worksheet, formatString) {
  if (!worksheet || !worksheet['!ref']) return
  const range = XLSX.utils.decode_range(worksheet['!ref'])

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      if (!cell) continue

      if (typeof cell.v === 'number' && !Number.isNaN(cell.v)) {
        cell.z = formatString
      }
    }
  }
}


