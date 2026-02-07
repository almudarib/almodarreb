 'use client';
 
 import * as React from 'react';
 import { Button } from '@/components/ui';
 import * as XLSX from 'xlsx';
 
 export type NoticeSeverity = 'success' | 'error' | 'warning';
 
 export type ExportSheet = {
   name: string;
   header?: string[];
   rows: Array<Record<string, unknown>>;
 };
 
 export default function ExportDataButton({
   label,
   disabled,
   onNotice,
   build,
 }: {
   label: string;
   disabled?: boolean;
   onNotice?: (message: string, severity: NoticeSeverity) => void;
   build: () => Promise<{ fileName: string; sheets: ExportSheet[] }>;
 }) {
   const [loading, setLoading] = React.useState(false);
 
   function sanitizeSheetName(name: string): string {
     const illegal = /[:\\/?*\[\]]/g;
     let n = name.replace(illegal, ' ').trim();
     if (n.length === 0) n = 'ورقة';
     if (n.length > 31) n = n.slice(0, 31);
     return n;
   }
 
   function sanitizeFilename(name: string): string {
     const illegal = /[<>:"/\\|?*\x00-\x1F]/g;
     const clean = name.replace(illegal, '_').trim() || 'ملف';
     const d = new Date();
     const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
     return `${clean}_${stamp}.xlsx`;
   }
 
   async function handleClick() {
     if (loading) return;
     setLoading(true);
     onNotice?.('بدء التصدير...', 'success');
     try {
       const { fileName, sheets } = await build();
       const wb = XLSX.utils.book_new();
       for (const s of sheets) {
         const ws = XLSX.utils.json_to_sheet(s.rows, { header: s.header, skipHeader: false });
         XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(s.name));
       }
       const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
       const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = sanitizeFilename(fileName);
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
       onNotice?.('تم إنشاء الملف وتنزيله بنجاح', 'success');
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير';
       onNotice?.(msg, 'error');
     } finally {
       setLoading(false);
     }
   }
 
   return (
     <Button variant="contained" disabled={disabled || loading} onClick={handleClick}>
       {loading ? 'جاري التصدير...' : label}
     </Button>
   );
 }
 
