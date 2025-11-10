'use client';
import { useEffect, useState } from 'react';

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handler = (event) => {
      setHasError(true);
      console.error('Error:', event.error);
    };
    
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);
  
  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-red-800 font-semibold">Bir hata oluştu</h2>
        <button onClick={() => setHasError(false)}>Yeniden dene</button>
      </div>
    );
  }
  
  return children;
}