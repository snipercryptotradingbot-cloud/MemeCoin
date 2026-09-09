'use client';

import { useRef, useState, useCallback } from 'react';

export default function ImageUploader({ onImageSelect, preview, error }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onImageSelect(null, 'Invalid file type. Use PNG, JPG, GIF, or WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onImageSelect(null, 'File too large. Maximum size is 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onImageSelect(file, null, e.target.result);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onImageSelect(null, null, null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="image-uploader" id="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        id="image-input"
      />

      {preview ? (
        <div className="image-preview-wrap" onClick={handleClick}>
          <img src={preview} alt="Token preview" className="image-preview-img" />
          <button className="image-remove-btn" onClick={handleRemove} id="btn-remove-image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="image-preview-overlay">
            <span>Click to change</span>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone ${isDragging ? 'active' : ''} ${error ? 'dropzone-error' : ''}`}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          id="dropzone"
        >
          <div className="dropzone-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <div className="dropzone-btn">Upload Image</div>
          <div className="dropzone-hint">or drag and drop</div>
          <div className="dropzone-types">PNG, JPG, GIF or WEBP &middot; max 5MB</div>
        </div>
      )}

      {error && <p className="input-error-text">{error}</p>}

      <style jsx>{`
        .image-uploader {
          width: 100%;
        }

        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 40px 24px;
          border: 2px dashed var(--hairline);
          border-radius: var(--radius-lg);
          background: var(--bg-surface-soft);
          cursor: pointer;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        .dropzone:hover {
          border-color: var(--brand-mint);
          background: rgba(60, 255, 208, 0.04);
        }

        .dropzone.active {
          border-color: var(--brand-mint);
          background: rgba(60, 255, 208, 0.08);
        }

        .dropzone-error {
          border-color: var(--error) !important;
          background: rgba(239, 68, 68, 0.04) !important;
        }

        .dropzone-icon {
          color: var(--muted);
          margin-bottom: 4px;
        }

        .dropzone-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--ink);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-pill);
          transition: background var(--transition-fast);
        }

        .dropzone:hover .dropzone-btn {
          background: #222;
        }

        .dropzone-hint {
          font-size: 13px;
          color: var(--muted);
        }

        .dropzone-types {
          font-size: 12px;
          color: var(--muted);
          opacity: 0.7;
        }

        .image-preview-wrap {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          cursor: pointer;
        }

        .image-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-remove-btn {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          width: 28px;
          height: 28px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid var(--border-subtle);
          color: white;
          font-size: var(--text-xs);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: background var(--transition-fast);
        }

        .image-remove-btn:hover {
          background: var(--error);
        }

        .image-preview-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-base);
          color: white;
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .image-preview-wrap:hover .image-preview-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
