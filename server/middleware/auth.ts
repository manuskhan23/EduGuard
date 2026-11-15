import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { RegistrationStatus, UserRole, VerificationStatus } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eduguard-dev-jwt-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eduguard-dev-refresh-secret-key-2026';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export interface AuthedRequest extends Request {
  user?: {
    _id: string;
    fullName: string;
    email: string;
    role: UserRole;
    schoolId?: string | null;
    schoolIds?: string[];
    isBlocked: boolean;
    tokenVersion: number;
    designation?: string;
    province?: string;
    district?: string;
  };
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && req.cookies.eduguard_access) {
    return req.cookies.eduguard_access;
  }
  return null;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = verifyAccessToken(token);
    const db = getDb();
    const user: any = await db.Users.findById(decoded.userId).lean();
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        error: 'Your account has been blocked by the Education Department.',
        reason: user.blockReason || 'Administrative action',
      });
    }
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
    }
    req.user = {
      _id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? String(user.schoolId) : null,
      schoolIds: (user.schoolIds || []).map((id: any) => String(id)),
      isBlocked: Boolean(user.isBlocked),
      tokenVersion: user.tokenVersion || 0,
      designation: user.designation,
      province: user.province,
      district: user.district,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const decoded = verifyAccessToken(token);
    const db = getDb();
    const user: any = await db.Users.findById(decoded.userId).lean();
    if (user && !user.isBlocked && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
      req.user = {
        _id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId ? String(user.schoolId) : null,
        schoolIds: (user.schoolIds || []).map((id: any) => String(id)),
        isBlocked: false,
        tokenVersion: user.tokenVersion || 0,
      };
    }
  } catch {
    // ignore optional auth failure
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this resource' });
    }
    next();
  };
}

export async function resolveTargetSchoolId(req: AuthedRequest): Promise<string | null> {
  if (!req.user) return null;
  const requested = (req.query.schoolId as string) || (req.body?.schoolId as string) || (req.params?.schoolId as string);
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return requested || req.user.schoolId || null;
  }
  if (req.user.role === UserRole.SCHOOL_OWNER) {
    const owned = new Set<string>();
    if (req.user.schoolId) owned.add(String(req.user.schoolId));
    for (const id of req.user.schoolIds || []) owned.add(String(id));
    if (requested && owned.has(String(requested))) return String(requested);
    return req.user.schoolId ? String(req.user.schoolId) : Array.from(owned)[0] || null;
  }
  return null;
}

export async function requireOperationalSchoolAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role === UserRole.SUPER_ADMIN) return next();

    const schoolId = await resolveTargetSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ error: 'No school associated with this account' });
    }

    const db = getDb();
    const school: any = await db.Schools.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ error: 'School record not found' });
    }
    if (school.registrationStatus !== RegistrationStatus.APPROVED) {
      return res.status(403).json({
        error: 'Operational dashboard access is locked until the Education Department approves your school registration.',
        registrationStatus: school.registrationStatus,
      });
    }
    if (school.verificationStatus === VerificationStatus.SUSPENDED) {
      return res.status(403).json({
        error: 'School operational modules are suspended under Education Department policy.',
        suspensionReason: school.suspensionReason || 'Administrative suspension',
      });
    }
    (req as any).resolvedSchoolId = String(school._id);
    next();
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
