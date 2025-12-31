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

export function Card(props: CardProps) {
  return <MUICard {...props} />;
}

export { CardContent, CardHeader, CardActions };

export function CardTitle(props: TypographyProps) {
  return <Typography variant="h6" {...props} />;
}

export function CardDescription(props: TypographyProps) {
  return <Typography variant="body2" color="text.secondary" {...props} />;
}

export default Card;
