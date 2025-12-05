// GET/POST /api/connection - Test and manage database connection

import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db/connection';
import { getConfiguredProviders } from '@/lib/llm/sql-generator';

export async function GET() {
    try {
        // Test database connection
        const connectionStatus = await testConnection();

        // Get configured LLM providers
        const llmProviders = getConfiguredProviders();

        return NextResponse.json({
            success: true,
            data: {
                database: connectionStatus,
                llm: {
                    configuredProviders: llmProviders,
                    hasProvider: llmProviders.length > 0,
                },
            },
        });
    } catch (error) {
        console.error('Connection API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Connection test failed',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // For future: allow runtime connection configuration
        // Currently we just test the existing connection
        const body = await request.json().catch(() => ({}));

        // If custom config provided, test with that (not implemented for security)
        if (Object.keys(body).length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Runtime connection configuration is not supported. Please use environment variables.',
                },
                { status: 400 }
            );
        }

        const connectionStatus = await testConnection();

        return NextResponse.json({
            success: connectionStatus.connected,
            data: connectionStatus,
        });
    } catch (error) {
        console.error('Connection POST API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Connection test failed',
            },
            { status: 500 }
        );
    }
}
