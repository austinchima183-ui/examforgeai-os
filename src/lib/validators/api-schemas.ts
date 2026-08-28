import { z } from 'zod';

// Common
export const uuidParam = z.string().uuid();
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const sortSchema = z.object({ sortBy: z.string().max(50).optional(), sortOrder: z.enum(['asc', 'desc']).default('asc') });
export const dateRangeSchema = z.object({ startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional() });

// Organization
export const createOrganizationSchema = z.object({ name: z.string().min(2).max(200), type: z.enum(['school', 'school_group', 'district', 'ministry', 'region', 'country', 'campus', 'branch', 'department', 'faculty', 'university', 'college', 'examination_council', 'ngo', 'corporate_training', 'international_network']), code: z.string().min(1).max(100), parentId: z.string().uuid().nullable().optional(), metadata: z.record(z.string(), z.unknown()).nullable().optional(), settings: z.record(z.string(), z.unknown()).nullable().optional(), branding: z.record(z.string(), z.unknown()).nullable().optional() }).strict();
export const updateOrganizationSchema = z.object({ name: z.string().min(2).max(200).optional(), settings: z.record(z.string(), z.unknown()).optional() }).strict();

// School
export const createSchoolSchema = z.object({ name: z.string().min(2).max(200), address: z.string().max(500).optional(), organizationId: z.string().uuid(), phone: z.string().max(30).optional(), email: z.string().email().optional() }).strict();
export const updateSchoolSchema = z.object({ name: z.string().min(2).max(200).optional(), address: z.string().max(500).optional(), phone: z.string().max(30).optional(), email: z.string().email().optional(), isActive: z.boolean().optional() }).strict();

// User
export const createUserSchema = z.object({ email: z.string().email(), fullName: z.string().min(2).max(100), role: z.enum(['student', 'teacher', 'school_admin', 'super_admin', 'parent', 'government']), schoolId: z.string().uuid().optional(), password: z.string().min(8).optional(), phone: z.string().max(30).optional(), isActive: z.boolean().optional(), isEmailVerified: z.boolean().optional() }).strict();
export const updateUserSchema = z.object({ id: z.string().uuid(), fullName: z.string().min(2).max(100).optional(), role: z.enum(['student', 'teacher', 'school_admin', 'super_admin', 'parent', 'government']).optional(), schoolId: z.string().uuid().nullable().optional(), isActive: z.boolean().optional(), phone: z.string().max(30).optional(), isEmailVerified: z.boolean().optional() }).strict();

// Analytics
export const analyticsQuerySchema = z.object({ range: z.enum(['7d', '30d', '90d', '1y', 'custom']).default('30d'), period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month') }).merge(dateRangeSchema).merge(paginationSchema);
export const nlqQuerySchema = z.object({ query: z.string().min(2).max(500) });
export const analyticsEventSchema = z.object({ type: z.string().max(50), name: z.string().max(100), properties: z.record(z.string(), z.unknown()).optional() }).strict();

// Billing
export const checkoutSchema = z.object({ planId: z.string().uuid(), organizationId: z.string().uuid().optional() }).strict();
export const subscriptionQuerySchema = z.object({ organizationId: z.string().uuid().optional(), status: z.enum(['active', 'canceled', 'past_due', 'trialing']).optional() }).merge(paginationSchema);
export const invoiceQuerySchema = z.object({ organizationId: z.string().uuid().optional(), status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).optional() }).merge(paginationSchema).merge(dateRangeSchema);
export const generateInvoiceSchema = z.object({ organizationId: z.string().uuid(), periodStart: z.string().datetime(), periodEnd: z.string().datetime() }).strict();
export const refundSchema = z.object({ subscriptionId: z.string().uuid(), reason: z.string().min(5).max(500), amount: z.number().positive().optional() }).strict();

// Marketplace
export const marketplaceSearchSchema = z.object({ query: z.string().min(1).max(200).optional(), category: z.string().max(50).optional(), sortBy: z.enum(['newest', 'popular', 'price_asc', 'price_desc', 'rating']).default('newest') }).merge(paginationSchema);
export const reviewCreateSchema = z.object({ productId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).strict();
export const purchaseSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).default(1) }).strict();

// Search
export const searchQuerySchema = z.object({ q: z.string().min(2).max(100), type: z.enum(['all', 'exam', 'question', 'student', 'teacher', 'school', 'marketplace']).default('all') }).merge(paginationSchema);

// Reports
export const reportGenerateSchema = z.object({ type: z.enum(['student', 'class', 'school', 'exam', 'attendance', 'financial']), format: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'), schoolId: z.string().uuid().optional(), examId: z.string().uuid().optional(), classId: z.string().uuid().optional() }).merge(dateRangeSchema).strict();

// AI
export const aiCompleteSchema = z.object({ prompt: z.string().min(1).max(10000), messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string().max(50000) })).optional(), model: z.string().max(50).optional(), maxTokens: z.number().int().min(1).max(4096).optional(), temperature: z.number().min(0).max(2).optional() }).strict();
export const aiStreamSchema = z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string().max(50000) })).min(1).max(50), model: z.string().max(50).optional() }).strict();

