"use client";

import S3FileUploader from "./components/fileUpload";

export default function Home() {

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
            <S3FileUploader/>
          </div>
        </div>
      </main>
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Secure File Upload Demo</p>
      </footer>
    </div>
  );
}
