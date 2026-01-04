'use client';
import * as React from 'react';
import { Box, Stack } from '@mui/material';
import { Dialog, type DialogProps } from './Dialog';
import { Button } from './button';

export type ModalProps = Omit<DialogProps, 'actions'> & {
  submitText?: React.ReactNode;
  cancelText?: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
};

export function Modal({
  title,
  children,
  submitText = 'حفظ',
  cancelText = 'إلغاء',
  onSubmit,
  onCancel,
  ...rest
}: ModalProps) {
  const actions = (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button variant="contained" onClick={onSubmit}>
        {submitText}
      </Button>
    </Stack>
  );
  return (
    <Dialog title={title} actions={actions} {...rest}>
      <Box>{children}</Box>
    </Dialog>
  );
}

export default Modal;
