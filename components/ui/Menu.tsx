'use client';
import * as React from 'react';
import { Menu as MUIMenu, type MenuProps as MUIMenuProps, MenuItem } from '@mui/material';

export type MenuItemSpec = {
  label: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'error';
};

export type MenuProps = Omit<MUIMenuProps, 'children'> & {
  items: MenuItemSpec[];
};

export function Menu({ items, ...rest }: MenuProps) {
  return (
    <MUIMenu
      MenuListProps={{
        sx: {
          py: 0.5
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          border: '1px solid var(--neutral-300)',
          boxShadow: '0 10px 30px var(--black-03)'
        }
      }}
      {...rest}
    >
      {items.map((item, idx) => (
        <MenuItem
          key={idx}
          onClick={item.onClick}
          disabled={item.disabled}
          sx={{
            fontWeight: 600,
            color: item.tone === 'error' ? 'error.main' : 'var(--brand-dark)',
            '&:hover': { bgcolor: 'var(--neutral-100)' }
          }}
        >
          {item.label}
        </MenuItem>
      ))}
    </MUIMenu>
  );
}

export default Menu;
