let _nextId = Date.now();
export const genId = (): string => String(++_nextId);
