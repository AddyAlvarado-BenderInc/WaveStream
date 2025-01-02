import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import styles from "./component.module.css";

interface Description {
    id: string;
    name: string;
    html: string;
    css: string;
    js: string;
}

type DescriptionProp = string | Description[];

interface AdvancedDescriptionProps {
    description: DescriptionProp;
    initialJS: string;
    initialHTML: string;
    initialCSS: string;
    descriptionName: string;
    onDescriptionName: (name: string) => void;
    onUpdate: (field: string, value: string) => void;
    handleFieldSelect: (field: string) => void;
    handleSaveButton: (name: string, html: string, css: string, js: string) => void;
    handleClearButton: () => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    description,
    initialJS,
    initialCSS,
    initialHTML,
    descriptionName,
    onDescriptionName,
    onUpdate,
    handleFieldSelect,
    handleSaveButton,
    handleClearButton,
}) => {
    const [activeTab, setActiveTab] = useState<"Javascript" | "CSS" | "HTML">("HTML");
    const [showModal, setShowModal] = useState(false);
    const [descriptionModal, setDescriptionModal] = useState(false);
    const [descriptionList, setDescriptionList] = useState<Description[]>([]);
    const [name, setName] = useState(descriptionName || "");
    const [js, setJs] = useState(initialJS || '');
    const [css, setCss] = useState(initialCSS || '');
    const [html, setHtml] = useState(initialHTML || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const configIcon = "◉";

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        onDescriptionName(newName);
    };

    const generateCombinedHTML = () => `
    <html>
        <head><style>${css || ""}</style></head>
        <body>${html}<script>${js || ""}</script></body>
    </html>
    `;

    const handleIconClick = (e: React.MouseEvent, field: string) => {
        e.stopPropagation();

        const camelCaseField = field
            .split(' ')
            .map((word, index) =>
                index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

        handleFieldSelect(camelCaseField);
    };

    const updateIframe = () => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
            iframe.contentDocument.open();
            iframe.contentDocument.write(generateCombinedHTML());
            iframe.contentDocument.close();
        }
    };

    useEffect(() => {
        updateIframe();
        const combinedHTML = generateCombinedHTML();
        onUpdate('description', combinedHTML);
    }, [html, css, js]);

    const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, updateState: (value: string) => void) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const { selectionStart, selectionEnd, value } = textarea;

            const newValue = value.substring(0, selectionStart) + "\t" + value.substring(selectionEnd);
            updateState(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
            }, 0);
        }
    };

    const renderEditor = () => {
        switch (activeTab) {
            case "Javascript":
                return (
                    <textarea
                        className={styles.textarea}
                        value={js}
                        onChange={(e) => {
                            const value = e.target.value;
                            setJs(value);
                            onUpdate("js", value);
                        }}
                        onKeyDown={(e) => handleTabKey(e, setJs)}
                        placeholder="Write JavaScript code here..."
                    />
                );
            case "CSS":
                return (
                    <textarea
                        className={styles.textarea}
                        value={css}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCss(value);
                            onUpdate("css", value);
                        }}
                        onKeyDown={(e) => handleTabKey(e, setCss)}
                        placeholder="Write CSS code here..."
                    />
                );
            case "HTML":
                return (
                    <textarea
                        className={styles.textarea}
                        value={html}
                        onChange={(e) => {
                            const value = e.target.value;
                            setHtml(value);
                            onUpdate("html", value);
                        }}
                        onKeyDown={(e) => handleTabKey(e, setHtml)}
                        placeholder="Write HTML code here..."
                    />
                );
            default:
                return null;
        }
    };

    const fetchDescription = async ({
        descriptionId,
        name,
    }: { descriptionId?: string; name?: string } = {}): Promise<Description[] | Description> => {
        try {
            let query = [];
            if (descriptionId) query.push(`descriptionId=${descriptionId}`);
            if (name) query.push(`name=${encodeURIComponent(name)}`);
    
            const response = await fetch(`/api/descriptions${query.length ? `?${query.join("&")}` : ""}`);
            if (!response.ok) throw new Error(`Error ${response.status}`);
    
            const data = await response.json();
    
            if (Array.isArray(data)) {
                return data.map((desc) => ({
                    id: desc.id,
                    name: desc.name,
                    html: desc.html,
                    css: desc.css,
                    js: desc.js,
                }));
            }
    
            return {
                id: data.id,
                name: data.name,
                html: data.html,
                css: data.css,
                js: data.js,
            };
        } catch (error) {
            console.error("Fetch Description Error:", error);
            throw error;
        }
    };    

    const handleClickSave = () => {
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        console.log("Description List:", descriptionList);
        if (!id) {
            toast.error("Invalid description ID.");
            return;
        }
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) {
            toast.error('Description ID is required for deletion.');
            return;
        }
    
        try {
            console.log('Delete ID:', deleteId);
    
            const response = await fetch(`/api/descriptions/${deleteId}`, {
                method: 'DELETE',
            });
    
            if (!response.ok) {
                const error = await response.json();
                console.error('Error Response:', error);
                toast.error(`Error: ${error.message}`);
                return;
            }
    
            toast.success('Description deleted successfully!');
            setDescriptionList((prev) => prev.filter((desc) => desc.id !== deleteId));
        } catch (error) {
            console.error('Error deleting description:', error);
            toast.error('An unexpected error occurred while deleting the description.');
        } finally {
            setDeleteId(null);
            setShowDeleteConfirm(false);
        }
    };     

    const handleSelectDescription = async (id: string) => {
        try {
            const data = await fetchDescription({ descriptionId: id });

            if (!Array.isArray(data)) {
                setHtml(data.html);
                setCss(data.css);
                setJs(data.js);
                setName(data.name);
                onDescriptionName(data.name);
                setShowModal(false);
            } else {
                toast.error("Unexpected data format: Received an array instead of an object.");
            }
        } catch (error) {
            toast.error("Failed to fetch description details.");
        }
    };


    useEffect(() => {
        if (initialCSS === '' && initialHTML === '' && initialJS === '') {
            setHtml('');
            setCss('');
            setJs('');
        }
    }, [initialCSS, initialHTML, initialJS]);

    const ConfirmationModal: React.FC<{
        show: boolean;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }> = ({ show, message, onConfirm, onCancel }) => {
        if (!show) return null;

        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                    <h3>Confirm Action</h3>
                    <p>{message}</p>
                    <div className={styles.modalActions}>
                        <button className={styles.button} onClick={onConfirm}>
                            Confirm
                        </button>
                        <button className={styles.button} onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                <button
                    className={activeTab === "HTML" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("HTML")}
                >
                    HTML
                </button>
                <button
                    className={activeTab === "CSS" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("CSS")}
                >
                    CSS
                </button>
                <button
                    className={activeTab === "Javascript" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("Javascript")}
                >
                    JS
                </button>
                <button
                    onClick={async () => {
                        try {
                            const data = await fetchDescription();
                            if (Array.isArray(data)) {
                                console.log("Mapped Descriptions:", data);
                                setDescriptionList(data);
                            } else {
                                toast.error("Unexpected data format: Received an object instead of an array.");
                            }

                            setDescriptionModal(true);
                        } catch (error) {
                            toast.error("Failed to fetch descriptions.");
                        }
                    }}
                >
                    Select Description
                </button>
                {descriptionModal && (
                    <div className={styles.descriptionModal}>
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHead}>
                                    <h2>Select a Description</h2>
                                    <button
                                        className={styles.crossButton}
                                        onClick={() => setDescriptionModal(false)}>
                                        ✕
                                    </button>
                                </div>
                                <hr className={styles.divider}></hr>
                                <ul>
                                    {descriptionList.map((desc) => (
                                        <li key={desc.id} className={styles.descriptionList}>
                                            <button onClick={() => handleSelectDescription(desc.id)}>
                                                {desc.name}
                                            </button>
                                            <button
                                                name="delete-button"
                                                className={styles.deleteButton}
                                                onClick={() => handleDelete(desc.id)}
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    className={styles.iconButton}
                    onClick={(e) => handleIconClick(e, "description")}
                >
                    {configIcon}
                </button>
            </div>
            <div className={styles.editor}>{renderEditor()}</div>
            <div className={styles.preview}>
                {descriptionName ? <h1>{descriptionName}</h1> : ''
                }
                <iframe
                    ref={iframeRef}
                    title="Live Preview"
                    className={styles.previewFrame}
                />
            </div>
            <div className={styles.descriptionButtons}>
                <button className={styles.button} onClick={handleClickSave}>
                    Save Description
                </button>
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHead}>
                                <h2>Save Your Description</h2>
                                <button
                                    className={styles.crossButton}
                                    onClick={() => setShowModal(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter description name"
                                value={descriptionName}
                                onChange={handleNameChange}
                                className={styles.input}
                            />
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.modalButton}
                                    onClick={() => handleSaveButton(descriptionName, html, css, js)
                                    }
                                >
                                    Save
                                </button>
                                <button
                                    className={styles.modalButton}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    className={styles.button}
                    onClick={handleClearButton}
                    disabled={!description && !initialCSS && !initialHTML && !initialJS}
                >
                    Clear Description
                </button>
                <ConfirmationModal
                    show={showDeleteConfirm}
                    message="Are you sure you want to delete this description? This action cannot be undone."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => {
                        setDeleteId(null);
                        setShowDeleteConfirm(false);
                    }}
                />

            </div>
        </div>
    );
};

export default AdvancedDescription;
