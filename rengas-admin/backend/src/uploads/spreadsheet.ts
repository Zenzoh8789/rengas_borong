import { BadRequestException } from "@nestjs/common";
import ExcelJS = require("exceljs");
import { extname } from "node:path";
import { Readable } from "node:stream";
import {
  assertSpreadsheetRowLimit,
  MAX_SPREADSHEET_ROWS,
  validateSpreadsheetUpload,
} from "./upload-validation";

const MAX_SHEETS = 5;
const MAX_COLUMNS = 100;

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if ("result" in value && value.result !== undefined) return value.result;
  return cell.text;
}

export async function readSpreadsheetRows(
  file?: Express.Multer.File,
): Promise<Record<string, unknown>[]> {
  validateSpreadsheetUpload(file);
  const workbook = new ExcelJS.Workbook();
  const extension = extname(file.originalname).toLowerCase();

  try {
    if (extension === ".csv") {
      await workbook.csv.read(Readable.from([file.buffer]));
    } else {
      await workbook.xlsx.load(file.buffer as any);
    }
  } catch {
    throw new BadRequestException("The selected spreadsheet cannot be read.");
  }

  if (workbook.worksheets.length > MAX_SHEETS) {
    throw new BadRequestException(`Spreadsheet may contain at most ${MAX_SHEETS} sheets.`);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new BadRequestException("Spreadsheet does not contain a sheet.");
  if (worksheet.columnCount > MAX_COLUMNS) {
    throw new BadRequestException(`Spreadsheet may contain at most ${MAX_COLUMNS} columns.`);
  }

  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: worksheet.columnCount }, (_, index) =>
    headerRow.getCell(index + 1).text.trim(),
  );
  if (!headers.some(Boolean)) {
    throw new BadRequestException("Spreadsheet does not contain a header row.");
  }

  const rows: Record<string, unknown>[] = [];
  const lastRow = Math.min(worksheet.actualRowCount, MAX_SPREADSHEET_ROWS + 2);
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const record: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = cellValue(row.getCell(index + 1));
      record[header] = value;
      if (value !== "" && value !== null && value !== undefined) hasValue = true;
    });
    if (hasValue) rows.push(record);
  }
  assertSpreadsheetRowLimit(rows.length);
  return rows;
}

export async function writeRowsToXlsx(
  rows: Array<Record<string, unknown>>,
  sheetName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  const headers = rows.length ? Object.keys(rows[0]) : ["No records"];
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(40, Math.max(12, header.length + 2)),
  }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(headers.length).address };
  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
