'use client'

import { createContext, useContext, useState, useEffect } from 'react';

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState('ZEBRE');
  const [portfolios, setPortfolios] = useState(['ZEBRE', 'xxx']);

  useEffect(() => {
    // Load selected portfolio from localStorage on mount
    const stored = localStorage.getItem('selectedPortfolio');
    if (stored) {
      setSelectedPortfolio(stored);
    }

    // Fetch portfolios from API
    const fetchPortfolios = async () => {
      try {
        const response = await fetch('/api/list-portfolios');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.portfolios)) {
            setPortfolios(data.portfolios);

            // If we didn't have a stored selection, or the stored one isn't in the new list (and isn't a custom one we just added),
            // we might want to default to the first one. 
            // For now, let's just ensure if nothing is selected, we select the first one.
            if (!stored && data.portfolios.length > 0) {
              setSelectedPortfolio(data.portfolios[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch portfolios:', error);
      }
    };

    fetchPortfolios();

    // Listen for portfolio changes
    const handlePortfolioChange = (event) => {
      setSelectedPortfolio(event.detail.portfolio);
    };

    window.addEventListener('portfolioChanged', handlePortfolioChange);
    return () => window.removeEventListener('portfolioChanged', handlePortfolioChange);
  }, []);

  const changePortfolio = (portfolioName) => {
    setSelectedPortfolio(portfolioName);
    localStorage.setItem('selectedPortfolio', portfolioName);
    window.dispatchEvent(new CustomEvent('portfolioChanged', { detail: { portfolio: portfolioName } }));
  };

  const addPortfolio = async (portfolioName) => {
    // Optimistically add to list
    if (!portfolios.includes(portfolioName)) {
      setPortfolios(prev => [...prev, portfolioName]);

      // Try to persist to backend
      try {
        await fetch('/api/create-portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolio: portfolioName })
        });
      } catch (error) {
        console.error('Failed to create portfolio:', error);
      }
    }
    changePortfolio(portfolioName);
  };

  return (
    <PortfolioContext.Provider value={{
      selectedPortfolio,
      portfolios,
      changePortfolio,
      addPortfolio
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider');
  }
  return context;
}


