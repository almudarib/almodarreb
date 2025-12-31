'use client';
import * as React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

export type InputProps = TextFieldProps;

export function Input(props: InputProps) {
  return <TextField fullWidth {...props} />;
}

export default Input;
