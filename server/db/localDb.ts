import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'eduguard.db.json');

type Doc = Record<string, any>;

const UNIQUE_KEYS: Record<string, string[][]> = {
  Users: [['email']],
  Schools: [['slug'], ['registrationNumber']],
  Students: [['schoolId', 'admissionNumber']],
  Teachers: [['schoolId', 'employeeCode']],
  ParentStudentRelationships: [['parentId', 'studentId']],
  Payments: [['receiptNumber']],
  Complaints: [['complaintNumber']],
  InspectionGroups: [['inspectionId']],
  InspectionMembers: [['groupId', 'inspectorId']],
  InspectionReports: [['groupId']],
  SystemSettings: [['key']],
  Provinces: [['name'], ['code']],
  Districts: [['name', 'province']],
};

const DEFAULTS: Record<string, Record<string, any>> = {
  Users: {
    phone: '',
    cnicOrReference: '',
    designation: '',
    employeeId: '',
    schoolId: null,
    schoolIds: [],
    isEmailVerified: true,
    isBlocked: false,
    blockReason: '',
    tokenVersion: 0,
    province: '',
    district: '',
    specialization: '',
    avatarUrl: '',
  },
  Schools: {
    schoolCode: '',
    emisCode: '',
    educationLevels: [],
    genderType: 'Co-education',
    establishedYear: 2000,
    operatingStatus: 'Active',
    numberOfCampuses: 1,
    parentOrganization: '',
    website: '',
    logo: '',
    photographs: [],
    tehsil: '',
    unionCouncil: '',
    postalCode: '',
    location: { lat: 31.5204, lng: 74.3587 },
    educationDepartment: '',
    administrativeRegion: '',
    relevantAuthority: '',
    departmentReferenceNumber: '',
    principalName: '',
    administratorName: '',
    managementOrganization: '',
    contactNumber: '',
    officialEmail: '',
    facilities: [],
    overview: '',
    authorizedRepresentatives: [],
    registrationStatus: 'PENDING',
    verificationStatus: 'UNVERIFIED',
    approvedBy: null,
    approvedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: '',
    suspensionReason: '',
    documents: [],
  },
  SchoolApplications: {
    status: 'PENDING',
    adminRemarks: '',
    internalNotes: [],
    history: [],
  },
  Complaints: {
    priority: 'MEDIUM',
    status: 'SUBMITTED',
    evidencePhotos: [],
    supportingDocuments: [],
    schoolResponse: '',
    schoolRespondedAt: null,
    resolutionSummary: '',
    resolvedAt: null,
    assignedInspectionGroupId: null,
  },
  InspectionGroups: {
    relatedComplaints: [],
    priority: 'HIGH',
    instructions: '',
    status: 'ASSIGNED',
    closedAt: null,
  },
  CorrectiveActions: {
    supportingDocuments: [],
    status: 'PENDING',
    schoolEvidenceNotes: '',
    schoolEvidenceFiles: [],
    submittedAt: null,
    adminReviewNotes: '',
    verifiedBy: null,
    verifiedAt: null,
  },
  Notifications: {
    isRead: false,
  },
};

function ensureStore(): Record<string, Doc[]> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let storeCache: Record<string, Doc[]> | null = null;

function getStore(): Record<string, Doc[]> {
  if (!storeCache) {
    storeCache = ensureStore();
  }
  return storeCache;
}

function persistStore() {
  if (!storeCache) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(storeCache, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

function getNestedValue(obj: any, key: string): any {
  if (!key.includes('.')) return obj?.[key];
  return key.split('.').reduce((acc, part) => (acc !== undefined && acc !== null ? acc[part] : undefined), obj);
}

function normalizeComparable(val: any): any {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'object' && typeof val.toHexString === 'function') return val.toString();
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return t;
  }
  return val;
}

function matchCondition(docVal: any, cond: any): boolean {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof RegExp) && !(cond instanceof Date) && typeof cond.toHexString !== 'function') {
    const keys = Object.keys(cond);
    const isOperator = keys.some((k) => k.startsWith('$'));
    if (isOperator) {
      for (const op of keys) {
        const target = cond[op];
        if (op === '$in') {
          const list = (target || []).map((x: any) => String(x));
          if (Array.isArray(docVal)) {
            if (!docVal.some((v) => list.includes(String(v)))) return false;
          } else if (!list.includes(String(docVal))) {
            return false;
          }
        } else if (op === '$nin') {
          const list = (target || []).map((x: any) => String(x));
          if (Array.isArray(docVal)) {
            if (docVal.some((v) => list.includes(String(v)))) return false;
          } else if (list.includes(String(docVal))) {
            return false;
          }
        } else if (op === '$ne') {
          if (String(docVal) === String(target)) return false;
        } else if (op === '$gt') {
          if (!(normalizeComparable(docVal) > normalizeComparable(target))) return false;
        } else if (op === '$gte') {
          if (!(normalizeComparable(docVal) >= normalizeComparable(target))) return false;
        } else if (op === '$lt') {
          if (!(normalizeComparable(docVal) < normalizeComparable(target))) return false;
        } else if (op === '$lte') {
          if (!(normalizeComparable(docVal) <= normalizeComparable(target))) return false;
        } else if (op === '$regex') {
          const flags = cond.$options || 'i';
          const re = target instanceof RegExp ? target : new RegExp(target, flags);
          if (!re.test(String(docVal ?? ''))) return false;
        } else if (op === '$exists') {
          const exists = docVal !== undefined && docVal !== null;
          if (Boolean(target) !== exists) return false;
        }
      }
      return true;
    }
  }

  if (cond instanceof RegExp) {
    return cond.test(String(docVal ?? ''));
  }

  if (Array.isArray(docVal)) {
    return docVal.some((item) => String(item) === String(cond));
  }

  if (cond === null) return docVal === null || docVal === undefined;
  return String(docVal) === String(cond);
}

