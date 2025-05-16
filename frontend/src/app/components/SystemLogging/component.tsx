import React, { useEffect, useState, useRef } from "react";
import { signalRLogService } from "../../services/signalRService";
import {
    setCurrentTask,
    addSavedTask,
    addFailedTask,
    setBatchTasks,
    clearAllTasks,
} from "@/app/store/productManagerSlice";
import { useDispatch } from "react-redux";
import styles from "./component.module.css";

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

interface ErrorItem {
    task: string;
    productName: string;
    message: string;
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
    const [errorItems, setErrorItems] = useState<ErrorItem[]>([]);
    const [skippedItems, setSkippedItems] = useState<string[]>([]);
    const [latestTaskInfo, setLatestTaskInfo] = useState<LatestTaskInfo | null>(
        null
    );
    const [latestBatchInfo, setLatestBatchInfo] = useState<LatestTaskInfo | null>(
        null
    );
    const [concurrentThreads, setConcurrentThreads] = useState<number | null>(
        null
    );
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const logIdCounter = useRef<number>(0);
    const [hide, setHide] = useState<boolean>(false);
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    const dispatch = useDispatch();

    const [automationStartTime, setAutomationStartTime] = useState<number | null>(
        null
    );
    const [automationEndTime, setAutomationEndTime] = useState<number | null>(
        null
    );
    const [displayedElapsedTime, setDisplayedElapsedTime] =
        useState<string>("00:00:00");

    const [searchTerm, setSearchTerm] = useState<string>("");

