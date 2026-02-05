import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();
const EXCEL_DIR = 'C:/Users/t.mercier/Downloads/Nouveau dossier';

const files = [
  { file: '2026-Roadmap logistique.xlsx', project: 'Logistique' },
  { file: '2026-roadmap MAIA.xlsx', project: 'MAIA' },
  { file: 'Roadmap SAV.xlsx', project: 'SAV' },
  { file: 'Roadmap Veepee+GMP retour équipe 2912.xlsx', project: 'Veepee' },
  { file: 'Roadmap WIMM.xlsx', project: 'WIMM' },
];

// Custom columns definitions per project
const projectCustomColumns = {
  'Logistique': [
    { name: 'Priorité Logistique', type: 'text' }
  ],
  'MAIA': [
    { name: 'Type de ticket', type: 'text' },
    { name: 'Priorité Laurine', type: 'number' }
  ],
  'SAV': [
    { name: 'Projet SAV', type: 'text' },
    { name: 'Sprint', type: 'text' },
    { name: 'Ticket JIRA Associé', type: 'text' }
  ],
  'Veepee': [
    { name: 'Projet Veepee', type: 'text' },
    { name: 'Sprint', type: 'text' },
    { name: 'Ticket JIRA lié', type: 'text' },
    { name: 'Priorité Nastia', type: 'number' }
  ],
  'WIMM': [
    { name: 'Sprint', type: 'text' },
    { name: 'Ticket JIRA Associé', type: 'text' }
  ]
};

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();

  const numericMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    let year = parseInt(numericMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

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

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function extractJiraKey(row) {
  for (const val of Object.values(row)) {
    if (typeof val === 'string') {
      const match = val.match(/(SIDEV|SUPPIT|SIOVERVIEW|PROJ)-\d+/);
      if (match) return match[0];
    }
  }
  return null;
}

function extractJiraUrl(row) {
  for (const val of Object.values(row)) {
    if (typeof val === 'string' && val.includes('atlassian.net/browse/')) {
      return val.trim();
    }
  }
  return null;
}

function getValue(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return null;
}

function getStringValue(row, ...keys) {
  const val = getValue(row, ...keys);
  return val ? String(val).trim() : null;
}

async function createCustomColumns() {
  console.log('Creating custom columns...');

  const columnMap = {}; // project -> columnName -> columnId

  for (const [project, columns] of Object.entries(projectCustomColumns)) {
    columnMap[project] = {};

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      try {
        const created = await prisma.customColumn.upsert({
          where: { project_name: { project, name: col.name } },
          create: { project, name: col.name, type: col.type, position: i },
          update: { type: col.type, position: i }
        });
        columnMap[project][col.name] = created.id;
        console.log(`  Created/Updated: ${project} -> ${col.name}`);
      } catch (e) {
        console.error(`  Error creating column ${col.name}: ${e.message}`);
      }
    }
  }

  return columnMap;
}

