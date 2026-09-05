'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';

const TokenContext = createContext(null);

const INITIAL_STATE = {
  // Status
  status: 'idle', // idle | uploading_image | uploading_metadata | building_tx | awaiting_signature | confirming | success | error
  error: null,

  // Token Config
  name: '',
  symbol: '',
  description: '',
  imageFile: null,
  imagePreview: null,
  decimals: 9,
  supply: '1000000000',
  website: '',
  twitter: '',
  telegram: '',
  revokeMintAuthority: true,
  revokeFreezeAuthority: true,

  // Results
  imageIpfsUrl: null,
  metadataUri: null,
  mintAddress: null,
  txSignature: null,
};

function tokenReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_STATUS':
      return { ...state, status: action.status, error: null };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'SET_IMAGE_RESULT':
      return { ...state, imageIpfsUrl: action.url };
    case 'SET_METADATA_RESULT':
      return { ...state, metadataUri: action.uri };
    case 'SET_SUCCESS':
      return {
        ...state,
        status: 'success',
        mintAddress: action.mintAddress,
        txSignature: action.txSignature,
      };
    case 'RESET':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export function TokenProvider({ children }) {
  const [state, dispatch] = useReducer(tokenReducer, INITIAL_STATE);

  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setStatus = useCallback((status) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const setImageResult = useCallback((url) => {
    dispatch({ type: 'SET_IMAGE_RESULT', url });
  }, []);

  const setMetadataResult = useCallback((uri) => {
    dispatch({ type: 'SET_METADATA_RESULT', uri });
  }, []);

  const setSuccess = useCallback((mintAddress, txSignature) => {
    dispatch({ type: 'SET_SUCCESS', mintAddress, txSignature });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <TokenContext.Provider
      value={{
        ...state,
        setField,
        setStatus,
        setError,
        setImageResult,
        setMetadataResult,
        setSuccess,
        reset,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}
