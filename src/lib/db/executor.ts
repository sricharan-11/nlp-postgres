// Safe query executor with validation

import { QueryResultRow, FieldDef } from 'pg';
import { getPool } from './connection';
import { QueryResult } from './types';

// Maximum execution time in milliseconds
const QUERY_TIMEOUT = parseInt(process.env.QUERY_TIMEOUT_MS || '30000', 10);

// Maximum rows to return
const MAX_RESULT_ROWS = parseInt(process.env.MAX_RESULT_ROWS || '1000', 10);

/**
 * Check if a SQL query is safe (SELECT only)
 */
export function validateQuery(sql: string): { valid: boolean; error?: string } {
    // Normalize SQL for validation
    const normalizedSql = sql.trim().toLowerCase();

    // Check for forbidden keywords
    const forbiddenPatterns = [
        /^\s*insert\s+/i,
        /^\s*update\s+/i,
        /^\s*delete\s+/i,
        /^\s*drop\s+/i,
        /^\s*truncate\s+/i,
        /^\s*alter\s+/i,
        /^\s*create\s+/i,
        /^\s*grant\s+/i,
        /^\s*revoke\s+/i,
        /^\s*exec\s+/i,
        /^\s*execute\s+/i,
        /;\s*(insert|update|delete|drop|truncate|alter|create|grant|revoke)\s+/i,
    ];

    for (const pattern of forbiddenPatterns) {
        if (pattern.test(normalizedSql)) {
            return {
                valid: false,
                error: 'Only SELECT queries are allowed. Data modification operations are disabled.',
            };
        }
    }

    // Check that query starts with SELECT or WITH (for CTEs)
    if (!normalizedSql.startsWith('select') && !normalizedSql.startsWith('with')) {
        return {
            valid: false,
            error: 'Query must start with SELECT or WITH (for CTEs).',
        };
    }

    return { valid: true };
}

/**
 * Execute a validated SQL query with safety limits
 */
export async function executeQuery<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = []
): Promise<QueryResult<T>> {
    // Validate the query first
    const validation = validateQuery(sql);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const pool = getPool();
    const startTime = Date.now();

    // Add LIMIT if not present
    let safeSql = sql.trim();
    const hasLimit = /\bLIMIT\s+\d+/i.test(safeSql);
    if (!hasLimit) {
        // Remove trailing semicolon if present
        safeSql = safeSql.replace(/;\s*$/, '');
        safeSql = `${safeSql} LIMIT ${MAX_RESULT_ROWS}`;
    }

    try {
        // Execute with timeout
        const result = await pool.query<T>({
            text: safeSql,
            values: params,
            // @ts-expect-error - statement_timeout is a valid query config option
            statement_timeout: QUERY_TIMEOUT,
        });

        const executionTime = Date.now() - startTime;

        return {
            rows: result.rows,
            rowCount: result.rowCount || 0,
            fields: result.fields.map((f: FieldDef) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
            })),
            executionTime,
        };
    } catch (error) {
        // Re-throw with more context
        if (error instanceof Error) {
            if (error.message.includes('statement timeout')) {
                throw new Error(`Query timed out after ${QUERY_TIMEOUT}ms. Consider adding filters or LIMIT clause.`);
            }
            throw new Error(`Query execution error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Explain a query without executing it
 */
export async function explainQuery(sql: string): Promise<string[]> {
    const validation = validateQuery(sql);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const pool = getPool();
    const result = await pool.query(`EXPLAIN ${sql}`);

    return result.rows.map((row) => row['QUERY PLAN'] as string);
}
