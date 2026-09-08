'use client';

import { useState, useCallback } from 'react';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import StepIndicator from '@/app/components/StepIndicator';
import ImageUploader from '@/app/components/ImageUploader';
import TokenPreviewCard from '@/app/components/TokenPreviewCard';
import ProgressOverlay from '@/app/components/ProgressOverlay';
import NetworkBadge from '@/app/components/NetworkBadge';
import { useToken } from '@/app/providers/TokenProvider';
import { useToast } from '@/app/components/Toast';
import { uploadImage, uploadMetadata } from '@/app/lib/pinata';
import { createMemeCoin } from '@/app/lib/createToken';
import { formatNumber } from '@/app/lib/solana';

const WIZARD_STEPS = ['Connect Wallet', 'Token Details', 'Review & Launch'];

export default function CreatePage() {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider('solana');
  const { caipNetwork } = useAppKitNetwork();

  const token = useToken();
  const toast = useToast();

  const [wizardStep, setWizardStep] = useState(0);
  const [imageError, setImageError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const network = caipNetwork?.name?.toLowerCase()?.includes('mainnet') ? 'mainnet' : 'devnet';

  // Auto-advance step 0 when connected
  const currentStep = isConnected && wizardStep === 0 ? 1 : wizardStep;

  const handleImageSelect = useCallback((file, error, preview) => {
    setImageError(error);
    token.setField('imageFile', file);
    token.setField('imagePreview', preview);
  }, [token]);

  const validateForm = () => {
    const errors = {};
    if (!token.name.trim()) errors.name = 'Token name is required';
    if (token.name.length > 32) errors.name = 'Max 32 characters';
    if (!token.symbol.trim()) errors.symbol = 'Token symbol is required';
    if (token.symbol.length > 10) errors.symbol = 'Max 10 characters';
    if (!token.imageFile && !token.imagePreview) errors.image = 'Token image is required';
    if (!token.supply || Number(token.supply) <= 0) errors.supply = 'Supply must be greater than 0';
    if (Number(token.supply) > 1e15) errors.supply = 'Supply too large';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLaunch = async () => {
    if (!validateForm()) {
      toast.error('Validation Error', 'Please fix the form errors');
      return;
    }

    if (!isConnected || !walletProvider || !connection) {
      toast.error('Wallet Error', 'Please connect your wallet first');
      return;
    }

    const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET || process.env.TREASURY_WALLET_ADDRESS;

    try {
      // Step 1: Upload image
      token.setStatus('uploading_image');
      const imageResult = await uploadImage(token.imageFile);
      token.setImageResult(imageResult.url);

      // Step 2: Upload metadata
      token.setStatus('uploading_metadata');
      const metaResult = await uploadMetadata({
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        description: token.description,
        imageUrl: imageResult.url,
        website: token.website,
        twitter: token.twitter,
        telegram: token.telegram,
      });
      token.setMetadataResult(metaResult.uri);

      // Step 3: Build & send transaction
      token.setStatus('building_tx');

      const config = {
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        uri: metaResult.uri,
        decimals: Number(token.decimals),
        supply: token.supply,
        revokeMintAuthority: token.revokeMintAuthority,
        revokeFreezeAuthority: token.revokeFreezeAuthority,
      };

      token.setStatus('awaiting_signature');

      const result = await createMemeCoin(
        connection,
        walletProvider,
        address,
        config,
        treasuryAddress
      );

      token.setStatus('confirming');

      // Small delay for UX
      await new Promise((r) => setTimeout(r, 1000));

      token.setSuccess(result.mintAddress, result.txSignature);

      // Record token in D1 for My Tokens / social features
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('mememint_token') : null;
        if (savedToken) {
          await fetch('/api/tokens/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${savedToken}` },
            body: JSON.stringify({
              mint_address: result.mintAddress,
              name: token.name,
              symbol: token.symbol.toUpperCase(),
              image: imageResult?.url || '',
              metadata_uri: metaResult?.uri || '',
              network,
            }),
          });
        }
      } catch { /* non-critical */ }

      // Store in localStorage for explore page
      try {
        const history = JSON.parse(localStorage.getItem('mememint_tokens') || '[]');
        history.unshift({
          mint: result.mintAddress,
          name: token.name,
          symbol: token.symbol.toUpperCase(),
          image: imageResult.url,
          network,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('mememint_tokens', JSON.stringify(history.slice(0, 50)));
      } catch { /* ignore localStorage errors */ }

      // Redirect to success
      window.location.href = `/success?mint=${result.mintAddress}&tx=${result.txSignature}&network=${network}`;

    } catch (err) {
      console.error('Token creation error:', err);
      token.setError(err.message || 'Failed to create token');
    }
  };

  const handleRetry = () => {
    token.setStatus('idle');
  };

  const handleCancel = () => {
    token.setStatus('idle');
  };

  return (
    <div className="create-page" id="create-page">
      <div className="container container-sm">
        {/* Header */}
        <div className="create-header">
          <span className="section-label">TOKEN CREATOR</span>
          <h1 className="section-title">Create Your Meme Coin</h1>
          <p className="section-desc" style={{ marginBottom: 'var(--space-8)' }}>
            Fill in the details below and launch your SPL token on Solana.
          </p>
          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>

        <div className="create-layout">
          {/* Main Form */}
          <div className="create-form-area">
            {/* Step 0: Connect Wallet */}
            {!isConnected && currentStep === 0 && (
              <div className="card step-card animate-fade-in-up" id="step-connect">
                <div className="step-card-center">
                  <div className="step-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-mint)' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                  <h2 className="step-title-lg">Connect Your Wallet</h2>
                  <p className="step-desc-text">
                    Connect your Solana wallet to get started. We support Phantom, Solflare, Backpack, and more.
                  </p>
                  <appkit-button />
                </div>
              </div>
            )}

            {/* Step 1: Token Details */}
            {isConnected && currentStep === 1 && (
              <div className="card step-card animate-fade-in-up" id="step-details">
                {/* Connected indicator */}
                <div className="connected-bar">
                  <span className="connected-dot" />
                  <span className="connected-address">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <NetworkBadge network={network} />
                </div>

                <div className="form-grid">
                  {/* Token Name */}
                  <div className="input-group">
                    <label className="input-label">
                      Token Name <span className="required">*</span>
                    </label>
                    <input
                      className={`input ${formErrors.name ? 'input-error' : ''}`}
                      type="text"
                      placeholder="e.g. Doge Moon"
                      maxLength={32}
                      value={token.name}
                      onChange={(e) => token.setField('name', e.target.value)}
                      id="input-name"
                    />
                    {formErrors.name && <span className="input-error-text">{formErrors.name}</span>}
                    <span className="input-hint">{token.name.length}/32</span>
                  </div>

                  {/* Token Symbol */}
                  <div className="input-group">
                    <label className="input-label">
                      Symbol <span className="required">*</span>
                    </label>
                    <input
                      className={`input ${formErrors.symbol ? 'input-error' : ''}`}
                      type="text"
                      placeholder="e.g. DMOON"
                      maxLength={10}
                      value={token.symbol}
                      onChange={(e) => token.setField('symbol', e.target.value.toUpperCase())}
                      id="input-symbol"
                    />
                    {formErrors.symbol && <span className="input-error-text">{formErrors.symbol}</span>}
                    <span className="input-hint">{token.symbol.length}/10</span>
                  </div>

                  {/* Description */}
                  <div className="input-group full-width">
                    <label className="input-label">Description</label>
                    <textarea
                      className="input"
                      placeholder="Tell the world about your meme coin..."
                      maxLength={500}
                      value={token.description}
                      onChange={(e) => token.setField('description', e.target.value)}
                      id="input-description"
                    />
                    <span className="input-hint">{token.description.length}/500</span>
                  </div>

                  {/* Image Upload */}
                  <div className="input-group full-width">
                    <label className="input-label">
                      Token Image <span className="required">*</span>
                    </label>
                    <ImageUploader
                      onImageSelect={handleImageSelect}
                      preview={token.imagePreview}
                      error={imageError || formErrors.image}
                    />
                  </div>

                  {/* Supply */}
                  <div className="input-group">
                    <label className="input-label">
                      Total Supply <span className="required">*</span>
                    </label>
                    <input
                      className={`input ${formErrors.supply ? 'input-error' : ''}`}
                      type="number"
                      placeholder="1000000000"
                      value={token.supply}
                      onChange={(e) => token.setField('supply', e.target.value)}
                      id="input-supply"
                    />
                    {formErrors.supply && <span className="input-error-text">{formErrors.supply}</span>}
                    <span className="input-hint">{formatNumber(token.supply)} tokens</span>
                  </div>

                  {/* Decimals */}
                  <div className="input-group">
                    <label className="input-label">Decimals</label>
                    <select
                      className="input"
                      value={token.decimals}
                      onChange={(e) => token.setField('decimals', Number(e.target.value))}
                      id="input-decimals"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                        <option key={d} value={d}>{d}{d === 9 ? ' (recommended)' : ''}</option>
                      ))}
                    </select>
                    <span className="input-hint">Most tokens use 9 decimals</span>
                  </div>
                </div>

                {/* Advanced Options */}
                <button
                  className="btn btn-ghost advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  id="btn-advanced"
                >
                  {showAdvanced ? '▾' : '▸'} Advanced Options
                </button>

                {showAdvanced && (
                  <div className="advanced-section animate-fade-in">
                    <div className="form-grid">
                      <div className="input-group full-width">
                        <label className="input-label">Website URL</label>
                        <input
                          className="input"
                          type="url"
                          placeholder="https://yourmemecoin.com"
                          value={token.website}
                          onChange={(e) => token.setField('website', e.target.value)}
                          id="input-website"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Twitter / X</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="@yourhandle"
                          value={token.twitter}
                          onChange={(e) => token.setField('twitter', e.target.value)}
                          id="input-twitter"
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Telegram</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="t.me/yourcommunity"
                          value={token.telegram}
                          onChange={(e) => token.setField('telegram', e.target.value)}
                          id="input-telegram"
                        />
                      </div>
                    </div>

                    <div className="divider" />

                    <div className="authority-options">
                      <label className="checkbox-label" id="checkbox-mint">
                        <input
                          type="checkbox"
                          checked={token.revokeMintAuthority}
                          onChange={(e) => token.setField('revokeMintAuthority', e.target.checked)}
                        />
                        <span className="checkbox-text">
                          <strong>Revoke Mint Authority</strong>
                          <span className="input-hint">No one can mint more tokens (recommended)</span>
                        </span>
                      </label>
                      <label className="checkbox-label" id="checkbox-freeze">
                        <input
                          type="checkbox"
                          checked={token.revokeFreezeAuthority}
                          onChange={(e) => token.setField('revokeFreezeAuthority', e.target.checked)}
                        />
                        <span className="checkbox-text">
                          <strong>Revoke Freeze Authority</strong>
                          <span className="input-hint">No one can freeze token accounts (recommended)</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="step-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                      if (validateForm()) setWizardStep(2);
                    }}
                    id="btn-next-review"
                  >
                    Review Token →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Launch */}
            {isConnected && currentStep === 2 && (
              <div className="card step-card animate-fade-in-up" id="step-review">
                <h2 className="step-heading">Review Your Token</h2>

                <TokenPreviewCard
                  name={token.name}
                  symbol={token.symbol}
                  imagePreview={token.imagePreview}
                  supply={token.supply}
                  decimals={token.decimals}
                  description={token.description}
                />

                {/* Fee Breakdown */}
                <div className="fee-card">
                  <h3 className="fee-title">Fee Breakdown</h3>
                  <div className="fee-row">
                    <span>Account Rent</span>
                    <span className="fee-mono">~0.01 SOL</span>
                  </div>
                  <div className="fee-row">
                    <span>Transaction Fee</span>
                    <span className="fee-mono">~0.000005 SOL</span>
                  </div>
                  <div className="fee-row">
                    <span>Platform Fee</span>
                    <span className="fee-mono">~0.09 SOL</span>
                  </div>
                  <div className="fee-divider" />
                  <div className="fee-row fee-total">
                    <span>Total</span>
                    <span className="fee-mono" style={{ color: 'var(--accent-primary)' }}>0.1 SOL</span>
                  </div>
                </div>

                {network === 'mainnet' && (
                  <div className="mainnet-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  You are on <strong>Mainnet</strong>. This will use real SOL.
                </div>
                )}

                <div className="step-actions" style={{ gap: 'var(--space-3)' }}>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setWizardStep(1)}
                    id="btn-back"
                  >
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleLaunch}
                    id="btn-launch"
                  >
                    Launch Token
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Preview (desktop only) */}
          {isConnected && currentStep >= 1 && (
            <div className="create-sidebar" id="sidebar-preview">
              <div className="sidebar-sticky">
                <h3 className="sidebar-title">Live Preview</h3>
                <TokenPreviewCard
                  name={token.name}
                  symbol={token.symbol}
                  imagePreview={token.imagePreview}
                  supply={token.supply}
                  decimals={token.decimals}
                  compact
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Overlay */}
      <ProgressOverlay
        status={token.status}
        error={token.error}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />

      <style jsx>{`
        .create-page {
          padding: var(--space-12) 0 var(--space-24);
        }

        .create-header {
          text-align: center;
          margin-bottom: var(--space-10);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .create-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--space-8);
          align-items: start;
        }

        .step-card {
          padding: var(--space-8);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
        }

        .step-card-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-4);
          padding: var(--space-10) 0;
        }

        .step-icon {
          margin-bottom: var(--space-2);
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          background: rgba(60, 255, 208, 0.1);
          color: var(--brand-mint);
        }

        .step-title-lg {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--ink);
        }

        .step-desc-text {
          font-size: var(--text-sm);
          color: var(--body);
          max-width: 400px;
          margin-bottom: var(--space-4);
          line-height: 1.6;
        }

        .step-heading {
          font-size: var(--text-xl);
          font-weight: 700;
          margin-bottom: var(--space-6);
          color: var(--ink);
        }

        .connected-bar {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--bg-surface-soft);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
          border: 1px solid var(--hairline);
        }

        .connected-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--success);
          animation: pulse 2s ease-in-out infinite;
        }

        .connected-address {
          font-size: var(--text-sm);
          color: var(--body);
          font-family: var(--font-mono);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-5);
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .advanced-toggle {
          margin-top: var(--space-6);
          color: var(--brand-mint);
          width: 100%;
          justify-content: flex-start;
        }

        .advanced-section {
          margin-top: var(--space-4);
        }

        .authority-options {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: var(--brand-mint);
          flex-shrink: 0;
        }

        .checkbox-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: var(--text-sm);
          color: var(--ink);
        }

        .step-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--space-8);
        }

        /* Fee Card */
        .fee-card {
          margin-top: var(--space-6);
          padding: var(--space-5);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
        }

        .fee-title {
          font-size: var(--text-base);
          font-weight: 600;
          margin-bottom: var(--space-4);
          color: var(--ink);
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
          color: var(--body);
          padding: var(--space-2) 0;
        }

        .fee-mono {
          font-family: var(--font-mono);
        }

        .fee-divider {
          height: 1px;
          background: var(--hairline);
          margin: var(--space-3) 0;
        }

        .fee-total {
          font-weight: 700;
          color: var(--ink);
          font-size: var(--text-base);
        }

        .mainnet-warning {
          margin-top: var(--space-4);
          padding: var(--space-3) var(--space-4);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--warning);
        }

        /* Sidebar */
        .create-sidebar {
          position: relative;
        }

        .sidebar-sticky {
          position: sticky;
          top: 88px;
        }

        .sidebar-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: var(--space-4);
          font-family: var(--font-mono);
        }

        @media (max-width: 1024px) {
          .create-layout {
            grid-template-columns: 1fr;
          }

          .create-sidebar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .step-card {
            padding: var(--space-5);
          }

          .step-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
