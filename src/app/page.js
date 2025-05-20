"use client";

import S3FileUploader from "./components/fileUpload";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-100 to-sky-200 py-12">
      <title>Secure File Upload with AWS S3</title>
      <main className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-600 to-sky-500 mb-10 drop-shadow-xl">
            Secure File Upload with AWS S3
          </h1>
          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10 border-2 border-blue-200 hover:shadow-cyan-200 transition-shadow duration-300">
            <h2 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
              <svg className="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 16v-8m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Upload Files
            </h2>
            <p className="text-gray-700 mb-6">
              <span className="font-semibold text-blue-600">Drag and drop</span> your files here or click to browse. Files will be securely uploaded directly to <span className="font-semibold text-sky-600">AWS S3</span> storage.
            </p>
            <S3FileUploader/>
          </div> 
        </div>
      </main>
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>
          <span className="text-cyan-600 font-bold">Secure File Upload Demo</span>
        </p>
      </footer>
    </div>
  );
}
