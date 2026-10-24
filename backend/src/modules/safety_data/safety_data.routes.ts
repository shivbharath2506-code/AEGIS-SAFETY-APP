import { Router } from 'express';
import { safetyDataController } from './safety_data.controller';

const router = Router();

router.get('/', (req, res) => safetyDataController.getSafetyData(req, res));
router.get('/metadata', (req, res) => safetyDataController.getSafetyMetadata(req, res));

export default router;
