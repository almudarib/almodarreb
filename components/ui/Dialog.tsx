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

export type DialogProps = Omit<MUIDialogProps, 'children'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function Dialog({ title, actions, children, ...rest }: DialogProps) {
  return (
    <MUIDialog
      TransitionComponent={Slide as React.ComponentType<TransitionProps & { children: React.ReactElement }>}
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: '16px',
          border: '1px solid var(--neutral-300)',
          bgcolor: 'var(--brand-white)',
          boxShadow: '0 10px 30px var(--black-03)'
        }
      }}
      BackdropProps={{
        sx: {
          bgcolor: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(2px)'
        }
      }}
      {...rest}
    >
      {title ? <DialogTitle sx={{ fontWeight: 800, color: 'var(--brand-dark)' }}>{title}</DialogTitle> : null}
      <DialogContent dividers sx={{ bgcolor: 'var(--brand-white)' }}>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MUIDialog>
  );
}

export { DialogTitle, DialogContent, DialogActions };

export default Dialog;
