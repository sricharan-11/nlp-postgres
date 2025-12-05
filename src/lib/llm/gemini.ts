// Google Gemini API client for SQL generation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLGenerationRequest, SQLGenerationResponse } from './types';
import { SQL_GENERATION_SYSTEM_PROMPT, buildUserPrompt, parseLLMResponse } from './prompts';

// Default model - can be overridden via GEMINI_MODEL env variable
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize the Gemini client
 */
function getClient(): GoogleGenerativeAI {
    if (genAI) return genAI;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

/**
 * Generate SQL query using Gemini
 */
export async function generateSQLWithGemini(
    request: SQLGenerationRequest,
    modelName?: string
): Promise<SQLGenerationResponse> {
    const client = getClient();
    const selectedModel = modelName || DEFAULT_MODEL;
    const model = client.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
            temperature: 0.1, // Low temperature for more deterministic output
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
        },
    });

    const userPrompt = buildUserPrompt(
        request.naturalLanguageQuery,
        request.schemaContext,
        request.previousQueries
    );

    try {
        const result = await model.generateContent([
            { text: SQL_GENERATION_SYSTEM_PROMPT },
            { text: userPrompt },
        ]);

        const response = result.response;
        const text = response.text();

        const parsed = parseLLMResponse(text);

        return {
            sql: parsed.sql,
            explanation: parsed.explanation,
            confidence: parsed.confidence,
            provider: 'gemini',
            model: selectedModel,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
        throw error;
    }
}
