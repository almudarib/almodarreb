'use client';
import * as React from 'react';
import {
  Dialog as MUIDialog,
  type DialogProps as MUIDialogProps,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

export type DialogProps = Omit<MUIDialogProps, 'children'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function Dialog({ title, actions, children, ...rest }: DialogProps) {
  return (
    <MUIDialog {...rest}>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent dividers>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MUIDialog>
  );
}

export { DialogTitle, DialogContent, DialogActions };

export default Dialog;
