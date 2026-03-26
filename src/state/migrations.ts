// src/state/migrations.ts
// Sequential migration functions for localStorage data.
// Each migration transforms data from version N to N+1.
// When a new schema version is added, add a migration function here.

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

// Registry: key is the source version, value migrates to the next version.
// Currently empty — v4 is the latest schema version.
const migrations: Record<number, MigrationFn> = {
    // Example for future use:
    // 4: (data) => { data.schema.version = 5; /* transform... */ return data; },
};

/**
 * Detect the schema version of stored data.
 * v4+: data.schema.version
 * v2/v3 legacy: data.formatVersion (returned as-is — legacy files are not migrated,
 *   they are handled by the legacy deserialisation path in deserializeDocument)
 */
function detectVersion(data: Record<string, unknown>): number | null {
    const schema = data?.schema as Record<string, unknown> | undefined;
    if (schema?.version && typeof schema.version === 'number') return schema.version;
    if (data?.formatVersion && typeof data.formatVersion === 'number') return data.formatVersion;
    return null;
}

/** Latest schema version that migrations can produce. */
export const LATEST_SCHEMA_VERSION = 4;

/**
 * Run sequential migrations on stored data up to the latest version.
 * Returns the (possibly transformed) data. Throws if the version is
 * unrecognised or a required migration is missing.
 *
 * Legacy v2/v3 data passes through unchanged — it uses a separate
 * deserialisation path that handles format differences directly.
 */
export function migrateStoredData(data: Record<string, unknown>): Record<string, unknown> {
    const version = detectVersion(data);
    if (version === null) {
        throw new Error('Unrecognised data format: no schema version found');
    }

    // Legacy formats are not migrated — they go through deserializeDocument's legacy path
    if (version < 4) return data;

    let current = data;
    let v = version;
    while (v < LATEST_SCHEMA_VERSION) {
        const migrate = migrations[v];
        if (!migrate) {
            throw new Error(`No migration from schema version ${v} to ${v + 1}`);
        }
        current = migrate(current);
        v++;
    }

    return current;
}
