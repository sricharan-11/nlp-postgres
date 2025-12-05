// Schema introspection for PostgreSQL databases

import { getPool } from './connection';
import { DatabaseSchema, TableSchema, TableColumn, ForeignKey } from './types';

let schemaCache: DatabaseSchema | null = null;

/**
 * Introspect database schema - tables, columns, relationships
 */
export async function introspectSchema(forceRefresh = false): Promise<DatabaseSchema> {
    if (schemaCache && !forceRefresh) {
        return schemaCache;
    }

    const pool = getPool();

    // Get all tables in public schema
    const tablesQuery = `
    SELECT 
      t.table_name,
      t.table_schema,
      obj_description((t.table_schema || '.' || t.table_name)::regclass) as table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
  `;

    const tablesResult = await pool.query(tablesQuery);
    const tables: TableSchema[] = [];

    for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;
        const tableSchema = tableRow.table_schema;

        // Get columns for this table
        const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        col_description((c.table_schema || '.' || c.table_name)::regclass, c.ordinal_position) as column_comment
      FROM information_schema.columns c
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

        const columnsResult = await pool.query(columnsQuery, [tableSchema, tableName]);

        // Get primary key columns
        const pkQuery = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2;
    `;

        const pkResult = await pool.query(pkQuery, [tableSchema, tableName]);
        const primaryKeys = pkResult.rows.map((row) => row.column_name);

        // Get foreign keys
        const fkQuery = `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2;
    `;

        const fkResult = await pool.query(fkQuery, [tableSchema, tableName]);
        const foreignKeys: ForeignKey[] = fkResult.rows.map((row) => ({
            columnName: row.column_name,
            referencedTable: row.referenced_table,
            referencedColumn: row.referenced_column,
        }));

        // Map columns
        const columns: TableColumn[] = columnsResult.rows.map((col) => ({
            name: col.column_name,
            type: col.udt_name || col.data_type,
            isNullable: col.is_nullable === 'YES',
            isPrimary: primaryKeys.includes(col.column_name),
            defaultValue: col.column_default,
            comment: col.column_comment,
        }));

        tables.push({
            name: tableName,
            schema: tableSchema,
            columns,
            primaryKeys,
            foreignKeys,
            comment: tableRow.table_comment,
        });
    }

    schemaCache = {
        tables,
        timestamp: new Date(),
    };

    return schemaCache;
}

/**
 * Format schema as a string for LLM context
 */
export function formatSchemaForLLM(schema: DatabaseSchema): string {
    const lines: string[] = ['DATABASE SCHEMA:', ''];

    for (const table of schema.tables) {
        lines.push(`TABLE: ${table.name}`);
        if (table.comment) {
            lines.push(`  Description: ${table.comment}`);
        }
        lines.push('  Columns:');

        for (const col of table.columns) {
            const flags: string[] = [];
            if (col.isPrimary) flags.push('PRIMARY KEY');
            if (!col.isNullable) flags.push('NOT NULL');

            const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
            const commentStr = col.comment ? ` -- ${col.comment}` : '';

            lines.push(`    - ${col.name}: ${col.type}${flagStr}${commentStr}`);
        }

        if (table.foreignKeys.length > 0) {
            lines.push('  Foreign Keys:');
            for (const fk of table.foreignKeys) {
                lines.push(`    - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`);
            }
        }

        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Clear the schema cache
 */
export function clearSchemaCache(): void {
    schemaCache = null;
}

/**
 * Get cached schema without refreshing
 */
export function getCachedSchema(): DatabaseSchema | null {
    return schemaCache;
}