// Events
export const eventCreateSchema = z.object({ type: z.string().max(100), payload: z.record(z.string(), z.unknown()).optional(), metadata: z.record(z.string(), z.unknown()).optional() }).strict();
export const eventQuerySchema = z.object({ fromTimestamp: z.string().datetime().optional(), toTimestamp: z.string().datetime().optional(), type: z.string().max(100).optional(), schoolId: z.string().uuid().optional() }).merge(paginationSchema);

// Plugins
export const pluginInstallSchema = z.object({ pluginId: z.string().uuid(), organizationId: z.string().uuid().optional(), config: z.record(z.string(), z.unknown()).optional() }).strict();
export const pluginSearchSchema = z.object({ query: z.string().max(200).optional(), category: z.string().max(50).optional() }).merge(paginationSchema);
export const pluginRegisterSchema = z.object({ id: z.string().max(200), name: z.string().min(1).max(200), version: z.string().max(50).optional(), description: z.string().max(1000).optional(), author: z.string().max(200).optional(), type: z.string().max(50).optional(), category: z.string().max(50).optional(), config: z.record(z.string(), z.unknown()).optional() }).strict();

// Settings
export const apiKeyCreateSchema = z.object({ name: z.string().min(2).max(100), permissions: z.array(z.string().max(50)).min(1).max(20), expiresIn: z.number().int().positive().optional() }).strict();
export const apiKeyActionSchema = z.object({ action: z.enum(['create', 'revoke', 'usage']), name: z.string().min(2).max(100).optional(), permissions: z.array(z.string().max(50)).max(20).optional(), expiration: z.string().max(100).optional(), keyId: z.string().max(100).optional() }).strict();
export const webhookCreateSchema = z.object({ url: z.string().url(), events: z.array(z.string().max(50)).min(1).max(20), secret: z.string().min(16).max(128).optional() }).strict();

// Security
export const passkeyCreateSchema = z.object({ name: z.string().min(1).max(100).optional() }).strict();
export const sessionQuerySchema = z.object({ userId: z.string().uuid().optional(), organizationId: z.string().uuid().optional() }).merge(paginationSchema);

// Developer
export const devKeyCreateSchema = z.object({ name: z.string().min(2).max(100), permissions: z.array(z.string().max(50)).min(1).max(20), organizationId: z.string().uuid().optional(), expiresIn: z.number().int().positive().optional() }).strict();
export const oauthAppCreateSchema = z.object({ name: z.string().min(2).max(100), redirectUris: z.array(z.string().url()).min(1).max(10), organizationId: z.string().uuid().optional() }).strict();

// Teacher
export const gradeSubmissionSchema = z.object({ submissionId: z.string().uuid(), score: z.number().min(0).max(100), feedback: z.string().max(2000).optional(), useAI: z.boolean().optional() }).strict();
export const submissionQuerySchema = z.object({ examId: z.string().uuid().optional(), status: z.enum(['pending', 'graded', 'submitted', 'in_progress']).optional() }).merge(paginationSchema);

// School Admin
export const attendanceCreateSchema = z.object({ studentId: z.string().uuid(), status: z.enum(['present', 'absent', 'late', 'excused']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), classId: z.string().uuid().optional(), notes: z.string().max(500).optional() }).strict();
export const attendanceUpdateSchema = z.object({ status: z.enum(['present', 'absent', 'late', 'excused']).optional(), notes: z.string().max(500).optional() }).strict();
export const feeCreateSchema = z.object({ studentId: z.string().uuid(), amount: z.number().positive(), type: z.enum(['tuition', 'exam', 'library', 'transport', 'other']), dueDate: z.string().datetime() }).strict();
export const feeUpdateSchema = z.object({ status: z.enum(['pending', 'paid', 'overdue', 'waived']).optional(), paidDate: z.string().datetime().optional() }).strict();

// Parent
export const parentQuerySchema = z.object({ childId: z.string().uuid().optional() }).merge(paginationSchema);

// Lead (CRM)
export const leadUpdateSchema = z.object({ stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(), firstName: z.string().max(100).optional(), lastName: z.string().max(100).optional(), email: z.string().email().optional(), phone: z.string().max(30).optional(), company: z.string().max(200).optional(), notes: z.string().max(2000).optional(), source: z.string().max(50).optional() }).strict();

// Role permissions
export const rolePermissionUpdateSchema = z.object({ roleId: z.string().uuid(), permissions: z.array(z.string().max(100)) }).strict();

// Lesson plans
export const lessonPlanCreateSchema = z.object({ teacherId: z.string().uuid(), schoolId: z.string().uuid().optional(), subject: z.string().min(1).max(200), topic: z.string().min(1).max(200), className: z.string().max(100).optional(), duration: z.number().int().min(1).max(480).optional(), objectives: z.array(z.string()).optional(), materials: z.array(z.string()).optional(), activities: z.array(z.string()).optional(), assessment: z.unknown().optional(), scheduledAt: z.string().datetime().optional(), status: z.enum(['draft', 'published', 'archived']).optional(), notes: z.string().max(5000).optional() }).strict();
export const lessonPlanUpdateSchema = z.object({ id: z.string().uuid(), teacherId: z.string().uuid().optional(), schoolId: z.string().uuid().optional(), subject: z.string().min(1).max(200).optional(), topic: z.string().min(1).max(200).optional(), className: z.string().max(100).optional(), duration: z.number().int().min(1).max(480).optional(), objectives: z.array(z.string()).optional(), materials: z.array(z.string()).optional(), activities: z.array(z.string()).optional(), assessment: z.unknown().optional(), scheduledAt: z.string().datetime().optional(), status: z.enum(['draft', 'published', 'archived']).optional(), notes: z.string().max(5000).optional() }).strict();

