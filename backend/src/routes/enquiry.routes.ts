import { Router } from 'express';
import { parseEnquiryPdf } from '../controllers/enquiry.controller';

const router = Router();

router.post('/parse-pdf', parseEnquiryPdf);

export default router;
