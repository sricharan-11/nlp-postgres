'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import ChatbotPopup from './components/ChatbotPopup';

// Types
interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    isPrimary: boolean;
  }>;
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

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // Check connection on mount
  useEffect(() => {
    checkConnection();
    fetchSchema();
  }, []);

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

  const getStatusClass = () => {
    if (!connectionStatus) return 'loading';
    return connectionStatus.database.connected ? 'connected' : 'disconnected';
  };

  return (
    <div className={styles.container}>
      {/* Sidebar - Unchanged for portability */}
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

      {/* Main Content Area - Your Product Content Goes Here */}
      <main className={styles.mainContent}>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderCard}>
            <span className={styles.placeholderIcon}>🏠</span>
            <h2>Your Product Dashboard</h2>
            <p>
              This is a placeholder for your main product content.
              The NLP-to-SQL chatbot is accessible via the floating button in the bottom-right corner.
            </p>
            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <span>💬</span>
                <span>Click the purple chat button to open the SQL assistant</span>
              </div>
              <div className={styles.featureItem}>
                <span>📊</span>
                <span>Use the sidebar to explore database schema</span>
              </div>
              <div className={styles.featureItem}>
                <span>🔮</span>
                <span>Ask questions in plain English to generate SQL</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot Popup - Portable Component */}
      <ChatbotPopup />
    </div>
  );
}
