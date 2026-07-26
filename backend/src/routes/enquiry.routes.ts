import { Router } from 'express';
import {
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  convertEnquiryToMember,
  parseEnquiryPdf
} from '../controllers/enquiry.controller';

const router = Router();

router.get('/', getEnquiries);
router.post('/', createEnquiry);
router.put('/:id', updateEnquiry);
router.delete('/:id', deleteEnquiry);
router.post('/:id/convert', convertEnquiryToMember);
router.post('/parse-pdf', parseEnquiryPdf);

export default router;