async function importFile(filePath, projectName, columnMap) {
  console.log(`\nImporting: ${path.basename(filePath)} -> ${projectName}`);

  const wb = XLSX.readFile(filePath);
  let imported = 0;
  let errors = 0;

  for (const sheetName of wb.SheetNames) {
    console.log(`  Sheet: ${sheetName}`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    for (const row of rows) {
      try {
        const values = Object.values(row).filter(v => v !== null);
        if (values.length < 2) continue;

        // Extract core data
        const jiraKey = extractJiraKey(row);
        const jiraUrl = extractJiraUrl(row);

        // Summary - try multiple columns
        let summary = getStringValue(row,
          'Résumé', 'Description', 'Summary', 'Titre',
          'Backlog logistique (mise à jour le 29/01/2025)',
          'Détails des développements liés à Parcel Cube',
          '__EMPTY_1'
        );

        // If still no summary, find longest text
        if (!summary) {
          for (const [key, val] of Object.entries(row)) {
            if (typeof val === 'string' && val.length > 20 && !val.includes('http') && !key.includes('EMPTY')) {
              summary = val.trim();
              break;
            }
          }
        }
        if (!summary || summary.length < 5) continue;

        // Skip header rows
        if (['Résumé', 'Description', 'Ticket JIRA', 'Clé de ticket', 'Type de ticket'].includes(summary)) continue;

        // Status
        let status = getStringValue(row,
          'État', 'Etat', "Etat d'avancement", "Etat d'avancement ", 'Status', 'Statut',
          '__EMPTY_2'
        ) || 'À définir';

        // Skip if status is a header
        if (['État', 'Etat', 'Status', 'Priorité'].includes(status)) {
          status = 'À définir';
        }

        // Business priority (numeric)
        let businessPriority = null;
        const prioVal = getValue(row, 'Priorité', 'Prioté Nastia', 'Priorité Laurine', '__EMPTY_1');
        if (prioVal !== null) {
          const num = parseInt(String(prioVal).replace(/[^\d]/g, ''));
          if (!isNaN(num) && num >= 1 && num <= 100) {
            businessPriority = num;
          }
        }

        // Jira priority (text like high/medium/low)
        let jiraPriority = null;
        const jpVal = getStringValue(row, 'Priorité', '__EMPTY_3');
        if (jpVal && ['high', 'medium', 'low', 'highest', 'lowest'].includes(jpVal.toLowerCase())) {
          jiraPriority = jpVal;
        }

        // Comment
        const comment = getStringValue(row,
          'Commentaire', 'Commentaire IT', 'Comments', 'Note',
          '__EMPTY_3', '__EMPTY_6'
        );

        // Creation date
        let createdAt = parseDate(getValue(row, 'Création', 'Date', 'Created', 'Date de création', '__EMPTY_5'));
        if (!createdAt) {
          for (const [key, val] of Object.entries(row)) {
            if (key.toLowerCase().includes('mise à jour') || key.toLowerCase().includes('update')) continue;
            const parsed = parseDate(val);
            if (parsed && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
              createdAt = parsed;
              break;
            }
          }
        }

        const dateKnown = !!createdAt;
        const finalDate = createdAt || new Date('2025-01-01T12:00:00Z');

        // Custom field values to save
        const customValues = [];
        const projectColumns = columnMap[projectName] || {};

        // Project-specific custom fields
        if (projectName === 'Logistique') {
          const prioLog = getStringValue(row, '__EMPTY_1');
          if (prioLog && projectColumns['Priorité Logistique']) {
            customValues.push({ columnId: projectColumns['Priorité Logistique'], value: prioLog });
          }
        }

        if (projectName === 'MAIA') {
          const typeTicket = getStringValue(row, 'Type de ticket');
          if (typeTicket && projectColumns['Type de ticket']) {
            customValues.push({ columnId: projectColumns['Type de ticket'], value: typeTicket });
          }
          const prioLaurine = getValue(row, 'Priorité Laurine', '__EMPTY_4');
          if (prioLaurine !== null && projectColumns['Priorité Laurine']) {
            customValues.push({ columnId: projectColumns['Priorité Laurine'], value: String(prioLaurine) });
          }
        }

        if (projectName === 'SAV') {
          const projetSav = getStringValue(row, 'Champs personnalisés (Projet)');
          if (projetSav && projectColumns['Projet SAV']) {
            customValues.push({ columnId: projectColumns['Projet SAV'], value: projetSav });
          }
          const sprint = getStringValue(row, 'Sprint');
          if (sprint && projectColumns['Sprint']) {
            customValues.push({ columnId: projectColumns['Sprint'], value: sprint });
          }
          const ticketAssocie = getStringValue(row, 'Ticket JIRA Associé');
          if (ticketAssocie && projectColumns['Ticket JIRA Associé']) {
            customValues.push({ columnId: projectColumns['Ticket JIRA Associé'], value: ticketAssocie });
          }
        }

        if (projectName === 'Veepee') {
          const projetVeepee = getStringValue(row, 'Projet');
          if (projetVeepee && projectColumns['Projet Veepee']) {
            customValues.push({ columnId: projectColumns['Projet Veepee'], value: projetVeepee });
          }
          const sprint = getStringValue(row, 'Sprint');
          if (sprint && projectColumns['Sprint']) {
            customValues.push({ columnId: projectColumns['Sprint'], value: sprint });
          }
          const ticketLie = getStringValue(row, 'Ticket JIRA lié');
          if (ticketLie && projectColumns['Ticket JIRA lié']) {
            customValues.push({ columnId: projectColumns['Ticket JIRA lié'], value: ticketLie });
          }
          const prioNastia = getValue(row, 'Prioté Nastia');
          if (prioNastia !== null && projectColumns['Priorité Nastia']) {
            customValues.push({ columnId: projectColumns['Priorité Nastia'], value: String(prioNastia) });
          }
        }

        if (projectName === 'WIMM') {
          const sprint = getStringValue(row, 'Sprint');
          if (sprint && projectColumns['Sprint']) {
            customValues.push({ columnId: projectColumns['Sprint'], value: sprint });
          }
          const ticketAssocie = getStringValue(row, 'Ticket JIRA Associé');
          if (ticketAssocie && projectColumns['Ticket JIRA Associé']) {
            customValues.push({ columnId: projectColumns['Ticket JIRA Associé'], value: ticketAssocie });
          }
        }

        // Create or update card
        let card;
        if (jiraKey) {
          const existing = await prisma.card.findUnique({ where: { jiraKey } });
          if (existing) {
            card = await prisma.card.update({
              where: { jiraKey },
              data: {
                summary: summary || existing.summary,
                status: status || existing.status,
                businessPriority: businessPriority ?? existing.businessPriority,
                jiraPriority: jiraPriority || existing.jiraPriority,
                comment: comment || existing.comment,
                jiraUrl: jiraUrl || existing.jiraUrl,
                project: projectName
              }
            });
            console.log(`    Updated: ${jiraKey}`);
          } else {
            card = await prisma.card.create({
              data: {
                jiraKey, jiraUrl, summary, status, jiraPriority,
                businessPriority, project: projectName, comment,
                createdAt: finalDate, dateKnown
              }
            });
            console.log(`    Created: ${jiraKey}`);
          }
        } else {
          // No jira key - check for duplicates by summary
          const existingBySummary = await prisma.card.findFirst({
            where: { summary, project: projectName }
          });
          if (existingBySummary) {
            card = existingBySummary;
            console.log(`    Skipped duplicate: ${summary.substring(0, 40)}...`);
          } else {
            card = await prisma.card.create({
              data: {
                jiraKey: null, jiraUrl: null, summary, status, jiraPriority,
                businessPriority, project: projectName, comment,
                createdAt: finalDate, dateKnown
              }
            });
            console.log(`    Created: ${summary.substring(0, 40)}...`);
          }
        }

        // Save custom values
        for (const cv of customValues) {
          try {
            await prisma.customFieldValue.upsert({
              where: { cardId_columnId: { cardId: card.id, columnId: cv.columnId } },
              create: { cardId: card.id, columnId: cv.columnId, value: cv.value },
              update: { value: cv.value }
            });
          } catch (e) {
            console.error(`    Error saving custom value: ${e.message}`);
          }
        }

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
  console.log('Starting full Excel import...\n');

  // Create custom columns first
  const columnMap = await createCustomColumns();

  let totalImported = 0;
  let totalErrors = 0;

  for (const { file, project } of files) {
    const filePath = path.join(EXCEL_DIR, file);
    try {
      const { imported, errors } = await importFile(filePath, project, columnMap);
      totalImported += imported;
      totalErrors += errors;
    } catch (error) {
      console.error(`Failed to import ${file}: ${error.message}`);
      totalErrors++;
    }
  }

  console.log('\n========================================');
  console.log(`Import complete: ${totalImported} cards, ${totalErrors} errors`);

  const counts = await prisma.card.groupBy({
    by: ['project'],
    _count: { id: true }
  });
  console.log('\nCards per project:');
  for (const c of counts) {
    console.log(`  ${c.project}: ${c._count.id}`);
  }

  const customCounts = await prisma.customFieldValue.count();
  console.log(`\nCustom field values: ${customCounts}`);

  await prisma.$disconnect();
}

main().catch(console.error);
