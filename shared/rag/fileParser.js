const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");

// Har file-type ke liye alag parser, but output same: plain text string
const parseFile = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    const workbook = XLSX.readFile(filePath);
    let fullText = "";

    // har sheet ko text mein convert karo
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      fullText += `\n\n--- Sheet: ${sheetName} ---\n${csvText}`;
    });

    return fullText;
  }

  if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filePath, "utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
};

module.exports = { parseFile };
