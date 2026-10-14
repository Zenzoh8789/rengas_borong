export declare function readSpreadsheetRows(file?: Express.Multer.File): Promise<Record<string, unknown>[]>;
export declare function writeRowsToXlsx(rows: Array<Record<string, unknown>>, sheetName: string): Promise<Buffer>;
