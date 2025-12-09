/**
 * Geese Editor - Client Application
 * Phase 1: Basic server + Monaco editor
 * Vanilla JavaScript implementation
 */

let editor = null;
let activeFile = null;

// Initialize Monaco Editor with fallback
function initMonacoEditor(container, language, value) {
  // Check if require is available (Monaco loader)
  if (typeof require === 'undefined' || typeof require.config === 'undefined') {
    // Fallback to textarea
    showFallbackEditor(container, value);
    return;
  }

  require.config({ 
    paths: { 
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
    } 
  });

  require(['vs/editor/editor.main'], function (monaco) {
    // Register custom language for .geese files
    if (!monaco.languages.getLanguages().find(l => l.id === 'geese')) {
      monaco.languages.register({ id: 'geese' });
      
      monaco.languages.setMonarchTokensProvider('geese', {
        tokenizer: {
          root: [
            [/^---$/, 'keyword'],
            [/_include|_exclude|_recipe|_tool|_model|_temperature|_max_tokens/, 'keyword'],
            [/~>/, 'operator'],
            [/\{\{/, { token: 'delimiter.handlebars', next: '@handlebars' }],
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/[a-zA-Z_]\w*/, 'identifier'],
          ],
          handlebars: [
            [/[^{}]+/, 'variable'],
            [/\}\}/, { token: 'delimiter.handlebars', next: '@pop' }],
          ],
          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ]
        }
      });
    }

    if (editor) {
      editor.dispose();
    }

    editor = monaco.editor.create(container, {
      value: value || '',
      language: language || 'geese',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      readOnly: true // Phase 1: Read-only
    });
  }, function(err) {
    // Monaco failed to load, use fallback
    showFallbackEditor(container, value);
  });
}

// Fallback editor using textarea
function showFallbackEditor(container, value) {
  container.innerHTML = `
    <textarea readonly style="
      width: 100%;
      height: 100%;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      padding: 15px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    ">${value || ''}</textarea>
  `;
}

// Load and display files
async function loadFiles() {
  try {
    const response = await fetch('/api/files');
    if (!response.ok) {
      throw new Error('Failed to load files');
    }
    const data = await response.json();
    
    renderFileList('local-files', data.local);
    renderFileList('global-files', data.global);
  } catch (error) {
    console.error('Error loading files:', error);
    document.getElementById('local-files').innerHTML = 
      `<div style="padding: 10px 15px; font-size: 12px; color: #f48771;">Error: ${error.message}</div>`;
  }
}

function renderFileList(containerId, fileData) {
  const container = document.getElementById(containerId);
  
  const files = [
    ...fileData.geese.map(f => ({ ...f, type: 'geese', scope: containerId === 'local-files' ? 'local' : 'global' })),
    ...fileData.pipes.map(f => ({ ...f, type: 'pipes', scope: containerId === 'local-files' ? 'local' : 'global' })),
    ...(fileData.config ? [{ 
      name: 'config.json', 
      path: fileData.config, 
      type: 'config', 
      scope: containerId === 'local-files' ? 'local' : 'global' 
    }] : [])
  ];

  if (files.length === 0) {
    container.innerHTML = 
      '<div style="padding: 10px 15px; font-size: 12px; color: #888; font-style: italic;">No files</div>';
    return;
  }

  container.innerHTML = files.map(file => `
    <div class="file-item ${file.type}" 
         onclick="loadFile('${file.scope}', '${file.type}', '${file.name}')"
         title="${file.path}">
      ${file.name}
    </div>
  `).join('');
}

async function loadFile(scope, type, filename) {
  try {
    const response = await fetch(`/api/files/${scope}/${type}/${filename}`);
    if (!response.ok) {
      throw new Error('Failed to load file content');
    }
    const data = await response.json();
    
    // Update active file
    activeFile = { scope, type, name: filename, path: data.path };
    
    // Update tabs
    document.getElementById('editor-tabs').innerHTML = `
      <div class="editor-tab active">${filename}</div>
    `;
    
    // Clear welcome screen and show editor
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = '<div id="monaco-container" style="width: 100%; height: 100%;"></div>';
    
    // Determine language
    let language = 'plaintext';
    if (type === 'geese') language = 'geese';
    else if (type === 'pipes') language = 'javascript';
    else if (type === 'config') language = 'json';
    
    // Initialize Monaco
    const container = document.getElementById('monaco-container');
    initMonacoEditor(container, language, data.content);
    
    // Update active state in sidebar
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    const activeEl = Array.from(document.querySelectorAll('.file-item'))
      .find(el => el.textContent.trim() === filename);
    if (activeEl) {
      activeEl.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading file:', error);
    document.getElementById('editor-content').innerHTML = `
      <div class="error">Error loading file: ${error.message}</div>
    `;
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadFiles();
});
