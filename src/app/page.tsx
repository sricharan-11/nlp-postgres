'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import styles from './page.module.css';

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
  'What are the top selling products?',
  'Count orders by status',
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
    fetchSchema();
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

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/schema');
      const data = await res.json();
      if (data.success && data.data.tables) {
        setSchema(data.data.tables);
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error);
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

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusClass = () => {
    if (!connectionStatus) return 'loading';
    return connectionStatus.database.connected ? 'connected' : 'disconnected';
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1>NLP to SQL</h1>
        </div>

        <div className={styles.sidebarContent}>
          {/* Connection Status */}
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${styles[getStatusClass()]}`} />
            <span>
              {!connectionStatus
                ? 'Checking...'
                : connectionStatus.database.connected
                  ? `Connected: ${connectionStatus.database.database}`
                  : 'Disconnected'}
            </span>
          </div>

          {/* Schema Explorer */}
          <div className={styles.schemaSection}>
            <h3>Database Schema</h3>
            {schema.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                No tables found
              </p>
            ) : (
              schema.map((table) => (
                <div
                  key={table.name}
                  className={`${styles.tableItem} ${expandedTables.has(table.name) ? styles.expanded : ''
                    }`}
                >
                  <div
                    className={styles.tableName}
                    onClick={() => toggleTable(table.name)}
                  >
                    <span className={styles.tableIcon}>📊</span>
                    {table.name}
                  </div>
                  {expandedTables.has(table.name) && (
                    <div className={styles.columnList}>
                      {table.columns.map((col) => (
                        <div key={col.name} className={styles.columnItem}>
                          {col.name}
                          <span className={styles.columnType}>{col.type}</span>
                          {col.isPrimary && (
                            <span className={styles.pkBadge}>PK</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Chat Area */}
        <div className={styles.chatArea}>
          {messages.length === 0 ? (
            <div className={styles.welcomeMessage}>
              <h2>Query Your Database</h2>
              <p>
                Ask questions in plain English and get SQL queries and results
                instantly. Powered by AI.
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
                <div className={styles.messageContent}>
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
                                  {msg.result.confidence} confidence
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
                                      .slice(0, 50)
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
                <div className={styles.messageMeta}>
                  <span>
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                  {msg.result && (
                    <span>{msg.result.provider} / {msg.result.model}</span>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner} />
              <span>Generating SQL and executing query...</span>
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
              placeholder="Ask a question about your data..."
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
                  Processing
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
