import React, { useState } from "react";
import styles from './component.module.css';

interface AdvancedDescriptionProps {
    description: string;
    section: string;
    initialHTML: string;
    initialCSS: string;
    initialJS: string;
    onCombine: (htmlString: string) => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    initialHTML,
    initialCSS,
    initialJS,
    onCombine,
}) => {
    const [activeTab, setActiveTab] = useState<"HTML" | "CSS" | "JS">("HTML");
    const [html, setHtml] = useState(initialHTML);
    const [css, setCss] = useState(initialCSS);
    const [js, setJs] = useState(initialJS);

    const combineCode = () => {
        const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        ${css}
    </style>
</head>
<body>
    ${html}
    <script>
        ${js}
    </script>
</body>
</html>`;
        onCombine(combinedHTML);
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
                    className={activeTab === "JS" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("JS")}
                >
                    JavaScript
                </button>
            </div>
            <div className={styles.editor}>
                {activeTab === "HTML" && (
                    <textarea
                        className={styles.textarea}
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        placeholder="Write HTML here..."
                    />
                )}
                {activeTab === "CSS" && (
                    <textarea
                        className={styles.textarea}
                        value={css}
                        onChange={(e) => setCss(e.target.value)}
                        placeholder="Write CSS here..."
                    />
                )}
                {activeTab === "JS" && (
                    <textarea
                        className={styles.textarea}
                        value={js}
                        onChange={(e) => setJs(e.target.value)}
                        placeholder="Write JavaScript here..."
                    />
                )}
            </div>
            <button className={styles.combineButton} onClick={combineCode}>
                Combine & Generate HTML
            </button>
        </div>
    );
};

export default AdvancedDescription;
