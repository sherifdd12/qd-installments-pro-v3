import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import { customerSchema, transactionSchema, paymentSchema } from './validation';

export interface ExcelRow {
  [key: string]: string | number | null;
}

export interface ImportError {
  row: number;
  errors: string[];
}

export interface ImportResult {
  successCount: number;
  failedRows: ImportError[];
}

import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import { config } from './excelSchema';

export type TableName = keyof typeof config.tables;

export interface ImportError {
  row: number;
  errors: string[];
}

export interface ImportResult {
  successCount: number;
  failedRows: ImportError[];
}

export interface ExcelPreview {
  sheets: string[];
  preview: Record<string, any[]>;
}

const CHUNK_SIZE = 100;

const processDate = (value: any): string | null => {
  if (!value) return null;

  try {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  } catch {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return null;
  }
};

const processNumber = (value: any): number | null => {
  if (value === undefined || value === null) return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
};

export const readExcelFile = async (file: File): Promise<ExcelPreview> => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    const sheets = workbook.SheetNames;
    const preview: Record<string, any[]> = {};
    
    for (const sheet of sheets) {
      const worksheet = workbook.Sheets[sheet];
      preview[sheet] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      }).slice(0, 10);
    }
    
    return { sheets, preview };
  } catch (error) {
    throw new Error('فشل قراءة ملف الإكسل');
  }
};

export const importExcelData = async (
  file: File,
  sheetName: string,
  tableName: TableName,
  mappings: Record<string, string>
): Promise<ImportResult> => {
  const result: ImportResult = {
    successCount: 0,
    failedRows: [],
  };

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`لم يتم العثور على ورقة العمل "${sheetName}"`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    }) as Record<string, any>[];

    const tableConfig = config.tables[tableName];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const processedRows: Record<string, any>[] = [];

      for (const [index, row] of chunk.entries()) {
        try {
          const mappedRow: Record<string, any> = {
            created_at: new Date().toISOString(),
          };

          for (const [source, target] of Object.entries(mappings)) {
            if (row[source] === undefined) continue;

            switch (target) {
              case 'id':
              case 'customer_id':
              case 'transaction_id':
              case 'number_of_installments':
                mappedRow[target] = processNumber(row[source]);
                break;

              case 'amount':
              case 'cost_price':
              case 'installment_amount':
              case 'balance_before':
              case 'balance_after':
                mappedRow[target] = processNumber(row[source]);
                break;

              case 'start_date':
              case 'payment_date':
                mappedRow[target] = processDate(row[source]);
                break;

              default:
                mappedRow[target] = row[source];
            }
          }

          if (tableName === 'transactions') {
            mappedRow.status = 'active';
            mappedRow.has_legal_case = Boolean(mappedRow.legal_case_details);
          }

          const validatedRow = tableConfig.schema.parse(mappedRow);
          processedRows.push(validatedRow);

        } catch (error) {
          result.failedRows.push({
            row: i + index + 2,
            errors: error instanceof Error ? [error.message] : ['بيانات غير صالحة'],
          });
        }
      }

      if (processedRows.length > 0) {
        const { error } = await supabase
          .from(tableName)
          .insert(processedRows);

        if (error) {
          result.failedRows.push(...processedRows.map((_, index) => ({
            row: i + index + 2,
            errors: [error.message],
          })));
        } else {
          result.successCount += processedRows.length;
        }
      }
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'حدث خطأ أثناء الاستيراد');
  }
};
  file: File,
  sheetName: string,
  tableName: keyof typeof config.tables,
  mappings: Record<string, string>
): Promise<ImportResult> => {
  const result: ImportResult = {
    successCount: 0,
    failedRows: [],
  };

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`لم يتم العثور على ورقة العمل "${sheetName}"`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    }) as Record<string, any>[];

    const tableConfig = config.tables[tableName];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const processedRows: Record<string, any>[] = [];

      // Process each row
      for (const [index, row] of chunk.entries()) {
        try {
          const mappedRow: Record<string, any> = {
            created_at: new Date().toISOString(),
          };

          // Map fields
          for (const [source, target] of Object.entries(mappings)) {
            if (row[source] === undefined) continue;

            // Handle different field types
            switch (target) {
              case 'id':
              case 'customer_id':
              case 'transaction_id':
              case 'number_of_installments':
                mappedRow[target] = processNumber(row[source]);
                break;

              case 'amount':
              case 'cost_price':
              case 'installment_amount':
              case 'balance_before':
              case 'balance_after':
                mappedRow[target] = processNumber(row[source]);
                break;

              case 'start_date':
              case 'payment_date':
                mappedRow[target] = processDate(row[source]);
                break;

              default:
                mappedRow[target] = row[source];
            }
          }

          // Additional processing for transactions
          if (tableName === 'transactions') {
            mappedRow.status = 'active';
            mappedRow.has_legal_case = Boolean(mappedRow.legal_case_details);
          }

          // Validate
          const validatedRow = tableConfig.schema.parse(mappedRow);
          processedRows.push(validatedRow);

        } catch (error) {
          result.failedRows.push({
            row: i + index + 2,
            errors: error instanceof Error ? [error.message] : ['بيانات غير صالحة'],
          });
        }
      }

      // Insert valid rows
      if (processedRows.length > 0) {
        const { error } = await supabase
          .from(tableName)
          .insert(processedRows);

        if (error) {
          result.failedRows.push(...processedRows.map((_, index) => ({
            row: i + index + 2,
            errors: [error.message],
          })));
        } else {
          result.successCount += processedRows.length;
        }
      }
    }

    return result;

  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'حدث خطأ أثناء الاستيراد');
  }
};

