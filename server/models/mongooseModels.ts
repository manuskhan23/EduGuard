import mongoose, { Schema } from 'mongoose';
import {
  UserRole,
  SchoolType,
  RegistrationStatus,
  VerificationStatus,
  ComplaintStatus,
  InspectionGroupStatus,
  CorrectiveActionStatus,
} from '../types.js';

const { Types } = Schema;

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true, index: true },
    phone: { type: String, default: '' },
    cnicOrReference: { type: String, default: '' },
    designation: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    schoolId: { type: Types.ObjectId, ref: 'Schools', default: null, index: true },
    schoolIds: [{ type: Types.ObjectId, ref: 'Schools' }],
    isEmailVerified: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockReason: { type: String, default: '' },
    tokenVersion: { type: Number, default: 0 },
    province: { type: String, default: '' },
    district: { type: String, default: '' },
    specialization: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const schoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    schoolCode: { type: String, default: '', index: true },
    emisCode: { type: String, default: '', index: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true, index: true },
    schoolCategory: { type: String, required: true, index: true },
    educationLevels: [{ type: String }],
    genderType: { type: String, default: 'Co-education' },
    establishedYear: { type: Number, default: 2000 },
    operatingStatus: { type: String, default: 'Active' },
    numberOfCampuses: { type: Number, default: 1 },
    parentOrganization: { type: String, default: '' },
    website: { type: String, default: '' },
    logo: { type: String, default: '' },
    photographs: [{ type: String }],
    address: { type: String, required: true },
    province: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    city: { type: String, required: true },
    tehsil: { type: String, default: '' },
    unionCouncil: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    location: {
      lat: { type: Number, default: 31.5204 },
      lng: { type: Number, default: 74.3587 },
    },
    // Government-specific metadata
    educationDepartment: { type: String, default: '' },
    administrativeRegion: { type: String, default: '' },
    relevantAuthority: { type: String, default: '' },
    departmentReferenceNumber: { type: String, default: '' },
    // Management contact
    principalName: { type: String, default: '' },
    administratorName: { type: String, default: '' },
    managementOrganization: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    officialEmail: { type: String, default: '' },
    facilities: [{ type: String }],
    overview: { type: String, default: '' },
    owner: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    authorizedRepresentatives: [{ type: Types.ObjectId, ref: 'Users' }],
    registrationStatus: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: RegistrationStatus.PENDING,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.UNVERIFIED,
      index: true,
    },
    approvedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    approvedAt: { type: Date, default: null },
    verifiedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    suspensionReason: { type: String, default: '' },
    documents: [{ type: Types.ObjectId, ref: 'SchoolDocuments' }],
  },
  { timestamps: true }
);
schoolSchema.index({ schoolType: 1, registrationStatus: 1, verificationStatus: 1 });
schoolSchema.index({ province: 1, district: 1, schoolType: 1 });

const schoolApplicationSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    applicantId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true, index: true },
    status: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: RegistrationStatus.PENDING,
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    reviewedAt: { type: Date, default: null },
    adminRemarks: { type: String, default: '' },
    internalNotes: [
      {
        authorId: { type: Types.ObjectId, ref: 'Users' },
        authorName: String,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    history: [
      {
        status: String,
        actionBy: { type: Types.ObjectId, ref: 'Users' },
        actionByName: String,
        comment: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const schoolDocumentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    uploadedBy: { type: Types.ObjectId, ref: 'Users', required: true },
    documentType: { type: String, required: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    fileUrl: { type: String, required: true },
    previewText: { type: String, default: '' },
  },
  { timestamps: true }
);

const classSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    name: { type: String, required: true },
    gradeLevel: { type: String, required: true },
    academicSession: { type: String, default: '2026-2027' },
    capacity: { type: Number, default: 40 },
  },
  { timestamps: true }
);

const sectionSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    classId: { type: Types.ObjectId, ref: 'Classes', required: true, index: true },
    name: { type: String, required: true },
    classTeacherId: { type: Types.ObjectId, ref: 'Teachers', default: null },
    roomNumber: { type: String, default: '' },
    capacity: { type: Number, default: 40 },
  },
  { timestamps: true }
);

const subjectSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    classId: { type: Types.ObjectId, ref: 'Classes', default: null },
    teacherId: { type: Types.ObjectId, ref: 'Teachers', default: null },
  },
  { timestamps: true }
);

const teacherSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    employeeCode: { type: String, required: true },
    qualification: { type: String, default: '' },
    subjects: [{ type: String }],
    assignedClassIds: [{ type: Types.ObjectId, ref: 'Classes' }],
    assignedSectionIds: [{ type: Types.ObjectId, ref: 'Sections' }],
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);
teacherSchema.index({ schoolId: 1, employeeCode: 1 }, { unique: true });

const studentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'Users', default: null },
    fullName: { type: String, required: true },
    admissionNumber: { type: String, required: true, index: true },
    rollNumber: { type: String, default: '' },
    classId: { type: Types.ObjectId, ref: 'Classes', required: true, index: true },
    sectionId: { type: Types.ObjectId, ref: 'Sections', default: null },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    dateOfBirth: { type: String, default: '' },
    guardianName: { type: String, default: '' },
    guardianPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    academicStatus: {
      type: String,
      enum: ['ACTIVE', 'PROMOTED', 'TRANSFERRED', 'GRADUATED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);
studentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });

const parentStudentSchema = new Schema(
  {
    parentId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'Students', required: true, index: true },
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    relationship: { type: String, default: 'Parent/Guardian' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    reviewedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
parentStudentSchema.index({ parentId: 1, studentId: 1 }, { unique: true });

const attendanceSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    targetType: { type: String, enum: ['STUDENT', 'TEACHER'], required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'Students', default: null, index: true },
    teacherId: { type: Types.ObjectId, ref: 'Teachers', default: null, index: true },
    classId: { type: Types.ObjectId, ref: 'Classes', default: null },
    sectionId: { type: Types.ObjectId, ref: 'Sections', default: null },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], required: true },
    remarks: { type: String, default: '' },
    markedBy: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true }
);

const examinationSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    title: { type: String, required: true },
    term: { type: String, default: 'Annual' },
    academicSession: { type: String, default: '2026-2027' },
    classId: { type: Types.ObjectId, ref: 'Classes', required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    subjects: [
      {
        subjectId: { type: Types.ObjectId, ref: 'Subjects' },
        subjectName: String,
        maxMarks: { type: Number, default: 100 },
        passingMarks: { type: Number, default: 33 },
      },
    ],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const resultSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    examinationId: { type: Types.ObjectId, ref: 'Examinations', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'Students', required: true, index: true },
    classId: { type: Types.ObjectId, ref: 'Classes', required: true },
    marks: [
      {
        subjectName: String,
        obtainedMarks: Number,
        maxMarks: Number,
        grade: String,
      },
    ],
    totalObtained: { type: Number, default: 0 },
    totalMax: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    overallGrade: { type: String, default: '' },
    status: { type: String, enum: ['PASS', 'FAIL'], default: 'PASS' },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const feeStructureSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    title: { type: String, required: true },
    classId: { type: Types.ObjectId, ref: 'Classes', default: null },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'], default: 'MONTHLY' },
    dueDate: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const paymentSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'Students', required: true, index: true },
    feeStructureId: { type: Types.ObjectId, ref: 'FeeStructures', required: true },
    receiptNumber: { type: String, required: true, unique: true },
    amountPaid: { type: Number, required: true },
    amountDue: { type: Number, default: 0 },
    paymentDate: { type: String, required: true },
    paymentMethod: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CHALLAN', 'ONLINE'], default: 'CHALLAN' },
    status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], default: 'PAID', index: true },
    recordedBy: { type: Types.ObjectId, ref: 'Users' },
  },
  { timestamps: true }
);

const timetableSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    classId: { type: Types.ObjectId, ref: 'Classes', required: true, index: true },
    sectionId: { type: Types.ObjectId, ref: 'Sections', default: null },
    subjectId: { type: Types.ObjectId, ref: 'Subjects', required: true },
    teacherId: { type: Types.ObjectId, ref: 'Teachers', required: true, index: true },
    dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    classroom: { type: String, required: true },
  },
  { timestamps: true }
);

const announcementSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    audience: { type: String, enum: ['PUBLIC', 'PARENTS', 'TEACHERS', 'STUDENTS', 'ALL'], default: 'ALL' },
    isPinned: { type: Boolean, default: false },
    createdBy: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true }
);

const complaintSchema = new Schema(
  {
    complaintNumber: { type: String, required: true, unique: true, index: true },
    parentId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true, index: true },
    province: { type: String, default: '', index: true },
    district: { type: String, default: '', index: true },
    category: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    relatedStudentId: { type: Types.ObjectId, ref: 'Students', default: null },
    relatedStudentName: { type: String, default: '' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
    status: { type: String, enum: Object.values(ComplaintStatus), default: ComplaintStatus.SUBMITTED, index: true },
    evidencePhotos: [{ type: String }],
    supportingDocuments: [{ title: String, fileUrl: String, mimeType: String }],
    schoolResponse: { type: String, default: '' },
    schoolRespondedAt: { type: Date, default: null },
    resolutionSummary: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    assignedInspectionGroupId: { type: Types.ObjectId, ref: 'InspectionGroups', default: null },
  },
  { timestamps: true }
);
complaintSchema.index({ schoolType: 1, status: 1, category: 1 });

