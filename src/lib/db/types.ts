// src/lib/db/types.ts
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: any[];
}

export interface DbAdapter {
  query<T extends Record<string, any>>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: DbAdapter) => Promise<T>): Promise<T>;
}