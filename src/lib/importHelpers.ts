import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';



export type TableName = keyof typeof TABLE_CONFIGS;

export interface ImportConfig {
  tableName: TableName;
  sheetName: string;
  mappings: { [key: string]: string };
}

export const readExcelFile = (file: File): Promise<{
  sheets: string[];
  preview: { [sheet: string]: any[] };
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = workbook.SheetNames;
        const preview: { [sheet: string]: any[] } = {};
        
        sheets.forEach(sheet => {
          const worksheet = workbook.Sheets[sheet];
          preview[sheet] = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: '',
            blankrows: false
          }).slice(0, 5); // Preview first 5 rows
        });

        resolve({ sheets, preview });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const getTableFields = async (tableName: string) => {
  const { data, error } = await supabase
    .from(tableName)
    .select()
    .limit(1);

  if (error) throw error;

  // Get column names from the first row
  return data.length > 0 ? Object.keys(data[0]) : [];
};

export const deleteImportedData = async (tableName: TableName, olderThanHours?: number) => {
  try {
    let query = supabase.from(tableName).delete();
    
    if (olderThanHours) {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);
      query = query.gte('created_at', cutoffTime.toISOString());
    }

    const { error } = await query;
    
    if (error) throw error;

    return {
      message: olderThanHours 
        ? `تم حذف البيانات المستوردة في آخر ${olderThanHours} ساعة من ${TABLE_CONFIGS[tableName].name}`
        : `تم حذف جميع البيانات من ${TABLE_CONFIGS[tableName].name}`
    };
  } catch (error: any) {
    throw new Error(`فشل حذف البيانات: ${error.message}`);
  }
};

