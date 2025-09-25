import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readJson(fileName) {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const buf = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(buf || '{}');
  } catch (err) {
    if (err.code === 'ENOENT') {
      const initial = getInitialData(fileName);
      await writeJson(fileName, initial);
      return initial;
    }
    throw err;
  }
}

export async function writeJson(fileName, data) {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function getInitialData(fileName) {
  switch (fileName) {
    case 'users.json':
      return { users: [] };
    case 'appointments.json':
      return { appointments: [] };
    case 'alerts.json':
      return { alerts: [] };
    default:
      return {};
  }
}