const processDate = (value: any): string | null => {
  if (!value) return null;

  try {
    // Try parsing as Excel date number
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  } catch {
    // Try parsing as string date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return null;
  }
};

const processNumber = (value: any): number | null => {
  if (value === undefined || value === null) return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
};

export const importExcelData = async (
  file: File,
  sheetName: string,
  tableName: keyof typeof config.tables,
  sourceToTargetMap: Record<string, string>
): Promise<ImportResult> => {
  const result: ImportResult = {
    successCount: 0,
    failedRows: [],
  };

  try {
    // Read Excel file
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`لم يتم العثور على ورقة العمل "${sheetName}"`);
    }

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    }) as Record<string, any>[];

    // Process rows in chunks
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const processedRows: Record<string, any>[] = [];
    'قيمة الدفعة': 'amount',
    'تاريخ الدفعة': 'payment_date',
    'المتبقى': 'balance_after',
    'الدين المستحق': 'balance_before',
    'notes': 'notes'
  }
};

const getSchemaForTable = (tableName: keyof typeof EXCEL_MAPPINGS) => {
  switch (tableName) {
    case 'customers':
      return customerSchema;
    case 'transactions':
      return transactionSchema;
    case 'payments':
      return paymentSchema;
  }
};

const preprocessRow = (row: Record<string, any>, tableName: keyof typeof EXCEL_MAPPINGS) => {
  const processed = { ...row };

  // Convert dates from Excel serial numbers if needed
  if (tableName === 'transactions' && processed.start_date) {
    try {
      const date = XLSX.SSF.parse_date_code(processed.start_date);
      processed.start_date = new Date(date.y, date.m - 1, date.d).toISOString();
    } catch (error) {
      // If not a serial number, try parsing as is
      const parsed = new Date(processed.start_date);
      if (!isNaN(parsed.getTime())) {
        processed.start_date = parsed.toISOString();
      }
    }
  }

  if (tableName === 'payments' && processed.payment_date) {
    try {
      const date = XLSX.SSF.parse_date_code(processed.payment_date);
      processed.payment_date = new Date(date.y, date.m - 1, date.d).toISOString();
    } catch (error) {
      // If not a serial number, try parsing as is
      const parsed = new Date(processed.payment_date);
      if (!isNaN(parsed.getTime())) {
        processed.payment_date = parsed.toISOString();
      }
    }
  }

  return processed;
};

