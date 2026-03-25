import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Toast {
    id: number;
    message: string;
    type: string;
}

interface ToastContextValue {
    showToast: (message: string, type?: string) => void;
    dismissToast: (id: number) => void;
    dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const showToast = useCallback((message: string, type: string = 'info') => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        if (type !== 'error') setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const dismissAllToasts = useCallback(() => setToasts([]), []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && toasts.length > 0) dismissAllToasts(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [toasts.length, dismissAllToasts]);

    return (
        <ToastContext.Provider value={{ showToast, dismissToast, dismissAllToasts }}>
            {children}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-[fadeIn_0.2s_ease-out] ${toast.type === 'error' ? 'bg-red-800 text-white' : 'bg-slate-800 text-white'}`}>
                            <span className="flex-1">{toast.message}</span>
                            <button onClick={() => dismissToast(toast.id)} className="shrink-0 hover:brightness-125 text-xs font-bold">&#10005;</button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}