function matchesQuery(doc: Doc, query: Doc = {}): boolean {
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined) continue;
    if (key === '$or' && Array.isArray(val)) {
      if (!val.some((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    if (key === '$and' && Array.isArray(val)) {
      if (!val.every((sub) => matchesQuery(doc, sub))) return false;
      continue;
    }
    const docVal = getNestedValue(doc, key);
    if (!matchCondition(docVal, val)) return false;
  }
  return true;
}

function applyUpdate(doc: Doc, update: Doc): Doc {
  const cloned = JSON.parse(JSON.stringify(doc));
  const hasOperators = Object.keys(update).some((k) => k.startsWith('$'));

  if (!hasOperators) {
    Object.assign(cloned, update);
  } else {
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        if (k.includes('.')) {
          const parts = k.split('.');
          let curr = cloned;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') curr[parts[i]] = {};
            curr = curr[parts[i]];
          }
          curr[parts[parts.length - 1]] = v;
        } else {
          cloned[k] = v;
        }
      }
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        cloned[k] = (Number(cloned[k]) || 0) + Number(v);
      }
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        if (!Array.isArray(cloned[k])) cloned[k] = [];
        if (v && typeof v === 'object' && '$each' in (v as any)) {
          cloned[k].push(...(v as any).$each);
        } else {
          cloned[k].push(v);
        }
      }
    }
    if (update.$addToSet) {
      for (const [k, v] of Object.entries(update.$addToSet)) {
        if (!Array.isArray(cloned[k])) cloned[k] = [];
        const items = v && typeof v === 'object' && '$each' in (v as any) ? (v as any).$each : [v];
        for (const item of items) {
          if (!cloned[k].some((existing: any) => String(existing) === String(item))) {
            cloned[k].push(item);
          }
        }
      }
    }
    if (update.$pull) {
      for (const [k, v] of Object.entries(update.$pull)) {
        if (Array.isArray(cloned[k])) {
          cloned[k] = cloned[k].filter((item: any) => String(item) !== String(v));
        }
      }
    }
  }
  cloned.updatedAt = new Date().toISOString();
  return cloned;
}

