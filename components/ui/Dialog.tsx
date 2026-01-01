'use client';
import * as React from 'react';
import {
  Dialog as MUIDialog,
  type DialogProps as MUIDialogProps,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';
import * as ReactFrom from 'react';

export type DialogProps = Omit<MUIDialogProps, 'children'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function Dialog({ title, actions, children, ...rest }: DialogProps) {
  return (
    <MUIDialog
      TransitionComponent={Slide as React.ComponentType<TransitionProps & { children: React.ReactElement<any, any> }>}
      keepMounted
      {...rest}
    >
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent dividers>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MUIDialog>
  );
}

export { DialogTitle, DialogContent, DialogActions };

export default Dialog;
