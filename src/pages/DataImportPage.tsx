import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteDataDialog } from "@/components/data/DeleteDataDialog";
import { readExcelFile, importData, deleteImportedData, TABLE_CONFIGS, ImportConfig } from '@/lib/importHelpers';

const DataImportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);

  const [preview, setPreview] = useState<{ [sheet: string]: any[] }>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<keyof typeof TABLE_CONFIGS>('customers');
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});

  const mutation = useMutation({
    mutationFn: async (config: ImportConfig) => {
      if (!file) throw new Error('No file selected');
      return importData(file, config);
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: data.message });
      queryClient.invalidateQueries({ queryKey: [selectedTable, 'dashboardStats'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFile(null);
    setSheets([]);
    setPreview({});
    setSelectedSheet('');
    setMapping({});
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setFile(file);
      try {
        const { sheets, preview } = await readExcelFile(file);
        setSheets(sheets);
        setPreview(preview);
        if (sheets.length > 0) {
          setSelectedSheet(sheets[0]);
        }
      } catch (error: any) {
        toast({ 
          title: "Error reading file", 
          description: error.message, 
          variant: "destructive" 
        });
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

  const handleImport = () => {
    const config: ImportConfig = {
      tableName: selectedTable,
      sheetName: selectedSheet,
      mappings: mapping
    };
    mutation.mutate(config);
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
                    onClick={handleImport} 
                    disabled={mutation.isPending || mappedData.length === 0}
                  >
                    {mutation.isPending ? 'جاري الاستيراد...' : 'استيراد البيانات'}
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
