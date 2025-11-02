const style = document.createElement('style');
style.textContent = `
  .lint-error {
    background: rgba(255, 0, 0, 0.15);
    border-bottom: 2px solid #ff5555;
  }
`;
document.head.appendChild(style);

class PythonLinter {
  async init() {
    // chạy khi mở hoặc lưu file Python
    editorManager.on('save', async (file) => {
      if (!file || !file.uri.endsWith('.py')) return;
      await this.lintFile(file);
    });

    editorManager.on('open', async (file) => {
      if (file.uri.endsWith('.py')) await this.lintFile(file);
    });

    this.errorMarks = new Map();
  }

  async lintFile(file) {
    try {
      const code = await fsOperation(file.uri).readFile('utf8');
      const cmd = `python3 -m py_compile -`;
      const result = await this.exec(cmd, code);

      this.clearMarks(file);

      if (result.stderr) this.displayError(result.stderr, file);
    } catch (e) {
      console.error('PythonLinter:', e);
    }
  }

  async exec(cmd, input) {
    return new Promise((resolve) => {
      acode.exec(cmd, { input }, (stdout, stderr) => {
        resolve({ stdout, stderr });
      });
    });
  }

  displayError(stderr, file) {
    const parsed = this.parseError(stderr);
    if (!parsed) return;

    const { line, message } = parsed;

    const editor = editorManager.editor;
    const from = { line: line - 1, ch: 0 };
    const to = { line: line - 1, ch: 999 };

    // highlight dòng lỗi
    const mark = editor.markText(from, to, {
      className: 'lint-error',
      title: message
    });
    this.errorMarks.set(file.uri, mark);

    // popup gợi ý
    const suggestion = this.suggestFix(message);
    const content = `
      <div style="padding:8px;max-width:300px;">
        <b>Lỗi dòng ${line}:</b><br>${message}<hr>
        <b>Gợi ý sửa:</b><br>${suggestion}
      </div>`;
    acode.alert('Python Linter', content);
  }

  parseError(stderr) {
    // ví dụ: File "test.py", line 4, in <module>
    // SyntaxError: invalid syntax
    const lineMatch = stderr.match(/line (\d+)/);
    const msgMatch = stderr.split('\n').find(x => x.trim().length && !x.startsWith('  File'));
    if (!lineMatch || !msgMatch) return null;
    return { line: parseInt(lineMatch[1]), message: msgMatch.trim() };
  }

  suggestFix(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('syntaxerror')) return 'Kiểm tra dấu ":" hoặc dấu ngoặc.';
    if (lower.includes('nameerror')) return 'Biến chưa được khai báo hoặc viết sai tên.';
    if (lower.includes('indentation')) return 'Kiểm tra thụt đầu dòng bằng 4 khoảng trắng.';
    if (lower.includes('typeerror')) return 'Kiểm tra kiểu dữ liệu khi truyền vào hàm.';
    return 'Kiểm tra lại cú pháp hoặc lỗi chính tả.';
  }

  clearMarks(file) {
    const mark = this.errorMarks.get(file.uri);
    if (mark) {
      mark.clear();
      this.errorMarks.delete(file.uri);
    }
  }

  async destroy() {
    this.errorMarks.forEach((mark) => mark.clear());
    this.errorMarks.clear();
  }
}

if (window.acode) acode.registerPlugin(PythonLinter);
