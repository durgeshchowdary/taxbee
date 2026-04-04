'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadDocumentsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = () => {
    if (files.length === 0) return alert('Please select files to upload.');
    alert(`${files.length} file(s) uploaded successfully!`);
    setFiles([]);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">📂 Upload Documents</h1>

      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        className="bg-green-500 px-5 py-2 rounded hover:bg-green-400 mb-6"
      >
        Upload
      </button>

      {files.length > 0 && (
        <ul className="mb-4">
          {files.map((file, index) => (
            <li key={index} className="bg-white p-2 rounded mb-2 shadow">
              {file.name}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="bg-yellow-400 px-5 py-2 rounded hover:bg-yellow-300"
      >
        Back to Dashboard
      </button>
    </div>
  );
}