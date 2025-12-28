import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Define the multer file type interface
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

/**
 * Extract text content from a PDF document
 */
export const extractTextFromPDF = async (fileBuffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Extract text content from a Word document (.docx)
 */
export const extractTextFromWord = async (fileBuffer: Buffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || '';
  } catch (error: any) {
    throw new Error(`Failed to extract text from Word document: ${error.message}`);
  }
};

/**
 * Extract text content from a document based on its type
 */
export const extractDocumentText = async (file: MulterFile): Promise<string> => {
  const { mimetype, buffer } = file;

  if (mimetype === 'application/pdf') {
    return await extractTextFromPDF(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return await extractTextFromWord(buffer);
  } else {
    throw new Error(`Unsupported document type: ${mimetype}`);
  }
};