const complaintMessageSchema = new Schema(
  {
    complaintId: { type: Types.ObjectId, ref: 'Complaints', required: true, index: true },
    senderId: { type: Types.ObjectId, ref: 'Users', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    isInternalAdminNote: { type: Boolean, default: false },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

const complaintTimelineSchema = new Schema(
  {
    complaintId: { type: Types.ObjectId, ref: 'Complaints', required: true, index: true },
    status: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actorId: { type: Types.ObjectId, ref: 'Users' },
    actorName: { type: String, default: '' },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const inspectionGroupSchema = new Schema(
  {
    inspectionId: { type: String, required: true, unique: true, index: true },
    groupName: { type: String, required: true },
    targetSchoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true, index: true },
    district: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    inspectionType: { type: String, required: true },
    relatedComplaints: [{ type: Types.ObjectId, ref: 'Complaints' }],
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
    deadline: { type: Date, required: true },
    instructions: { type: String, default: '' },
    groupLeaderId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(InspectionGroupStatus),
      default: InspectionGroupStatus.ASSIGNED,
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: 'Users', required: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const inspectionMemberSchema = new Schema(
  {
    groupId: { type: Types.ObjectId, ref: 'InspectionGroups', required: true, index: true },
    inspectorId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    isLeader: { type: Boolean, default: false },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
inspectionMemberSchema.index({ groupId: 1, inspectorId: 1 }, { unique: true });

const inspectionTaskSchema = new Schema(
  {
    groupId: { type: Types.ObjectId, ref: 'InspectionGroups', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    assignedTo: { type: Types.ObjectId, ref: 'Users', required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
    createdBy: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true }
);

const inspectionFindingSchema = new Schema(
  {
    groupId: { type: Types.ObjectId, ref: 'InspectionGroups', required: true, index: true },
    inspectorId: { type: Types.ObjectId, ref: 'Users', required: true },
    inspectorName: { type: String, required: true },
    title: { type: String, required: true },
    observations: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'], default: 'MODERATE' },
    notes: { type: String, default: '' },
    photos: [{ type: String }],
    documents: [{ title: String, fileUrl: String, mimeType: String }],
    evidenceStatus: { type: String, enum: ['SUBMITTED', 'MORE_EVIDENCE_REQUESTED', 'ACCEPTED'], default: 'SUBMITTED' },
    leaderFeedback: { type: String, default: '' },
    observedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const inspectionReportSchema = new Schema(
  {
    groupId: { type: Types.ObjectId, ref: 'InspectionGroups', required: true, unique: true, index: true },
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true },
    submittedBy: { type: Types.ObjectId, ref: 'Users', required: true },
    submittedAt: { type: Date, default: Date.now },
    detailedFindings: { type: String, required: true },
    violations: [{ type: String }],
    riskAssessment: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'], default: 'MODERATE' },
    recommendations: { type: String, required: true },
    correctiveActionRequirements: { type: String, default: '' },
    finalConclusion: { type: String, required: true },
    evidenceAttachments: [{ title: String, fileUrl: String, mimeType: String }],
    adminStatus: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'REVISION_REQUESTED'], default: 'PENDING_REVIEW', index: true },
    adminRemarks: { type: String, default: '' },
    reviewedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    reviewedAt: { type: Date, default: null },
    publicSummaryApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const correctiveActionSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    schoolType: { type: String, enum: Object.values(SchoolType), required: true },
    inspectionReportId: { type: Types.ObjectId, ref: 'InspectionReports', default: null },
    identifiedIssue: { type: String, required: true },
    requiredCorrection: { type: String, required: true },
    responsibleParty: { type: String, required: true },
    deadline: { type: Date, required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
    supportingDocuments: [{ title: String, fileUrl: String, mimeType: String }],
    status: {
      type: String,
      enum: Object.values(CorrectiveActionStatus),
      default: CorrectiveActionStatus.PENDING,
      index: true,
    },
    schoolEvidenceNotes: { type: String, default: '' },
    schoolEvidenceFiles: [{ title: String, fileUrl: String, mimeType: String }],
    submittedAt: { type: Date, default: null },
    adminReviewNotes: { type: String, default: '' },
    verifiedBy: { type: Types.ObjectId, ref: 'Users', default: null },
    verifiedAt: { type: Date, default: null },
    createdBy: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true }
);

const conversationSchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    subject: { type: String, required: true },
    participants: [{ type: Types.ObjectId, ref: 'Users' }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const messageSchema = new Schema(
  {
    conversationId: { type: Types.ObjectId, ref: 'Conversations', required: true, index: true },
    senderId: { type: Types.ObjectId, ref: 'Users', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    body: { type: String, required: true },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    recipientId: { type: Types.ObjectId, ref: 'Users', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    resourceType: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const verificationHistorySchema = new Schema(
  {
    schoolId: { type: Types.ObjectId, ref: 'Schools', required: true, index: true },
    previousStatus: { type: String, enum: Object.values(VerificationStatus), required: true },
    newStatus: { type: String, enum: Object.values(VerificationStatus), required: true },
    adminId: { type: Types.ObjectId, ref: 'Users', required: true },
    adminName: { type: String, required: true },
    reason: { type: String, required: true },
    supportingDocUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

const auditLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'Users', default: null, index: true },
    userName: { type: String, default: 'System' },
    role: { type: String, default: 'SYSTEM' },
    action: { type: String, required: true, index: true },
    targetResource: { type: String, required: true },
    targetId: { type: String, default: '' },
    previousValues: { type: Schema.Types.Mixed, default: null },
    newValues: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

const systemSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    schoolCategories: [
      {
        id: String,
        name: String,
        schoolType: { type: String, enum: Object.values(SchoolType) },
        isActive: { type: Boolean, default: true },
      },
    ],
    ownershipPolicies: [
      {
        id: String,
        title: String,
        schoolType: { type: String, enum: Object.values(SchoolType) },
        province: String,
        district: String,
        schoolCategory: String,
        effectiveDate: String,
        requiredDocuments: [String],
        reportingRequirements: String,
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

const provinceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const districtSchema = new Schema(
  {
    name: { type: String, required: true },
    province: { type: String, required: true, index: true },
    tehsils: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
districtSchema.index({ name: 1, province: 1 }, { unique: true });

export const MongooseModels = {
  Users: mongoose.models.Users || mongoose.model('Users', userSchema),
  Schools: mongoose.models.Schools || mongoose.model('Schools', schoolSchema),
  SchoolApplications: mongoose.models.SchoolApplications || mongoose.model('SchoolApplications', schoolApplicationSchema),
  SchoolDocuments: mongoose.models.SchoolDocuments || mongoose.model('SchoolDocuments', schoolDocumentSchema),
  Classes: mongoose.models.Classes || mongoose.model('Classes', classSchema),
  Sections: mongoose.models.Sections || mongoose.model('Sections', sectionSchema),
  Students: mongoose.models.Students || mongoose.model('Students', studentSchema),
  Teachers: mongoose.models.Teachers || mongoose.model('Teachers', teacherSchema),
  Subjects: mongoose.models.Subjects || mongoose.model('Subjects', subjectSchema),
  ParentStudentRelationships:
    mongoose.models.ParentStudentRelationships || mongoose.model('ParentStudentRelationships', parentStudentSchema),
  Attendance: mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema),
  Examinations: mongoose.models.Examinations || mongoose.model('Examinations', examinationSchema),
  Results: mongoose.models.Results || mongoose.model('Results', resultSchema),
  FeeStructures: mongoose.models.FeeStructures || mongoose.model('FeeStructures', feeStructureSchema),
  Payments: mongoose.models.Payments || mongoose.model('Payments', paymentSchema),
  Timetables: mongoose.models.Timetables || mongoose.model('Timetables', timetableSchema),
  Announcements: mongoose.models.Announcements || mongoose.model('Announcements', announcementSchema),
  Complaints: mongoose.models.Complaints || mongoose.model('Complaints', complaintSchema),
  ComplaintMessages: mongoose.models.ComplaintMessages || mongoose.model('ComplaintMessages', complaintMessageSchema),
  ComplaintTimeline: mongoose.models.ComplaintTimeline || mongoose.model('ComplaintTimeline', complaintTimelineSchema),
  InspectionGroups: mongoose.models.InspectionGroups || mongoose.model('InspectionGroups', inspectionGroupSchema),
  InspectionMembers: mongoose.models.InspectionMembers || mongoose.model('InspectionMembers', inspectionMemberSchema),
  InspectionTasks: mongoose.models.InspectionTasks || mongoose.model('InspectionTasks', inspectionTaskSchema),
  InspectionFindings: mongoose.models.InspectionFindings || mongoose.model('InspectionFindings', inspectionFindingSchema),
  InspectionReports: mongoose.models.InspectionReports || mongoose.model('InspectionReports', inspectionReportSchema),
  CorrectiveActions: mongoose.models.CorrectiveActions || mongoose.model('CorrectiveActions', correctiveActionSchema),
  Conversations: mongoose.models.Conversations || mongoose.model('Conversations', conversationSchema),
  Messages: mongoose.models.Messages || mongoose.model('Messages', messageSchema),
  Notifications: mongoose.models.Notifications || mongoose.model('Notifications', notificationSchema),
  VerificationHistory:
    mongoose.models.VerificationHistory || mongoose.model('VerificationHistory', verificationHistorySchema),
  AuditLogs: mongoose.models.AuditLogs || mongoose.model('AuditLogs', auditLogSchema),
  SystemSettings: mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingSchema),
  Districts: mongoose.models.Districts || mongoose.model('Districts', districtSchema),
  Provinces: mongoose.models.Provinces || mongoose.model('Provinces', provinceSchema),
};