// Admin user query
export const adminUserQuerySchema = z.object({ role: z.enum(['student', 'teacher', 'school_admin', 'super_admin', 'parent', 'government']).optional(), schoolId: z.string().uuid().optional(), status: z.enum(['active', 'inactive', 'all']).optional(), search: z.string().max(200).optional() }).merge(paginationSchema);

// SSO create
export const ssoCreateSchema = z.object({ organizationId: z.string().uuid().optional(), type: z.enum(['saml', 'oidc', 'google', 'azure_ad', 'okta', 'auth0', 'onelogin', 'ping', 'ldap']), name: z.string().min(1).max(200), enabled: z.boolean().optional(), config: z.object({ clientId: z.string().optional(), clientSecret: z.string().optional(), issuer: z.string().optional(), authorizationUrl: z.string().optional(), tokenUrl: z.string().optional(), userInfoUrl: z.string().optional(), scopes: z.array(z.string()).optional() }).optional(), attributeMapping: z.record(z.string(), z.string()).optional() }).strict();

// Branding update
export const brandingUpdateSchema = z.object({ schoolId: z.string().uuid(), schoolData: z.object({ name: z.string().min(1).max(200).optional(), tagline: z.string().max(500).optional(), logoUrl: z.string().max(500).optional(), primaryColor: z.string().max(20).optional(), accentColor: z.string().max(20).optional(), address: z.string().max(500).optional(), city: z.string().max(100).optional(), phone: z.string().max(30).optional(), email: z.string().email().optional() }).optional(), settings: z.record(z.string(), z.unknown()).optional(), userId: z.string().uuid().optional() }).strict();

// Rubric create
export const rubricCreateSchema = z.object({ name: z.string().min(1).max(200), criteria: z.array(z.unknown()).optional(), examId: z.string().uuid().optional(), teacherId: z.string().uuid(), schoolId: z.string().uuid().optional(), subject: z.string().max(100).optional(), topic: z.string().max(200).optional(), assessmentType: z.enum(['essay', 'project', 'presentation', 'portfolio', 'lab', 'oral', 'other']).optional(), performanceLevels: z.array(z.unknown()).optional(), cells: z.array(z.unknown()).optional(), totalPoints: z.number().min(0).optional(), isTemplate: z.boolean().optional() }).strict();

// Parent messaging
export const parentMessagingQuerySchema = z.object({ userId: z.string().uuid(), contactId: z.string().uuid().optional() });
export const parentMessagingSchema = z.object({ senderId: z.string().uuid(), recipientId: z.string().uuid(), subject: z.string().max(500).optional(), content: z.string().min(1).max(10000), schoolId: z.string().uuid().optional(), attachmentUrl: z.string().max(500).optional(), attachmentName: z.string().max(200).optional() }).strict();

// Worksheet create/update
export const worksheetCreateSchema = z.object({ teacherId: z.string().uuid(), schoolId: z.string().uuid().optional(), title: z.string().min(1).max(200), subject: z.string().min(1).max(100), instructions: z.string().max(5000).optional(), questions: z.array(z.unknown()).optional(), headerConfig: z.unknown().optional(), difficulty: z.enum(['easy', 'medium', 'hard']).optional(), spacing: z.enum(['compact', 'normal', 'wide']).optional(), isTemplate: z.boolean().optional(), templateName: z.string().max(200).optional() }).strict();
export const worksheetUpdateSchema = z.object({ id: z.string().uuid(), teacherId: z.string().uuid().optional(), schoolId: z.string().uuid().optional(), title: z.string().min(1).max(200).optional(), subject: z.string().min(1).max(100).optional(), instructions: z.string().max(5000).optional(), questions: z.array(z.unknown()).optional(), headerConfig: z.unknown().optional(), difficulty: z.enum(['easy', 'medium', 'hard']).optional(), spacing: z.enum(['compact', 'normal', 'wide']).optional(), isTemplate: z.boolean().optional(), templateName: z.string().max(200).optional() }).strict();

// Webhook action
export const webhookActionSchema = z.object({ action: z.enum(['create', 'update', 'delete', 'test']), url: z.string().url().optional(), events: z.array(z.string().max(50)).optional(), webhookId: z.string().max(100).optional(), active: z.boolean().optional() });

// CBT
export const cbtSessionStartSchema = z.object({ userId: z.string().uuid(), examId: z.string().uuid(), clientTimestamp: z.string().datetime().optional() }).strict();
export const cbtSessionReconnectSchema = z.object({ sessionId: z.string().uuid() }).strict();
