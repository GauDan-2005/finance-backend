import { Router } from 'express';
import { recordController } from './record.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createRecordSchema, updateRecordSchema } from './record.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('ADMIN'), validate(createRecordSchema), recordController.createRecord);
router.get('/', authorize('ADMIN', 'ANALYST'), recordController.listRecords);
router.get('/:id', authorize('ADMIN', 'ANALYST'), recordController.getRecordById);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(updateRecordSchema),
  recordController.updateRecord,
);
router.delete('/:id', authorize('ADMIN'), recordController.deleteRecord);

export default router;
