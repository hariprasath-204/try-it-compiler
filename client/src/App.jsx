import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2, Settings2, FileCode2, X, Plus, FolderOpen, Save, Download, CheckCircle, ChevronDown, File } from 'lucide-react';
import axios from 'axios';
import OutputConsole from './components/OutputConsole';

const LANGUAGES = {
  cpp: { name: 'C++', monacoLang: 'cpp', extension: '.cpp', boilerplate: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
  c: { name: 'C', monacoLang: 'c', extension: '.c', boilerplate: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  python: { name: 'Python', monacoLang: 'python', extension: '.py', boilerplate: 'def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()' },
  java: { name: 'Java', monacoLang: 'java', extension: '.java', boilerplate: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' }
};

function App() {
  const [files, setFiles] = useState([
    { id: '1', name: 'main.cpp', code: LANGUAGES.cpp.boilerplate, lang: 'cpp' }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [isCompiling, setIsCompiling] = useState(false);
  const [output, setOutput] = useState({ stdout: '', stderr: '' });
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [fileMenuPos, setFileMenuPos] = useState({ top: 0, right: 0 });
  const fileMenuBtnRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const handleLangChange = (e) => {
    const selectedLang = e.target.value;
    setFiles(files.map(f => {
      if (f.id === activeFileId) {
        return { 
          ...f, 
          lang: selectedLang, 
          code: LANGUAGES[selectedLang].boilerplate,
          name: `main${LANGUAGES[selectedLang].extension}`
        };
      }
      return f;
    }));
    setOutput({ stdout: '', stderr: '' });
  };

  const handleCodeChange = (value) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, code: value } : f));
  };

  const handleNewFile = () => {
    const newId = Date.now().toString();
    const defaultLang = activeFile ? activeFile.lang : 'cpp';
    const newFile = { 
      id: newId, 
      name: `new_file${LANGUAGES[defaultLang].extension}`, 
      code: LANGUAGES[defaultLang].boilerplate, 
      lang: defaultLang 
    };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
    setShowFileMenu(false);
  };

  const handleOpenFileClick = async () => {
    try {
      if (window.showOpenFilePicker) {
        const fileHandles = await window.showOpenFilePicker({ multiple: true });
        setShowFileMenu(false);
        
        for (const fileHandle of fileHandles) {
          const file = await fileHandle.getFile();
          const content = await file.text();
          
          const ext = file.name.substring(file.name.lastIndexOf('.'));
          let detectedLang = 'cpp';
          Object.entries(LANGUAGES).forEach(([key, val]) => {
            if (val.extension === ext) detectedLang = key;
          });

          const newId = Date.now().toString() + Math.random().toString();
          setFiles(prev => [...prev, { 
            id: newId, 
            name: file.name, 
            code: content, 
            lang: detectedLang,
            fileHandle // store for saving
          }]);
          setActiveFileId(newId);
        }
      } else {
        fileInputRef.current?.click();
        setShowFileMenu(false);
      }
    } catch (err) {
      console.log('User cancelled or error:', err);
      setShowFileMenu(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        let detectedLang = 'cpp';
        Object.entries(LANGUAGES).forEach(([key, val]) => {
          if (val.extension === ext) detectedLang = key;
        });

        const newId = Date.now().toString() + Math.random().toString();
        setFiles(prev => [...prev, { id: newId, name: file.name, code: content, lang: detectedLang }]);
        setActiveFileId(newId);
      };
      reader.readAsText(file);
    });
    e.target.value = null;
  };

  const handleSave = async () => {
    if (!activeFile) return;

    try {
      if (window.showSaveFilePicker) {
        let handle = activeFile.fileHandle;
        if (!handle) {
          handle = await window.showSaveFilePicker({ suggestedName: activeFile.name });
          const fileObj = await handle.getFile();
          setFiles(files.map(f => f.id === activeFileId ? { ...f, fileHandle: handle, name: fileObj.name } : f));
        }
        const writable = await handle.createWritable();
        await writable.write(activeFile.code);
        await writable.close();
        setShowFileMenu(false);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.log('Save cancelled or failed:', err);
      setShowFileMenu(false);
    }
  };

  const handleSaveAs = async () => {
    if (!activeFile) return;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({ suggestedName: activeFile.name });
        const fileObj = await handle.getFile();
        setFiles(files.map(f => f.id === activeFileId ? { ...f, fileHandle: handle, name: fileObj.name } : f));
        
        const writable = await handle.createWritable();
        await writable.write(activeFile.code);
        await writable.close();
        setShowFileMenu(false);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.log('Save As cancelled or failed:', err);
      setShowFileMenu(false);
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    setShowFileMenu(false);
  };

  const closeFile = (e, id) => {
    e.stopPropagation(); // prevent setting active
    const newFiles = files.filter(f => f.id !== id);
    if (newFiles.length === 0) {
      // If closing the last file, create a new default one
      const newId = Date.now().toString();
      newFiles.push({ id: newId, name: 'main.cpp', code: LANGUAGES.cpp.boilerplate, lang: 'cpp' });
      setActiveFileId(newId);
    } else if (activeFileId === id) {
      setActiveFileId(newFiles[newFiles.length - 1].id);
    }
    setFiles(newFiles);
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    setIsCompiling(true);
    setOutput({ stdout: '', stderr: '' });
    try {
      const response = await axios.post('https://try-it-compiler.onrender.com/api/run', {
        lang: activeFile.lang,
        code: activeFile.code
      });
      setOutput({
        stdout: response.data.stdout || '',
        stderr: response.data.stderr || ''
      });
    } catch (error) {
      console.error(error);
      setOutput({
        stdout: '',
        stderr: error.response?.data?.details || error.message || 'An unknown error occurred.'
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCheckCompile = async () => {
    if (!activeFile) return;
    setIsCompiling(true);
    setOutput({ stdout: '', stderr: '' });
    try {
      const response = await axios.post('https://try-it-compiler.onrender.com/api/run', {
        lang: activeFile.lang,
        code: activeFile.code
      });
      if (response.data.stderr) {
          setOutput({ stdout: '', stderr: response.data.stderr });
      } else {
          setOutput({ stdout: '✅ Compiled Successfully. No syntax errors found.', stderr: '' });
      }
    } catch (error) {
      console.error(error);
      setOutput({
        stdout: '',
        stderr: error.response?.data?.details || error.message || 'An unknown error occurred.'
      });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col font-sans">
      {/* Hidden file input for opening files */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Header */}
      <header className="glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="bg-brand-accent/20 p-2 rounded-lg">
            <Code2 className="w-6 h-6 text-brand-accent" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            TRY IT COMPILER
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg">
            <Settings2 className="w-4 h-4 text-gray-400" />
            <select
              className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer border-none"
              value={activeFile?.lang || 'cpp'}
              onChange={handleLangChange}
              disabled={isCompiling}
            >
              {Object.entries(LANGUAGES).map(([key, val]) => (
                <option key={key} value={key} className="bg-brand-card text-white">
                  {val.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunCode}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg ${isCompiling
                ? 'bg-brand-accent/50 cursor-not-allowed opacity-80'
                : 'bg-brand-accent hover:bg-blue-400 hover:shadow-brand-accent/25 hover:-translate-y-0.5'
              }`}
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Compiling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Code
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Editor Pane */}
        <section className="w-3/5 glass-panel rounded-xl overflow-hidden flex flex-col z-10 shadow-2xl border border-white/5">
          {/* Tab Bar & ToolBar */}
          <div className="bg-[#1e1e1e] border-b border-white/10 flex items-center justify-between relative">
            <div className="flex items-center overflow-x-auto flex-1 custom-scrollbar">
              {files.map(file => (
                <div 
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-white/5 transition-colors duration-200 min-w-[120px] max-w-[200px] group ${
                    activeFileId === file.id 
                      ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-t-blue-500' 
                      : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#333333] border-t-2 border-t-transparent'
                  }`}
                >
                  <FileCode2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <button 
                    onClick={(e) => closeFile(e, file.id)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button 
                onClick={handleNewFile}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
                title="New File"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Toolbar Tools */}
            <div className="flex items-center gap-2 pr-4 pl-2 flex-shrink-0 z-50">
              
              {/* File Menu */}
              <div className="relative">
                <button 
                  ref={fileMenuBtnRef}
                  onClick={() => {
                    if (!showFileMenu && fileMenuBtnRef.current) {
                      const rect = fileMenuBtnRef.current.getBoundingClientRect();
                      setFileMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setShowFileMenu(!showFileMenu);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-md transition-all shadow-sm"
                >
                  <File className="w-3.5 h-3.5 text-blue-400" />
                  FILE
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                </button>
                
                {showFileMenu && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowFileMenu(false)}></div>
                    <div
                      className="fixed w-52 bg-[#252526] border border-white/10 rounded-lg shadow-2xl z-[9999] py-1.5 overflow-hidden backdrop-blur-xl"
                      style={{ top: fileMenuPos.top, right: fileMenuPos.right }}
                    >
                      <button onClick={handleNewFile} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-3 transition-colors">
                        <Plus className="w-4 h-4 text-gray-400" /> New File
                      </button>
                      <button onClick={handleOpenFileClick} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-3 transition-colors">
                        <FolderOpen className="w-4 h-4 text-gray-400" /> Open File...
                      </button>
                      <button onClick={handleSave} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-3 transition-colors">
                        <Save className="w-4 h-4 text-gray-400" /> Save
                      </button>
                      <button onClick={handleSaveAs} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-3 transition-colors">
                        <Download className="w-4 h-4 text-gray-400" /> Save As...
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-5 bg-white/10 mx-1"></div>

              {/* Check Compile Button */}
              <button 
                onClick={handleCheckCompile}
                disabled={isCompiling}
                title="Check for syntax errors (Compile Only)"
                className="group relative p-1.5 flex items-center justify-center text-gray-400 hover:text-green-400 bg-white/5 hover:bg-green-400/10 border border-white/5 hover:border-green-400/30 rounded-md transition-all shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="absolute -top-8 bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">Syntax Check</span>
              </button>



            </div>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={activeFile ? LANGUAGES[activeFile.lang].monacoLang : 'cpp'}
              theme="vs-dark"
              value={activeFile ? activeFile.code : ''}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "all"
              }}
            />
          </div>
        </section>

        {/* Output Pane */}
        <section className="w-2/5 z-10 h-full flex flex-col">
          <OutputConsole stdout={output.stdout} stderr={output.stderr} />
        </section>
      </main>
    </div>
  );
}

export default App;
