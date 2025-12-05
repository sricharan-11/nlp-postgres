// POST /api/query - Execute natural language query

import { NextRequest, NextResponse } from 'next/server';
import { introspectSchema, formatSchemaForLLM } from '@/lib/db/schema';
import { executeQuery, validateQuery } from '@/lib/db/executor';
import { generateSQL, getConfiguredProviders } from '@/lib/llm/sql-generator';
import { LLMProvider } from '@/lib/llm/types';

interface QueryRequestBody {
    query: string;
    provider?: LLMProvider;
    options?: {
        limit?: number;
        explain?: boolean;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: QueryRequestBody = await request.json();

        // Validate request
        if (!body.query || typeof body.query !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Query is required' },
                { status: 400 }
            );
        }

        // Check for configured LLM providers
        const configuredProviders = getConfiguredProviders();
        if (configuredProviders.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No LLM providers configured. Please set GEMINI_API_KEY or CLAUDE_API_KEY.' },
                { status: 500 }
            );
        }

        // Get database schema
        const schema = await introspectSchema();
        if (schema.tables.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No tables found in database. Please check your connection.' },
                { status: 400 }
            );
        }

        const schemaContext = formatSchemaForLLM(schema);

        // Generate SQL using LLM
        const llmResponse = await generateSQL(
            {
                naturalLanguageQuery: body.query,
                schemaContext,
            },
            body.provider
        );

        // Validate generated SQL
        const validation = validateQuery(llmResponse.sql);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error,
                    generatedSQL: llmResponse.sql,
                    explanation: llmResponse.explanation,
                },
                { status: 400 }
            );
        }

        // Execute the query
        const result = await executeQuery(llmResponse.sql);

        return NextResponse.json({
            success: true,
            data: {
                query: body.query,
                sql: llmResponse.sql,
                explanation: llmResponse.explanation,
                confidence: llmResponse.confidence,
                provider: llmResponse.provider,
                model: llmResponse.model,
                results: result.rows,
                rowCount: result.rowCount,
                fields: result.fields,
                executionTime: result.executionTime,
            },
        });
    } catch (error) {
        console.error('Query API error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            { status: 500 }
        );
    }
}
