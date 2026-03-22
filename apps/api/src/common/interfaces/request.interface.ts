import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  tenant: { id: string; name: string };
  tenantId: string;
}