export const importExcelData = async (
  file: File,
  sheetName: string,
  tableName: keyof typeof EXCEL_MAPPINGS,
  mappings: Record<string, string>
): Promise<ImportResult> => {
  const schema = getSchemaForTable(tableName);
  const result: ImportResult = {
    successCount: 0,
    failedRows: []
  };

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`لم يتم العثور على ورقة العمل "${sheetName}"`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: null
    }) as ExcelRow[];

    // Process rows in chunks to avoid overwhelming the database
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const processedRows = chunk.map((row, index) => {
        const mappedRow: Record<string, any> = {};
        
        try {
          // Map fields according to the provided mappings
          for (const [sourceField, targetField] of Object.entries(mappings)) {
            if (row[sourceField] !== undefined) {
              mappedRow[targetField] = row[sourceField];
            }
          }

          // Preprocess the row (handle dates, etc.)
          const processedRow = preprocessRow(mappedRow, tableName);
          
          // Validate the row
          schema.parse(processedRow);

          return { success: true, data: processedRow };
        } catch (error) {
          result.failedRows.push({
            row: i + index + 2, // +2 because Excel is 1-based and we have header row
            errors: error instanceof Error ? [error.message] : ['Invalid data']
          });
          return { success: false, data: null };
        }
      });

      const validRows = processedRows
        .filter((r): r is { success: true, data: Record<string, any> } => 
          r.success && r.data !== null
        )
        .map(r => r.data);

      if (validRows.length > 0) {
        const { error } = await supabase
          .from(tableName)
          .insert(validRows);

        if (error) {
          // If there's a database error, mark all rows in this chunk as failed
          result.failedRows.push(...validRows.map((_, index) => ({
            row: i + index + 2,
            errors: [error.message]
          })));
        } else {
          result.successCount += validRows.length;
        }
      }
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'حدث خطأ أثناء الاستيراد');
  }
};
    'قيمة الدفعة': 'amount',
    'تاريخ الدفعة': 'payment_date',
    'المتبقى': 'balance_after',
    'الدين المستحق': 'balance_before',
    'notes': 'notes'
  }
};

export const importExcelData = async (file: File, sheetName: string, tableName: keyof typeof EXCEL_MAPPINGS) => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`لم يتم العثور على ورقة العمل "${sheetName}"`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: null
    }) as ExcelRow[];

    const mappings = EXCEL_MAPPINGS[tableName];
    const validRows: any[] = [];
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        const mappedRow: any = {
          created_at: new Date().toISOString()
        };

        // Add default values for transactions
        if (tableName === 'transactions') {
          mappedRow.status = 'active';
          mappedRow.has_legal_case = false;
        }

        // Map and validate fields
        for (const [excelField, dbField] of Object.entries(mappings)) {
          const value = row[excelField];

          // Handle different field types
          switch (dbField) {
            case 'id':
            case 'customer_id':
            case 'transaction_id':
            case 'number_of_installments':
              mappedRow[dbField] = value ? parseInt(String(value), 10) : null;
              if (isNaN(mappedRow[dbField])) {
                throw new Error(`قيمة غير صحيحة للحقل "${excelField}" في السطر ${index + 2}`);
              }
              break;

            case 'amount':
            case 'cost_price':
            case 'installment_amount':
            case 'balance_before':
            case 'balance_after':
              mappedRow[dbField] = value ? parseFloat(String(value)) : null;
              if (isNaN(mappedRow[dbField])) {
                throw new Error(`قيمة غير صحيحة للحقل "${excelField}" في السطر ${index + 2}`);
              }
              break;

            case 'start_date':
            case 'payment_date':
              try {
                if (!value) {
                  mappedRow[dbField] = null;
                  break;
                }
                const date = new Date(String(value));
                if (isNaN(date.getTime())) throw new Error();
                mappedRow[dbField] = date.toISOString().split('T')[0];
              } catch {
                throw new Error(`تاريخ غير صحيح في الحقل "${excelField}" في السطر ${index + 2}`);
              }
              break;

            default:
              mappedRow[dbField] = value;
          }
        }

        validRows.push(mappedRow);
      } catch (error: any) {
        errors.push(error.message);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        message: `تم العثور على ${errors.length} أخطاء في البيانات`
      };
    }

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(validRows);

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      message: `تم استيراد ${validRows.length} صفوف بنجاح`,
      rowCount: validRows.length
    };

  } catch (error: any) {
    return {
      success: false,
      message: `فشل استيراد البيانات: ${error.message}`,
      error
    };
  }
};
