// This file would be used in a Next.js or Express.js backend
// It handles the generation of pre-signed URLs for secure S3 uploads

const AWS = require('aws-sdk');
const crypto = require('crypto');
const path = require('path');

// Configure AWS SDK with your credentials
// In production, use environment variables or AWS IAM roles
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3({
  signatureVersion: 'v4' // Important for pre-signed URLs
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Generate a unique file key to prevent overwriting files with the same name
const generateUniqueFileKey = (fileName) => {
  const fileExtension = path.extname(fileName);
  const fileNameWithoutExtension = path.basename(fileName, fileExtension);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  return `uploads/${fileNameWithoutExtension}-${timestamp}-${randomString}${fileExtension}`;
};

// Function to generate pre-signed URL for file upload
const generatePresignedUrl = async (fileName, fileType) => {
  const fileKey = generateUniqueFileKey(fileName);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
    Expires: 300 // URL expires in 5 minutes (300 seconds)
  };
  
  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return {
      uploadUrl,
      fileKey
    };
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
};

// Express or Next.js API route handler
module.exports = async (req, res) => {
  // For Express, use: 
  // app.post('/api/get-presigned-url', async (req, res) => { ... });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate file type if needed
    // const allowedTypes = ['image/jpeg', 'image/png', ...];
    // if (!allowedTypes.includes(fileType)) {
    //   return res.status(400).json({ error: 'File type not allowed' });
    // }
    
    const { uploadUrl, fileKey } = await generatePresignedUrl(fileName, fileType);
    
    return res.status(200).json({ 
      uploadUrl,
      fileKey,
      // You can also return a URL where the file will be accessible after upload
      fileUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};