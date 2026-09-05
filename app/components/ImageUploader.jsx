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
          <div className="dropzone-icon">📸</div>
          <div className="dropzone-text">
            <strong>Click to upload</strong> or drag and drop
          </div>
          <div className="dropzone-hint">PNG, JPG, GIF or WEBP (max 5MB)</div>
        </div>
      )}

      {error && <p className="input-error-text">{error}</p>}

      <style jsx>{`
        .image-uploader {
          width: 100%;
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

        .dropzone-error {
          border-color: var(--error) !important;
        }
      `}</style>
    </div>
  );
}
