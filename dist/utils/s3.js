"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocumentToS3 = exports.uploadImageToS3 = exports.uploadTextToS3 = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const s3 = new aws_sdk_1.default.S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const uploadTextToS3 = async (filename, content) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `scrapes/${filename}.txt`,
        Body: content,
        ContentType: 'text/plain',
    };
    await s3.putObject(params).promise();
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};
exports.uploadTextToS3 = uploadTextToS3;
const uploadImageToS3 = async (file, organizationName) => {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit.');
    }
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileExtension = file.mimetype.split('/')[1];
    const key = `organization-images/${sanitizedOrgName}-${timestamp}.${fileExtension}`;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Note: ACL removed - bucket policies should be used for public access
        // If bucket has ACLs disabled, ensure bucket policy allows public read access
    };
    await s3.putObject(params).promise();
    // Return the public URL
    // Note: This assumes the bucket policy allows public read access to organization-images/*
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
exports.uploadImageToS3 = uploadImageToS3;
const uploadDocumentToS3 = async (file, organizationName) => {
    // Validate file type
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF and Word documents (.pdf, .doc, .docx) are allowed.');
    }
    // Validate file size (max 10MB for documents)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit.');
    }
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    // Determine file extension based on mimetype
    let fileExtension = 'pdf';
    if (file.mimetype.includes('wordprocessingml')) {
        fileExtension = 'docx';
    }
    else if (file.mimetype.includes('msword')) {
        fileExtension = 'doc';
    }
    else if (file.originalname) {
        // Fallback to original filename extension
        const extMatch = file.originalname.match(/\.([^.]+)$/);
        if (extMatch) {
            fileExtension = extMatch[1].toLowerCase();
        }
    }
    const key = `organization-documents/${sanitizedOrgName}-${timestamp}.${fileExtension}`;
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Note: ACL removed - bucket policies should be used for public access
    };
    await s3.putObject(params).promise();
    // Return the S3 URL
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
exports.uploadDocumentToS3 = uploadDocumentToS3;
