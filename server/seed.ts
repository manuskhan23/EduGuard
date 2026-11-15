import bcrypt from 'bcryptjs';
import { getDb } from './db/connection.js';
import { SchoolType, UserRole } from './types.js';

export const DEFAULT_GOV_EMBLEM = '/src/assets/images/gov_school_emblem_1794737229739.jpg';
export const DEFAULT_PRIVATE_EMBLEM = '/src/assets/images/private_school_emblem_1794737229683.jpg';
export const DEFAULT_CAMPUS_PHOTO = '/src/assets/images/eduguard_hero_campus_1794737229925.jpg';

async function syncEnvSuperAdmin() {
  const db = getDb();
  const envEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const isPlaceholderPassword = envPassword === 'replace-with-strong-admin-password';

  const existingByEmail: any = envEmail ? await db.Users.findOne({ email: envEmail }).lean() : null;
  const existingAdmin: any = existingByEmail || (await db.Users.findOne({ role: UserRole.SUPER_ADMIN }).lean());

  if (existingAdmin) {
    if (!envEmail && (!envPassword || isPlaceholderPassword)) return;
    const patch: Record<string, any> = {};
    if (existingAdmin.role !== UserRole.SUPER_ADMIN) {
      patch.role = UserRole.SUPER_ADMIN;
    }
    if (envEmail && existingAdmin.email !== envEmail && !existingByEmail) {
      patch.email = envEmail;
    }
    if (envPassword && !isPlaceholderPassword) {
      const same = await bcrypt.compare(envPassword, existingAdmin.passwordHash);
      if (!same) {
        patch.passwordHash = await bcrypt.hash(envPassword, 10);
        patch.tokenVersion = (existingAdmin.tokenVersion || 0) + 1;
      }
    }
    if (Object.keys(patch).length > 0) {
      await db.Users.findByIdAndUpdate(String(existingAdmin._id), { $set: patch });
    }
    return;
  }

  const effectivePassword = !isPlaceholderPassword && envPassword ? envPassword : 'EduGuard@2026';
  const passwordHash = await bcrypt.hash(effectivePassword, 10);
  await db.Users.create({
    fullName: 'Education Department Super Admin',
    email: envEmail || 'admin@eduguard.gov.pk',
    passwordHash,
    role: UserRole.SUPER_ADMIN,
    designation: 'Super Admin',
    isEmailVerified: true,
  });
}

export async function seedDatabaseIfEmpty() {
  const db = getDb();

  // Ensure essential geographic & classification metadata exists on an empty database
  const provinceCount = await db.Provinces.countDocuments({});
  if (provinceCount === 0) {
    await db.Provinces.create([
      { name: 'Punjab', code: 'PB', isActive: true },
      { name: 'Sindh', code: 'SD', isActive: true },
      { name: 'Khyber Pakhtunkhwa', code: 'KP', isActive: true },
      { name: 'Balochistan', code: 'BL', isActive: true },
      { name: 'Islamabad Capital Territory', code: 'ICT', isActive: true },
    ]);
  }

  const districtCount = await db.Districts.countDocuments({});
  if (districtCount === 0) {
    await db.Districts.create([
      { name: 'Lahore', province: 'Punjab', tehsils: ['Lahore City', 'Model Town', 'Cantt', 'Shalimar'], isActive: true },
      { name: 'Rawalpindi', province: 'Punjab', tehsils: ['Rawalpindi', 'Taxila', 'Gujar Khan'], isActive: true },
      { name: 'Faisalabad', province: 'Punjab', tehsils: ['Faisalabad City', 'Jaranwala', 'Sammundri'], isActive: true },
      { name: 'Karachi South', province: 'Sindh', tehsils: ['Saddar', 'Clifton', 'Civil Lines'], isActive: true },
      { name: 'Hyderabad', province: 'Sindh', tehsils: ['Hyderabad City', 'Latifabad', 'Qasimabad'], isActive: true },
      { name: 'Peshawar', province: 'Khyber Pakhtunkhwa', tehsils: ['Peshawar City', 'Hayatabad'], isActive: true },
      { name: 'Quetta', province: 'Balochistan', tehsils: ['Quetta City', 'Sariab'], isActive: true },
      { name: 'Islamabad', province: 'Islamabad Capital Territory', tehsils: ['Federal Area', 'G-Sector', 'F-Sector'], isActive: true },
    ]);
  }

  const settingsCount = await db.SystemSettings.countDocuments({});
  if (settingsCount === 0) {
    await db.SystemSettings.create({
      key: 'global_config',
      schoolCategories: [
        { id: 'cat-gov-1', name: 'Government Primary School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-2', name: 'Government Elementary School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-3', name: 'Government Secondary School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-4', name: 'Government Higher Secondary School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-5', name: 'Government Girls School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-6', name: 'Government Boys School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-7', name: 'Government Model School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-8', name: 'Government Special Education School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-gov-9', name: 'Government Technical School', schoolType: SchoolType.GOVERNMENT, isActive: true },
        { id: 'cat-prv-1', name: 'Private Primary School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-2', name: 'Private Elementary School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-3', name: 'Private Secondary School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-4', name: 'Private Higher Secondary School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-5', name: 'Private International School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-6', name: 'Private Montessori School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-7', name: 'Private Islamic School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-8', name: 'Private Special Education School', schoolType: SchoolType.PRIVATE, isActive: true },
        { id: 'cat-prv-9', name: 'Private Technical School', schoolType: SchoolType.PRIVATE, isActive: true },
      ],
      ownershipPolicies: [],
    });
  }

  // Ensure Super Admin user exists and stays synced with .env ADMIN_EMAIL / ADMIN_PASSWORD
  await syncEnvSuperAdmin();
}
