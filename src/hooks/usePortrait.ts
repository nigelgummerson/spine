import { useState, useEffect } from 'react';

const usePortrait = () => {
    const [isPortrait, setIsPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);
    useEffect(() => {
        const mql = window.matchMedia('(orientation: portrait)');
        const handler = (e) => setIsPortrait(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return isPortrait;
};

export default usePortrait;
