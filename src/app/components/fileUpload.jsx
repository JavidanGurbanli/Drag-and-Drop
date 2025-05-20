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
    <div className="w-full max-w-md mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
      ${
        isDragActive
          ? "border-purple-500 bg-purple-50 shadow-lg"
          : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
      }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-purple-400 mb-2 animate-pulse" />
        <p className="text-lg font-semibold text-purple-700">
          Drag & drop files here
        </p>
        <p className="text-sm text-purple-500">or click to select files</p>
        <p className="text-xs text-purple-400 mt-2">
          Supported: JPG, PNG, PDF, DOC, XLS, TXT • Max size: 100MB
        </p>
      </div>
      {errorMessage && (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start shadow">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{errorMessage}</p>
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
        <div className="mt-6 space-y-4">
          <h3 className="text-base font-bold text-purple-700">
            Files ({files.length})
          </h3>

          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-gradient-to-r from-white via-purple-50 to-white rounded-xl border border-purple-200 p-4 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-4">
                  {getFilePreview(file)}

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold text-gray-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {renderActionButtons(file)}

                    <button
                      className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                      onClick={() => cancelUpload(file.id)}
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-in-out ${progressBarColorClass(
                        file.status
                      )}`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs font-medium">
                    <div
                      className={`${
                        file.status === "error"
                          ? "text-red-600"
                          : "text-purple-600"
                      }`}
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
};

export default S3FileUploader;
