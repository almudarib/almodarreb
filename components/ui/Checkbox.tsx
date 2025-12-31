'use client';
import * as React from 'react';
import { Checkbox as MUICheckbox, type CheckboxProps as MUICheckboxProps, FormControlLabel } from '@mui/material';

export type CheckboxProps = MUICheckboxProps & {
  label?: React.ReactNode;
};

export function Checkbox({ label, ...rest }: CheckboxProps) {
  if (label) {
    return <FormControlLabel control={<MUICheckbox {...rest} />} label={label} />;
  }
  return <MUICheckbox {...rest} />;
}

export default Checkbox;
