"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDocumentText = exports.extractTextFromWord = exports.extractTextFromPDF = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
/**
 * Extract text content from a PDF document
 */
const extractTextFromPDF = async (fileBuffer) => {
    try {
        const data = await (0, pdf_parse_1.default)(fileBuffer);
        return data.text || '';
    }
    catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};
exports.extractTextFromPDF = extractTextFromPDF;
/**
 * Extract text content from a Word document (.docx)
 */
const extractTextFromWord = async (fileBuffer) => {
    try {
        const result = await mammoth_1.default.extractRawText({ buffer: fileBuffer });
        return result.value || '';
    }
    catch (error) {
        throw new Error(`Failed to extract text from Word document: ${error.message}`);
    }
};
exports.extractTextFromWord = extractTextFromWord;
/**
 * Extract text content from a document based on its type
 */
const extractDocumentText = async (file) => {
    const { mimetype, buffer } = file;
    if (mimetype === 'application/pdf') {
        return await (0, exports.extractTextFromPDF)(buffer);
    }
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword') {
        return await (0, exports.extractTextFromWord)(buffer);
    }
    else {
        throw new Error(`Unsupported document type: ${mimetype}`);
    }
};
exports.extractDocumentText = extractDocumentText;
