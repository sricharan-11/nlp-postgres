// LLM TypeScript type definitions

export type LLMProvider = 'gemini' | 'claude';

export interface LLMConfig {
    provider: LLMProvider;
    apiKey: string;
    model?: string;
}

export interface SQLGenerationRequest {
    naturalLanguageQuery: string;
    schemaContext: string;
    previousQueries?: Array<{
        nl: string;
        sql: string;
    }>;
}

export interface SQLGenerationResponse {
    sql: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'low';
    provider: LLMProvider;
    model: string;
}

export interface LLMError {
    provider: LLMProvider;
    message: string;
    code?: string;
}
