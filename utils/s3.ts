import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const uploadTextToS3 = async (filename: string, content: string): Promise<string> => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: `scrapes/${filename}.txt`,
    Body: content,
    ContentType: 'text/plain',
  };

  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('S3 upload timeout')), 10000); // 10 second timeout
  });

  const uploadPromise = s3.putObject(params).promise();
  
  await Promise.race([uploadPromise, timeoutPromise]);

  return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};
