"use client";

import { useState } from "react";
import S3FileUploader from "./components/fileUpload";

export default function Home() {
  const [uploadResults, setUploadResults] = useState([]);

  const handleUploadComplete = (fileInfo) => {
    setUploadResults((prev) => [...prev, fileInfo]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <title>Secure File Upload with AWS S3</title>
      <main className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Secure File Upload with AWS S3
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 ">
              Upload Files
            </h2>
            <p className="text-gray-600 mb-6">
              Drag and drop your files here or click to browse. Files will be
              securely uploaded directly to AWS S3 storage.
            </p>

            <S3FileUploader onUploadComplete={handleUploadComplete} />
          </div>

          {uploadResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Uploaded Files
              </h2>
              <ul className="divide-y divide-gray-200">
                {uploadResults.map((file) => (
                  <li key={file.fileUrl} className="py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-gray-600">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {file.size} bytes
                        </p>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                      >
                        View File
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Secure File Upload Demo</p>
      </footer>
    </div>
  );
}
