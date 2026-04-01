import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// All authenticated users can view dashboard data
router.use(authenticate, authorize('VIEWER', 'ANALYST', 'ADMIN'));

router.get('/summary', dashboardController.getSummary);
router.get('/category-summary', dashboardController.getCategorySummary);
router.get('/trends', dashboardController.getTrends);
router.get('/recent', dashboardController.getRecentActivity);

export default router;
