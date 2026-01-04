'use client';
import * as React from 'react';
import { InputLabel, type InputLabelProps } from '@mui/material';

export type LabelProps = InputLabelProps;

export function Label({ sx, ...rest }: LabelProps) {
  const defaultSx = {
    color: 'var(--brand-dark)',
    fontWeight: 600,
    mb: 1
  } as const;
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;
  return <InputLabel sx={mergedSx} {...rest} />;
}

export default Label;
