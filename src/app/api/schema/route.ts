// GET /api/schema - Fetch database schema

import { NextResponse } from 'next/server';
import { introspectSchema, clearSchemaCache } from '@/lib/db/schema';

export async function GET(request: Request) {
    try {
        // Check for refresh parameter
        const { searchParams } = new URL(request.url);
        const refresh = searchParams.get('refresh') === 'true';

        if (refresh) {
            clearSchemaCache();
        }

        const schema = await introspectSchema(refresh);

        return NextResponse.json({
            success: true,
            data: {
                tables: schema.tables,
                tableCount: schema.tables.length,
                timestamp: schema.timestamp.toISOString(),
            },
        });
    } catch (error) {
        console.error('Schema API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch schema',
            },
            { status: 500 }
        );
    }
}
