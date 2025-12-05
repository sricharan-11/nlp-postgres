// PostgreSQL connection pool management

import { Pool, PoolConfig, PoolClient, QueryResultRow } from 'pg';
import { ConnectionConfig, ConnectionStatus } from './types';

let pool: Pool | null = null;

/**
 * Get connection configuration from environment variables
 */
function getConfigFromEnv(): ConnectionConfig {
    return {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        database: process.env.DATABASE_NAME || 'postgres',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        ssl: process.env.DATABASE_SSL === 'true',
    };
}

/**
 * Initialize or get the connection pool
 */
export function getPool(config?: ConnectionConfig): Pool {
    if (pool) return pool;

    const connectionConfig = config || getConfigFromEnv();

    const poolConfig: PoolConfig = {
        host: connectionConfig.host,
        port: connectionConfig.port,
        database: connectionConfig.database,
        user: connectionConfig.user,
        password: connectionConfig.password,
        ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : undefined,
        max: 10, // Maximum pool connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    };

    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
        console.error('Unexpected PostgreSQL pool error:', err);
    });

    return pool;
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
    const p = getPool();
    return await p.connect();
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

/**
 * Test the database connection
 */
export async function testConnection(config?: ConnectionConfig): Promise<ConnectionStatus> {
    try {
        const p = getPool(config);
        const result = await p.query('SELECT current_database() as db, inet_server_addr() as server');

        return {
            connected: true,
            database: result.rows[0]?.db || null,
            server: result.rows[0]?.server || null,
            error: null,
        };
    } catch (error) {
        return {
            connected: false,
            database: null,
            server: null,
            error: error instanceof Error ? error.message : 'Unknown connection error',
        };
    }
}

/**
 * Execute a simple query
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
    const p = getPool();
    const result = await p.query<T>(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
}
