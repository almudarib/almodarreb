 'use client';
 import * as React from 'react';
 import { Box, Stack, Autocomplete, TextField, Chip, MenuItem } from '@mui/material';
 import { Input, Button } from '@/components/ui';
 
 export type FilterOption = { label: string; value: string | number };
 export type FilterField =
   | {
       id: string;
       label: string;
       type: 'text' | 'number' | 'date';
       placeholder?: string;
       sx?: any;
       width?: number | string;
     }
   | {
       id: string;
       label: string;
       type: 'select';
       options: FilterOption[] | (() => Promise<FilterOption[]>);
       placeholder?: string;
       sx?: any;
       width?: number | string;
     }
   | {
       id: string;
       label: string;
       type: 'multi-select';
       options: FilterOption[] | (() => Promise<FilterOption[]>);
       placeholder?: string;
       sx?: any;
       width?: number | string;
     }
   | {
       id: string;
       label: string;
       type: 'date-range';
       placeholder?: string;
       sx?: any;
       width?: number | string;
     };
 
 export type FilterValues = Record<string, unknown>;
 
 export type FilterBarProps = {
   fields: FilterField[];
   value?: FilterValues;
   defaultValue?: FilterValues;
   onChange?: (next: FilterValues) => void;
   onApply?: (current: FilterValues) => void;
   onReset?: () => void;
   loading?: boolean;
   applyText?: string;
   resetText?: string;
  autoApplyOnChange?: boolean;
  hideActions?: boolean;
   sx?: any;
 };
 
 export default function FilterBar({
   fields,
   value,
   defaultValue,
   onChange,
   onApply,
   onReset,
   loading,
   applyText = 'تطبيق',
   resetText = 'مسح',
  autoApplyOnChange = false,
  hideActions = false,
   sx,
 }: FilterBarProps) {
   const controlled = value !== undefined;
   const [internal, setInternal] = React.useState<FilterValues>(() => defaultValue ?? {});
   const current = controlled ? (value as FilterValues) : internal;
   const [optionsMap, setOptionsMap] = React.useState<Record<string, FilterOption[]>>({});
   const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({});
 
   React.useEffect(() => {
     fields.forEach((f) => {
       if ((f.type === 'select' || f.type === 'multi-select') && typeof (f as any).options === 'function') {
         const id = f.id;
         setLoadingMap((m) => ({ ...m, [id]: true }));
         Promise.resolve()
           .then(async () => ((f as any).options as () => Promise<FilterOption[]> )())
           .then((opts) => setOptionsMap((m) => ({ ...m, [id]: opts ?? [] })))
           .finally(() => setLoadingMap((m) => ({ ...m, [id]: false })));
       } else if (f.type === 'select' || f.type === 'multi-select') {
         const id = f.id;
         setOptionsMap((m) => ({ ...m, [id]: ((f as any).options ?? []) as FilterOption[] }));
       }
     });
   }, [fields]);
 
   function update(id: string, v: unknown) {
     const next = { ...current, [id]: v };
     if (!controlled) setInternal(next);
     onChange?.(next);
    if (autoApplyOnChange) {
      onApply?.(next);
    }
   }
 
   function reset() {
     const base = defaultValue ?? {};
     if (!controlled) setInternal(base);
     onReset?.();
     onChange?.(base);
    if (autoApplyOnChange) {
      onApply?.(base);
    }
   }
 
   function apply() {
     onApply?.(current);
   }
 
   return (
     <Box
       sx={{
         borderRadius: '16px',
         border: '1px solid var(--neutral-300)',
         bgcolor: 'var(--brand-white)',
         boxShadow: '0 10px 30px var(--black-03)',
         p: 2,
         ...sx,
       }}
     >
       <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap" dir="rtl">
         {fields.map((f) => {
           const commonSx = f.sx ?? {};
           const w = f.width ?? 240;
           if (f.type === 'text' || f.type === 'number' || f.type === 'date') {
             const typeAttr = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
             return (
               <Box key={f.id} sx={{ width: w }}>
                 <Input
                   label={f.label}
                   placeholder={f.placeholder}
                   type={typeAttr as any}
                   value={(current[f.id] as any) ?? ''}
                   onChange={(e) => update(f.id, typeAttr === 'number' ? Number(e.target.value) : e.target.value)}
                   sx={commonSx}
                 />
               </Box>
             );
           }
           if (f.type === 'select') {
             const opts = optionsMap[f.id] ?? [];
             const val = current[f.id] as string | number | undefined;
             return (
               <Box key={f.id} sx={{ width: w }}>
                 <Input
                   label={f.label}
                   select
                   value={val ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const opts = optionsMap[f.id] ?? [];
                    const allNumeric = opts.length > 0 && opts.every((o) => typeof o.value === 'number');
                    update(f.id, allNumeric && raw !== '' ? Number(raw) : raw);
                  }}
                   sx={commonSx}
                   SelectProps={{ displayEmpty: true }}
                 >
                  <MenuItem value="">{f.placeholder ?? 'الكل'}</MenuItem>
                  {loadingMap[f.id] ? null : opts.map((o) => (
                    <MenuItem key={String(o.value)} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                 </Input>
               </Box>
             );
           }
           if (f.type === 'multi-select') {
             const opts = optionsMap[f.id] ?? [];
             const val = Array.isArray(current[f.id]) ? (current[f.id] as (string | number)[]) : [];
             return (
               <Box key={f.id} sx={{ width: w }}>
                 <Autocomplete
                   multiple
                   options={opts}
                   loading={!!loadingMap[f.id]}
                   value={opts.filter((o) => val.includes(o.value))}
                   onChange={(_, newValue) => update(f.id, newValue.map((o) => o.value))}
                   getOptionLabel={(o) => o.label}
                   renderInput={(params) => (
                     <TextField
                       {...params}
                       label={f.label}
                       placeholder={f.placeholder}
                       size="small"
                     />
                   )}
                   renderTags={(selected, getTagProps) =>
                     selected.map((option, index) => (
                       <Chip {...getTagProps({ index })} key={String(option.value)} label={option.label} />
                     ))
                   }
                 />
               </Box>
             );
           }
           if (f.type === 'date-range') {
             const val = (current[f.id] as { from?: string | null; to?: string | null } | undefined) ?? { from: null, to: null };
             return (
               <Stack key={f.id} direction="row" spacing={1} alignItems="center" sx={{ width: w }}>
                 <Input
                   label={`${f.label} من`}
                   type="date"
                   value={val.from ?? ''}
                   onChange={(e) => update(f.id, { ...val, from: e.target.value })}
                   sx={commonSx}
                 />
                 <Input
                   label="إلى"
                   type="date"
                   value={val.to ?? ''}
                   onChange={(e) => update(f.id, { ...val, to: e.target.value })}
                   sx={commonSx}
                 />
               </Stack>
             );
           }
           return null;
         })}
        {hideActions ? null : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={apply} loading={loading} loadingText="جاري التطبيق">
              {applyText}
            </Button>
            <Button variant="outlined" onClick={reset}>
              {resetText}
            </Button>
          </Stack>
        )}
       </Stack>
     </Box>
   );
 }
