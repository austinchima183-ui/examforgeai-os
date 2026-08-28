// ============================================================================
// ExamForge AI — API Endpoint Registry
// ============================================================================
// Provides a centralized registry of all API endpoints with metadata, scope
// requirements, and rate limits. Generates OpenAPI 3.1 specifications and
// Postman collections for SDK integration and developer documentation.
// ============================================================================

import type {
  APIEndpoint,
  APIParameter,
  APIRequestBody,
  APIResponse,
  APIVersion,
  APIScope,
  GraphQLSchema,
  GraphQLType,
  GraphQLOperation,
  GraphQLField,
  GraphQLArgument,
  OpenAPISpec,
  PostmanCollection,
  PostmanItem,
  PostmanVariable,
  RateLimitConfig,
  HTTPMethod,
} from './types';

// ----------------------------------------------------------------------------
// Default Rate Limit Config
// ----------------------------------------------------------------------------

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
  burstLimit: 10,
};

const STRICT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 10,
  requestsPerHour: 200,
  requestsPerDay: 2000,
  burstLimit: 3,
};

const AI_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 20,
  requestsPerHour: 500,
  requestsPerDay: 5000,
  burstLimit: 5,
};

// ----------------------------------------------------------------------------
// Endpoint Definitions
// ----------------------------------------------------------------------------

