import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "excel-data");

// ensure folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

/**
 * Append data into Excel file
 */
export const appendToExcel = (fileName, sheetName, newRow) => {
  const filePath = path.join(DATA_DIR, `${fileName}.xlsx`);

  let workbook;
  let worksheet;
  let data = [];

  // if file exists → read existing data
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);

    worksheet = workbook.Sheets[sheetName];

    if (worksheet) {
      data = XLSX.utils.sheet_to_json(worksheet);
    }
  } else {
    workbook = XLSX.utils.book_new();
  }

  // append new row
  data.push(newRow);

  // recreate sheet
  worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // write file
  XLSX.writeFile(workbook, filePath);
};