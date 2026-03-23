// Setup for component tests running in jsdom environment.
// Import this at the top of component test files.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: query.includes('landscape'),
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

// Node v22+ has a built-in localStorage that lacks getItem/setItem methods,
// which conflicts with jsdom. Override unconditionally in jsdom environment.
if (typeof window !== 'undefined') {
    function makeStorage(): Storage {
        const store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, val: string) => { store[key] = val; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { Object.keys(store).forEach(k => delete store[k]); },
            get length() { return Object.keys(store).length; },
            key: (i: number) => Object.keys(store)[i] ?? null,
        };
    }
    Object.defineProperty(window, 'localStorage', { value: makeStorage(), writable: true });
    Object.defineProperty(window, 'sessionStorage', { value: makeStorage(), writable: true });
    // Also set on globalThis for module-level access
    Object.defineProperty(globalThis, 'localStorage', { value: window.localStorage, writable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: window.sessionStorage, writable: true });
}
