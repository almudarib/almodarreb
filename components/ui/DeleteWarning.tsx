'use client';
import * as React from 'react';
import { Box, Stack, Typography, Alert } from '@mui/material';
import { Modal } from './Modal';
import { Checkbox } from './Checkbox';
import { Button } from './button';

export type DeleteWarningProps = {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  impacts?: string[];
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  requireAck?: boolean;
  ackLabel?: React.ReactNode;
  entityName?: React.ReactNode;
  dangerNote?: React.ReactNode;
};

export function DeleteWarning({
  open,
  title = 'تأكيد الحذف',
  description = 'سيتم حذف هذا الحساب بشكل نهائي.',
  impacts,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  requireAck = true,
  ackLabel = 'أفهم أن هذا الإجراء لا يمكن التراجع عنه',
  entityName,
  dangerNote,
}: DeleteWarningProps) {
  const [ack, setAck] = React.useState(!requireAck);
  React.useEffect(() => {
    if (!open) setAck(!requireAck);
  }, [open, requireAck]);
  return (
    <Modal
      open={open}
      title={title}
      submitText={confirmText}
      submitDisabled={!ack}
      cancelText={cancelText}
      onSubmit={() => {
        if (!ack) return;
        onConfirm?.();
      }}
      onCancel={() => {
        onCancel?.();
      }}
      fullWidth
      maxWidth="sm"
    >
      <Stack spacing={2}>
        <Alert severity="warning" variant="outlined">
          {entityName ? (
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 700 }}>سيتم حذف: {entityName}</Typography>
              <Typography>{description}</Typography>
            </Stack>
          ) : (
            <Typography>{description}</Typography>
          )}
        </Alert>
        {!!dangerNote && <Alert severity="error" variant="standard">{dangerNote}</Alert>}
        {Array.isArray(impacts) && impacts.length > 0 && (
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>التأثيرات:</Typography>
            <Stack spacing={0.75}>
              {impacts.map((item, idx) => (
                <Typography key={idx} sx={{ color: 'var(--neutral-800)' }}>• {item}</Typography>
              ))}
            </Stack>
          </Box>
        )}
        {requireAck && (
          <Checkbox
            checked={ack}
            onChange={(e) => setAck(Boolean((e.target as HTMLInputElement).checked))}
            label={ackLabel}
          />
        )}
      </Stack>
    </Modal>
  );
}

export default DeleteWarning;
