'use client';
import * as React from 'react';
import { InputLabel, type InputLabelProps } from '@mui/material';

export type LabelProps = InputLabelProps;

export function Label(props: LabelProps) {
  return <InputLabel {...props} />;
}

export default Label;
