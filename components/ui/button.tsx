'use client';
import * as React from 'react';
import { Button as MUIButton, type ButtonProps as MUIButtonProps } from '@mui/material';

export type ButtonProps = MUIButtonProps & {
  loading?: boolean;
  loadingText?: React.ReactNode;
};

export function Button({ loading, loadingText, children, disabled, ...rest }: ButtonProps) {
  return (
    <MUIButton disabled={loading || disabled} {...rest}>
      {loading ? loadingText ?? '...' : children}
    </MUIButton>
  );
}

export default Button;
