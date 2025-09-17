import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteDataDialog } from "@/components/data/DeleteDataDialog";
import { importExcelData, readExcelFile } from '@/lib/excelImport';
import { config } from '@/lib/excelSchema';
import type { TableName, ImportResult } from '@/lib/excelImport';
import { supabase } from '@/lib/supabaseClient';

interface TableField {
  label: string;
  value: string;
}

interface TableConfig {
  name: string;
  fields: TableField[];
  requiredFields: string[];
}

const TABLE_CONFIGS: Record<TableName, TableConfig> = {
  customers: {
    name: 'العملاء',
    fields: [
      { label: 'الكود', value: 'id' },
      { label: 'الاسم', value: 'full_name' },
      { label: 'رقم الموبايل', value: 'mobile_number' },
      { label: 'رقم الموبايل 2', value: 'mobile_number2' },
    ],
    requiredFields: ['id', 'full_name', 'mobile_number']
  },
  transactions: {
    name: 'المعاملات',
    fields: [
      { label: 'رقم البيع', value: 'id' },
      { label: 'رقم العميل', value: 'customer_id' },
      { label: 'سعر السلعة', value: 'cost_price' },
      { label: 'إجمالي السعر', value: 'amount' },
      { label: 'عدد الدفعات', value: 'number_of_installments' },
      { label: 'القسط الشهرى', value: 'installment_amount' },
      { label: 'تاريخ بدء القرض', value: 'start_date' },
      { label: 'اتعاب محاماه', value: 'legal_case_details' },
    ],
    requiredFields: ['id', 'customer_id', 'amount', 'number_of_installments', 'start_date']
  },
  payments: {
    name: 'الدفعات',
    fields: [
      { label: 'رقم العميل', value: 'customer_id' },
      { label: 'رقم البيع', value: 'transaction_id' },
      { label: 'قيمة الدفعة', value: 'amount' },
      { label: 'تاريخ الدفعة', value: 'payment_date' },
      { label: 'المتبقى', value: 'balance_after' },
      { label: 'الدين المستحق', value: 'balance_before' },
      { label: 'ملاحظات', value: 'notes' },
    ],
    requiredFields: ['customer_id', 'transaction_id', 'amount', 'payment_date']
  }
};

interface PreviewData {
  [sheet: string]: Record<string, any>[];
}

interface Mapping {
  [sourceField: string]: string;
}

const DataImportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<TableName>('customers');
  const [isImporting, setIsImporting] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewData>({});
  const [mapping, setMapping] = useState<Mapping>({});

  const resetForm = () => {
    setFile(null);
    setSheets([]);
    setPreview({});
    setSelectedSheet('');
    setMapping({});
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !selectedSheet) {
        throw new Error('يرجى اختيار ملف وورقة عمل');
      }
      
      return importExcelData(file, selectedSheet, selectedTable, mapping);
    },
    onError: (error) => {
      const errorMessage = error?.message || 'حدث خطأ غير متوقع';
      toast({
        title: "فشل الاستيراد",
        description: errorMessage,
      });
    },
    onSuccess: (result) => {
      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${result.successCount} صف من البيانات${result.failedRows.length > 0 ? ` وفشل ${result.failedRows.length} صفوف` : ''}.`,
      });
      queryClient.invalidateQueries({ queryKey: [selectedTable] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSheets([]);
      setPreview({});
      setMapping({});
      
      try {
        const { sheets, preview } = await readExcelFile(selectedFile);
        setSheets(sheets);
        setPreview(preview);
        if (sheets.length > 0) {
          setSelectedSheet(sheets[0]);
        }
      } catch (error: any) {
        toast({ 
          title: "خطأ في قراءة الملف", 
          description: error.message, 
          variant: "destructive" 
        });
      } finally {
        // Add any cleanup or final actions here if needed
      }
    }
  };

  const handleMappingChange = (header: string, value: string) => {
    setMapping(prev => ({ ...prev, [header]: value }));
  };

  const validateMapping = () => {
    const mappedFields = Object.values(mapping);
    const requiredFields = TABLE_CONFIGS[selectedTable].requiredFields;
    return requiredFields.every(field => mappedFields.includes(field));
  };

  const getMappedData = () => {
    if (!selectedSheet || !preview[selectedSheet]) return [];
    
    return preview[selectedSheet].map(row => {
      const newRow: { [key: string]: any } = {};
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (row[sourceField] !== undefined) {
          newRow[targetField] = row[sourceField];
        }
      }
      return newRow;
    });
  };

  const mappedData = getMappedData();
  const isMappingValid = validateMapping();
  const headers = selectedSheet && preview[selectedSheet]?.length > 0 
    ? Object.keys(preview[selectedSheet][0]) 
    : [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">استيراد البيانات</h1>
        <DeleteDataDialog />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>الخطوة 1: اختيار نوع البيانات والملف</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">نوع البيانات</label>
              <Select value={selectedTable} onValueChange={(value: keyof typeof TABLE_CONFIGS) => setSelectedTable(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="اختر نوع البيانات" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TABLE_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">الملف (Excel أو CSV)</label>
              <div className="flex items-center gap-4">
                <Input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={handleFileChange} 
                  className="max-w-xs"
                />
              </div>
            </div>

            {sheets.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">اختر ورقة العمل</label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="اختر ورقة العمل" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map(sheet => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>الخطوة 2: ربط الأعمدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {headers.map(header => (
                <div key={header}>
                  <p className="text-sm font-medium mb-2">{header}</p>
                  <Select onValueChange={(value) => handleMappingChange(header, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحقل" />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_CONFIGS[selectedTable].fields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(mapping).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الخطوة 3: معاينة البيانات والتحقق منها</CardTitle>
          </CardHeader>
          <CardContent>
            {isMappingValid ? (
              <>
                <p className='text-sm text-muted-foreground mb-4'>
                  معاينة أول 5 سجلات من البيانات المحددة
                </p>
                <div className="border rounded-lg overflow-hidden mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {TABLE_CONFIGS[selectedTable].fields
                          .filter(field => Object.values(mapping).includes(field.value))
                          .map(field => (
                            <TableHead key={field.value}>{field.label}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedData.map((row, i) => (
                        <TableRow key={i}>
                          {TABLE_CONFIGS[selectedTable].fields
                            .filter(field => Object.values(mapping).includes(field.value))
                            .map(field => (
                              <TableCell key={field.value}>{row[field.value]}</TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending || mappedData.length === 0}
                  >
                    {importMutation.isPending ? 'جاري الاستيراد...' : 'استيراد البيانات'}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-destructive">
                يرجى ربط جميع الحقول المطلوبة ({TABLE_CONFIGS[selectedTable].requiredFields.map(f => 
                  TABLE_CONFIGS[selectedTable].fields.find(field => field.value === f)?.label
                ).join(', ')}) للمتابعة.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataImportPage;
