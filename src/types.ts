export type Mode = 'sql' | 'nosql';
export type Page = 'home' | 'sql' | 'nosql' | 'designer' | 'learn' | 'compare' | 'history' | 'settings';
export type Cell = string | number | null | Uint8Array;
export type DataRow = Record<string, unknown>;
export interface SqlResult { columns: string[]; values: Cell[][]; affected: number; elapsed: number; statements: number; message: string }
export interface ColumnInfo { name: string; type: string; pk: number; notnull: boolean; defaultValue: string | null }
export interface ForeignKeyInfo { table: string; from: string; to: string }
export interface IndexInfo { name: string; unique: boolean }
export interface TableInfo { name: string; type: 'table' | 'view'; columns: ColumnInfo[]; foreignKeys: ForeignKeyInfo[]; indexes: IndexInfo[]; count: number }
export interface SchemaInfo { tables: TableInfo[]; triggers: string[]; pageCount: number; pageSize: number }
export interface DatabaseRecord { id: string; name: string; mode: Mode; created: number; updated: number; sqlBytes?: Uint8Array; collections?: Record<string, DocumentRecord[]> }
export interface DocumentRecord { _id: string | number; [key: string]: unknown }
export interface ExecutionRecord { id: string; databaseId: string; databaseName: string; mode: Mode; query: string; elapsed: number; rows: number; success: boolean; error?: string; at: number }
export interface SavedQuery { id: string; title: string; folder: string; description: string; mode: Mode; query: string; updated: number }
export interface EditorTab { id: string; title: string; text: string; mode: Mode }
export interface NoSqlRequest { collection: string; operation: string; filter?: Record<string, unknown>; document?: DocumentRecord; documents?: DocumentRecord[]; update?: Record<string, unknown>; projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1>; pipeline?: Record<string, unknown>[]; skip?: number; limit?: number; upsert?: boolean }
export interface NoSqlResult { documents: Record<string, unknown>[]; columns: string[]; affected: number; elapsed: number; message: string }
export interface Challenge { id: string; title: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; mode: Mode; description: string; hint: string; solution: string; starter: string; explanation: string; sample: string }
