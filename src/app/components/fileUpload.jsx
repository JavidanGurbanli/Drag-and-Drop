"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  X,
  Upload,
  Pause,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  File,
  Image,
  FileText,
} from "lucide-react";

const S3FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const xhrRefs = useRef({});
  console.log(files);

  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const ACCEPTED_FILE_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles
      .filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          setErrorMessage(
            `File "${file.name}" is too large. Maximum size is 100MB.`
          );
          return false;
        }
        return true;
      })
      .map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "pending", // pending, uploading, paused, completed, error
        error: null,
      }));

    if (newFiles.length === 0) return;

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(uploadFile);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(xhrRefs.current).forEach((xhr) => {
        if (xhr) xhr.abort();
      });
    };
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
  });

  const updateFile = useCallback((fileId, updates) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  }, []);

  const uploadFile = async (fileInfo) => {
    try {
      updateFile(fileInfo.id, { status: "uploading" });

      // Step 1: Get a pre-signed URL
      const response = await fetch("/api/get-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileInfo.name,
          fileType: fileInfo.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl } = await response.json();

      // Step 2: Upload to S3 with XHR for progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRefs.current[fileInfo.id] = xhr;
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentCompleted = Math.round(
              (event.loaded * 100) / event.total
            );
            updateFile(fileInfo.id, { progress: percentCompleted });
          }
        });

        xhr.addEventListener("load", () => {
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload"))
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload aborted"))
        );

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", fileInfo.type);
        xhr.send(fileInfo.file);
      });

      updateFile(fileInfo.id, { status: "completed", progress: 100 });
      delete xhrRefs.current[fileInfo.id];
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Upload error:", error);
      updateFile(fileInfo.id, {
        status: "error",
        error: error.message || "Upload failed",
      });
    }
  };

  const pauseUpload = (fileId) => {
    if (xhrRefs.current[fileId]) {
      xhrRefs.current[fileId].abort();
      delete xhrRefs.current[fileId];
      updateFile(fileId, { status: "paused" });
    }
  };

  const resumeUpload = (fileId) => {
    const fileInfo = files.find((f) => f.id === fileId);
    if (fileInfo) uploadFile(fileInfo);
  };

  const retryUpload = (fileId) => {
    const fileInfo = files.find((f) => f.id === fileId);
    if (fileInfo) {
      updateFile(fileId, { progress: 0 });
      uploadFile(fileInfo);
    }
  };

  const cancelUpload = (fileId) => {
    if (xhrRefs.current[fileId]) {
      xhrRefs.current[fileId].abort();
      delete xhrRefs.current[fileId];
    }
    setFiles(files.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return <Image className="w-6 h-6 text-blue-500" />;
    }
    if (fileType.startsWith("application/pdf")) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (
      fileType.startsWith("application/vnd.ms-excel") ||
      fileType.startsWith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml"
      )
    ) {
      return <FileText className="w-6 h-6 text-green-500" />;
    }
    if (
      fileType.startsWith("application/msword") ||
      fileType.startsWith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml"
      )
    ) {
      return <FileText className="w-6 h-6 text-indigo-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const getFilePreview = (file) => {
    if (file.type.startsWith("image/")) {
      return (
        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
          <img
            src={URL.createObjectURL(file.file)}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 flex items-center justify-center rounded bg-gray-100">
        {getFileIcon(file.type)}
      </div>
    );
  };

  const renderActionButtons = (file) => {
    switch (file.status) {
      case "uploading":
        return (
          <button
            className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={() => pauseUpload(file.id)}
            title="Pause upload"
          >
            <Pause className="w-4 h-4" />
          </button>
        );
      case "paused":
        return (
          <button
            className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={() => resumeUpload(file.id)}
            title="Resume upload"
          >
            <Play className="w-4 h-4" />
          </button>
        );
      case "error":
        return (
          <button
            className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={() => retryUpload(file.id)}
            title="Retry upload"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        );
      default:
        return null;
    }
  };

  const renderStatusText = (file) => {
    switch (file.status) {
      case "completed":
        return (
          <span className="text-green-600 flex items-center">
            <Check className="w-3 h-3 mr-1" /> Completed
          </span>
        );
      case "uploading":
        return `Uploading (${file.progress}%)`;
      case "paused":
        return "Paused";
      case "error":
        return (
          <span className="text-red-600" title={file.error}>
            Upload failed
          </span>
        );
      default:
        return "";
    }
  };

  const progressBarColorClass = (status) => {
    switch (status) {
      case "error":
        return "bg-red-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-10">
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-gradient-to-br from-blue-100 via-cyan-50 to-slate-100 shadow-xl
        ${
          isDragActive
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-cyan-400 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full p-4 mb-3 shadow-lg">
          <Upload className="w-14 h-14 text-white animate-bounce" />
        </div>
        <p className="text-xl font-extrabold text-blue-700 mb-1">
          Drop files here
        </p>
        <p className="text-base text-cyan-700 mb-2">or click to browse</p>
        <div className="flex flex-wrap gap-2 justify-center text-xs mt-2">
          <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full font-semibold">JPG</span>
          <span className="bg-cyan-200 text-cyan-700 px-2 py-1 rounded-full font-semibold">PNG</span>
          <span className="bg-green-200 text-green-700 px-2 py-1 rounded-full font-semibold">PDF</span>
          <span className="bg-yellow-200 text-yellow-700 px-2 py-1 rounded-full font-semibold">DOC</span>
          <span className="bg-sky-200 text-sky-700 px-2 py-1 rounded-full font-semibold">XLS</span>
          <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-semibold">TXT</span>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Max size: <span className="font-bold text-blue-600">100MB</span>
        </p>
      </div>
      {errorMessage && (
        <div className="mt-6 p-4 bg-gradient-to-r from-red-100 via-orange-100 to-yellow-100 border border-red-300 rounded-xl flex items-start shadow-lg animate-shake">
          <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-base text-red-800 font-semibold">{errorMessage}</p>
            <button
              className="text-xs text-red-700 mt-1 hover:underline"
              onClick={() => setErrorMessage("")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div className="mt-10 space-y-6">
          <h3 className="text-lg font-bold text-blue-700 mb-2 flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-3 py-1 rounded-full shadow">{files.length}</span>
            Files
          </h3>
          <div className="space-y-6">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-gradient-to-r from-white via-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-5 shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex-shrink-0">{getFilePreview(file)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-base font-bold text-gray-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderActionButtons(file)}
                    <button
                      className="p-1 rounded-full bg-red-50 hover:bg-red-200 text-red-500 hover:text-red-700 transition cursor-pointer"
                      onClick={() => cancelUpload(file.id)}
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gradient-to-r from-blue-100 via-cyan-100 to-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-in-out ${progressBarColorClass(
                        file.status
                      )}`}
                      style={{
                        width: `${file.progress}%`,
                        boxShadow:
                          file.status === "completed"
                            ? "0 0 10px 2px #22c55e"
                            : file.status === "error"
                            ? "0 0 10px 2px #ef4444"
                            : "0 0 10px 2px #0ea5e9",
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs font-semibold">
                    <div
                      className={`${
                        file.status === "error"
                          ? "text-red-600"
                          : file.status === "completed"
                          ? "text-green-600"
                          : "text-blue-600"
                      } flex items-center gap-1`}
                    >
                      {renderStatusText(file)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default S3FileUploader;
 