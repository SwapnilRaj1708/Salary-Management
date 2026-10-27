import { EmployeeExportQuery } from '@salary/shared';
import { type RequestHandler, Router } from 'express';
import { parseWith } from '../http/validate.ts';
import type { ExportService } from './service.ts';

/** Mounted before the employees router, so `export.csv` is never read as an employee id. */
export function exportRouter({
  exports,
  requireAuth,
}: {
  exports: ExportService;
  requireAuth: RequestHandler;
}): Router {
  const router = Router();

  router.get('/employees/export.csv', requireAuth, async (req, res) => {
    const query = parseWith(EmployeeExportQuery, req.query);
    const { filename, body } = await exports.directoryCsv(query);
    // The filename is ours (letters, digits, dashes), so it can be quoted as it is.
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body);
  });

  return router;
}
