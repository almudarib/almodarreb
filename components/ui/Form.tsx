'use client';
import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

export type FormProps = BoxProps & {
  onSubmit?: React.FormEventHandler<HTMLDivElement>;
};

export function Form({ onSubmit, ...rest }: FormProps) {
  return <Box component="form" onSubmit={onSubmit} {...rest} />;
}

export default Form;
