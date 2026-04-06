import { useState, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { ControllerDocs } from "@/types/Rig";

interface CodeEditorProps {
    code: string;
    onChange: (code: string) => void;
    error: string | null;
    onReset?: () => void;
    docs?: ControllerDocs;
}

export function CodeEditor({ code, onChange, error, onReset, docs }: CodeEditorProps) {
    const [docsOpen, setDocsOpen] = useState(false);

    return (
        <div className="code-editor-container">
            <div className="code-editor-header">
                <span>Controller Code</span>
                <div className="code-editor-actions">
                    {docs && (
                        <button className="btn btn-docs" onClick={() => setDocsOpen(prev => !prev)} aria-expanded={docsOpen} aria-label="Toggle API reference">
                            {docsOpen ? "Hide Help" : "How To"}
                        </button>
                    )}
                    {onReset && (
                        <button className="btn btn-reset" onClick={onReset} aria-label="Reset controller code to default">
                            Reset
                        </button>
                    )}
                </div>
            </div>
            {docs && docsOpen && <ApiReference docs={docs} />}
            <CodeMirror
                value={code}
                height="100%"
                theme={oneDark}
                extensions={[javascript()]}
                onChange={onChange}
                className="code-editor"
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: true,
                    autocompletion: true
                }}
            />
            {error && (
                <div className="code-error" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}

function ApiReference({ docs }: { docs: ControllerDocs }) {
    const [copied, setCopied] = useState(false);

    const handleCopyPrompt = useCallback(() => {
        navigator.clipboard.writeText(docs.llmPrompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [docs.llmPrompt]);

    return (
        <div className="api-reference">
            <div className="api-section">
                <div className="api-signature">function controller(state, dt) → {docs.returnUnit}</div>
            </div>
            <div className="api-section">
                <div className="api-section-title">Input: state</div>
                <table className="api-table">
                    <tbody>
                        {docs.stateFields.map(field => (
                            <tr key={field.name}>
                                <td className="api-field-name">{field.name}</td>
                                <td className="api-field-desc">{field.description}</td>
                                <td className="api-field-unit">{field.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="api-section">
                <div className="api-section-title">Input: dt</div>
                <div className="api-detail">Fixed simulation timestep (0.001s). Useful for integrating values over time.</div>
            </div>
            <div className="api-section">
                <div className="api-section-title">Return</div>
                <div className="api-detail">{docs.returnDescription}</div>
            </div>
            <div className="api-section api-prompt-section">
                <button className="btn btn-copy-prompt" onClick={handleCopyPrompt} aria-label="Copy LLM prompt to clipboard">
                    {copied ? "Copied!" : "Copy LLM Prompt"}
                </button>
                <span className="api-prompt-hint">Paste into ChatGPT, Claude, etc. to generate a controller</span>
            </div>
        </div>
    );
}
