import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const EXCEL_DIR = 'C:/Users/t.mercier/Downloads/Nouveau dossier';

const files = [
  { file: '2026-Roadmap logistique.xlsx', project: 'Logistique' },
  { file: '2026-roadmap MAIA.xlsx', project: 'MAIA' },
  { file: 'Roadmap SAV.xlsx', project: 'SAV' },
  { file: 'Roadmap Veepee+GMP retour équipe 2912.xlsx', project: 'Veepee' },
  { file: 'Roadmap WIMM.xlsx', project: 'WIMM' },
];

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Excel serial date (number)
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();

  // Format: dd/mm/yyyy or dd/mm/yy (numeric)
  const numericMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    let year = parseInt(numericMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // Format: dd/month./yy or dd/month/yy (French)
  const frenchMatch = str.match(/^(\d{1,2})\/([a-zéûô]+)\.?\/(\d{2,4})/i);
  if (frenchMatch) {
    const months = {
      'janv': 0, 'jan': 0, 'janvier': 0,
      'févr': 1, 'fev': 1, 'fevr': 1, 'février': 1,
      'mars': 2, 'mar': 2,
      'avr': 3, 'avril': 3,
      'mai': 4,
      'juin': 5, 'jun': 5,
      'juil': 6, 'juill': 6, 'juillet': 6,
      'août': 7, 'aout': 7, 'ao': 7,
      'sept': 8, 'sep': 8, 'septembre': 8,
      'oct': 9, 'octobre': 9,
      'nov': 10, 'novembre': 10,
      'déc': 11, 'dec': 11, 'décembre': 11
    };
    const day = parseInt(frenchMatch[1]);
    const monthStr = frenchMatch[2].toLowerCase();
    let year = parseInt(frenchMatch[3]);
    if (year < 100) year += 2000;
    const month = months[monthStr];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Try native parsing as last resort
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function extractJiraKey(row) {
  // Look for JIRA key pattern in various fields
  for (const val of Object.values(row)) {
    if (typeof val === 'string') {
      const match = val.match(/(SIDEV|SUPPIT|PROJ)-\d+/);
      if (match) return match[0];
    }
  }
  return null;
}

function extractJiraUrl(row) {
  for (const val of Object.values(row)) {
    if (typeof val === 'string' && val.includes('atlassian.net/browse/')) {
      return val;
    }
  }
  return null;
}

async function importFile(filePath, projectName) {
  console.log(`\nImporting: ${filePath} -> ${projectName}`);

  const wb = XLSX.readFile(filePath);
  let imported = 0;
  let errors = 0;

  for (const sheetName of wb.SheetNames) {
    console.log(`  Sheet: ${sheetName}`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    for (const row of rows) {
      try {
        // Skip header rows or empty rows
        const values = Object.values(row).filter(v => v !== null);
        if (values.length < 2) continue;

        // Extract data with flexible field matching
        const jiraKey = extractJiraKey(row);
        const jiraUrl = extractJiraUrl(row);

        // Find summary/description field
        let summary = row['Résumé'] || row['Description'] || row['Summary'] || row['Titre'];
        if (!summary) {
          // Try to find a long text field that could be the summary
          for (const [key, val] of Object.entries(row)) {
            if (typeof val === 'string' && val.length > 20 && !val.includes('http')) {
              summary = val;
              break;
            }
          }
        }
        if (!summary) continue; // Skip if no summary found

        // Extract status
        let status = row['État'] || row['Etat'] || row["Etat d'avancement"] ||
                     row["Etat d'avancement "] || row['Status'] || row['Statut'] || 'À définir';

        // Extract priority
        let businessPriority = row['Priorité'] || row['Priorité Laurine'] || row['Priority'];
        if (typeof businessPriority === 'string') {
          const num = parseInt(businessPriority);
          businessPriority = isNaN(num) ? null : num;
        }

        // Extract Jira priority
        const jiraPriority = row['Priorité Jira'] ||
          (typeof row['Priorité'] === 'string' && ['high', 'medium', 'low'].includes(row['Priorité'].toLowerCase())
            ? row['Priorité'] : null);

        // Extract comment
        const comment = row['Commentaire'] || row['Commentaire IT'] || row['Comments'] || row['Note'];

        // Extract creation date - try multiple column names
        let createdAt = parseDate(row['Création']) ||
                        parseDate(row['Date']) ||
                        parseDate(row['Created']) ||
                        parseDate(row['Date de création']);

        // If no date found in standard columns, search all columns for date values
        if (!createdAt) {
          for (const [key, val] of Object.entries(row)) {
            // Skip if it's likely not a date column
            if (key.toLowerCase().includes('mise à jour') || key.toLowerCase().includes('update')) continue;

            const parsed = parseDate(val);
            if (parsed && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
              createdAt = parsed;
              break;
            }
          }
        }

        // Check if card already exists
        if (jiraKey) {
          const existing = await prisma.card.findUnique({ where: { jiraKey } });
          if (existing) {
            // Update existing card
            await prisma.card.update({
              where: { jiraKey },
              data: {
                summary: summary || existing.summary,
                status: status || existing.status,
                businessPriority: businessPriority ?? existing.businessPriority,
                comment: comment || existing.comment,
                project: projectName
              }
            });
            console.log(`    Updated: ${jiraKey}`);
            imported++;
            continue;
          }
        }

        // Create new card - use Jan 1 2025 as fallback for unknown dates (use UTC to avoid timezone issues)
        const dateKnown = !!createdAt;
        const finalDate = createdAt || new Date('2025-01-01T12:00:00Z');
        await prisma.card.create({
          data: {
            jiraKey,
            jiraUrl,
            summary,
            status,
            jiraPriority,
            businessPriority,
            project: projectName,
            comment,
            createdAt: finalDate,
            dateKnown
          }
        });
        const dateInfo = dateKnown ? '' : ' [date inconnue]';
        console.log(`    Created: ${jiraKey || summary.substring(0, 30)}...${dateInfo}`);
        imported++;

      } catch (error) {
        console.error(`    Error: ${error.message}`);
        errors++;
      }
    }
  }

  return { imported, errors };
}

async function main() {
  console.log('Starting Excel import...\n');

  let totalImported = 0;
  let totalErrors = 0;

  for (const { file, project } of files) {
    const filePath = path.join(EXCEL_DIR, file);
    try {
      const { imported, errors } = await importFile(filePath, project);
      totalImported += imported;
      totalErrors += errors;
    } catch (error) {
      console.error(`Failed to import ${file}: ${error.message}`);
      totalErrors++;
    }
  }

  console.log('\n========================================');
  console.log(`Import complete: ${totalImported} cards imported, ${totalErrors} errors`);

  // Show summary
  const counts = await prisma.card.groupBy({
    by: ['project'],
    _count: { id: true }
  });
  console.log('\nCards per project:');
  for (const c of counts) {
    console.log(`  ${c.project}: ${c._count.id}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
