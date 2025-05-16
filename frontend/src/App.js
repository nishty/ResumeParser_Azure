import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Add fade-in animation styles
    const fadeInStyle = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = fadeInStyle;
    document.head.appendChild(styleSheet);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please upload at least one resume.');
      return;
    }
    if (!jobDescription.trim()) {
      alert('Please paste the job description.');
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append('resumes', file));
    formData.append('jobDescription', jobDescription);

    try {
      setProgress(10);
      const response = await axios.post('http://localhost:5000/parse-resumes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const sortedResumes = response.data.parsedResumes.sort((a, b) => 
        (b.FitScoreOutOf100 || 0) - (a.FitScoreOutOf100 || 0)
      );

      setParsedData(sortedResumes);
      setProgress(100);
    } catch (error) {
      console.error(error);
      alert('Error parsing resumes.');
      setProgress(0);
    }
  };

  const downloadCSV = () => {
    if (parsedData.length === 0) return;

    const headers = ['FullName', 'Email', 'Phone', 'SkillsMatched', 'TotalExperienceYears', 'FitScoreOutOf100'];
    const rows = parsedData.map(resume => [
      resume.FullName || '',
      resume.Email || '',
      resume.Phone || '',
      (resume.SkillsMatched || []).join('; '),
      resume.TotalExperienceYears || '',
      resume.FitScoreOutOf100 || ''
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\r\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'matched_resumes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      padding: '40px'
    }}>
      <div style={{ maxWidth: '1000px', margin: 'auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#0d47a1' }}>
          Resume Parser
        </h1>

        <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            style={{ marginBottom: '15px' }}
          />
          {files.length > 0 && (
            <div>
              <strong>Files Selected:</strong>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            rows="8"
            cols="80"
            placeholder="Paste the Job Description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ 
              width: '100%', 
              marginTop: '20px', 
              padding: '10px', 
              fontSize: '16px', 
              borderRadius: '6px',
              backgroundColor: '#f1f3f5',
              border: '1px solid #ced4da'
            }}
          />

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleUpload}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1565c0'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1976d2'}
            >
              Upload and Match
            </button>
          </div>

          {progress > 0 && progress < 100 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ width: '100%', backgroundColor: '#dee2e6', borderRadius: '10px' }}>
                <div style={{
                  width: `${progress}%`,
                  backgroundColor: '#1976d2',
                  height: '12px',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '8px' }}>Parsing Resumes... {progress}%</p>
            </div>
          )}
        </div>

        {parsedData.length > 0 && (
          <>
            <h2 style={{ textAlign: 'center', color: '#0d47a1', marginBottom: '20px' }}>
              Matched Resumes
            </h2>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button
                onClick={downloadCSV}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Export Results as CSV
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {parsedData.map((resume, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0px 2px 10px rgba(0,0,0,0.05)',
                    animation: 'fadeIn 0.8s ease'
                  }}
                >
                  <h3 style={{ color: '#0d47a1' }}>{resume.FullName || "No Name Found"}</h3>
                  <p><strong>Email:</strong> {resume.Email || "Not Found"}</p>
                  <p><strong>Phone:</strong> {resume.Phone || "Not Found"}</p>
                  <p><strong>Skills Matched:</strong> {resume.SkillsMatched ? resume.SkillsMatched.join(', ') : "None"}</p>
                  <p><strong>Years of Experience:</strong> {resume.TotalExperienceYears || "N/A"}</p>
                  <p><strong>Fit Score:</strong> {resume.FitScoreOutOf100 || "N/A"} / 100</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
