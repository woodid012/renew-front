'use client'

import { createContext, useContext, useState, useEffect } from 'react';

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const [selectedPortfolio, setSelectedPortfolio] = useState('ZEBRE');
  const [portfolios, setPortfolios] = useState([{ name: 'ZEBRE', title: 'ZEBRE' }, { name: 'xxx', title: 'xxx' }]);

  // Fetch portfolios from API
  const fetchPortfolios = async () => {
    try {
      const response = await fetch('/api/list-portfolios');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.portfolios)) {
          // Store full portfolio objects (with name, title, and unique_id)
          // Keep backward compatibility with string format
          const portfolioObjects = data.portfolios.map(p => 
            typeof p === 'string' 
              ? { name: p, title: p, unique_id: p } 
              : { name: p.name, title: p.title || p.name, unique_id: p.unique_id || p.name }
          );
          setPortfolios(portfolioObjects);

          // Extract unique_ids for selection (use unique_id for API calls)
          const portfolioUniqueIds = portfolioObjects.map(p => p.unique_id || p.name);

          // Check if stored value is a valid unique_id
          const stored = localStorage.getItem('selectedPortfolio');
          if (stored && portfolioUniqueIds.includes(stored)) {
            setSelectedPortfolio(stored);
          } else if (portfolioUniqueIds.length > 0) {
            // If stored value is not a valid unique_id, default to first portfolio
            setSelectedPortfolio(portfolioUniqueIds[0]);
            localStorage.setItem('selectedPortfolio', portfolioUniqueIds[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
    }
  };

  useEffect(() => {
    // Load selected portfolio from localStorage on mount
    const stored = localStorage.getItem('selectedPortfolio');
    if (stored) {
      setSelectedPortfolio(stored);
    }

    fetchPortfolios();

    // Listen for portfolio changes
    const handlePortfolioChange = (event) => {
      setSelectedPortfolio(event.detail.portfolio);
    };

    // Listen for portfolio refresh requests (e.g., when a portfolio is created elsewhere)
    const handlePortfolioRefresh = () => {
      fetchPortfolios();
    };

    window.addEventListener('portfolioChanged', handlePortfolioChange);
    window.addEventListener('refreshPortfolios', handlePortfolioRefresh);
    return () => {
      window.removeEventListener('portfolioChanged', handlePortfolioChange);
      window.removeEventListener('refreshPortfolios', handlePortfolioRefresh);
    };
  }, []);

  const changePortfolio = (uniqueId) => {
    // uniqueId must be a valid unique_id - only match by unique_id
    setSelectedPortfolio(uniqueId);
    localStorage.setItem('selectedPortfolio', uniqueId);
    window.dispatchEvent(new CustomEvent('portfolioChanged', { detail: { portfolio: uniqueId } }));
  };

  const addPortfolio = async (portfolioName) => {
    // Try to persist to backend first
    try {
      const response = await fetch('/api/create-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: portfolioName })
      });
      
      const result = await response.json();
      if (!result.success && !result.message?.includes('already exists')) {
        throw new Error(result.error || 'Failed to create portfolio');
      }

      // Refresh portfolios from API to ensure we have the latest list
      await fetchPortfolios();
      
      // After refresh, find the unique_id for the newly created portfolio
      // Wait a bit for the state to update, then find and select by unique_id
      setTimeout(async () => {
        const refreshedResponse = await fetch('/api/list-portfolios');
        if (refreshedResponse.ok) {
          const refreshedData = await refreshedResponse.json();
          if (refreshedData.success && Array.isArray(refreshedData.portfolios)) {
            const newPortfolio = refreshedData.portfolios.find(p => p.name === portfolioName);
            if (newPortfolio) {
              const uniqueId = newPortfolio.unique_id || newPortfolio.name;
              changePortfolio(uniqueId);
            } else {
              changePortfolio(portfolioName); // Fallback
            }
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      throw error; // Re-throw so caller can handle it
    }
  };

  // Helper function to get portfolio title by unique_id (for display)
  // Returns "PlatformName (unique_id)" format
  const getPortfolioTitle = (portfolioIdentifier) => {
    if (!portfolioIdentifier) return '';
    const portfolio = portfolios.find(p => {
      const pUniqueId = typeof p === 'string' ? p : (p.unique_id || p.name);
      return pUniqueId === portfolioIdentifier;
    });
    if (!portfolio) return portfolioIdentifier;
    
    const portfolioObj = typeof portfolio === 'string' 
      ? { name: portfolio, title: portfolio, unique_id: portfolio }
      : portfolio;
    
    const platformName = portfolioObj.name || portfolioObj.title || portfolioIdentifier;
    const uniqueId = portfolioObj.unique_id || portfolioIdentifier;
    
    // If unique_id is the same as platformName, just show platformName
    if (uniqueId === platformName) {
      return platformName;
    }
    
    // Otherwise show "PlatformName (unique_id)"
    return `${platformName} (${uniqueId})`;
  };

  // Helper function to get unique_id from portfolio identifier (unique_id only)
  const getPortfolioUniqueId = (portfolioIdentifier) => {
    if (!portfolioIdentifier) return '';
    const portfolio = portfolios.find(p => {
      const pUniqueId = typeof p === 'string' ? p : p.unique_id;
      return pUniqueId === portfolioIdentifier;
    });
    if (!portfolio) {
      // If not found in local state, assume portfolioIdentifier is already a unique_id
      // This handles cases where portfolios haven't loaded yet or the identifier is already a unique_id
      return portfolioIdentifier;
    }
    return typeof portfolio === 'string' ? portfolio : portfolio.unique_id;
  };

  return (
    <PortfolioContext.Provider value={{
      selectedPortfolio,
      portfolios,
      changePortfolio,
      addPortfolio,
      refreshPortfolios: fetchPortfolios,
      getPortfolioTitle,
      getPortfolioUniqueId
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