export const importData = async (
  file: File,
  config: ImportConfig
) => {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const worksheet = workbook.Sheets[config.sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
          blankrows: false
        });

        if (config.tableName === 'transactions') {
          // For transactions, we need to lookup customer_id from sequence_number
          const { data: customers } = await supabase
            .from('customers')
            .select('id, sequence_number');

          if (!customers) {
            throw new Error('فشل في جلب بيانات العملاء للتحقق');
          }

          const customerMap = new Map();
          customers.forEach(c => {
            if (c.sequence_number) {
              // Try both string and number formats
              customerMap.set(c.sequence_number.toString(), c.id);
              customerMap.set(Number(c.sequence_number).toString(), c.id);
            }
          });

          // Collect valid rows and errors
          const validRows: any[] = [];
          const errors: string[] = [];

          jsonData.forEach((row, index) => {
            try {
              const newRow: { [key: string]: any } = {
                created_at: new Date().toISOString(),
                status: 'active',
                has_legal_case: false
              };

              let isValid = true;

              // Process each field
              for (const [sourceField, targetField] of Object.entries(config.mappings)) {
                // Skip if field is undefined and not required
                if (row[sourceField] === undefined && 
                    !TABLE_CONFIGS.transactions.requiredFields.includes(targetField)) {
                  continue;
                }

                try {
                  switch (targetField) {
                    case 'customer_id':
                      const customerId = customerMap.get(row[sourceField].toString());
                      if (!customerId) {
                        throw new Error(`لم يتم العثور على عميل برقم ${row[sourceField]}`);
                      }
                      newRow[targetField] = customerId;
                      break;

                    case 'cost_price':
                    case 'extra_price':
                    case 'installment_amount':
                      const amount = Number(row[sourceField]);
                      if (isNaN(amount) || amount <= 0) {
                        throw new Error(`قيمة غير صالحة في حقل ${targetField}`);
                      }
                      newRow[targetField] = amount;
                      break;

                    case 'number_of_installments':
                      const installments = row[sourceField] ? Number(row[sourceField]) : 0;
                      if (!Number.isInteger(installments) || installments < 0) {
                        throw new Error('عدد الدفعات يجب أن يكون رقماً صحيحاً');
                      }
                      newRow[targetField] = installments;
                      break;

                    case 'start_date':
                      const date = new Date(row[sourceField]);
                      if (isNaN(date.getTime())) {
                        throw new Error('تاريخ غير صالح');
                      }
                      newRow[targetField] = date.toISOString().split('T')[0];
                      break;

                    default:
                      newRow[targetField] = row[sourceField];
                  }
                } catch (fieldError: any) {
                  errors.push(`خطأ في الصف ${index + 2}: ${fieldError.message}`);
                  isValid = false;
                  break;
                }
              }

              if (isValid) {
                // Calculate derived fields
                newRow.amount = Number(newRow.cost_price) + Number(newRow.extra_price);
                newRow.remaining_balance = newRow.amount;
                validRows.push(newRow);
              }
            } catch (rowError: any) {
              errors.push(`خطأ في الصف ${index + 2}: ${rowError.message}`);
            }
          });

          if (validRows.length === 0) {
            throw new Error('لم يتم العثور على أي بيانات صالحة للاستيراد\n' + errors.join('\n'));
          }

          // Import valid rows to Supabase
          const { data: result, error } = await supabase
            .from(config.tableName)
            .insert(validRows)
            .select();

          if (error) throw error;

          resolve({
            imported: validRows.length,
            message: validRows.length === jsonData.length
              ? `تم استيراد ${validRows.length} من المعاملات بنجاح`
              : `تم استيراد ${validRows.length} من المعاملات بنجاح\nتم تخطي ${jsonData.length - validRows.length} صفوف بسبب الأخطاء:\n${errors.join('\n')}`
          });
        } else {
          // For other tables, proceed with normal import
          const mappedData = await Promise.all(jsonData.map(async row => {
            const newRow: { [key: string]: any } = {
              created_at: new Date().toISOString()
            };
            for (const [sourceField, targetField] of Object.entries(config.mappings)) {
              if (row[sourceField] !== undefined) {
                if (targetField === 'id') {
                  // Convert the كود value to a UUID format if it's not already
                  const idValue = row[sourceField].toString();
                  try {
                    // Check if it's already a valid UUID
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idValue)) {
                      newRow[targetField] = idValue;
                    } else {
                      // Generate a deterministic UUID from the ID value
                      const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // A fixed namespace UUID
                      const { data: uuidData } = await supabase.rpc('gen_random_uuid');
                      newRow[targetField] = uuidData;
                    }
                  } catch {
                    // If there's any error, generate a random UUID
                    const { data: uuidData } = await supabase.rpc('gen_random_uuid');
                    newRow[targetField] = uuidData;
                  }
                } else {
                  newRow[targetField] = row[sourceField];
                }
              }
            }
            return newRow;
          }));

          // Import to Supabase
          const { data: result, error } = await supabase
            .from(config.tableName)
            .insert(mappedData)
            .select();

          if (error) throw error;

          resolve({
            imported: mappedData.length,
            message: `تم استيراد ${mappedData.length} من السجلات بنجاح`
          });
        }
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const TABLE_CONFIGS = {
  customers: {
    name: 'العملاء',
    requiredFields: ['full_name', 'mobile_number'],
    fields: [
      { value: 'id', label: 'كود' },
      { value: 'sequence_number', label: 'م العميل' },
      { value: 'full_name', label: 'الاسم الكامل' },
      { value: 'mobile_number', label: 'رقم الهاتف' },
      { value: 'mobile_number2', label: 'رقم الهاتف 2' },
      { value: 'civil_id', label: 'الرقم المدني' }
    ]
  },
  transactions: {
    name: 'المعاملات',
    requiredFields: ['customer_id', 'cost_price', 'extra_price', 'installment_amount', 'start_date'],
    fields: [
      { value: 'sequence_number', label: 'رقم البيع' },
      { value: 'customer_id', label: 'رقم العميل' },
      { value: 'cost_price', label: 'سعر السلعة' },
      { value: 'extra_price', label: 'السعر الاضافى' },
      { value: 'amount', label: 'إجمالي السعر' },
      { value: 'installment_amount', label: 'قيمة القسط' },
      { value: 'number_of_installments', label: 'عدد الدفعات' },
      { value: 'start_date', label: 'تاريخ البدء' },
      { value: 'notes', label: 'ملاحظات' },
      { value: 'status', label: 'الحالة', defaultValue: 'active' },
      { value: 'has_legal_case', label: 'قضية قانونية', defaultValue: false }
    ]
  },
  payments: {
    name: 'المدفوعات',
    requiredFields: ['transaction_id', 'customer_id', 'amount', 'payment_date'],
    fields: [
      { value: 'transaction_id', label: 'معرف المعاملة' },
      { value: 'customer_id', label: 'معرف العميل' },
      { value: 'amount', label: 'المبلغ' },
      { value: 'payment_date', label: 'تاريخ الدفع' },
      { value: 'notes', label: 'ملاحظات' }
    ]
  },

};
