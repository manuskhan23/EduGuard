import dns from 'dns/promises';
import mongoose from 'mongoose';
import { MongooseModels } from '../models/mongooseModels.js';
import { createLocalModels } from './localDb.js';

export type DbModels = typeof MongooseModels;

let activeDb: any = null;
let isMongoConnected = false;
let lastMongoMessage = '';
let lastMongoChecks: { scheme: string; dnsSrvOk: boolean | null } = {
  scheme: 'none',
  dnsSrvOk: null,
};

function normalizeMongoUri(rawUri?: string): { uri: string; scheme: string; host: string; hasDbName: boolean } {
  if (!rawUri) return { uri: '', scheme: 'none', host: '', hasDbName: false };
  let uri = rawUri.trim();
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  const schemeMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!schemeMatch) return { uri, scheme: 'invalid', host: '', hasDbName: false };

  const [, scheme, remainder] = schemeMatch;
  const schemeName = scheme.toLowerCase().startsWith('mongodb+srv') ? 'mongodb+srv' : 'mongodb';
  // Greedy userinfo match before the final @host(:port) segment so special chars (@, /, ?, #) in passwords stay intact
  const hostMatch = remainder.match(
    /^(.+)@([a-zA-Z0-9._-]+(?::\d+)?(?:,[a-zA-Z0-9._-]+(?::\d+)?)*)((?:[/?#].*)?)$/
  );
  if (!hostMatch) return { uri, scheme: schemeName, host: '', hasDbName: false };

  const [, userinfo, hosts, rest] = hostMatch;
  const primaryHost = hosts.split(',')[0].split(':')[0];
  const pathPart = (rest || '').split('?')[0].replace(/^\/+/, '');
  const hasDbName = Boolean(pathPart);
  const colonIdx = userinfo.indexOf(':');
  if (colonIdx === -1) return { uri, scheme: schemeName, host: primaryHost, hasDbName };

  const rawUser = userinfo.slice(0, colonIdx);
  const rawPass = userinfo.slice(colonIdx + 1);

  const encodePart = (val: string) => {
    try {
      if (encodeURIComponent(decodeURIComponent(val)) === val) {
        return val;
      }
    } catch {
      // Unencoded '%' or malformed percent sequence — encode directly
    }
    return encodeURIComponent(val);
  };

  return {
    uri: `${scheme}${encodePart(rawUser)}:${encodePart(rawPass)}@${hosts}${rest}`,
    scheme: schemeName,
    host: primaryHost,
    hasDbName,
  };
}

export async function connectDatabase(): Promise<{ mode: 'mongodb' | 'local'; db: DbModels }> {
  const parsed = normalizeMongoUri(process.env.MONGODB_URI);
  const mongoUri = parsed.uri;
  lastMongoChecks = { scheme: parsed.scheme, dnsSrvOk: null };

  if (mongoUri && !mongoUri.includes('username:password@cluster')) {
    if (parsed.scheme === 'mongodb+srv' && parsed.host) {
      try {
        const srv = await dns.resolveSrv(`_mongodb._tcp.${parsed.host}`);
        lastMongoChecks.dnsSrvOk = Array.isArray(srv) && srv.length > 0;
      } catch {
        lastMongoChecks.dnsSrvOk = false;
      }
    }

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        family: 4,
        ...(parsed.hasDbName ? {} : { dbName: 'eduguard' }),
      });
      isMongoConnected = true;
      lastMongoMessage = 'Connected';
      activeDb = MongooseModels;
      console.log('EduGuard connected to MongoDB via Mongoose.');
      return { mode: 'mongodb', db: activeDb };
    } catch (err) {
      await mongoose.disconnect().catch(() => {});
      lastMongoMessage = String((err as Error)?.message || 'Connection issue').replace(/\/\/[^@]+@/g, '//***@');
    }
  } else {
    lastMongoMessage = mongoUri ? 'Placeholder MONGODB_URI detected' : 'MONGODB_URI not set in environment';
  }

  const localModels = createLocalModels(Object.keys(MongooseModels));
  activeDb = localModels;
  isMongoConnected = false;
  console.log('EduGuard using local persistent document store (.data/eduguard.db.json).');
  return { mode: 'local', db: activeDb };
}

export function getDb(): DbModels {
  if (!activeDb) {
    const localModels = createLocalModels(Object.keys(MongooseModels));
    activeDb = localModels;
  }
  return activeDb;
}

export function getDbMode(): 'mongodb' | 'local' {
  return isMongoConnected ? 'mongodb' : 'local';
}

export function getDbDiagnostics() {
  return {
    dbMode: getDbMode(),
    mongoConfigured: Boolean(process.env.MONGODB_URI?.trim()),
    scheme: lastMongoChecks.scheme,
    dnsSrvOk: lastMongoChecks.dnsSrvOk,
    detail: lastMongoMessage,
  };
}
