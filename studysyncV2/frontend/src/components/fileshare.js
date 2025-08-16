import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FileShare = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFiles = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view files.');
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/files`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFiles(response.data.files || []);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError(`Failed to load files: ${err.response?.data?.error || err.message}`);
        }
      }
    };
    fetchFiles();
  }, [navigate]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to upload files.');
      navigate('/login');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setError(null);
      setSelectedFile(null);
      // Refresh file list
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data.files || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(`Upload failed: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">File Sharing</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Upload Form */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload File</h2>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="p-2 border rounded-lg"
            aria-label="Select file to upload"
          />
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            aria-label="Upload file"
          >
            Upload
          </button>
        </form>
      </div>

      {/* File List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Files</h2>
        {files.length > 0 ? (
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex justify-between items-center p-2 border-b">
                <span className="text-gray-700">{file.original_name}</span>
                <a
                  href={`${process.env.REACT_APP_API_URL}/download/${file.filename}`}
                  className="text-primary hover:underline"
                  aria-label={`Download ${file.original_name}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No files uploaded yet.</p>
        )}
      </div>

      <Link
        to="/dashboard"
        className="mt-6 inline-block bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
};

export default FileShare;