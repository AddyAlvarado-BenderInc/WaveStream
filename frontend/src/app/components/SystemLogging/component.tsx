import React, { useEffect, useState, useRef } from "react";
import { signalRLogService } from "../../services/signalRService";
import styles from './component.module.css';

interface LogEntry {
    id: number;
    message: string;
    timestamp: string;
    status?: string;
}

interface FailedItem {
    task: string;
    productName: string;
}

interface LatestTaskInfo {
    taskId: string;
    productName?: string;
}

const SystemLogging: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [completedTasks, setCompletedTasks] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
    const [latestTaskInfo, setLatestTaskInfo] = useState<LatestTaskInfo | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const logIdCounter = useRef<number>(0);
    const [hide, setHide] = useState<boolean>(false);
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    const getLogDetails = (message: string): {
        status: string | null,
        productName: string | null,
        taskId: string | null,
        generalTaskId: string | null,
        generalProductName: string | null
    } => {
        let status: string | null = null;
        let productName: string | null = null;
        let saveTaskId: string | null = null;
        let generalTaskId: string | null = null;
        let generalProductName: string | null = null;

        const taskRegex = /(?:\[Task\s*(\d+)|Task\s*(\d+))/i;
        const taskMatch = message.match(taskRegex);
        if (taskMatch) {
            generalTaskId = taskMatch[1] || taskMatch[2];
        }

        if (generalTaskId) {
            const productForTaskRegex = new RegExp(`(?:Task\\s*${generalTaskId}[^']*'([^']*)'|Task\\s*${generalTaskId}.*for:\\s*([^\\n\\r]+))`, "i");
            const productMatch = message.match(productForTaskRegex);
            if (productMatch) {
                generalProductName = productMatch[1] || productMatch[2]?.trim();
            }
        }

        if (message.startsWith("[USER] SAVE_")) {
            status = message.substring("[USER] SAVE_".length).split(':')[0]?.trim().toUpperCase();

            if (status === "FAIL") {
                const failMatch = message.match(/At Task (\d+) with product '([^']*)'/i);
                if (failMatch && failMatch[1] && failMatch[2]) {
                    saveTaskId = failMatch[1];
                    productName = failMatch[2];
                    if (!generalTaskId) generalTaskId = saveTaskId;
                    if (!generalProductName) generalProductName = productName;
                } else {
                    const genericProductMatch = message.match(/Product '([^']*)'/i);
                    if (genericProductMatch && genericProductMatch[1]) {
                        productName = genericProductMatch[1];
                        if (!generalProductName) generalProductName = productName;
                    }
                }
            } else if (status === "SUCCESS") {
                const successMatch = message.match(/Product '([^']*)'/i);
                if (successMatch && successMatch[1]) {
                    productName = successMatch[1];
                    if (!generalProductName) generalProductName = productName;
                }
            }
        }

        if (!generalProductName && productName) {
            generalProductName = productName;
        }

        return { status, productName, taskId: saveTaskId, generalTaskId, generalProductName };
    };

    useEffect(() => {
        signalRLogService.onLogReceived = (logEntryMessage, timestamp) => {
            const { status, productName, taskId, generalTaskId, generalProductName } = getLogDetails(logEntryMessage);

            setLogs(prevLogs => {
                const newLogs = [
                    ...prevLogs,
                    { id: logIdCounter.current++, message: logEntryMessage, timestamp, status: status || undefined }
                ];
                return newLogs;
            });

            if (generalTaskId) {
                setLatestTaskInfo(prevInfo => {
                    if (!prevInfo || prevInfo.taskId !== generalTaskId || (prevInfo.taskId === generalTaskId && generalProductName && !prevInfo.productName)) {
                        return { taskId: generalTaskId, productName: generalProductName || prevInfo?.productName };
                    }
                    return prevInfo;
                });
            }

            if (status === "SUCCESS" && productName) {
                setCompletedTasks(prevCompleted => {
                    if (!prevCompleted.includes(productName)) {
                        return [...prevCompleted, productName];
                    }
                    return prevCompleted;
                });
            } else if (status === "FAIL" && productName && taskId) {
                setFailedItems(prevFailed => {
                    if (!prevFailed.some(item => item.task === taskId && item.productName === productName)) {
                        return [...prevFailed, { task: taskId, productName }];
                    }
                    return prevFailed;
                });
            } else if (status === "FAIL" && productName && !taskId) {
                setFailedItems(prevFailed => {
                    if (!prevFailed.some(item => item.productName === productName && item.task === "N/A")) {
                        return [...prevFailed, { task: "N/A", productName }];
                    }
                    return prevFailed;
                });
            }
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
        const container = logsContainerRef.current;
        if (container && !userScrolledUp) {
            setTimeout(() => {
                if (logsContainerRef.current && !userScrolledUp) {
                    logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [logs, userScrolledUp]);

    const handleScroll = () => {
        const container = logsContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
            if (isAtBottom) {
                setUserScrolledUp(false);
            } else {
                setUserScrolledUp(true);
            }
        }
    };

    const getLogEntryClass = (logStatus?: string): string => {
        if (!logStatus) return "";
        switch (logStatus) {
            case "SUCCESS": return styles.logSuccess;
            case "FAIL": return styles.logFail;
            case "WARN": return styles.logWarn;
            case "ATTEMPT": return styles.logAttempt;
            case "CANCELLED": return styles.logCancelled;
            default: return "";
        }
    };

    const triggerDownload = (content: string, filename: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        if (failedItems.length === 0) return;

        const header = "Task ID,Product Name\n";
        const csvRows = failedItems.map(item =>
            `${item.task},"${item.productName.replace(/"/g, '""')}"`
        );
        const csvContent = header + csvRows.join("\n");
        triggerDownload(csvContent, 'failed_items.csv', 'text/csv;charset=utf-8;');
    };

    const handleExportJSON = () => {
        if (failedItems.length === 0) return;

        const jsonContent = JSON.stringify(failedItems, null, 2);
        triggerDownload(jsonContent, 'failed_items.json', 'application/json;charset=utf-8;');
    };

    return (
        <div className={styles.loggingContainer}>
            <div className={styles.header}>
                <button className={styles.toggleButton} onClick={() => setHide(!hide)}>
                    <h1>System Logging | </h1>
                    <h1 className={styles.toggleText}>{hide ? "Hide" : "Show"} Logs</h1>
                </button>
                <div className={styles.rightHeader}>
                    <span className={isConnected ? styles.connected : styles.disconnected}>
                        {isConnected ? "● Connected" : "● Disconnected"}
                    </span>
                    {isConnected && (
                        <div className={styles.connectedInfo}>
                            {latestTaskInfo && (
                                <span className={styles.connectedText}>
                                    <span style={{ color: "white" }}>
                                        <strong>{completedTasks.length}</strong>
                                    </span>
                                    {" "} Saved
                                </span>
                            )}
                            {latestTaskInfo && (
                                <span className={styles.latestTaskText}>
                                    <span className={styles.latestTaskId}>
                                       @ <strong style={{ color: "white" }}>{latestTaskInfo.taskId}</strong> Tasks {" "}
                                        {failedItems.length > 0 && (
                                            <span className={styles.failedItemsCount}>
                                                w/ <strong style={{ color: "white" }}>{failedItems.length}</strong> Failed
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.taskProductName}>{latestTaskInfo.productName && `${latestTaskInfo.productName}`}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {hide && (
                <div className={styles.logger}>
                    <div className={styles.logsDisplay} ref={logsContainerRef} onScroll={handleScroll}>
                        {logs.map((log) => (
                            <div key={log.id} className={styles.logEntry}>
                                <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                                <pre className={`${styles.logMessage} ${getLogEntryClass(log.status)}`}>
                                    {log.message}
                                </pre>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                    <div className={styles.logButtonContainer}>
                        {logs.length > 0 && (
                            <button className={styles.clearButton} onClick={() => {
                                setLogs([]);
                                setFailedItems([]);
                                setCompletedTasks([]);
                                setLatestTaskInfo(null);
                                setUserScrolledUp(false);
                            }}>
                                Clear Logs & Data
                            </button>
                        )}
                        {userScrolledUp && logs.length > 0 && (
                            <button
                                className={userScrolledUp ? styles.scrollToBottomButton : styles.scrollToBottomHidden}
                                onClick={() => {
                                    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                    setUserScrolledUp(false);
                                }}
                            >
                                Scroll to Latest
                            </button>
                        )}
                    </div>
                    {logs.length === 0 && !isConnected && <p className={styles.waitingMessage}>Attempting to connect to logging server...</p>}
                    {logs.length === 0 && isConnected && <p className={styles.waitingMessage}>Connected. Waiting for log entries...</p>}

                    <div className={styles.failedItemsContainer}>
                        <div className={styles.failedItemsHeader}>
                            <h3>Failed Items | {failedItems.length}</h3>
                            {failedItems.length > 0 && (
                                <div className={styles.exportButtonsContainer}>
                                    <button onClick={handleExportCSV} className={styles.exportButton}>Export CSV</button>
                                    <button onClick={handleExportJSON} className={styles.exportButton}>Export JSON</button>
                                </div>
                            )}
                        </div>
                        {failedItems.length === 0 ? (
                            <p className={styles.noFailedItems}>No failed items recorded.</p>
                        ) : (
                            <div className={styles.failedItemsTable}>
                                {failedItems.map((item, index) => (
                                    <div key={index} className={styles.failedItemRow}>
                                        Task {item.task}: <strong style={{ marginLeft: '5px' }}>{item.productName}</strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
export default SystemLogging;