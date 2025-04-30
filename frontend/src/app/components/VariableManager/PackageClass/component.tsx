import React, { useState } from 'react';
import styles from '../component.module.css'; // Assuming it uses the same styles

interface PackageData {
    name: string;
    dataLength: number;
    iconData: {
        filename: string[];
        url: string[];
    };
    // Include dataId if needed for display or key
    dataId?: number;
}

interface DisplayPackageClassProps {
    packageItem: PackageData | null | undefined;
}

export const DisplayPackageClass: React.FC<DisplayPackageClassProps> = ({ packageItem }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 3; // Show fewer items per page for icon data

    if (!packageItem) {
        return <div className={styles.variableClassContainer}><span className={styles.noData}>No Data</span></div>;
    }

    const { name, dataLength, iconData, dataId } = packageItem;
    const filenames = iconData?.filename || [];
    const totalPages = Math.ceil(filenames.length / itemsPerPage);

    const currentFilenames = filenames.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    return (
        <div className={styles.variableClassContainer}> {/* Reuse container style */}
            <div className={styles.variableItems}> {/* Reuse item container style */}
                {/* Display Core Package Info */}
                <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>Name:</b><br />
                        <span style={{ fontSize: "10pt" }}>{name || "No Name"}</span>
                    </span>
                </div>
                 <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>ID:</b><br />
                        <span style={{ fontSize: "10pt" }}>{dataId ?? 'N/A'}</span>
                    </span>
                </div>
                <div className={styles.variableClassItem}>
                    <span className={styles.variableValue}>
                        <b>Item Count:</b><br />
                        <span style={{ fontSize: "10pt" }}>{dataLength ?? 0}</span>
                    </span>
                </div>

                {/* Display Filenames (Paginated) */}
                {filenames.length > 0 && (
                    <div className={styles.variableClassItem} style={{ gridColumn: '1 / -1' }}> {/* Span full width */}
                        <span className={styles.variableValue}>
                            <b>Filenames:</b><br />
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '9pt' }}>
                                {currentFilenames.map((filename, index) => (
                                    <li key={`${dataId}-fn-${currentPage}-${index}`}>{filename}</li>
                                ))}
                            </ul>
                        </span>
                    </div>
                )}
            </div>

            {/* Pagination for Filenames */}
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