/**
 * Compute a SHA-256 checksum of a JSON payload, excluding the checksum field itself.
 * Uses the Web Crypto API (available in all modern browsers).
 */
export async function computeChecksum(payload: Record<string, unknown>): Promise<string> {
    // Clone and remove any existing checksum before hashing
    const clone = { ...payload };
    if (clone.document && typeof clone.document === 'object') {
        const doc = { ...(clone.document as Record<string, unknown>) };
        delete doc.checksum;
        clone.document = doc;
    }
    const jsonString = JSON.stringify(clone, null, 2);
    const encoded = new TextEncoder().encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify the checksum of a loaded JSON payload.
 * Returns 'valid' if checksum matches, 'mismatch' if it doesn't, or 'absent' if no checksum field.
 */
export async function verifyChecksum(payload: Record<string, unknown>): Promise<'valid' | 'mismatch' | 'absent'> {
    const doc = payload.document as Record<string, unknown> | undefined;
    if (!doc?.checksum || typeof doc.checksum !== 'string') return 'absent';
    const storedChecksum = doc.checksum;
    const computed = await computeChecksum(payload);
    return computed === storedChecksum ? 'valid' : 'mismatch';
}
