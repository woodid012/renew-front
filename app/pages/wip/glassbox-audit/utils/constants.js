// Color utilities for objects
export const getColorClasses = (color) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    teal: 'bg-teal-50 border-teal-200 text-teal-900',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900'
  }
  return colors[color] || colors.blue
}

export const getColorAccent = (color) => {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
    teal: 'bg-teal-600',
    cyan: 'bg-cyan-600',
    amber: 'bg-amber-600',
    red: 'bg-red-600',
    indigo: 'bg-indigo-600'
  }
  return colors[color] || colors.blue
}

export const getColorHex = (color) => {
  const colors = {
    blue: '#2563EB',
    green: '#16A34A',
    orange: '#F97316',
    purple: '#9333EA',
    teal: '#14B8A6',
    cyan: '#06B6D4',
    amber: '#F59E0B',
    red: '#EF4444',
    indigo: '#4F46E5'
  }
  return colors[color] || colors.blue
}

export const getColorLight = (color) => {
  const colors = {
    blue: '#DBEAFE',
    green: '#DCFCE7',
    orange: '#FFEDD5',
    purple: '#F3E8FF',
    teal: '#CCFBF1',
    cyan: '#CFFAFE',
    amber: '#FEF3C7',
    red: '#FEE2E2',
    indigo: '#E0E7FF'
  }
  return colors[color] || colors.blue
}

export const formatValue = (value, unit) => {
  if (unit === '$') {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  }
  if (unit === 'MWh' || unit === 'years') {
    return new Intl.NumberFormat('en-AU').format(value)
  }
  if (unit === '%' || unit === '%/year') {
    return `${value.toFixed(2)}%`
  }
  if (unit === 'ratio') {
    return value.toFixed(3)
  }
  return value.toString()
}

