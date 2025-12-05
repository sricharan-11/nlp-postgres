// Database TypeScript type definitions

export interface TableColumn {
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    defaultValue: string | null;
    comment: string | null;
}

export interface ForeignKey {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
}

export interface TableSchema {
    name: string;
    schema: string;
    columns: TableColumn[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
    comment: string | null;
}

export interface DatabaseSchema {
    tables: TableSchema[];
    timestamp: Date;
}

export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
    fields: Array<{ name: string; dataTypeID: number }>;
    executionTime: number;
}

export interface ConnectionConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
}

export interface ConnectionStatus {
    connected: boolean;
    database: string | null;
    server: string | null;
    error: string | null;
}
