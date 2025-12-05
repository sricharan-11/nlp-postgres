'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import styles from './ChatbotPopup.module.css';

// Types
interface TableSchema {
    name: string;
    columns: Array<{
        name: string;
        type: string;
        isPrimary: boolean;
    }>;
}

interface QueryResult {
    query: string;
    sql: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'low';
    provider: string;
    model: string;
    results: Record<string, unknown>[];
    rowCount: number;
    fields: Array<{ name: string }>;
    executionTime: number;
}

interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    result?: QueryResult;
    error?: string;
    timestamp: Date;
}

interface ConnectionStatus {
    database: {
        connected: boolean;
        database: string | null;
        error: string | null;
    };
    llm: {
        configuredProviders: string[];
        hasProvider: boolean;
    };
}

// Example queries for the welcome screen
const EXAMPLE_QUERIES = [
    'Show me all tables',
    'List the first 10 customers',
    'Count orders by status',
];

export default function ChatbotPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Check connection on mount
    useEffect(() => {
        checkConnection();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const checkConnection = async () => {
        try {
            const res = await fetch('/api/connection');
            const data = await res.json();
            if (data.success) {
                setConnectionStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to check connection:', error);
        }
    };

    const handleSubmit = async (query?: string) => {
        const queryText = query || input.trim();
        if (!queryText || isLoading) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: queryText,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryText }),
            });

            const data = await res.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.success ? data.data.explanation : data.error,
                result: data.success ? data.data : undefined,
                error: data.success ? undefined : data.error,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Failed to process query',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusClass = () => {
        if (!connectionStatus) return 'loading';
        return connectionStatus.database.connected ? 'connected' : 'disconnected';
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                className={`${styles.chatButton} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open chat"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Popup Window */}
            {isOpen && (
                <div className={styles.popupOverlay}>
                    <div className={styles.popupContainer}>
                        {/* Header */}
                        <div className={styles.popupHeader}>
                            <div className={styles.headerTitle}>
                                <span className={styles.headerIcon}>🔮</span>
                                <h3>NLP to SQL Assistant</h3>
                            </div>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsOpen(false)}
                                aria-label="Close chat"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Status Bar */}
                        <div className={styles.statusBar}>
                            <span className={`${styles.statusDot} ${styles[getStatusClass()]}`} />
                            <span>
                                {!connectionStatus
                                    ? 'Connecting...'
                                    : connectionStatus.database.connected
                                        ? `Connected: ${connectionStatus.database.database}`
                                        : 'Disconnected'}
                            </span>
                        </div>

                        {/* Message List */}
                        <div className={styles.messageList}>
                            {messages.length === 0 ? (
                                <div className={styles.welcomeScreen}>
                                    <span className={styles.welcomeIcon}>🗃️</span>
                                    <h4>Query Your Database</h4>
                                    <p>
                                        Ask questions in plain English and get SQL queries and results instantly.
                                    </p>
                                    <div className={styles.exampleQueries}>
                                        {EXAMPLE_QUERIES.map((q) => (
                                            <button
                                                key={q}
                                                className={styles.exampleQuery}
                                                onClick={() => handleSubmit(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.message} ${styles[msg.type]}`}
                                    >
                                        <div className={styles.messageBubble}>
                                            {msg.type === 'user' ? (
                                                msg.content
                                            ) : msg.error ? (
                                                <div className={styles.errorMessage}>{msg.error}</div>
                                            ) : (
                                                <>
                                                    <p>{msg.content}</p>

                                                    {msg.result && (
                                                        <>
                                                            {/* SQL Display */}
                                                            <div className={styles.sqlContainer}>
                                                                <div className={styles.sqlHeader}>
                                                                    <span className={styles.sqlLabel}>
                                                                        Generated SQL
                                                                    </span>
                                                                    <button
                                                                        className={styles.copyBtn}
                                                                        onClick={() =>
                                                                            copyToClipboard(msg.result!.sql)
                                                                        }
                                                                    >
                                                                        📋 Copy
                                                                    </button>
                                                                </div>
                                                                <pre className={styles.sqlCode}>
                                                                    {msg.result.sql}
                                                                </pre>
                                                            </div>

                                                            {/* Results Table */}
                                                            {msg.result.results.length > 0 && (
                                                                <div className={styles.resultsContainer}>
                                                                    <div className={styles.resultsHeader}>
                                                                        <span className={styles.resultsCount}>
                                                                            {msg.result.rowCount} rows •{' '}
                                                                            {msg.result.executionTime}ms
                                                                        </span>
                                                                        <span
                                                                            className={`${styles.confidenceBadge} ${styles[msg.result.confidence]
                                                                                }`}
                                                                        >
                                                                            {msg.result.confidence}
                                                                        </span>
                                                                    </div>
                                                                    <div className={styles.resultsTableWrapper}>
                                                                        <table className={styles.resultsTable}>
                                                                            <thead>
                                                                                <tr>
                                                                                    {msg.result.fields.map((f) => (
                                                                                        <th key={f.name}>{f.name}</th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {msg.result.results
                                                                                    .slice(0, 20)
                                                                                    .map((row, i) => (
                                                                                        <tr key={i}>
                                                                                            {msg.result!.fields.map((f) => (
                                                                                                <td key={f.name}>
                                                                                                    {String(
                                                                                                        row[f.name] ?? 'NULL'
                                                                                                    )}
                                                                                                </td>
                                                                                            ))}
                                                                                        </tr>
                                                                                    ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <span className={styles.messageTime}>
                                            {formatTime(msg.timestamp)}
                                            {msg.result && (
                                                <span className={styles.providerBadge}>
                                                    {' '}• {msg.result.provider}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className={styles.loadingIndicator}>
                                    <div className={styles.spinner} />
                                    <span>Generating SQL...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className={styles.inputArea}>
                            <div className={styles.inputContainer}>
                                <input
                                    type="text"
                                    className={styles.queryInput}
                                    placeholder="Ask about your data..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                />
                                <button
                                    className={styles.submitBtn}
                                    onClick={() => handleSubmit()}
                                    disabled={isLoading || !input.trim()}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className={styles.spinner} />
                                        </>
                                    ) : (
                                        'Send'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
