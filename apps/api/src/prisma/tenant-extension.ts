import { Prisma } from '@prisma/client';
import { getRequestCtx } from '../common/request-context';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Document',
  'DocumentChunk',
  'Conversation',
  'Message',
  'OnboardingTemplate',
  'OnboardingAssignment',
  'Scenario',
  'SimulatorSession',
  'Project',
  'KnowledgeNote',
  'Persona',
  'PersonaChunk',
  'OffboardingInterview',
  'PointsEvent',
  'Badge',
  'Notification',
  'AnalyticsEvent',
]);

const READ_OPS = new Set(['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy']);
const WRITE_OPS = new Set(['create', 'createMany', 'upsert']);

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }
        const ctx = getRequestCtx();
        const tenantId = ctx?.tenantId;

        if (!tenantId) {
          if ((args as Record<string, unknown>)?.['$allowCrossTenant']) {
            const { $allowCrossTenant: _drop, ...rest } = args as Record<string, unknown>;
            return query(rest as typeof args);
          }
          throw new Error(
            `Tenant context required for ${model}.${operation}. Run inside TenantGuard or pass $allowCrossTenant.`,
          );
        }

        if (READ_OPS.has(operation)) {
          const a = (args ?? {}) as Record<string, unknown>;
          const existingWhere = (a['where'] ?? {}) as Record<string, unknown>;
          a['where'] = { ...existingWhere, tenantId };
          return query(a as typeof args);
        }

        if (WRITE_OPS.has(operation)) {
          const a = (args ?? {}) as Record<string, unknown>;
          if (operation === 'createMany') {
            const data = a['data'] as Record<string, unknown> | Array<Record<string, unknown>>;
            a['data'] = Array.isArray(data)
              ? data.map((d) => ({ tenantId, ...d }))
              : { tenantId, ...data };
          } else {
            const data = (a['data'] ?? {}) as Record<string, unknown>;
            a['data'] = { tenantId, ...data };
            if (operation === 'upsert') {
              const w = (a['where'] ?? {}) as Record<string, unknown>;
              a['where'] = { ...w, tenantId };
            }
          }
          return query(a as typeof args);
        }

        const a = (args ?? {}) as Record<string, unknown>;
        const existingWhere = (a['where'] ?? {}) as Record<string, unknown>;
        a['where'] = { ...existingWhere, tenantId };
        return query(a as typeof args);
      },
    },
  },
});
