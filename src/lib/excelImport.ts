import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import { customerSchema, transactionSchema, paymentSchema } from './validation';
import { EXCEL_MAPPINGS } from './excelMappings';

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

          try {
            const validatedRow = tableConfig.schema.parse(mappedRow);
            processedRows.push(validatedRow);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'بيانات غير صالحة';
            console.error(`Row ${i + index + 2} failed validation: ${errorMessage}`);
            result.failedRows.push({
              row: i + index + 2,
              errors: [errorMessage],
            });
          }
        } catch (error) {
          console.error(`Unexpected error processing row ${i + index + 2}: ${error.message}`);
          result.failedRows.push({
            row: i + index + 2,
            errors: ['خطأ غير متوقع'],
          });
        }
      }

      if (processedRows.length > 0) {
        try {
          const { error } = await supabase
            .from(tableName)
            .insert(processedRows);

          if (error) {
            console.error(`Supabase insertion error: ${error.message}`);
            result.failedRows.push(...processedRows.map((_, index) => ({
              row: i + index + 2,
              errors: [error.message],
            })));
          } else {
            result.successCount += processedRows.length;
          }
        } catch (error) {
          console.error(`Unexpected error during Supabase insertion: ${error.message}`);
        }
      }
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'حدث خطأ أثناء الاستيراد');
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

  // Convert phone numbers to strings if they are numeric
  if (processed.mobile_number) {
    processed.mobile_number = String(processed.mobile_number);
  }
  if (processed.mobile_number2) {
    processed.mobile_number2 = String(processed.mobile_number2);
  }

  // Convert dates from Excel serial numbers if needed
  if (tableName === 'transactions' && processed.start_date) {
    try {
      const date = XLSX.SSF.parse_date_code(processed.start_date);
      processed.start_date = new Date(date.y, date.m - 1, date.d).toISOString();
    } catch (error) {
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
      const parsed = new Date(processed.payment_date);
      if (!isNaN(parsed.getTime())) {
        processed.payment_date = parsed.toISOString();
      }
    }
  }

  return processed;
};
