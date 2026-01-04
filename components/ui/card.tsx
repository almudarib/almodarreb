'use client';
import * as React from 'react';
import {
  Card as MUICard,
  type CardProps as MUICardProps,
  CardContent,
  CardHeader,
  CardActions,
} from '@mui/material';
import { Typography, type TypographyProps } from '@mui/material';

export type CardProps = MUICardProps;

export function Card({ sx, ...rest }: CardProps) {
  const defaultSx = {
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px var(--black-03)',
    border: '1px solid var(--neutral-300)',
    bgcolor: 'var(--brand-white)'
  } as const;
  const mergedSx = sx ? [defaultSx, ...(Array.isArray(sx) ? sx : [sx])] : defaultSx;
  return <MUICard sx={mergedSx} {...rest} />;
}

export { CardContent, CardHeader, CardActions };

export function CardTitle(props: TypographyProps) {
  return <Typography variant="h6" {...props} />;
}

export function CardDescription(props: TypographyProps) {
  return <Typography variant="body2" color="text.secondary" {...props} />;
}

export default Card;
