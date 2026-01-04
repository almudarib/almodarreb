'use client';
import * as React from 'react';
import { Checkbox as MUICheckbox, type CheckboxProps as MUICheckboxProps, FormControlLabel } from '@mui/material';

export type CheckboxProps = MUICheckboxProps & {
  label?: React.ReactNode;
};

export function Checkbox({ label, sx, ...rest }: CheckboxProps) {
  const defaultSx = {
    color: 'var(--brand-teal)',
    '&.Mui-checked': { color: 'var(--brand-teal)' },
    '&.MuiCheckbox-indeterminate': { color: 'var(--brand-teal)' }
  } as const;
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;
  if (label) {
    return <FormControlLabel control={<MUICheckbox sx={mergedSx} {...rest} />} label={label} />;
  }
  return <MUICheckbox sx={mergedSx} {...rest} />;
}

export default Checkbox;
