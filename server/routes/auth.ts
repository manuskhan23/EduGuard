import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  getClientIp,
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { recordAuditLog, notifySuperAdmins, notifyUser } from '../services/auditAndNotify.js';
import { RegistrationStatus, SchoolType, UserRole, VerificationStatus } from '../types.js';
import { DEFAULT_CAMPUS_PHOTO, DEFAULT_GOV_EMBLEM, DEFAULT_PRIVATE_EMBLEM } from '../seed.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
});

function setAuthCookies(res: any, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('eduguard_access', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.cookie('eduguard_refresh', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${crypto.randomBytes(2).toString('hex')}`;
}

function sanitizeUser(user: any) {
  const { passwordHash, resetToken, resetTokenExpires, ...safe } = user;
  return safe;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid email and password are required' });
    }
    const db = getDb();
    const user: any = await db.Users.findOne({ email: parsed.data.email.toLowerCase().trim() }).lean();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        error: 'Your account has been blocked by the Education Department.',
        reason: user.blockReason || 'Administrative action',
      });
    }

    const payload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    let schools: any[] = [];
    if (user.role === UserRole.SCHOOL_OWNER) {
      const ids = Array.from(new Set([...(user.schoolIds || []), ...(user.schoolId ? [user.schoolId] : [])].map(String)));
      if (ids.length > 0) {
        schools = await db.Schools.find({ _id: { $in: ids } }).lean();
      }
    } else if (user.schoolId) {
      const s = await db.Schools.findById(String(user.schoolId)).lean();
      if (s) schools = [s];
    }

    await recordAuditLog({
      userId: String(user._id),
      userName: user.fullName,
      role: user.role,
      action: 'USER_LOGIN',
      targetResource: 'Users',
      targetId: String(user._id),
      ipAddress: getClientIp(req),
    });

    return res.json({
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
      schools,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.eduguard_refresh;
    if (!token) return res.status(401).json({ error: 'Refresh token missing' });

    const decoded = verifyRefreshToken(token);
    const db = getDb();
    const user: any = await db.Users.findById(decoded.userId).lean();
    if (!user || user.isBlocked || (user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Session invalid or revoked' });
    }

    const nextVersion = (user.tokenVersion || 0) + 1;
    await db.Users.findByIdAndUpdate(String(user._id), { $set: { tokenVersion: nextVersion } });

    const payload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      tokenVersion: nextVersion,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);
    return res.json({ accessToken, refreshToken });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('eduguard_access');
  res.clearCookie('eduguard_refresh');
  return res.json({ message: 'Signed out successfully' });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const user: any = await db.Users.findById(req.user!._id).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  let schools: any[] = [];
  if (user.role === UserRole.SCHOOL_OWNER) {
    const ids = Array.from(new Set([...(user.schoolIds || []), ...(user.schoolId ? [user.schoolId] : [])].map(String)));
    if (ids.length > 0) {
      schools = await db.Schools.find({ _id: { $in: ids } }).lean();
    }
  } else if (user.schoolId) {
    const s = await db.Schools.findById(String(user.schoolId)).lean();
    if (s) schools = [s];
  }

  const applications =
    user.role === UserRole.SCHOOL_OWNER
      ? await db.SchoolApplications.find({ applicantId: String(user._id) }).sort({ createdAt: -1 }).lean()
      : [];

  return res.json({ user: sanitizeUser(user), schools, applications });
});

const parentRegisterSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  cnicOrReference: z.string().optional().default(''),
  province: z.string().optional().default(''),
  district: z.string().optional().default(''),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
});

router.post('/register/parent', authLimiter, async (req, res) => {
  try {
    const parsed = parentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
    }
    const d = parsed.data;
    if (d.password !== d.confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const db = getDb();
    const existing = await db.Users.findOne({ email: d.email.toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(d.password, 10);
    const user: any = await db.Users.create({
      fullName: d.fullName.trim(),
      email: d.email.toLowerCase().trim(),
      passwordHash,
      role: UserRole.PARENT,
      phone: d.phone,
      cnicOrReference: d.cnicOrReference,
      province: d.province,
      district: d.district,
      isEmailVerified: true,
    });

    await notifySuperAdmins({
      type: 'PARENT_REGISTERED',
      title: 'New Parent Account Registered',
      message: `${user.fullName} (${user.email}) registered a parent portal account.`,
      resourceType: 'User',
      resourceId: String(user._id),
    });

    const payload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      tokenVersion: 0,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: 'Parent account created successfully.',
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
      schools: [],
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

const govRegisterSchema = z.object({
  // A. Official School Info
  name: z.string().min(3),
  schoolCode: z.string().min(2),
  emisCode: z.string().optional().default(''),
  registrationNumber: z.string().min(2),
  schoolCategory: z.string().min(2),
  educationLevels: z.array(z.string()).min(1),
  genderType: z.string().default('Co-education'),
  establishedYear: z.coerce.number().min(1850).max(2026),
  operatingStatus: z.string().default('Active'),
  logo: z.string().optional().default(''),
  photographs: z.array(z.string()).optional().default([]),
  overview: z.string().optional().default(''),
  facilities: z.array(z.string()).optional().default([]),
  // B. Government Department Info
  province: z.string().min(2),
  district: z.string().min(2),
  tehsil: z.string().optional().default(''),
  unionCouncil: z.string().optional().default(''),
  educationDepartment: z.string().min(2),
  administrativeRegion: z.string().optional().default(''),
  relevantAuthority: z.string().min(2),
  departmentReferenceNumber: z.string().min(2),
  // C. School Location
  address: z.string().min(4),
  city: z.string().min(2),
  postalCode: z.string().optional().default(''),
  lat: z.coerce.number().optional().default(31.5204),
  lng: z.coerce.number().optional().default(74.3587),
  // D. Authorized Representative
  repFullName: z.string().min(2),
  repEmail: z.string().email(),
  repPhone: z.string().min(6),
  repDesignation: z.string().min(2),
  repEmployeeId: z.string().min(2),
  repGovReference: z.string().min(2),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  // E. Supporting Documents & Draft flag
  saveAsDraft: z.boolean().optional().default(false),
  documents: z
    .array(
      z.object({
        documentType: z.string(),
        title: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number().optional().default(0),
        fileUrl: z.string(),
        previewText: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
});

router.post('/register/government-school', authLimiter, async (req, res) => {
  try {
    const parsed = govRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
    }
    const d = parsed.data;
    if (d.password !== d.confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const db = getDb();
    const existingEmail = await db.Users.findOne({ email: d.repEmail.toLowerCase().trim() }).lean();
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this representative email already exists' });
    }
    const existingReg = await db.Schools.findOne({ registrationNumber: d.registrationNumber.trim() }).lean();
    if (existingReg) {
      return res.status(409).json({ error: 'A school with this registration/reference number already exists' });
    }

    const passwordHash = await bcrypt.hash(d.password, 10);
    const repUser: any = await db.Users.create({
      fullName: d.repFullName.trim(),
      email: d.repEmail.toLowerCase().trim(),
      passwordHash,
      role: UserRole.SCHOOL_OWNER,
      phone: d.repPhone,
      designation: d.repDesignation,
      employeeId: d.repEmployeeId,
      cnicOrReference: d.repGovReference,
      province: d.province,
      district: d.district,
      isEmailVerified: true,
    });

    const initialStatus = d.saveAsDraft ? RegistrationStatus.DRAFT : RegistrationStatus.PENDING;

    const school: any = await db.Schools.create({
      name: d.name.trim(),
      slug: makeSlug(d.name),
      schoolCode: d.schoolCode.trim(),
      emisCode: d.emisCode.trim(),
      registrationNumber: d.registrationNumber.trim(),
      schoolType: SchoolType.GOVERNMENT,
      schoolCategory: d.schoolCategory,
      educationLevels: d.educationLevels,
      genderType: d.genderType,
      establishedYear: d.establishedYear,
      operatingStatus: d.operatingStatus,
      logo: d.logo || DEFAULT_GOV_EMBLEM,
      photographs: d.photographs.length > 0 ? d.photographs : [DEFAULT_CAMPUS_PHOTO],
      overview: d.overview || `${d.name} (${d.schoolCategory}) operating under ${d.educationDepartment}.`,
      facilities: d.facilities,
      address: d.address,
      province: d.province,
      district: d.district,
      city: d.city,
      tehsil: d.tehsil,
      unionCouncil: d.unionCouncil,
      postalCode: d.postalCode,
      location: { lat: d.lat, lng: d.lng },
      educationDepartment: d.educationDepartment,
      administrativeRegion: d.administrativeRegion,
      relevantAuthority: d.relevantAuthority,
      departmentReferenceNumber: d.departmentReferenceNumber,
      principalName: d.repFullName,
      contactNumber: d.repPhone,
      officialEmail: d.repEmail.toLowerCase().trim(),
      owner: repUser._id,
      authorizedRepresentatives: [repUser._id],
      registrationStatus: initialStatus,
      verificationStatus: VerificationStatus.UNVERIFIED, // Never auto-verified
    });

    const docIds: any[] = [];
    for (const doc of d.documents) {
      const createdDoc: any = await db.SchoolDocuments.create({
        schoolId: school._id,
        uploadedBy: repUser._id,
        ...doc,
      });
      docIds.push(createdDoc._id);
    }
    if (docIds.length > 0) {
      await db.Schools.findByIdAndUpdate(String(school._id), { $set: { documents: docIds } });
    }

    await db.Users.findByIdAndUpdate(String(repUser._id), {
      $set: { schoolId: school._id, schoolIds: [school._id] },
    });

    const application: any = await db.SchoolApplications.create({
      schoolId: school._id,
      applicantId: repUser._id,
      schoolType: SchoolType.GOVERNMENT,
      status: initialStatus,
      history: [
        {
          status: initialStatus,
          actionBy: repUser._id,
          actionByName: repUser.fullName,
          comment: d.saveAsDraft
            ? 'Government school registration saved as draft.'
            : 'Your government school registration request has been successfully submitted to the Education Department.',
        },
      ],
    });

    if (!d.saveAsDraft) {
      await notifySuperAdmins({
        type: 'SCHOOL_REGISTRATION',
        title: 'New Government School Registration',
        message: `${school.name} (${school.district}, ${school.province}) submitted a Government School registration request.`,
        resourceType: 'SchoolApplication',
        resourceId: String(application._id),
      });
    }

    await recordAuditLog({
      userId: String(repUser._id),
      userName: repUser.fullName,
      role: UserRole.SCHOOL_OWNER,
      action: 'GOVERNMENT_SCHOOL_REGISTERED',
      targetResource: 'Schools',
      targetId: String(school._id),
      newValues: { name: school.name, schoolType: SchoolType.GOVERNMENT, status: initialStatus },
      ipAddress: getClientIp(req),
    });

    const payload = { userId: String(repUser._id), email: repUser.email, role: repUser.role, tokenVersion: 0 };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: d.saveAsDraft
        ? 'Government school application saved as draft.'
        : 'Your government school registration request has been successfully submitted to the Education Department.',
      accessToken,
      refreshToken,
      user: sanitizeUser({ ...repUser, schoolId: school._id, schoolIds: [school._id] }),
      school,
      application,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

const privateRegisterSchema = z.object({
  // A. School Information
  name: z.string().min(3),
  registrationNumber: z.string().min(2),
  schoolCategory: z.string().min(2),
  educationLevels: z.array(z.string()).min(1),
  genderType: z.string().default('Co-education'),
  establishedYear: z.coerce.number().min(1850).max(2026),
  numberOfCampuses: z.coerce.number().min(1).default(1),
  parentOrganization: z.string().optional().default(''),
  website: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  photographs: z.array(z.string()).optional().default([]),
  overview: z.string().optional().default(''),
  facilities: z.array(z.string()).optional().default([]),
  // B. Owner Information
  ownerFullName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().min(6),
  ownerCnic: z.string().min(5),
  ownerDesignation: z.string().min(2),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  // C. School Management Information
  principalName: z.string().min(2),
  administratorName: z.string().min(2),
  managementOrganization: z.string().optional().default(''),
  contactNumber: z.string().min(6),
  officialEmail: z.string().email(),
  // D. School Address
  address: z.string().min(4),
  province: z.string().min(2),
  district: z.string().min(2),
  city: z.string().min(2),
  tehsil: z.string().optional().default(''),
  unionCouncil: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  lat: z.coerce.number().optional().default(33.6844),
  lng: z.coerce.number().optional().default(73.0479),
  // E. Legal & Registration Documents
  documents: z
    .array(
      z.object({
        documentType: z.string(),
        title: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number().optional().default(0),
        fileUrl: z.string(),
        previewText: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
});

router.post('/register/private-school', authLimiter, async (req, res) => {
  try {
    const parsed = privateRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
    }
    const d = parsed.data;
    if (d.password !== d.confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const db = getDb();
    const existingEmail = await db.Users.findOne({ email: d.ownerEmail.toLowerCase().trim() }).lean();
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this owner email already exists' });
    }
    const existingReg = await db.Schools.findOne({ registrationNumber: d.registrationNumber.trim() }).lean();
    if (existingReg) {
      return res.status(409).json({ error: 'A school with this registration number already exists' });
    }

    const passwordHash = await bcrypt.hash(d.password, 10);
    const ownerUser: any = await db.Users.create({
      fullName: d.ownerFullName.trim(),
      email: d.ownerEmail.toLowerCase().trim(),
      passwordHash,
      role: UserRole.SCHOOL_OWNER,
      phone: d.ownerPhone,
      cnicOrReference: d.ownerCnic,
      designation: d.ownerDesignation,
      province: d.province,
      district: d.district,
      isEmailVerified: true,
    });

    const school: any = await db.Schools.create({
      name: d.name.trim(),
      slug: makeSlug(d.name),
      registrationNumber: d.registrationNumber.trim(),
      schoolType: SchoolType.PRIVATE,
      schoolCategory: d.schoolCategory,
      educationLevels: d.educationLevels,
      genderType: d.genderType,
      establishedYear: d.establishedYear,
      numberOfCampuses: d.numberOfCampuses,
      parentOrganization: d.parentOrganization || d.managementOrganization,
      website: d.website,
      logo: d.logo || DEFAULT_PRIVATE_EMBLEM,
      photographs: d.photographs.length > 0 ? d.photographs : [DEFAULT_CAMPUS_PHOTO],
      overview: d.overview || `${d.name} — ${d.schoolCategory} located in ${d.city}, ${d.district}.`,
      facilities: d.facilities,
      principalName: d.principalName,
      administratorName: d.administratorName,
      managementOrganization: d.managementOrganization,
      contactNumber: d.contactNumber,
      officialEmail: d.officialEmail.toLowerCase().trim(),
      address: d.address,
      province: d.province,
      district: d.district,
      city: d.city,
      tehsil: d.tehsil,
      unionCouncil: d.unionCouncil,
      postalCode: d.postalCode,
      location: { lat: d.lat, lng: d.lng },
      owner: ownerUser._id,
      authorizedRepresentatives: [ownerUser._id],
      registrationStatus: RegistrationStatus.PENDING,
      verificationStatus: VerificationStatus.UNVERIFIED,
    });

    const docIds: any[] = [];
    for (const doc of d.documents) {
      const createdDoc: any = await db.SchoolDocuments.create({
        schoolId: school._id,
        uploadedBy: ownerUser._id,
        ...doc,
      });
      docIds.push(createdDoc._id);
    }
    if (docIds.length > 0) {
      await db.Schools.findByIdAndUpdate(String(school._id), { $set: { documents: docIds } });
    }

    await db.Users.findByIdAndUpdate(String(ownerUser._id), {
      $set: { schoolId: school._id, schoolIds: [school._id] },
    });

    const application: any = await db.SchoolApplications.create({
      schoolId: school._id,
      applicantId: ownerUser._id,
      schoolType: SchoolType.PRIVATE,
      status: RegistrationStatus.PENDING,
      history: [
        {
          status: RegistrationStatus.PENDING,
          actionBy: ownerUser._id,
          actionByName: ownerUser.fullName,
          comment: 'Private school registration submitted for Education Department review.',
        },
      ],
    });

    await notifySuperAdmins({
      type: 'SCHOOL_REGISTRATION',
      title: 'New Private School Registration',
      message: `${school.name} (${school.district}, ${school.province}) submitted a Private School application.`,
      resourceType: 'SchoolApplication',
      resourceId: String(application._id),
    });

    await recordAuditLog({
      userId: String(ownerUser._id),
      userName: ownerUser.fullName,
      role: UserRole.SCHOOL_OWNER,
      action: 'PRIVATE_SCHOOL_REGISTERED',
      targetResource: 'Schools',
      targetId: String(school._id),
      newValues: { name: school.name, schoolType: SchoolType.PRIVATE, status: RegistrationStatus.PENDING },
      ipAddress: getClientIp(req),
    });

    const payload = { userId: String(ownerUser._id), email: ownerUser.email, role: ownerUser.role, tokenVersion: 0 };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: 'Your request has been successfully sent to the admin.',
      subMessage:
        'Your school registration is pending approval. You will receive a notification when the Education Department reviews your application.',
      accessToken,
      refreshToken,
      user: sanitizeUser({ ...ownerUser, schoolId: school._id, schoolIds: [school._id] }),
      school,
      application,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

