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
    <MUIMenu {...rest}>
      {items.map((item, idx) => (
        <MenuItem
          key={idx}
          onClick={item.onClick}
          disabled={item.disabled}
          sx={item.tone === 'error' ? { color: 'error.main' } : undefined}
        >
          {item.label}
        </MenuItem>
      ))}
    </MUIMenu>
  );
}

export default Menu;