function buildEndpoints(version: string): APIEndpoint[] {
  const v = `/api/${version}`;

  return [
    // ---- Profiles ----
    {
      method: 'GET',
      path: `${v}/profiles`,
      description: 'List all user profiles in the organization',
      scopes: [{ resource: 'profiles', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Profiles'],
      parameters: [
        { name: 'limit', in: 'query', required: false, description: 'Max results per page', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', required: false, description: 'Offset for pagination', schema: { type: 'integer', default: 0 } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of profiles', schema: { type: 'array', items: { '$ref': '#/components/schemas/Profile' } } },
        { statusCode: 401, description: 'Unauthorized' },
      ],
    },
    {
      method: 'GET',
      path: `${v}/profiles/:id`,
      description: 'Get a specific user profile',
      scopes: [{ resource: 'profiles', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Profiles'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Profile ID', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Profile details', schema: { '$ref': '#/components/schemas/Profile' } },
        { statusCode: 404, description: 'Profile not found' },
      ],
    },
    {
      method: 'PATCH',
      path: `${v}/profiles/:id`,
      description: 'Update a user profile',
      scopes: [{ resource: 'profiles', permission: 'write' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Profiles'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Profile ID', schema: { type: 'string' } },
      ],
      requestBody: { description: 'Profile update data', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/ProfileUpdate' } },
      responses: [
        { statusCode: 200, description: 'Updated profile', schema: { '$ref': '#/components/schemas/Profile' } },
        { statusCode: 400, description: 'Invalid input' },
      ],
    },

    // ---- Exams ----
    {
      method: 'GET',
      path: `${v}/exams`,
      description: 'List all exams',
      scopes: [{ resource: 'exams', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Exams'],
      parameters: [
        { name: 'status', in: 'query', required: false, description: 'Filter by exam status', schema: { type: 'string', enum: ['draft', 'published', 'archived'] } },
        { name: 'limit', in: 'query', required: false, description: 'Max results per page', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', required: false, description: 'Offset for pagination', schema: { type: 'integer', default: 0 } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of exams', schema: { type: 'array', items: { '$ref': '#/components/schemas/Exam' } } },
      ],
    },
    {
      method: 'POST',
      path: `${v}/exams`,
      description: 'Create a new exam',
      scopes: [{ resource: 'exams', permission: 'write' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Exams'],
      parameters: [],
      requestBody: { description: 'Exam creation data', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/ExamCreate' } },
      responses: [
        { statusCode: 201, description: 'Created exam', schema: { '$ref': '#/components/schemas/Exam' } },
        { statusCode: 400, description: 'Invalid input' },
      ],
    },
    {
      method: 'GET',
      path: `${v}/exams/:id`,
      description: 'Get a specific exam',
      scopes: [{ resource: 'exams', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Exams'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Exam ID', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Exam details', schema: { '$ref': '#/components/schemas/Exam' } },
        { statusCode: 404, description: 'Exam not found' },
      ],
    },
    {
      method: 'PUT',
      path: `${v}/exams/:id`,
      description: 'Replace an exam entirely',
      scopes: [{ resource: 'exams', permission: 'write' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Exams'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Exam ID', schema: { type: 'string' } },
      ],
      requestBody: { description: 'Full exam data', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/ExamCreate' } },
      responses: [
        { statusCode: 200, description: 'Updated exam', schema: { '$ref': '#/components/schemas/Exam' } },
        { statusCode: 400, description: 'Invalid input' },
      ],
    },
    {
      method: 'DELETE',
      path: `${v}/exams/:id`,
      description: 'Delete an exam',
      scopes: [{ resource: 'exams', permission: 'admin' }],
      rateLimit: STRICT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Exams'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Exam ID', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 204, description: 'Exam deleted' },
        { statusCode: 404, description: 'Exam not found' },
      ],
    },

    // ---- Questions ----
    {
      method: 'GET',
      path: `${v}/questions`,
      description: 'List questions in a question bank',
      scopes: [{ resource: 'questions', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Questions'],
      parameters: [
        { name: 'exam_id', in: 'query', required: false, description: 'Filter by exam ID', schema: { type: 'string' } },
        { name: 'type', in: 'query', required: false, description: 'Filter by question type', schema: { type: 'string', enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'] } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of questions', schema: { type: 'array', items: { '$ref': '#/components/schemas/Question' } } },
      ],
    },
    {
      method: 'POST',
      path: `${v}/questions`,
      description: 'Create a new question',
      scopes: [{ resource: 'questions', permission: 'write' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Questions'],
      parameters: [],
      requestBody: { description: 'Question creation data', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/QuestionCreate' } },
      responses: [
        { statusCode: 201, description: 'Created question', schema: { '$ref': '#/components/schemas/Question' } },
      ],
    },

    // ---- Results ----
    {
      method: 'GET',
      path: `${v}/results`,
      description: 'List exam results',
      scopes: [{ resource: 'results', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Results'],
      parameters: [
        { name: 'exam_id', in: 'query', required: false, description: 'Filter by exam ID', schema: { type: 'string' } },
        { name: 'student_id', in: 'query', required: false, description: 'Filter by student ID', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of results', schema: { type: 'array', items: { '$ref': '#/components/schemas/Result' } } },
      ],
    },

    // ---- Analytics ----
    {
      method: 'GET',
      path: `${v}/analytics/overview`,
      description: 'Get analytics overview for the organization',
      scopes: [{ resource: 'analytics', permission: 'read' }],
      rateLimit: STRICT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Analytics'],
      parameters: [
        { name: 'period', in: 'query', required: false, description: 'Time period for analytics', schema: { type: 'string', enum: ['7d', '30d', '90d'] } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Analytics overview', schema: { '$ref': '#/components/schemas/AnalyticsOverview' } },
      ],
    },
    {
      method: 'GET',
      path: `${v}/analytics/performance`,
      description: 'Get performance analytics',
      scopes: [{ resource: 'analytics', permission: 'read' }],
      rateLimit: STRICT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Analytics'],
      parameters: [
        { name: 'exam_id', in: 'query', required: true, description: 'Exam ID to analyze', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Performance data', schema: { '$ref': '#/components/schemas/PerformanceAnalytics' } },
      ],
    },

    // ---- Billing ----
    {
      method: 'GET',
      path: `${v}/billing/subscription`,
      description: 'Get current subscription details',
      scopes: [{ resource: 'billing', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Billing'],
      parameters: [],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Subscription details', schema: { '$ref': '#/components/schemas/Subscription' } },
      ],
    },
    {
      method: 'GET',
      path: `${v}/billing/invoices`,
      description: 'List billing invoices',
      scopes: [{ resource: 'billing', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Billing'],
      parameters: [
        { name: 'limit', in: 'query', required: false, description: 'Max results per page', schema: { type: 'integer', default: 20 } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of invoices', schema: { type: 'array', items: { '$ref': '#/components/schemas/Invoice' } } },
      ],
    },

    // ---- Marketplace ----
    {
      method: 'GET',
      path: `${v}/marketplace/exams`,
      description: 'Browse the exam marketplace',
      scopes: [{ resource: 'marketplace', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Marketplace'],
      parameters: [
        { name: 'category', in: 'query', required: false, description: 'Filter by category', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Marketplace listings', schema: { type: 'array', items: { '$ref': '#/components/schemas/MarketplaceListing' } } },
      ],
    },

    // ---- AI ----
    {
      method: 'POST',
      path: `${v}/ai/generate-questions`,
      description: 'Generate questions using AI',
      scopes: [{ resource: 'ai', permission: 'write' }],
      rateLimit: AI_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['AI'],
      parameters: [],
      requestBody: { description: 'AI question generation request', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/AIGenerateRequest' } },
      responses: [
        { statusCode: 200, description: 'Generated questions', schema: { type: 'array', items: { '$ref': '#/components/schemas/Question' } } },
      ],
    },
    {
      method: 'POST',
      path: `${v}/ai/analyze-response`,
      description: 'Analyze a student response using AI',
      scopes: [{ resource: 'ai', permission: 'write' }],
      rateLimit: AI_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['AI'],
      parameters: [],
      requestBody: { description: 'Response analysis request', required: true, contentType: 'application/json', schema: { '$ref': '#/components/schemas/AIAnalyzeRequest' } },
      responses: [
        { statusCode: 200, description: 'Analysis result', schema: { '$ref': '#/components/schemas/AIAnalysisResult' } },
      ],
    },

    // ---- Workflows ----
    {
      method: 'GET',
      path: `${v}/workflows`,
      description: 'List automation workflows',
      scopes: [{ resource: 'workflows', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Workflows'],
      parameters: [],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of workflows', schema: { type: 'array', items: { '$ref': '#/components/schemas/Workflow' } } },
      ],
    },
    {
      method: 'POST',
      path: `${v}/workflows/:id/execute`,
      description: 'Execute a workflow',
      scopes: [{ resource: 'workflows', permission: 'write' }],
      rateLimit: STRICT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Workflows'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Workflow ID', schema: { type: 'string' } },
      ],
      requestBody: { description: 'Workflow execution input', required: false, contentType: 'application/json', schema: { type: 'object' } },
      responses: [
        { statusCode: 200, description: 'Execution result', schema: { '$ref': '#/components/schemas/WorkflowExecution' } },
      ],
    },

    // ---- Organizations ----
    {
      method: 'GET',
      path: `${v}/organizations`,
      description: 'List organizations (admin only)',
      scopes: [{ resource: 'organizations', permission: 'admin' }],
      rateLimit: STRICT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Organizations'],
      parameters: [],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'List of organizations', schema: { type: 'array', items: { '$ref': '#/components/schemas/Organization' } } },
      ],
    },
    {
      method: 'GET',
      path: `${v}/organizations/:id`,
      description: 'Get organization details',
      scopes: [{ resource: 'organizations', permission: 'read' }],
      rateLimit: DEFAULT_RATE_LIMIT,
      deprecated: false,
      version,
      tags: ['Organizations'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Organization ID', schema: { type: 'string' } },
      ],
      requestBody: undefined,
      responses: [
        { statusCode: 200, description: 'Organization details', schema: { '$ref': '#/components/schemas/Organization' } },
        { statusCode: 404, description: 'Organization not found' },
      ],
    },
  ];
}

// ----------------------------------------------------------------------------
// Endpoint Registry Functions
// ----------------------------------------------------------------------------

/** Cache of endpoints by version */
const endpointCache = new Map<string, APIEndpoint[]>();

/**
 * Get all API endpoints, optionally filtered by version.
 */
export function getAPIEndpoints(version: string = 'v1'): APIEndpoint[] {
  const cached = endpointCache.get(version);
  if (cached) return cached;

  const endpoints = buildEndpoints(version);
  endpointCache.set(version, endpoints);
  return endpoints;
}

/**
 * Get a specific endpoint by method and path.
 */
export function getEndpoint(method: HTTPMethod, path: string): APIEndpoint | null {
  // Try all known versions
  for (const version of ['v1', 'v2']) {
    const endpoints = getAPIEndpoints(version);
    const found = endpoints.find(
      (ep) => ep.method === method && ep.path === path
    );
    if (found) return found;
  }
  return null;
}

// ----------------------------------------------------------------------------
// OpenAPI 3.1 Specification Generator
// ----------------------------------------------------------------------------

/**
 * Generate a full OpenAPI 3.1 specification for the given API version.
 */
export function generateOpenAPISpec(version: string = 'v1'): OpenAPISpec {
  const endpoints = getAPIEndpoints(version);
  const paths: Record<string, Record<string, unknown>> = {};

  // Group endpoints by path
  const pathGroups = new Map<string, APIEndpoint[]>();
  for (const ep of endpoints) {
    const existing = pathGroups.get(ep.path) ?? [];
    existing.push(ep);
    pathGroups.set(ep.path, existing);
  }

  // Build paths object
  for (const [path, eps] of pathGroups) {
    const pathItem: Record<string, unknown> = {};

    for (const ep of eps) {
      const method = ep.method.toLowerCase();
      const operation: Record<string, unknown> = {
        operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        summary: ep.description,
        deprecated: ep.deprecated || undefined,
        tags: ep.tags,
        security: [{ ApiKeyAuth: ep.scopes.map((s) => `${s.resource}:${s.permission}`) }],
      };

      // Add parameters
      if (ep.parameters.length > 0) {
        operation.parameters = ep.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: p.schema,
        }));
      }

      // Add request body
      if (ep.requestBody) {
        operation.requestBody = {
          description: ep.requestBody.description,
          required: ep.requestBody.required,
          content: {
            [ep.requestBody.contentType]: {
              schema: ep.requestBody.schema,
            },
          },
        };
      }

      // Add responses
      const responses: Record<string, unknown> = {};
      for (const r of ep.responses) {
        const responseEntry: Record<string, unknown> = {
          description: r.description,
        };
        if (r.schema && r.contentType) {
          responseEntry.content = {
            [r.contentType ?? 'application/json']: { schema: r.schema },
          };
        }
        responses[String(r.statusCode)] = responseEntry;
      }
      operation.responses = responses;

      pathItem[method] = operation;
    }

    // Convert path params from :param to {param} for OpenAPI
    const openApiPath = path.replace(/:(\w+)/g, '{$1}');
    paths[openApiPath] = pathItem;
  }

  // Collect all unique tags
  const allTags = new Set<string>();
  for (const ep of endpoints) {
    for (const tag of ep.tags) {
      allTags.add(tag);
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'ExamForge AI API',
      version,
      description: 'Comprehensive API for exam creation, management, and AI-powered analytics. Build powerful educational tools on top of ExamForge AI.',
      contact: {
        name: 'ExamForge AI Support',
        email: 'api@examforge.ai',
        url: 'https://examforge.ai/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://examforge.ai/terms',
      },
    },
    servers: [
      { url: `https://api.examforge.ai/${version}`, description: 'Production' },
      { url: `https://api.staging.examforge.ai/${version}`, description: 'Staging' },
    ],
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'OAuth 2.0 Bearer token',
        },
      },
      schemas: {
        Profile: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } },
        ProfileUpdate: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } },
        Exam: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, status: { type: 'string' } } },
        ExamCreate: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' } } },
        Question: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' }, content: { type: 'string' } } },
        QuestionCreate: { type: 'object', required: ['type', 'content'], properties: { type: { type: 'string' }, content: { type: 'string' } } },
        Result: { type: 'object', properties: { id: { type: 'string' }, score: { type: 'number' }, examId: { type: 'string' } } },
        AnalyticsOverview: { type: 'object', properties: { totalExams: { type: 'integer' }, totalStudents: { type: 'integer' } } },
        PerformanceAnalytics: { type: 'object', properties: { averageScore: { type: 'number' }, passRate: { type: 'number' } } },
        Subscription: { type: 'object', properties: { plan: { type: 'string' }, status: { type: 'string' } } },
        Invoice: { type: 'object', properties: { id: { type: 'string' }, amount: { type: 'number' } } },
        MarketplaceListing: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, price: { type: 'number' } } },
        AIGenerateRequest: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, count: { type: 'integer' } } },
        AIAnalyzeRequest: { type: 'object', required: ['response'], properties: { response: { type: 'string' }, questionId: { type: 'string' } } },
        AIAnalysisResult: { type: 'object', properties: { score: { type: 'number' }, feedback: { type: 'string' } } },
        Workflow: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, status: { type: 'string' } } },
        WorkflowExecution: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, output: { type: 'object' } } },
        Organization: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
      },
      parameters: {},
      responses: {
        Unauthorized: { description: 'Authentication required', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        Forbidden: { description: 'Insufficient permissions', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        RateLimited: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, retryAfter: { type: 'integer' } } } } } },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    tags: Array.from(allTags).map((name) => ({
      name,
      description: `${name} related operations`,
    })),
  };
}

// ----------------------------------------------------------------------------
// Postman Collection Generator
// ----------------------------------------------------------------------------

/**
 * Generate a Postman collection for the given API version.
 */
export function generatePostmanCollection(version: string = 'v1'): PostmanCollection {
  const endpoints = getAPIEndpoints(version);
  const baseUrl = `https://api.examforge.ai/${version}`;

  // Group endpoints by tag
  const tagGroups = new Map<string, APIEndpoint[]>();
  for (const ep of endpoints) {
    const tag = ep.tags[0] ?? 'Other';
    const existing = tagGroups.get(tag) ?? [];
    existing.push(ep);
    tagGroups.set(tag, existing);
  }

  const items: PostmanItem[] = [];

  for (const [tag, eps] of tagGroups) {
    const requests: PostmanItem[] = eps.map((ep) => {
      const pathParts = ep.path.replace(`:api/${version}/`, '').split('/');
      const queryParams = ep.parameters
        .filter((p) => p.in === 'query')
        .map((p) => ({
          key: p.name,
          value: p.schema.default !== undefined ? String(p.schema.default) : '',
          description: p.description,
        }));

      return {
        name: `${ep.method} ${ep.path.replace(`/api/${version}/`, '')}`,
        request: {
          method: ep.method,
          header: [
            { key: 'Authorization', value: 'Bearer {{api_token}}' },
            { key: 'Content-Type', value: 'application/json' },
          ],
          url: {
            raw: `${baseUrl}${ep.path.replace(/:(\w+)/g, '{{$1}}')}`,
            host: ['api.examforge.ai'],
            path: [version, ...pathParts],
            query: queryParams,
          },
          description: ep.description,
        },
      };
    });

    items.push({
      name: tag,
      item: requests,
    });
  }

  const variables: PostmanVariable[] = [
    { key: 'api_token', value: '', type: 'string' },
    { key: 'base_url', value: baseUrl, type: 'string' },
    { key: 'version', value: version, type: 'string' },
  ];

  return {
    info: {
      name: `ExamForge AI API - ${version}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version,
    },
    item: items,
    variable: variables,
  };
}

// ----------------------------------------------------------------------------
// GraphQL Schema
// ----------------------------------------------------------------------------

/**
 * Get the GraphQL schema definition for the ExamForge AI API.
 */
export function getGraphQLSchema(): GraphQLSchema {
  const schemaStr = `
type Query {
  profile(id: ID!): Profile
  profiles(limit: Int = 20, offset: Int = 0): [Profile!]!
  exam(id: ID!): Exam
  exams(status: String, limit: Int = 20, offset: Int = 0): [Exam!]!
  question(id: ID!): Question
  questions(examId: ID, type: String, limit: Int = 20): [Question!]!
  result(id: ID!): Result
  results(examId: ID, studentId: ID, limit: Int = 20): [Result!]!
  analyticsOverview(period: String!): AnalyticsOverview!
  performanceAnalytics(examId: ID!): PerformanceAnalytics!
  subscription: Subscription!
  invoices(limit: Int = 20): [Invoice!]!
  marketplaceExams(category: String, limit: Int = 20): [MarketplaceListing!]!
  workflows: [Workflow!]!
  organization(id: ID!): Organization
}

type Mutation {
  createExam(input: ExamCreateInput!): Exam!
  updateExam(id: ID!, input: ExamUpdateInput!): Exam!
  deleteExam(id: ID!): Boolean!
  createQuestion(input: QuestionCreateInput!): Question!
  updateQuestion(id: ID!, input: QuestionUpdateInput!): Question!
  deleteQuestion(id: ID!): Boolean!
  submitResult(input: ResultSubmitInput!): Result!
  generateQuestions(input: AIGenerateInput!): [Question!]!
  analyzeResponse(input: AIAnalyzeInput!): AIAnalysisResult!
  executeWorkflow(id: ID!, input: JSON): WorkflowExecution!
  updateProfile(id: ID!, input: ProfileUpdateInput!): Profile!
}

type Subscription {
  examUpdated(examId: ID!): Exam!
  resultSubmitted(examId: ID!): Result!
  workflowStatusChanged(workflowId: ID!): WorkflowExecution!
}
`;

  const types: GraphQLType[] = [
    {
      name: 'Profile',
      kind: 'object',
      description: 'User profile',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Unique identifier', args: [] },
        { name: 'name', type: 'String!', required: true, description: 'Full name', args: [] },
        { name: 'email', type: 'String!', required: true, description: 'Email address', args: [] },
        { name: 'role', type: 'String!', required: true, description: 'User role', args: [] },
        { name: 'orgId', type: 'ID!', required: true, description: 'Organization ID', args: [] },
      ],
    },
    {
      name: 'Exam',
      kind: 'object',
      description: 'An exam definition',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Unique identifier', args: [] },
        { name: 'title', type: 'String!', required: true, description: 'Exam title', args: [] },
        { name: 'description', type: 'String', required: false, description: 'Exam description', args: [] },
        { name: 'status', type: 'String!', required: true, description: 'Exam status', args: [] },
        { name: 'questions', type: '[Question!]!', required: true, description: 'Questions in the exam', args: [] },
        { name: 'results', type: '[Result!]!', required: true, description: 'Exam results', args: [] },
      ],
    },
    {
      name: 'Question',
      kind: 'object',
      description: 'A question in an exam',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Unique identifier', args: [] },
        { name: 'type', type: 'String!', required: true, description: 'Question type', args: [] },
        { name: 'content', type: 'String!', required: true, description: 'Question content', args: [] },
        { name: 'options', type: '[String!]', required: false, description: 'Answer options', args: [] },
        { name: 'correctAnswer', type: 'String', required: false, description: 'Correct answer', args: [] },
        { name: 'points', type: 'Int!', required: true, description: 'Point value', args: [] },
      ],
    },
    {
      name: 'Result',
      kind: 'object',
      description: 'An exam result',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Unique identifier', args: [] },
        { name: 'examId', type: 'ID!', required: true, description: 'Exam ID', args: [] },
        { name: 'studentId', type: 'ID!', required: true, description: 'Student ID', args: [] },
        { name: 'score', type: 'Float!', required: true, description: 'Score achieved', args: [] },
        { name: 'maxScore', type: 'Float!', required: true, description: 'Maximum possible score', args: [] },
        { name: 'submittedAt', type: 'String!', required: true, description: 'Submission timestamp', args: [] },
      ],
    },
    {
      name: 'AnalyticsOverview',
      kind: 'object',
      description: 'Aggregated analytics overview',
      fields: [
        { name: 'totalExams', type: 'Int!', required: true, description: 'Total exam count', args: [] },
        { name: 'totalStudents', type: 'Int!', required: true, description: 'Total student count', args: [] },
        { name: 'averageScore', type: 'Float!', required: true, description: 'Average score', args: [] },
        { name: 'passRate', type: 'Float!', required: true, description: 'Overall pass rate', args: [] },
      ],
    },
    {
      name: 'Workflow',
      kind: 'object',
      description: 'An automation workflow',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Unique identifier', args: [] },
        { name: 'name', type: 'String!', required: true, description: 'Workflow name', args: [] },
        { name: 'status', type: 'String!', required: true, description: 'Workflow status', args: [] },
      ],
    },
    {
      name: 'WorkflowExecution',
      kind: 'object',
      description: 'A workflow execution result',
      fields: [
        { name: 'id', type: 'ID!', required: true, description: 'Execution ID', args: [] },
        { name: 'status', type: 'String!', required: true, description: 'Execution status', args: [] },
        { name: 'output', type: 'JSON', required: false, description: 'Execution output', args: [] },
      ],
    },
  ];

  const queries: GraphQLOperation[] = [
    { name: 'profile', description: 'Get a user profile', args: [{ name: 'id', type: 'ID!', required: true, description: 'Profile ID' }], returnType: 'Profile' },
    { name: 'profiles', description: 'List user profiles', args: [{ name: 'limit', type: 'Int', required: false, defaultValue: '20', description: 'Max results' }, { name: 'offset', type: 'Int', required: false, defaultValue: '0', description: 'Result offset' }], returnType: '[Profile!]!' },
    { name: 'exam', description: 'Get an exam', args: [{ name: 'id', type: 'ID!', required: true, description: 'Exam ID' }], returnType: 'Exam' },
    { name: 'exams', description: 'List exams', args: [{ name: 'status', type: 'String', required: false, description: 'Filter by status' }, { name: 'limit', type: 'Int', required: false, defaultValue: '20', description: 'Max results' }], returnType: '[Exam!]!' },
    { name: 'question', description: 'Get a question', args: [{ name: 'id', type: 'ID!', required: true, description: 'Question ID' }], returnType: 'Question' },
    { name: 'questions', description: 'List questions', args: [{ name: 'examId', type: 'ID', required: false, description: 'Filter by exam' }, { name: 'type', type: 'String', required: false, description: 'Filter by type' }], returnType: '[Question!]!' },
    { name: 'result', description: 'Get a result', args: [{ name: 'id', type: 'ID!', required: true, description: 'Result ID' }], returnType: 'Result' },
    { name: 'results', description: 'List results', args: [{ name: 'examId', type: 'ID', required: false, description: 'Filter by exam' }, { name: 'studentId', type: 'ID', required: false, description: 'Filter by student' }], returnType: '[Result!]!' },
    { name: 'analyticsOverview', description: 'Get analytics overview', args: [{ name: 'period', type: 'String!', required: true, description: 'Time period' }], returnType: 'AnalyticsOverview!' },
    { name: 'performanceAnalytics', description: 'Get performance analytics', args: [{ name: 'examId', type: 'ID!', required: true, description: 'Exam ID' }], returnType: 'PerformanceAnalytics!' },
    { name: 'subscription', description: 'Get subscription details', args: [], returnType: 'Subscription!' },
    { name: 'invoices', description: 'List invoices', args: [{ name: 'limit', type: 'Int', required: false, defaultValue: '20', description: 'Max results' }], returnType: '[Invoice!]!' },
    { name: 'marketplaceExams', description: 'Browse marketplace', args: [{ name: 'category', type: 'String', required: false, description: 'Category filter' }], returnType: '[MarketplaceListing!]!' },
    { name: 'workflows', description: 'List workflows', args: [], returnType: '[Workflow!]!' },
    { name: 'organization', description: 'Get organization', args: [{ name: 'id', type: 'ID!', required: true, description: 'Organization ID' }], returnType: 'Organization' },
  ];

  const mutations: GraphQLOperation[] = [
    { name: 'createExam', description: 'Create an exam', args: [{ name: 'input', type: 'ExamCreateInput!', required: true, description: 'Exam data' }], returnType: 'Exam!' },
    { name: 'updateExam', description: 'Update an exam', args: [{ name: 'id', type: 'ID!', required: true, description: 'Exam ID' }, { name: 'input', type: 'ExamUpdateInput!', required: true, description: 'Update data' }], returnType: 'Exam!' },
    { name: 'deleteExam', description: 'Delete an exam', args: [{ name: 'id', type: 'ID!', required: true, description: 'Exam ID' }], returnType: 'Boolean!' },
    { name: 'createQuestion', description: 'Create a question', args: [{ name: 'input', type: 'QuestionCreateInput!', required: true, description: 'Question data' }], returnType: 'Question!' },
    { name: 'updateQuestion', description: 'Update a question', args: [{ name: 'id', type: 'ID!', required: true, description: 'Question ID' }, { name: 'input', type: 'QuestionUpdateInput!', required: true, description: 'Update data' }], returnType: 'Question!' },
    { name: 'deleteQuestion', description: 'Delete a question', args: [{ name: 'id', type: 'ID!', required: true, description: 'Question ID' }], returnType: 'Boolean!' },
    { name: 'submitResult', description: 'Submit a result', args: [{ name: 'input', type: 'ResultSubmitInput!', required: true, description: 'Result data' }], returnType: 'Result!' },
    { name: 'generateQuestions', description: 'AI question generation', args: [{ name: 'input', type: 'AIGenerateInput!', required: true, description: 'Generation request' }], returnType: '[Question!]!' },
    { name: 'analyzeResponse', description: 'AI response analysis', args: [{ name: 'input', type: 'AIAnalyzeInput!', required: true, description: 'Analysis request' }], returnType: 'AIAnalysisResult!' },
    { name: 'executeWorkflow', description: 'Execute a workflow', args: [{ name: 'id', type: 'ID!', required: true, description: 'Workflow ID' }, { name: 'input', type: 'JSON', required: false, description: 'Execution input' }], returnType: 'WorkflowExecution!' },
    { name: 'updateProfile', description: 'Update a profile', args: [{ name: 'id', type: 'ID!', required: true, description: 'Profile ID' }, { name: 'input', type: 'ProfileUpdateInput!', required: true, description: 'Update data' }], returnType: 'Profile!' },
  ];

  const subscriptions: GraphQLOperation[] = [
    { name: 'examUpdated', description: 'Subscribe to exam updates', args: [{ name: 'examId', type: 'ID!', required: true, description: 'Exam ID' }], returnType: 'Exam!' },
    { name: 'resultSubmitted', description: 'Subscribe to result submissions', args: [{ name: 'examId', type: 'ID!', required: true, description: 'Exam ID' }], returnType: 'Result!' },
    { name: 'workflowStatusChanged', description: 'Subscribe to workflow status changes', args: [{ name: 'workflowId', type: 'ID!', required: true, description: 'Workflow ID' }], returnType: 'WorkflowExecution!' },
  ];

  return {
    schema: schemaStr.trim(),
    types,
    queries,
    mutations,
    subscriptions,
  };
}

// ----------------------------------------------------------------------------
// API Version Management
// ----------------------------------------------------------------------------

/**
 * Get all API versions with their status.
 */
export function getAPIVersions(): APIVersion[] {
  return [
    {
      version: 'v1',
      status: 'current',
      sunsetDate: null,
      changelog: 'Stable release with full CRUD operations for all resources, AI integration, and webhook support.',
      releaseDate: new Date('2024-01-15'),
    },
    {
      version: 'v2',
      status: 'deprecated',
      sunsetDate: new Date('2025-06-30'),
      changelog: 'Added GraphQL support, improved rate limiting, and enhanced AI endpoints.',
      releaseDate: new Date('2024-06-01'),
    },
  ];
}

/**
 * Mark an endpoint as deprecated for a given version.
 */
export function deprecateEndpoint(
  method: HTTPMethod,
  path: string,
  version: string
): APIEndpoint | null {
  const endpoints = getAPIEndpoints(version);
  const endpoint = endpoints.find(
    (ep) => ep.method === method && ep.path === path
  );

  if (endpoint) {
    endpoint.deprecated = true;
    // Invalidate cache to reflect the change
    endpointCache.delete(version);
  }

  return endpoint ?? null;
}

/**
 * Get documentation for a specific API endpoint.
 */
export function getAPIDocumentation(endpoint: APIEndpoint): string {
  const scopeStr = endpoint.scopes
    .map((s) => `${s.resource}:${s.permission}`)
    .join(', ');

  let docs = `# ${endpoint.method} ${endpoint.path}\n\n`;
  docs += `${endpoint.description}\n\n`;
  docs += `**Version**: ${endpoint.version}\n`;
  docs += `**Required Scopes**: ${scopeStr}\n`;
  docs += `**Deprecated**: ${endpoint.deprecated ? 'Yes' : 'No'}\n\n`;

  if (endpoint.parameters.length > 0) {
    docs += `## Parameters\n\n`;
    docs += `| Name | In | Required | Description |\n`;
    docs += `|------|----|----------|-------------|\n`;
    for (const p of endpoint.parameters) {
      docs += `| ${p.name} | ${p.in} | ${p.required ? 'Yes' : 'No'} | ${p.description} |\n`;
    }
    docs += '\n';
  }

  if (endpoint.requestBody) {
    docs += `## Request Body\n\n`;
    docs += `- **Content Type**: ${endpoint.requestBody.contentType}\n`;
    docs += `- **Required**: ${endpoint.requestBody.required ? 'Yes' : 'No'}\n`;
    docs += `- **Description**: ${endpoint.requestBody.description}\n\n`;
  }

  docs += `## Responses\n\n`;
  docs += `| Status | Description |\n`;
  docs += `|--------|-------------|\n`;
  for (const r of endpoint.responses) {
    docs += `| ${r.statusCode} | ${r.description} |\n`;
  }
  docs += '\n';

  docs += `## Rate Limits\n\n`;
  docs += `- **Per Minute**: ${endpoint.rateLimit.requestsPerMinute}\n`;
  docs += `- **Per Hour**: ${endpoint.rateLimit.requestsPerHour}\n`;
  docs += `- **Per Day**: ${endpoint.rateLimit.requestsPerDay}\n`;
  docs += `- **Burst**: ${endpoint.rateLimit.burstLimit}\n`;

  return docs;
}
