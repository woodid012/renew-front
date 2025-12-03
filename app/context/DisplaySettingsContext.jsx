'use client'

import { createContext, useContext, useState, useEffect } from 'react';

const DisplaySettingsContext = createContext();

export const CURRENCY_UNITS = {
  MILLIONS: '$M',
  THOUSANDS: '$000',
  DOLLARS: '$'
};

export function DisplaySettingsProvider({ children }) {
  const [currencyUnit, setCurrencyUnit] = useState(CURRENCY_UNITS.MILLIONS);

  useEffect(() => {
    // Load currency unit from localStorage on mount
    const stored = localStorage.getItem('currencyUnit');
    if (stored && Object.values(CURRENCY_UNITS).includes(stored)) {
      setCurrencyUnit(stored);
    }
  }, []);

  const updateCurrencyUnit = (unit) => {
    if (Object.values(CURRENCY_UNITS).includes(unit)) {
      setCurrencyUnit(unit);
      localStorage.setItem('currencyUnit', unit);
    }
  };

  return (
    <DisplaySettingsContext.Provider value={{
      currencyUnit,
      updateCurrencyUnit,
      CURRENCY_UNITS
    }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  }
  return context;
}

