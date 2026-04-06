import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorProps {
    code: string;
    onChange: (code: string) => void;
    error: string | null;
    onReset?: () => void;
}

export function CodeEditor({ code, onChange, error, onReset }: CodeEditorProps) {
    return (
        <div className="code-editor-container">
            <div className="code-editor-header">
                <span>Controller Code</span>
                {onReset && (
                    <button className="btn btn-reset" onClick={onReset} aria-label="Reset controller code to default">
                        Reset
                    </button>
                )}
            </div>
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
