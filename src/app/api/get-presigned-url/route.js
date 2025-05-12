import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const generateUniqueFileKey = (fileName) => {
  const fileExtension = path.extname(fileName);
  const fileNameWithoutExtension = path.basename(fileName, fileExtension);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `uploads/${fileNameWithoutExtension}-${timestamp}-${randomString}${fileExtension}`;
};

const validateFileType = (fileName, fileType) => {
  const fileExtension = path.extname(fileName).toLowerCase();
  return ALLOWED_FILE_TYPES[fileType]?.includes(fileExtension);
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
    }

    if (fileSize && parseInt(fileSize) > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File exceeds maximum size (100MB)' }), { status: 400 });
    }

    if (!validateFileType(fileName, fileType)) {
      return new Response(JSON.stringify({ error: 'Invalid file type or extension' }), { status: 400 });
    }

    const fileKey = generateUniqueFileKey(fileName);

    const putObjectCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        originalname: fileName,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 300 });
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;

    return new Response(
      JSON.stringify({ uploadUrl, fileKey, fileUrl, expiresIn: 300 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate upload URL' }), { status: 500 });
  }
}
