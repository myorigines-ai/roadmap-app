import XLSX from 'xlsx';
import path from 'path';

const EXCEL_DIR = 'C:/Users/t.mercier/Downloads/Nouveau dossier';

const files = [
  { file: '2026-Roadmap logistique.xlsx', project: 'Logistique' },
  { file: '2026-roadmap MAIA.xlsx', project: 'MAIA' },
  { file: 'Roadmap SAV.xlsx', project: 'SAV' },
  { file: 'Roadmap Veepee+GMP retour équipe 2912.xlsx', project: 'Veepee' },
  { file: 'Roadmap WIMM.xlsx', project: 'WIMM' },
];

function analyzeFile(filePath, projectName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILE: ${projectName} - ${path.basename(filePath)}`);
  console.log('='.repeat(60));

  const wb = XLSX.readFile(filePath);

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) continue;

    console.log(`\n  SHEET: "${sheetName}" (${rows.length} rows)`);
    console.log('  COLUMNS:');

    // Get all unique columns
    const allColumns = new Set();
    rows.forEach(row => Object.keys(row).forEach(k => allColumns.add(k)));

    // For each column, show sample values
    for (const col of allColumns) {
      const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = [...new Set(values.map(v => String(v).substring(0, 50)))];
      const sampleCount = Math.min(3, uniqueValues.length);
      const samples = uniqueValues.slice(0, sampleCount).join(' | ');

      console.log(`    - "${col}" (${values.length} values)`);
      if (sampleCount > 0) {
        console.log(`      Samples: ${samples}${uniqueValues.length > 3 ? '...' : ''}`);
      }
    }
  }
}

console.log('EXCEL FILES ANALYSIS');
console.log('====================\n');

for (const { file, project } of files) {
  try {
    analyzeFile(path.join(EXCEL_DIR, file), project);
  } catch (e) {
    console.error(`Failed to analyze ${file}: ${e.message}`);
  }
}
