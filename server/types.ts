export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_OWNER = 'SCHOOL_OWNER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  INSPECTOR = 'INSPECTOR',
  GROUP_LEADER = 'GROUP_LEADER',
}

export enum SchoolType {
  GOVERNMENT = 'GOVERNMENT',
  PRIVATE = 'PRIVATE',
}

export enum RegistrationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  MORE_INFORMATION_REQUIRED = 'MORE_INFORMATION_REQUIRED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
}

export enum ComplaintStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVESTIGATION_ASSIGNED = 'INVESTIGATION_ASSIGNED',
  INVESTIGATION_IN_PROGRESS = 'INVESTIGATION_IN_PROGRESS',
  REPORT_SUBMITTED = 'REPORT_SUBMITTED',
  ADMIN_REVIEW = 'ADMIN_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum InspectionGroupStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  REPORT_SUBMITTED = 'REPORT_SUBMITTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum CorrectiveActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  VERIFIED_BY_ADMIN = 'VERIFIED_BY_ADMIN',
}

export const COMPLAINT_CATEGORIES = [
  'Teacher Misconduct',
  'School Administration',
  'Student Safety',
  'Harassment or Bullying',
  'Unfair Treatment',
  'Poor Academic Quality',
  'Attendance Issues',
  'Infrastructure Problems',
  'Hygiene and Sanitation',
  'Fee Issues',
  'Unauthorized Fees',
  'Missing Facilities',
  'Discrimination',
  'Other',
] as const;

export const INSPECTION_TYPES = [
  'Complaint-Based Inspection',
  'Routine Inspection',
  'Surprise Inspection',
  'Safety Inspection',
  'Infrastructure Inspection',
  'Academic Quality Inspection',
  'Financial Compliance Inspection',
  'Follow-Up Inspection',
] as const;

export const EDUCATION_LEVELS = [
  'Primary',
  'Elementary',
  'Secondary',
  'Higher Secondary',
  'Technical',
  'Special Education',
] as const;

export const GENDER_TYPES = ['Boys', 'Girls', 'Co-education'] as const;
