import React, { useEffect, useState, useRef } from "react";
import { signalRLogService } from "../../services/signalRService";
import styles from './component.module.css';

interface LogEntry {
    id: number;
    message: string;
    timestamp: string;
}

const SystemLogging: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logIdCounter = useRef<number>(0);

    useEffect(() => {
        signalRLogService.onLogReceived = (logEntryMessage, timestamp) => {
            setLogs(prevLogs => [
                ...prevLogs,
                { id: logIdCounter.current++, message: logEntryMessage, timestamp }
            ]);
        };

        signalRLogService.onConnectionStateChanged = (connectionState) => {
            setIsConnected(connectionState);
        };

        if (signalRLogService.getConnectionState() !== "Connected") {
            signalRLogService.startConnection();
        } else {
            setIsConnected(true);
        }

        return () => {

            signalRLogService.onLogReceived = null;
            signalRLogService.onConnectionStateChanged = null;
        };
    }, []);

    useEffect(() => {

        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className={styles.loggingContainer}>
            <div className={styles.header}>
                <h1>System Logging</h1>
                <span className={isConnected ? styles.connected : styles.disconnected}>
                    {isConnected ? "● Connected" : "● Disconnected"}
                </span>
            </div>
            {logs.length === 0 ? (
                <p className={styles.waitingMessage}>Waiting for log entries...</p>
            ) : (
                <div className={styles.logsDisplay}>
                    <div className={styles.logCount}>
                        {logs.map((log) => (
                            <div key={log.id} className={styles.logEntry}>
                                <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                                <pre className={styles.logMessage}>{log.message}</pre>
                            </div>
                        ))}
                    </div>
                    <div ref={logsEndRef} />
                </div>
            )}
        </div>
    );
}
export default SystemLogging;