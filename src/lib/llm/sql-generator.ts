// SQL Generator - orchestrates LLM providers for SQL generation

import { SQLGenerationRequest, SQLGenerationResponse, LLMProvider } from './types';
import { generateSQLWithGemini } from './gemini';
import { generateSQLWithClaude } from './claude';

// Default provider - can be overridden via LLM_PROVIDER env variable
const DEFAULT_PROVIDER: LLMProvider = (process.env.LLM_PROVIDER as LLMProvider) || 'gemini';

/**
 * Generate SQL from natural language using the specified or default provider
 * Falls back to secondary provider on failure
 */
export async function generateSQL(
    request: SQLGenerationRequest,
    preferredProvider?: LLMProvider
): Promise<SQLGenerationResponse> {
    const primary = preferredProvider || DEFAULT_PROVIDER;
    const fallback: LLMProvider = primary === 'gemini' ? 'claude' : 'gemini';

    try {
        // Try primary provider
        if (primary === 'gemini') {
            return await generateSQLWithGemini(request);
        } else {
            return await generateSQLWithClaude(request);
        }
    } catch (primaryError) {
        console.warn(`Primary provider (${primary}) failed:`, primaryError);

        // Try fallback provider
        try {
            console.log(`Falling back to ${fallback}...`);
            if (fallback === 'gemini') {
                return await generateSQLWithGemini(request);
            } else {
                return await generateSQLWithClaude(request);
            }
        } catch (fallbackError) {
            // Both providers failed
            console.error(`Fallback provider (${fallback}) also failed:`, fallbackError);

            throw new Error(
                `Failed to generate SQL. Primary (${primary}): ${primaryError instanceof Error ? primaryError.message : 'Unknown error'
                }. Fallback (${fallback}): ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
                }`
            );
        }
    }
}

/**
 * Check if an LLM provider is configured
 */
export function isProviderConfigured(provider: LLMProvider): boolean {
    if (provider === 'gemini') {
        return !!process.env.GEMINI_API_KEY;
    } else if (provider === 'claude') {
        return !!process.env.CLAUDE_API_KEY;
    }
    return false;
}

/**
 * Get list of configured providers
 */
export function getConfiguredProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (isProviderConfigured('gemini')) providers.push('gemini');
    if (isProviderConfigured('claude')) providers.push('claude');
    return providers;
}
