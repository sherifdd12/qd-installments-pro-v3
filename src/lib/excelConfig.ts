import { z } from 'zod';

export interface TableConfig<T> {
  name: string;
  mappings: Record<string, string>;
  schema: z.ZodSchema<T>;
}

export interface Config {
  tables: {
    customers: TableConfig<any>;
    transactions: TableConfig<any>;
    payments: TableConfig<any>;
  };
}

export const defineConfig = (config: Config): Config => config;
