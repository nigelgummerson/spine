// Unique ID generator - counter starts from timestamp to avoid collisions with saved data
let _nextId = Date.now();
export const genId = () => ++_nextId;
