// Anthropic Claude API client for SQL generation

import Anthropic from '@anthropic-ai/sdk';
import { SQLGenerationRequest, SQLGenerationResponse } from './types';
import { SQL_GENERATION_SYSTEM_PROMPT, buildUserPrompt, parseLLMResponse } from './prompts';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

let client: Anthropic | null = null;

/**
 * Initialize the Claude client
 */
function getClient(): Anthropic {
    if (client) return client;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY environment variable is not set');
    }

    client = new Anthropic({ apiKey });
    return client;
}

/**
 * Generate SQL query using Claude
 */
export async function generateSQLWithClaude(
    request: SQLGenerationRequest,
    modelName?: string
): Promise<SQLGenerationResponse> {
    const anthropic = getClient();

    const userPrompt = buildUserPrompt(
        request.naturalLanguageQuery,
        request.schemaContext,
        request.previousQueries
    );

    try {
        const message = await anthropic.messages.create({
            model: modelName || DEFAULT_MODEL,
            max_tokens: 1024,
            system: SQL_GENERATION_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        });

        // Extract text content from response
        const textContent = message.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text content in Claude response');
        }

        const parsed = parseLLMResponse(textContent.text);

        return {
            sql: parsed.sql,
            explanation: parsed.explanation,
            confidence: parsed.confidence,
            provider: 'claude',
            model: modelName || DEFAULT_MODEL,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Claude API error: ${error.message}`);
        }
        throw error;
    }
}
