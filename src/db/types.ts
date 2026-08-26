// Common surface both the native (@capacitor-community/sqlite) and web
// (sql.js, see webAdapter.ts) backends implement, so repositories don't
// need to know which one they're talking to.

export interface QueryResult {
  values?: Record<string, unknown>[];
}

export interface DbHandle {
  execute(statements: string): Promise<unknown>;
  run(statement: string, values?: unknown[]): Promise<unknown>;
  query(statement: string, values?: unknown[]): Promise<QueryResult>;
}