class LocalQuery<T = any> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private skipVal = 0;
  private limitVal = 0;

  constructor(private readonly executor: () => T) {}

  sort(spec: Record<string, 1 | -1> | string) {
    if (typeof spec === 'string') {
      const desc = spec.startsWith('-');
      const key = desc ? spec.slice(1) : spec;
      this.sortSpec = { [key]: desc ? -1 : 1 };
    } else {
      this.sortSpec = spec;
    }
    return this;
  }

  skip(n: number) {
    this.skipVal = n;
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  lean() {
    return this;
  }

  select(_fields: any) {
    return this;
  }

  populate(_path: any, _select?: any) {
    return this;
  }

  exec(): Promise<T> {
    let result: any = this.executor();
    if (Array.isArray(result)) {
      if (this.sortSpec) {
        const entries = Object.entries(this.sortSpec);
        result = [...result].sort((a, b) => {
          for (const [field, dir] of entries) {
            const av = normalizeComparable(getNestedValue(a, field)) ?? '';
            const bv = normalizeComparable(getNestedValue(b, field)) ?? '';
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
          }
          return 0;
        });
      }
      if (this.skipVal > 0) result = result.slice(this.skipVal);
      if (this.limitVal > 0) result = result.slice(0, this.limitVal);
    }
    return Promise.resolve(result);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export class LocalModel {
  constructor(public readonly name: string) {}

  private list(): Doc[] {
    const store = getStore();
    if (!store[this.name]) store[this.name] = [];
    return store[this.name];
  }

  private assertUnique(doc: Doc, ignoreId?: string) {
    const keySets = UNIQUE_KEYS[this.name] || [];
    const existing = this.list();
    for (const fields of keySets) {
      const conflict = existing.find((row) => {
        if (ignoreId && String(row._id) === String(ignoreId)) return false;
        return fields.every((f) => {
          const val = String(row[f] ?? '').toLowerCase();
          const incoming = String(doc[f] ?? '').toLowerCase();
          return val !== '' && val === incoming;
        });
      });
      if (conflict) {
        const err: any = new Error(`Duplicate value for unique key (${fields.join(', ')})`);
        err.code = 11000;
        throw err;
      }
    }
  }

  private prepareDoc(input: Doc): Doc {
    const defaults = JSON.parse(JSON.stringify(DEFAULTS[this.name] || {}));
    const now = new Date().toISOString();
    const doc: Doc = {
      ...defaults,
      ...JSON.parse(JSON.stringify(input)),
      _id: input._id ? String(input._id) : new mongoose.Types.ObjectId().toString(),
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    };
    if (this.name === 'Users' && doc.email) {
      doc.email = String(doc.email).toLowerCase().trim();
    }
    if (this.name === 'Schools' && doc.slug) {
      doc.slug = String(doc.slug).toLowerCase().trim();
    }
    return doc;
  }

  find(query: Doc = {}) {
    return new LocalQuery<Doc[]>(() =>
      this.list()
        .filter((d) => matchesQuery(d, query))
        .map((d) => JSON.parse(JSON.stringify(d)))
    );
  }

  findOne(query: Doc = {}) {
    return new LocalQuery<Doc | null>(() => {
      const found = this.list().find((d) => matchesQuery(d, query));
      return found ? JSON.parse(JSON.stringify(found)) : null;
    });
  }

  findById(id: string) {
    return new LocalQuery<Doc | null>(() => {
      if (!id) return null;
      const found = this.list().find((d) => String(d._id) === String(id));
      return found ? JSON.parse(JSON.stringify(found)) : null;
    });
  }

  async create(input: Doc | Doc[]): Promise<any> {
    const rows = this.list();
    if (Array.isArray(input)) {
      const created: Doc[] = [];
      for (const item of input) {
        const doc = this.prepareDoc(item);
        this.assertUnique(doc);
        rows.push(doc);
        created.push(JSON.parse(JSON.stringify(doc)));
      }
      persistStore();
      return created;
    }
    const doc = this.prepareDoc(input);
    this.assertUnique(doc);
    rows.push(doc);
    persistStore();
    return JSON.parse(JSON.stringify(doc));
  }

  async insertMany(inputs: Doc[]) {
    return this.create(inputs);
  }

  findByIdAndUpdate(id: string, update: Doc, _opts?: any) {
    return new LocalQuery<Doc | null>(() => {
      const rows = this.list();
      const idx = rows.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) return null;
      const updated = applyUpdate(rows[idx], update);
      this.assertUnique(updated, id);
      rows[idx] = updated;
      persistStore();
      return JSON.parse(JSON.stringify(updated));
    });
  }

  findOneAndUpdate(query: Doc, update: Doc, opts?: any) {
    return new LocalQuery<Doc | null>(() => {
      const rows = this.list();
      const idx = rows.findIndex((d) => matchesQuery(d, query));
      if (idx === -1) {
        if (opts?.upsert) {
          const base = { ...query, ...(update.$set || (!Object.keys(update).some((k) => k.startsWith('$')) ? update : {})) };
          const doc = this.prepareDoc(base);
          rows.push(doc);
          persistStore();
          return JSON.parse(JSON.stringify(doc));
        }
        return null;
      }
      const updated = applyUpdate(rows[idx], update);
      this.assertUnique(updated, rows[idx]._id);
      rows[idx] = updated;
      persistStore();
      return JSON.parse(JSON.stringify(updated));
    });
  }

  async updateOne(query: Doc, update: Doc) {
    const rows = this.list();
    const idx = rows.findIndex((d) => matchesQuery(d, query));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
    rows[idx] = applyUpdate(rows[idx], update);
    persistStore();
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query: Doc, update: Doc) {
    const rows = this.list();
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      if (matchesQuery(rows[i], query)) {
        rows[i] = applyUpdate(rows[i], update);
        count++;
      }
    }
    if (count > 0) persistStore();
    return { matchedCount: count, modifiedCount: count };
  }

  findByIdAndDelete(id: string) {
    return new LocalQuery<Doc | null>(() => {
      const rows = this.list();
      const idx = rows.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) return null;
      const [removed] = rows.splice(idx, 1);
      persistStore();
      return JSON.parse(JSON.stringify(removed));
    });
  }

  async deleteOne(query: Doc) {
    const rows = this.list();
    const idx = rows.findIndex((d) => matchesQuery(d, query));
    if (idx === -1) return { deletedCount: 0 };
    rows.splice(idx, 1);
    persistStore();
    return { deletedCount: 1 };
  }

  async deleteMany(query: Doc) {
    const store = getStore();
    const rows = this.list();
    const before = rows.length;
    store[this.name] = rows.filter((d) => !matchesQuery(d, query));
    const deletedCount = before - store[this.name].length;
    if (deletedCount > 0) persistStore();
    return { deletedCount };
  }

  async countDocuments(query: Doc = {}): Promise<number> {
    return this.list().filter((d) => matchesQuery(d, query)).length;
  }
}

export function createLocalModels(collectionNames: string[]) {
  const models: Record<string, LocalModel> = {};
  for (const name of collectionNames) {
    models[name] = new LocalModel(name);
  }
  return models;
}
