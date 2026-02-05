import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getJiraConfig() {
  const config = await prisma.jiraConfig.findFirst();
  if (!config) {
    throw new Error('Jira non configuré');
  }
  return config;
}

function getAuthHeader(config) {
  return `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
}

export async function testConnection() {
  const config = await getJiraConfig();

  const response = await fetch(`${config.baseUrl}/rest/api/3/myself`, {
    headers: {
      'Authorization': getAuthHeader(config),
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errorMessages?.[0] || 'Erreur de connexion Jira');
  }

  const user = await response.json();
  return { success: true, user: user.displayName };
}

export async function searchIssues(jql, project) {
  const config = await getJiraConfig();

  // La nouvelle API v3 nécessite une restriction (project, etc.)
  const defaultJql = jql || 'project IN (SIDEV, SUPPIT) ORDER BY created DESC';
  const encodedJql = encodeURIComponent(defaultJql);
  const fields = 'summary,status,priority,created,updated,assignee,description';

  const allIssues = [];
  let nextPageToken = null;
  let pageCount = 0;
  const maxPages = 10; // Limite de sécurité

  do {
    let url = `${config.baseUrl}/rest/api/3/search/jql?jql=${encodedJql}&maxResults=100&fields=${fields}`;
    if (nextPageToken) {
      url += `&nextPageToken=${nextPageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': getAuthHeader(config),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errorMessages?.[0] || 'Erreur de recherche Jira');
    }

    const data = await response.json();

    if (data.issues) {
      for (const issue of data.issues) {
        allIssues.push({
          jiraKey: issue.key,
          jiraUrl: `${config.baseUrl}/browse/${issue.key}`,
          summary: issue.fields.summary || '',
          status: issue.fields.status?.name || 'Unknown',
          jiraPriority: issue.fields.priority?.name || null,
          createdAt: new Date(issue.fields.created),
          project: project || extractProject(issue.key)
        });
      }
    }

    nextPageToken = data.nextPageToken;
    pageCount++;
  } while (nextPageToken && pageCount < maxPages);

  return allIssues;
}

function extractProject(jiraKey) {
  const prefix = jiraKey.split('-')[0];
  const projectMap = {
    'SIDEV': 'Dev',
    'SUPPIT': 'Support'
  };
  return projectMap[prefix] || prefix;
}

export async function syncFromJira(jql, targetProject) {
  const issues = await searchIssues(jql, targetProject);
  const results = { created: 0, updated: 0, errors: [] };

  for (const issue of issues) {
    try {
      const existing = await prisma.card.findUnique({
        where: { jiraKey: issue.jiraKey }
      });

      if (existing) {
        await prisma.card.update({
          where: { jiraKey: issue.jiraKey },
          data: {
            summary: issue.summary,
            status: issue.status,
            jiraPriority: issue.jiraPriority,
            jiraUrl: issue.jiraUrl
          }
        });
        results.updated++;
      } else {
        await prisma.card.create({
          data: {
            ...issue,
            dateKnown: true
          }
        });
        results.created++;
      }
    } catch (error) {
      results.errors.push({ key: issue.jiraKey, error: error.message });
    }
  }

  return results;
}

export async function getIssue(jiraKey) {
  const config = await getJiraConfig();
  const fields = 'summary,status,priority,created,updated,assignee,description,comment';

  const response = await fetch(
    `${config.baseUrl}/rest/api/3/issue/${jiraKey}?fields=${fields}`,
    {
      headers: {
        'Authorization': getAuthHeader(config),
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errorMessages?.[0] || 'Erreur de récupération issue');
  }

  return response.json();
}
