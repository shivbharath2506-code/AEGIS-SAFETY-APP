import { Router } from 'express';
import {
  emergencyContactsController,
  createContactSchema,
  updateContactSchema
} from './emergency_contacts.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => emergencyContactsController.listContacts(req, res));
router.post('/', validateRequest({ body: createContactSchema }), (req, res) =>
  emergencyContactsController.addContact(req, res)
);
router.patch('/:id', validateRequest({ body: updateContactSchema }), (req, res) =>
  emergencyContactsController.updateContact(req, res)
);
router.delete('/:id', (req, res) => emergencyContactsController.deleteContact(req, res));

export default router;
