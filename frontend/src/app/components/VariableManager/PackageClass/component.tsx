import React, { useState } from 'react';
import styles from '../component.module.css';

interface PackageData {
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>;
    dataId?: number;
}

interface DisplayPackageClassProps {
    packageItem: PackageData | null | undefined;
}

export const DisplayPackageClass: React.FC<DisplayPackageClassProps> = ({ packageItem }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 3;

    if (!packageItem) {
        return <div className={styles.variableClassContainer}><span className={styles.noData}>No Data</span></div>;
    }

    const { name, dataLength, variableData, dataId } = packageItem;
    const variableDataValues = (variableData && typeof variableData === 'object')
        ? Object.values(variableData)
        : []; 

    const filenames = variableDataValues
        .filter(item => item && item.value && Array.isArray(item.value.filename))
        .map(item => item!.value.filename)
        .flat(); 

    const totalPages = Math.ceil(filenames.length / itemsPerPage);

    const currentFilenames = filenames.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    return (
        <div className={styles.variableClassContainer}>
            <div className={styles.variableItems}>
                <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>dataId:</b><br />
                        <span style={{ fontSize: "10pt" }}>{dataId ?? 'N/A'}</span>
                    </span>
                </div>
                <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>Name:</b><br />
                        <span style={{ fontSize: "10pt" }}>{name || "No Name"}</span>
                    </span>
                </div>
                <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>Item Count:</b><br />
                        <span style={{ fontSize: "10pt" }}>{dataLength ?? 0}</span>
                    </span>
                </div>

                {filenames.length > 0 && (
                    <div className={styles.variableClassItem} style={{ gridColumn: '1 / -1' }}>
                        <span className={styles.variableValue}>
                            <b>Filenames:</b><br />
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12pt' }}>
                                {currentFilenames.map((filename, index) => (
                                    <li key={`${dataId}-fn-${currentPage}-${index}`}>{filename}</li>
                                ))}
                            </ul>
                        </span>
                    </div>
                )}
            </div>

            {filenames.length > itemsPerPage && (
                <div className={styles.paginationControls}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className={styles.pageButton}
                    >
                        &lt; Prev Files
                    </button>
                    <span className={styles.pageIndicator}>
                        Files {currentPage * itemsPerPage + 1}-
                        {Math.min((currentPage + 1) * itemsPerPage, filenames.length)} of {filenames.length}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage === totalPages - 1}
                        className={styles.pageButton}
                    >
                        Next Files &gt;
                    </button>
                </div>
            )}
        </div>
    );
};