/**
 * Geese Editor - Client Application
 * Phase 2: File editing, creation, and deletion
 */

let editor = null;
let activeFile = null;
let originalContent = '';
let isModified = false;

// Initialize Monaco Editor with editing support
function initMonacoEditor(container, language, value) {
  // Check if require is available (Monaco loader)
  if (typeof require === 'undefined' || typeof require.config === 'undefined') {
    // Fallback to textarea
    showFallbackEditor(container, value, true); // Enable editing
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
      readOnly: false // Phase 2: Editable!
    });

    // Track changes
    editor.onDidChangeModelContent(() => {
      const currentContent = editor.getValue();
      isModified = currentContent !== originalContent;
      updateModifiedIndicator();
    });

    // Save on Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
  }, function(err) {
    // Monaco failed to load, use fallback
    showFallbackEditor(container, value, true);
  });
}

// Fallback editor using textarea (with editing support)
function showFallbackEditor(container, value, editable) {
  const textarea = document.createElement('textarea');
  textarea.value = value || '';
  textarea.readOnly = !editable;
  textarea.style.cssText = `
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
  `;
  
  if (editable) {
    textarea.addEventListener('input', () => {
      isModified = textarea.value !== originalContent;
      updateModifiedIndicator();
    });
    
    // Save on Ctrl+S
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    });
  }
  
  container.innerHTML = '';
  container.appendChild(textarea);
}

// Update modified indicator in tab
function updateModifiedIndicator() {
  const tab = document.querySelector('.editor-tab.active');
  if (tab) {
    const indicator = tab.querySelector('.modified-indicator');
    if (isModified) {
      if (!indicator) {
        const span = document.createElement('span');
        span.className = 'modified-indicator';
        span.textContent = '●';
        tab.insertBefore(span, tab.firstChild);
      }
    } else {
      if (indicator) {
        indicator.remove();
      }
    }
  }
}

// Show status message
function showStatus(message, type = 'info') {
  let statusBar = document.getElementById('status-bar');
  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'status-bar';
    statusBar.className = 'status-message';
    document.querySelector('.editor-container').appendChild(statusBar);
  }
  
  statusBar.className = `status-message ${type}`;
  statusBar.textContent = message;
  
  setTimeout(() => {
    statusBar.textContent = '';
    statusBar.className = 'status-message';
  }, 3000);
}

// Load and display files
async function loadFiles() {
  try {
    const response = await fetch('/api/files');
    if (!response.ok) {
      throw new Error('Failed to load files');
    }
    const data = await response.json();
    
    renderFileList('local-files', data.local, 'local');
    renderFileList('global-files', data.global, 'global');
  } catch (error) {
    console.error('Error loading files:', error);
    document.getElementById('local-files').innerHTML = 
      `<div style="padding: 10px 15px; font-size: 12px; color: #f48771;">Error: ${error.message}</div>`;
  }
}

