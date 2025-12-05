// LLM prompt templates for SQL generation

/**
 * System prompt for SQL generation
 */
export const SQL_GENERATION_SYSTEM_PROMPT = `You are an expert PostgreSQL database assistant. Your task is to convert natural language questions into accurate, efficient SQL queries.

IMPORTANT RULES:
1. Generate ONLY SELECT queries - never INSERT, UPDATE, DELETE, DROP, or any data modification statements
2. Use the provided database schema to write accurate queries
3. Include appropriate JOINs when data from multiple tables is needed
4. Use proper column and table names exactly as they appear in the schema
5. Add LIMIT clause when appropriate to prevent excessive data retrieval
6. Use meaningful aliases for better readability
7. Handle NULL values appropriately
8. Use appropriate WHERE clauses based on the user's question

OUTPUT FORMAT:
Return your response in the following JSON format:
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": "Brief explanation of what the query does and why you structured it this way",
  "confidence": "high|medium|low"
}

Use "high" confidence when the question clearly maps to the schema.
Use "medium" when you made some assumptions.
Use "low" when the question is ambiguous or schema coverage is uncertain.

REMEMBER: Only output valid JSON, no additional text before or after.`;

/**
 * Build the user prompt with schema context
 */
export function buildUserPrompt(
    naturalLanguageQuery: string,
    schemaContext: string,
    previousQueries?: Array<{ nl: string; sql: string }>
): string {
    let prompt = `${schemaContext}\n\n`;

    if (previousQueries && previousQueries.length > 0) {
        prompt += 'PREVIOUS QUERIES FOR CONTEXT:\n';
        for (const q of previousQueries.slice(-3)) {
            prompt += `User: ${q.nl}\nSQL: ${q.sql}\n\n`;
        }
    }

    prompt += `USER QUESTION: ${naturalLanguageQuery}\n\n`;
    prompt += 'Generate the SQL query:';

    return prompt;
}

/**
 * Parse LLM response to extract SQL and metadata
 */
export function parseLLMResponse(response: string): {
    sql: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'low';
} {
    // Try to parse as JSON first
    try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = response.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr);

        return {
            sql: parsed.sql || '',
            explanation: parsed.explanation || 'No explanation provided',
            confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
                ? parsed.confidence
                : 'medium',
        };
    } catch {
        // Fallback: try to extract SQL from response
        const sqlMatch = response.match(/SELECT[\s\S]+?(?:;|$)/i);

        return {
            sql: sqlMatch ? sqlMatch[0].trim() : response,
            explanation: 'Extracted SQL from response',
            confidence: 'low',
        };
    }
}
