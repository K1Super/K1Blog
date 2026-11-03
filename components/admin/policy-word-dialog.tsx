'use client';

import { useEffect, useRef, useState } from 'react';

import {
  WORD_LIST_FILE_MAX_BYTES,
  WORD_LIST_MAX,
  mergeWordList,
  parseWordListFile,
  splitWordList,
} from '@/features/comments/word-list';

type ImportPreview = {
  fileName: string;
  terms: string[];
  total: number;
  duplicates: number;
  invalid: number;
};

export function PolicyWordDialog({
  open,
  title,
  value,
  count,
  error,
  fieldId,
  onChange,
  onClose,
}: {
  open: boolean;
  title: string;
  value: string;
  count: number;
  error?: string;
  fieldId: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRequestRef = useRef(0);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const frame = requestAnimationFrame(() => textareaRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    if (dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    importRequestRef.current += 1;
    setPreview(null);
    setImportError('');
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const request = importRequestRef.current + 1;
    importRequestRef.current = request;
    setPreview(null);
    setImportError('');

    if (file.size > WORD_LIST_FILE_MAX_BYTES) {
      setImportError('文件超过 1MB');
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setImportError('仅支持 .csv 或 .txt 文件');
      return;
    }

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      if (request !== importRequestRef.current) return;

      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        setImportError('文件不是 UTF-8 编码');
        return;
      }

      const result = parseWordListFile(file.name, text);
      if (request !== importRequestRef.current) return;
      if (result.error) {
        setImportError(result.error);
        return;
      }

      setPreview({
        fileName: file.name,
        terms: result.terms,
        total: result.total,
        duplicates: result.duplicates,
        invalid: result.invalid,
      });
    } catch {
      if (request === importRequestRef.current) setImportError('文件读取失败');
    } finally {
      if (request === importRequestRef.current) setImporting(false);
    }
  }

  function applyImport(mode: 'append' | 'replace') {
    if (!preview) return;
    const result = mergeWordList(splitWordList(value), preview.terms, mode);
    if (result.overflow) {
      setImportError(`合并后超过 ${WORD_LIST_MAX} 项，请改用替换或拆分文件`);
      return;
    }

    onChange(result.terms.join('、'));
    setPreview(null);
    setImportError('');
  }

  const appendResult = preview
    ? mergeWordList(splitWordList(value), preview.terms, 'append')
    : null;

  return (
    <dialog
      id="policy-word-dialog"
      ref={dialogRef}
      className="policy-dialog"
      aria-labelledby="policy-dialog-title"
      onClose={handleClose}
    >
      {open ? (
        <>
          <header className="policy-dialog-head">
            <div>
              <p className="eyebrow">WORD LIST</p>
              <h3 className="policy-dialog-title" id="policy-dialog-title">
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="policy-dialog-close"
              aria-label="关闭词表"
              onClick={handleClose}
            >
              ×
            </button>
          </header>
          <div className="policy-dialog-body">
            <p className="policy-dialog-note" id="policy-dialog-note">
              使用「、」分隔，修改后自动保存
            </p>
            <textarea
              id={fieldId}
              ref={textareaRef}
              className="automation-textarea policy-dialog-textarea"
              aria-label={title}
              aria-describedby={
                error ? 'policy-dialog-note policy-dialog-error' : 'policy-dialog-note'
              }
              aria-invalid={error ? true : undefined}
              value={value}
              onChange={(event) => {
                setPreview(null);
                setImportError('');
                onChange(event.target.value);
              }}
            />
            {error ? (
              <p className="form-error" id="policy-dialog-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="policy-import-bar">
              <button
                type="button"
                className="policy-import-trigger"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? '读取中' : '导入 CSV / TXT'}
              </button>
              <span className="policy-import-hint">
                {`CSV 第一列 · TXT 换行或「、」 · ≤1MB / ${WORD_LIST_MAX} 项`}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                hidden
                onChange={handleFile}
              />
            </div>

            {importError ? (
              <p className="form-error policy-import-error" role="alert">
                {importError}
              </p>
            ) : null}

            {preview ? (
              <div className="policy-import-preview">
                <p className="policy-import-summary" role="status">
                  {preview.fileName} · 读取 {preview.total} 条 · 有效 {preview.terms.length} 项
                  {preview.duplicates ? ` · 去重 ${preview.duplicates}` : ''}
                  {preview.invalid ? ` · 忽略 ${preview.invalid}` : ''}
                </p>
                {appendResult?.overflow ? (
                  <p className="form-error">追加后超过 {WORD_LIST_MAX} 项，请改用替换或拆分文件</p>
                ) : null}
                <div className="policy-import-actions">
                  <button
                    type="button"
                    className="policy-import-action"
                    disabled={appendResult?.overflow}
                    onClick={() => applyImport('append')}
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    className="policy-import-action"
                    onClick={() => applyImport('replace')}
                  >
                    替换
                  </button>
                  <button
                    type="button"
                    className="policy-import-action"
                    onClick={() => {
                      setPreview(null);
                      setImportError('');
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <footer className="policy-dialog-foot">
            <span className="policy-dialog-count">{count} 项</span>
            <button type="button" className="policy-dialog-done" onClick={handleClose}>
              完成
            </button>
          </footer>
        </>
      ) : null}
    </dialog>
  );
}