function renderFileList(containerId, fileData, scope) {
  const container = document.getElementById(containerId);
  
  const files = [
    ...fileData.geese.map(f => ({ ...f, type: 'geese', scope })),
    ...fileData.pipes.map(f => ({ ...f, type: 'pipes', scope })),
    ...(fileData.config ? [{ 
      name: 'config.json', 
      path: fileData.config, 
      type: 'config', 
      scope 
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
         oncontextmenu="showContextMenu(event, '${file.scope}', '${file.type}', '${file.name}')"
         title="${file.path}">
      ${file.name}
    </div>
  `).join('');
}

async function loadFile(scope, type, filename) {
  // Check for unsaved changes
  if (isModified) {
    if (!confirm('You have unsaved changes. Discard them?')) {
      return;
    }
  }

  try {
    const response = await fetch(`/api/files/${scope}/${type}/${filename}`);
    if (!response.ok) {
      throw new Error('Failed to load file content');
    }
    const data = await response.json();
    
    // Update active file
    activeFile = { scope, type, name: filename, path: data.path };
    originalContent = data.content;
    isModified = false;
    
    // Update tabs with toolbar
    document.getElementById('editor-tabs').innerHTML = `
      <div class="toolbar">
        <div class="editor-tab active">${filename}</div>
        <div class="spacer"></div>
        <button class="btn btn-primary btn-small" onclick="saveFile()">Save (Ctrl+S)</button>
        <button class="btn btn-danger btn-small" onclick="confirmDeleteFile()">Delete</button>
      </div>
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
    showStatus(`Error loading file: ${error.message}`, 'error');
  }
}

async function saveFile() {
  if (!activeFile) {
    return;
  }

  try {
    // Get current content
    let content;
    if (editor) {
      content = editor.getValue();
    } else {
      const textarea = document.querySelector('#monaco-container textarea');
      content = textarea ? textarea.value : '';
    }

    const response = await fetch(`/api/files/${activeFile.scope}/${activeFile.type}/${activeFile.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to save file');
    }

    originalContent = content;
    isModified = false;
    updateModifiedIndicator();
    showStatus('File saved successfully', 'success');
  } catch (error) {
    console.error('Error saving file:', error);
    showStatus(`Error saving file: ${error.message}`, 'error');
  }
}

async function confirmDeleteFile() {
  if (!activeFile) {
    return;
  }

  if (!confirm(`Are you sure you want to delete ${activeFile.name}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/files/${activeFile.scope}/${activeFile.type}/${activeFile.name}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }

    showStatus('File deleted successfully', 'success');
    
    // Clear editor
    activeFile = null;
    originalContent = '';
    isModified = false;
    document.getElementById('editor-tabs').innerHTML = '';
    document.getElementById('editor-content').innerHTML = `
      <div class="welcome-screen">
        <h2>Welcome to Geese Editor</h2>
        <p>Select a .geese file, pipe, or config file from the sidebar to get started.</p>
      </div>
    `;
    
    // Reload file list
    await loadFiles();
  } catch (error) {
    console.error('Error deleting file:', error);
    showStatus(`Error deleting file: ${error.message}`, 'error');
  }
}

// Show new file modal
function showNewFileModal(scope) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };
  
  overlay.innerHTML = `
    <div class="modal">
      <h3>Create New File</h3>
      <div class="modal-body">
        <div class="form-group">
          <label>File Type</label>
          <select id="new-file-type">
            <option value="geese">.geese File</option>
            <option value="pipes">Pipe (.js)</option>
          </select>
        </div>
        <div class="form-group">
          <label>File Name</label>
          <input type="text" id="new-file-name" placeholder="my-task" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="createNewFile('${scope}')">Create</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.getElementById('new-file-name').focus();
}

async function createNewFile(scope) {
  const type = document.getElementById('new-file-type').value;
  const filename = document.getElementById('new-file-name').value.trim();
  
  if (!filename) {
    alert('Please enter a file name');
    return;
  }

  try {
    const response = await fetch(`/api/files/${scope}/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create file');
    }

    const result = await response.json();
    showStatus('File created successfully', 'success');
    
    // Close modal
    document.querySelector('.modal-overlay').remove();
    
    // Reload files
    await loadFiles();
    
    // Open the new file
    await loadFile(scope, type, result.filename);
  } catch (error) {
    console.error('Error creating file:', error);
    showStatus(`Error creating file: ${error.message}`, 'error');
  }
}

// Context menu
function showContextMenu(event, scope, type, filename) {
  event.preventDefault();
  
  // Remove any existing context menu
  const existing = document.querySelector('.context-menu');
  if (existing) {
    existing.remove();
  }
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="loadFile('${scope}', '${type}', '${filename}'); document.querySelector('.context-menu').remove();">
      Open
    </div>
    <div class="context-menu-item danger" onclick="deleteFileFromContext('${scope}', '${type}', '${filename}'); document.querySelector('.context-menu').remove();">
      Delete
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Close menu on click outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 0);
}

async function deleteFileFromContext(scope, type, filename) {
  if (!confirm(`Are you sure you want to delete ${filename}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/files/${scope}/${type}/${filename}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }

    showStatus('File deleted successfully', 'success');
    
    // If this was the active file, clear editor
    if (activeFile && activeFile.name === filename) {
      activeFile = null;
      originalContent = '';
      isModified = false;
      document.getElementById('editor-tabs').innerHTML = '';
      document.getElementById('editor-content').innerHTML = `
        <div class="welcome-screen">
          <h2>Welcome to Geese Editor</h2>
          <p>Select a .geese file, pipe, or config file from the sidebar to get started.</p>
        </div>
      `;
    }
    
    // Reload file list
    await loadFiles();
  } catch (error) {
    console.error('Error deleting file:', error);
    showStatus(`Error deleting file: ${error.message}`, 'error');
  }
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (isModified) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadFiles();
});
