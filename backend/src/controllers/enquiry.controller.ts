import { Request, Response } from 'express';
import { getFirestoreDb } from '../firebase';

export const parseEnquiryPdf = async (req: Request, res: Response) => {
  try {
    // Expect base64 pdf data or just a signal
    const { pdfBase64, filename } = req.body;

    // Simulated AI Processing Delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated AI response detecting fields in a standard gym brochure/enquiry form
    const detectedFields = [
      { id: 'name', label: 'Full Name', type: 'text', required: true, enabled: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true, enabled: true },
      { id: 'email', label: 'Email Address', type: 'email', required: false, enabled: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true, enabled: true },
      { id: 'age', label: 'Age', type: 'number', required: false, enabled: true },
      { id: 'goal', label: 'Fitness Goal', type: 'select', options: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Athletics'], required: true, enabled: true },
      { id: 'preferredPlan', label: 'Interested Plan', type: 'select', options: ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'], required: false, enabled: true },
      { id: 'preferredTime', label: 'Preferred Timing', type: 'text', required: false, enabled: true },
      { id: 'reference', label: 'Reference / Source', type: 'text', required: false, enabled: true },
      { id: 'remarks', label: 'Remarks / Medical History', type: 'textarea', required: false, enabled: true }
    ];

    res.json({
      success: true,
      message: 'AI parsed the document successfully.',
      detectedFields,
      confidence: 0.94
    });
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: 'Failed to parse PDF.' });
  }
};
