'use client';
import * as React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

export type InputProps = TextFieldProps;

export function Input({ sx, variant, size, ...rest }: InputProps) {
  const defaultSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      bgcolor: 'var(--brand-white)',
      '& fieldset': { borderColor: 'var(--neutral-200)' },
      '&:hover fieldset': { borderColor: 'var(--neutral-400)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--brand-teal)' }
    },
    '& .MuiInputBase-input': {
      color: 'var(--brand-dark)'
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'var(--neutral-600)'
    }
  } as const;
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;
  return <TextField fullWidth variant={variant ?? 'outlined'} size={size ?? 'small'} sx={mergedSx} {...rest} />;
}

export default Input;