    const getLogDetails = (
        message: string
    ): {
        status: string | null;
        productName: string | null;
        taskId: string | null;
        generalTaskId: string | null;
        generalProductName: string | null;
        threads: number | null;
    } => {
        let status: string | null = null;
        let productName: string | null = null;
        let saveTaskId: string | null = null;
        let generalTaskId: string | null = null;
        let generalProductName: string | null = null;
        let threads: number | null = null;

        const automationCompletedRegex =
            /^\[Automation Completed\] Automation run finished\. Products processed \(attempted save or skipped\): \d+\. Products successfully saved: \d+\.?$/i;
        if (automationCompletedRegex.test(message)) {
            status = "AUTOMATION_SUMMARY";
        }

        const concurrentTasksRegex =
            /\[Automation\] Total products to process: \d+\. Max concurrent processing tasks: (\d+)/i;
        const concurrentMatch = message.match(concurrentTasksRegex);
        if (concurrentMatch && concurrentMatch[1]) {
            threads = parseInt(concurrentMatch[1], 10);
        }

        const specificSkippedErrorRegex =
            /\[Automation\] \[Task (\d+)\] \[Error\] Product ([^ ]+) was skipped or failed processing before save/i;
        const specificSkippedMatch = message.match(specificSkippedErrorRegex);

        if (specificSkippedMatch) {
            status = "SKIPPED_ITEM";
            generalTaskId = specificSkippedMatch[1];
            generalProductName = specificSkippedMatch[2];
        } else {
            const errorLogRegex = /\[Error\]/i;
            if (errorLogRegex.test(message)) {
                status = "ERROR_LOG";
            }
        }

        if (status !== "SKIPPED_ITEM") {
            const skippedLogPhraseRegex = /Skipped Task \d+ for product '([^']*)'/i;
            const oldSkippedMatch = message.match(skippedLogPhraseRegex);
            if (oldSkippedMatch) {
                status = "SKIPPED";
            }
        }

        if (!generalTaskId) {
            const taskRegex = /(?:\[Task\s*(\d+)|Task\s*(\d+))/i;
            const taskMatch = message.match(taskRegex);
            if (taskMatch) {
                generalTaskId = taskMatch[1] || taskMatch[2];
            }
        }

        if (generalTaskId && !generalProductName) {
            const productForTaskRegex = new RegExp(
                `(?:Task\\s*${generalTaskId}[^']*'([^']*)'|Task\\s*${generalTaskId}.*for:\\s*([^\\n\\r]+))`,
                "i"
            );
            const productMatch = message.match(productForTaskRegex);
            if (productMatch) {
                generalProductName = productMatch[1] || productMatch[2]?.trim();
            }
        }

        if (message.startsWith("[USER] SAVE_") && status !== "AUTOMATION_SUMMARY") {
            const saveStatus = message
                .substring("[USER] SAVE_".length)
                .split(":")[0]
                ?.trim()
                .toUpperCase();

            if (status !== "SKIPPED_ITEM" && status !== "ERROR_LOG") {
                status = saveStatus;
            }

            if (saveStatus === "FAIL") {
                const failMatch = message.match(
                    /At Task (\d+) with product '([^']*)'/i
                );
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
            } else if (saveStatus === "SUCCESS") {
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

        return {
            status,
            productName,
            taskId: saveTaskId,
            generalTaskId,
            generalProductName,
            threads,
        };
    };

    const formatElapsedTime = (ms: number): string => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0"
        )}:${String(seconds).padStart(2, "0")}`;
    };

    useEffect(() => {
        let intervalId: NodeJS.Timeout | undefined = undefined;

        if (automationStartTime !== null) {
            intervalId = setInterval(() => {
                const endTime = automationEndTime || Date.now();
                const elapsed = endTime - automationStartTime;
                setDisplayedElapsedTime(formatElapsedTime(elapsed));
            }, 1000);
        } else {
            setDisplayedElapsedTime("00:00:00");
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [automationStartTime, automationEndTime]);

    useEffect(() => {
        signalRLogService.onLogReceived = (logEntryMessage, timestamp) => {
            const {
                status,
                productName,
                taskId,
                generalTaskId,
                generalProductName,
                threads,
            } = getLogDetails(logEntryMessage);

            setAutomationStartTime((prevStartTime) => {
                if (prevStartTime === null) {
                    setAutomationEndTime(null);
                    dispatch(clearAllTasks());
                    setConcurrentThreads(null);
                    return Date.now();
                }
                return prevStartTime;
            });

            if (status === "AUTOMATION_SUMMARY") {
                setAutomationEndTime(Date.now());
                dispatch(setCurrentTask(0));
                dispatch(setBatchTasks([]));
            }

            setLogs((prevLogs) => {
                const newLogs = [
                    ...prevLogs,
                    {
                        id: logIdCounter.current++,
                        message: logEntryMessage,
                        timestamp,
                        status: status || undefined,
                    },
                ];
                return newLogs;
            });

            if (threads !== null) {
                setConcurrentThreads(threads);
            }

            if (generalTaskId) {
                const numericGeneralTaskId = parseInt(generalTaskId, 10);
                if (!isNaN(numericGeneralTaskId)) {
                    dispatch(setCurrentTask(numericGeneralTaskId));

                    if (status === "SUCCESS") {
                        dispatch(addSavedTask(numericGeneralTaskId));
                    }

                    if (status === "FAIL") {
                        dispatch(addFailedTask(numericGeneralTaskId));
                    }

                    dispatch(setBatchTasks([numericGeneralTaskId]));
                }
            }

            if (generalTaskId) {
                setLatestTaskInfo((prevInfo) => {
                    if (
                        !prevInfo ||
                        prevInfo.taskId !== generalTaskId ||
                        (prevInfo.taskId === generalTaskId &&
                            generalProductName &&
                            !prevInfo.productName)
                    ) {
                        return {
                            taskId: generalTaskId,
                            productName: generalProductName || prevInfo?.productName,
                        };
                    }
                    return prevInfo;
                });
                setLatestBatchInfo((prevInfo) => {
                    if (!generalTaskId) {
                        return prevInfo;
                    }
                    const currentNumericTaskId = parseInt(generalTaskId, 10);
                    if (isNaN(currentNumericTaskId)) {
                        return prevInfo;
                    }
                    if (!prevInfo) {
                        return {
                            taskId: generalTaskId,
                            productName: generalProductName ?? undefined,
                        };
                    }
                    const prevNumericTaskId = parseInt(prevInfo.taskId, 10);
                    if (isNaN(prevNumericTaskId)) {
                        return {
                            taskId: generalTaskId,
                            productName: generalProductName ?? undefined,
                        };
                    }
                    if (currentNumericTaskId > prevNumericTaskId) {
                        return {
                            taskId: generalTaskId,
                            productName: generalProductName ?? undefined,
                        };
                    } else if (currentNumericTaskId === prevNumericTaskId) {
                        return {
                            taskId: generalTaskId,
                            productName:
                                generalProductName !== undefined && generalProductName !== null
                                    ? generalProductName
                                    : prevInfo.productName,
                        };
                    }
                    return prevInfo;
                });
            }

            if (status === "SKIPPED_ITEM" && generalTaskId && generalProductName) {
                setSkippedItems((prevSkipped) => {
                    if (!prevSkipped.includes(generalProductName)) {
                        return [...prevSkipped, generalProductName];
                    }
                    return prevSkipped;
                });
            } else if (status === "SUCCESS" && productName) {
                setCompletedTasks((prevCompleted) => {
                    if (!prevCompleted.includes(productName)) {
                        return [...prevCompleted, productName];
                    }
                    return prevCompleted;
                });
            } else if (status === "FAIL" && productName && taskId) {
                setFailedItems((prevFailed) => {
                    if (
                        !prevFailed.some(
                            (item) => item.task === taskId && item.productName === productName
                        )
                    ) {
                        return [...prevFailed, { task: taskId, productName }];
                    }
                    return prevFailed;
                });
            } else if (status === "FAIL" && productName && !taskId) {
                setFailedItems((prevFailed) => {
                    if (
                        !prevFailed.some(
                            (item) => item.productName === productName && item.task === "N/A"
                        )
                    ) {
                        return [...prevFailed, { task: "N/A", productName }];
                    }
                    return prevFailed;
                });
            } else if (status === "ERROR_LOG") {
                const taskForError = generalTaskId || "N/A";
                const productForError = generalProductName || "Unknown Product";
                setErrorItems((prevErrorItems) => {
                    if (
                        !prevErrorItems.some(
                            (item) =>
                                item.task === taskForError &&
                                item.productName === productForError &&
                                item.message === logEntryMessage
                        )
                    ) {
                        return [
                            ...prevErrorItems,
                            {
                                task: taskForError,
                                productName: productForError,
                                message: logEntryMessage,
                            },
                        ];
                    }
                    return prevErrorItems;
                });
            } else if (status === "SKIPPED" && generalProductName) {
                setSkippedItems((prevSkipped) => {
                    if (!prevSkipped.includes(generalProductName)) {
                        return [...prevSkipped, generalProductName];
                    }
                    return prevSkipped;
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
    }, [dispatch]);

    useEffect(() => {
        const container = logsContainerRef.current;
        if (container && !userScrolledUp) {
            setTimeout(() => {
                if (logsContainerRef.current && !userScrolledUp) {
                    logsContainerRef.current.scrollTop =
                        logsContainerRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [logs, userScrolledUp]);

    const handleScroll = () => {
        const container = logsContainerRef.current;
        if (container) {
            const isAtBottom =
                container.scrollHeight - container.scrollTop <=
                container.clientHeight + 10;
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
            case "SUCCESS":
                return styles.logSuccess;
            case "FAIL":
                return styles.logFail;
            case "WARN":
                return styles.logWarn;
            case "ATTEMPT":
                return styles.logAttempt;
            case "CANCELLED":
                return styles.logCancelled;
            case "AUTOMATION_SUMMARY":
                return styles.logAutomationSummary;
            case "ERROR_LOG":
                return styles.logErrorHighlight;
            default:
                return "";
        }
    };

    const triggerDownload = (
        content: string,
        filename: string,
        contentType: string
    ) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
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
        const csvRows = failedItems.map(
            (item) => `${item.task},"${item.productName.replace(/"/g, '""')}"`
        );
        const csvContent = header + csvRows.join("\n");
        triggerDownload(csvContent, "failed_items.csv", "text/csv;charset=utf-8;");
    };

    const handleExportJSON = () => {
        if (failedItems.length === 0) return;

        const jsonContent = JSON.stringify(failedItems, null, 2);
        triggerDownload(
            jsonContent,
            "failed_items.json",
            "application/json;charset=utf-8;"
        );
    };

    const filteredLogs = logs.filter((log) =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.loggingContainer}>
            <div className={styles.header}>
                <button className={styles.toggleButton} onClick={() => setHide(!hide)}>
                    <h1>System Logging | </h1>
                    <h1 className={styles.toggleText}>{hide ? "Hide" : "Show"} Logs</h1>
                </button>
                <div className={styles.rightHeader}>
                    <span
                        className={isConnected ? styles.connected : styles.disconnected}
                    >
                        {isConnected ? "● Connected" : "● Disconnected"}
                    </span>
                    {isConnected && (
                        <div className={styles.connectedInfo}>
                            {latestTaskInfo && (
                                <span className={styles.connectedText}>
                                    <span style={{ color: "white" }}>
                                        <strong>{completedTasks.length}</strong>
                                    </span>{" "}
                                    Saved
                                    {skippedItems.length > 0 && (
                                        <span className={styles.skippedItemsCount}>
                                            |{" "}
                                            <strong style={{ color: "white" }}>
                                                {skippedItems.length}
                                            </strong>{" "}
                                            Skipped
                                        </span>
                                    )}
                                    {/* Display Concurrent Threads */}
                                    {concurrentThreads !== null && (
                                        <span className={styles.threadsCount}>
                                            |{" "}
                                            <strong style={{ color: "white" }}>
                                                {concurrentThreads}
                                            </strong>{" "}
                                            Threads
                                        </span>
                                    )}
                                </span>
                            )}
                            {latestTaskInfo && (
                                <span className={styles.latestTaskText}>
                                    <span className={styles.latestTaskId}>
                                        @{" "}
                                        <strong style={{ color: "white" }}>
                                            {latestTaskInfo.taskId}
                                        </strong>{" "}
                                        from{" "}
                                        <strong style={{ color: "white" }}>
                                            {latestBatchInfo?.taskId}
                                        </strong>{" "}
                                        Tasks
                                        {failedItems.length > 0 && (
                                            <span className={styles.failedItemsCount}>
                                                w/{" "}
                                                <strong style={{ color: "white" }}>
                                                    {failedItems.length}
                                                </strong>{" "}
                                                Failed
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.taskProductName}>
                                        {latestTaskInfo.productName &&
                                            `${latestTaskInfo.productName}`}
                                    </span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {hide && (
                <div className={styles.logger}>
                    <div className={styles.logSearchContainer}>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className={styles.logSearchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div
                        className={styles.logsDisplay}
                        ref={logsContainerRef}
                        onScroll={handleScroll}
                    >
                        {filteredLogs.map((log) => (
                            <div key={log.id} className={styles.logEntry}>
                                <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                                <pre
                                    className={`${styles.logMessage} ${getLogEntryClass(
                                        log.status
                                    )}`}
                                >
                                    {log.message}
                                </pre>
                            </div>
                        ))}
                        {filteredLogs.length === 0 && logs.length > 0 && (
                            <p className={styles.noSearchResults}>
                                No logs match your search criteria.
                            </p>
                        )}
                        <div ref={logsEndRef} />
                    </div>
                    <div className={styles.logBottomSection}>
                        <div className={styles.logButtonContainer}>
                            {logs.length > 0 && (
                                <button
                                    className={styles.clearButton}
                                    onClick={() => {
                                        setLogs([]);
                                        setFailedItems([]);
                                        setErrorItems([]);
                                        setCompletedTasks([]);
                                        setSkippedItems([]);
                                        setConcurrentThreads(null);
                                        setLatestTaskInfo(null);
                                        setLatestBatchInfo(null);
                                        setUserScrolledUp(false);
                                        setAutomationStartTime(null);
                                        setAutomationEndTime(null);
                                        dispatch(clearAllTasks());
                                    }}
                                >
                                    Clear Logs & Data
                                </button>
                            )}
                            {userScrolledUp && logs.length > 0 && (
                                <button
                                    className={
                                        userScrolledUp
                                            ? styles.scrollToBottomButton
                                            : styles.scrollToBottomHidden
                                    }
                                    onClick={() => {
                                        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                        setUserScrolledUp(false);
                                    }}
                                >
                                    Scroll to Latest
                                </button>
                            )}
                        </div>
                        <div className={styles.timerContainer}>
                            <span className={styles.timerText}>Elapsed Time - </span>
                            <span className={styles.timerValue}>
                                <strong>{displayedElapsedTime}</strong>
                            </span>
                        </div>
                    </div>
                    {logs.length === 0 && !isConnected && (
                        <p className={styles.waitingMessage}>
                            Attempting to connect to logging server...
                        </p>
                    )}
                    {logs.length === 0 && isConnected && (
                        <p className={styles.waitingMessage}>
                            Connected. Waiting for log entries...
                        </p>
                    )}

                    <div className={styles.failedItemsContainer}>
                        <div className={styles.failedItemsHeader}>
                            <h3>Failed Items | {failedItems.length}</h3>
                            {failedItems.length > 0 && (
                                <div className={styles.exportButtonsContainer}>
                                    <button
                                        onClick={handleExportCSV}
                                        className={styles.exportButton}
                                    >
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={handleExportJSON}
                                        className={styles.exportButton}
                                    >
                                        Export JSON
                                    </button>
                                </div>
                            )}
                        </div>
                        {failedItems.length === 0 ? (
                            <p className={styles.noFailedItems}>No failed items recorded.</p>
                        ) : (
                            <div className={styles.failedItemsTable}>
                                {failedItems.map((item, index) => (
                                    <div key={index} className={styles.failedItemRow}>
                                        Task {item.task}:{" "}
                                        <strong style={{ marginLeft: "5px" }}>
                                            {item.productName}
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.errorItemsContainer}>
                        <div className={styles.errorItemsHeader}>
                            <h3 className={errorItems.length > 0 ? styles.hasErrors : ""}>
                                Detected Errors |{" "}
                                <span
                                    className={errorItems.length > 0 ? styles.errorCount : ""}
                                >
                                    {errorItems.length}
                                </span>
                            </h3>
                        </div>
                        {errorItems.length === 0 ? (
                            <p className={styles.noErrorItems}>No specific errors flagged.</p>
                        ) : (
                            <div className={styles.errorItemsTable}>
                                {errorItems.map((item, index) => (
                                    <div key={index} className={styles.errorItemRow}>
                                        Task {item.task}:{" "}
                                        <strong style={{ marginLeft: "5px" }}>
                                            {item.productName}
                                        </strong>
                                        <span className={styles.errorItemMessage}>
                                            {item.message.substring(0, 100)}...
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default SystemLogging;
