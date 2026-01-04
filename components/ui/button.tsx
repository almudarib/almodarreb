'use client';
import * as React from 'react';
import { Button as MUIButton, type ButtonProps as MUIButtonProps } from '@mui/material';

export type ButtonProps = MUIButtonProps & {
  loading?: boolean;
  loadingText?: React.ReactNode;
};

export function Button({ loading, loadingText, children, disabled, variant, sx, ...rest }: ButtonProps) {
  const defaultSx = {
    borderRadius: '10px',
    textTransform: 'none',
    fontWeight: 700,
    px: 3,
    py: 1.2,
    '&.MuiButton-contained': {
      bgcolor: 'var(--brand-teal)',
      color: 'var(--brand-white)',
      boxShadow: '0 4px 14px var(--teal-shadow-30)',
      '&:hover': { bgcolor: 'var(--brand-teal-hover)' }
    },
    '&.MuiButton-outlined': {
      borderColor: 'var(--neutral-400)',
      color: 'var(--brand-dark)',
      '&:hover': { bgcolor: 'var(--neutral-100)' }
    },
    '&.MuiButton-text': {
      color: 'var(--brand-teal)'
    }
  } as const;
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;

  return (
    <MUIButton
      disabled={loading || disabled}
      variant={variant ?? 'contained'}
      sx={mergedSx}
      {...rest}
    >
      {loading ? loadingText ?? '...' : children}
    </MUIButton>
  );
}

export default Button;
