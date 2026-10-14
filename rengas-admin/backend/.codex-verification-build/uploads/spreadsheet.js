"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSpreadsheetRows = readSpreadsheetRows;
exports.writeRowsToXlsx = writeRowsToXlsx;
const common_1 = require("@nestjs/common");
const ExcelJS = require("exceljs");
const node_path_1 = require("node:path");
const node_stream_1 = require("node:stream");
const upload_validation_1 = require("./upload-validation");
const MAX_SHEETS = 5;
const MAX_COLUMNS = 100;
function cellValue(cell) {
    const value = cell.value;
    if (value === null || value === undefined)
        return "";
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value !== "object")
        return value;
    if ("result" in value && value.result !== undefined)
        return value.result;
    return cell.text;
}
async function readSpreadsheetRows(file) {
    (0, upload_validation_1.validateSpreadsheetUpload)(file);
    const workbook = new ExcelJS.Workbook();
    const extension = (0, node_path_1.extname)(file.originalname).toLowerCase();
    try {
        if (extension === ".csv") {
            await workbook.csv.read(node_stream_1.Readable.from([file.buffer]));
        }
        else {
            await workbook.xlsx.load(file.buffer);
        }
    }
    catch {
        throw new common_1.BadRequestException("The selected spreadsheet cannot be read.");
    }
    if (workbook.worksheets.length > MAX_SHEETS) {
        throw new common_1.BadRequestException(`Spreadsheet may contain at most ${MAX_SHEETS} sheets.`);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
        throw new common_1.BadRequestException("Spreadsheet does not contain a sheet.");
    if (worksheet.columnCount > MAX_COLUMNS) {
        throw new common_1.BadRequestException(`Spreadsheet may contain at most ${MAX_COLUMNS} columns.`);
    }
    const headerRow = worksheet.getRow(1);
    const headers = Array.from({ length: worksheet.columnCount }, (_, index) => headerRow.getCell(index + 1).text.trim());
    if (!headers.some(Boolean)) {
        throw new common_1.BadRequestException("Spreadsheet does not contain a header row.");
    }
    const rows = [];
    const lastRow = Math.min(worksheet.actualRowCount, upload_validation_1.MAX_SPREADSHEET_ROWS + 2);
    for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const record = {};
        let hasValue = false;
        headers.forEach((header, index) => {
            if (!header)
                return;
            const value = cellValue(row.getCell(index + 1));
            record[header] = value;
            if (value !== "" && value !== null && value !== undefined)
                hasValue = true;
        });
        if (hasValue)
            rows.push(record);
    }
    (0, upload_validation_1.assertSpreadsheetRowLimit)(rows.length);
    return rows;
}
async function writeRowsToXlsx(rows, sheetName) {
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
//# sourceMappingURL=spreadsheet.js.map