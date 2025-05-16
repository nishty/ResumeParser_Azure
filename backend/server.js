const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// POST endpoint to parse resumes + job description
app.post('/parse-resumes', upload.array('resumes', 20), async (req, res) => {
  const files = req.files;
  const jobDescription = req.body.jobDescription;

  console.log("Received request to parse resumes.");

  if (!files || files.length === 0) {
    console.error("No resumes uploaded.");
    return res.status(400).send('No resumes uploaded.');
  }

  if (!jobDescription || jobDescription.trim() === "") {
    console.error("No job description provided.");
    return res.status(400).send('Job description is required.');
  }

  let parsedResumes = [];

  for (const file of files) {
    let extractedText = '';

    try {
      console.log(`Reading file: ${file.originalname}`);

      if (file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(file.path);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text;
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const dataBuffer = fs.readFileSync(file.path);
        const data = await mammoth.extractRawText({ buffer: dataBuffer });
        extractedText = data.value;
      } else {
        console.error(`Unsupported file type: ${file.mimetype}`);
        continue;
      }

      console.log(`Finished reading file: ${file.originalname}`);
      console.log(`Calling Claude for file: ${file.originalname}`);

      const claudePrompt = `
You are an expert recruiter assistant.

Here is the job description:

${jobDescription}

Now evaluate the following resume:

${extractedText}

Return ONLY a JSON object structured like this:
{
  "FullName": "",
  "Email": "",
  "Phone": "",
  "SkillsMatched": [],
  "TotalExperienceYears": "",
  "FitScoreOutOf100": ""
}
ONLY return valid JSON, no extra explanation.
`;

      // Call Claude API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: claudePrompt
          }]
        },
        {
          headers: {
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Claude API call successful for: ${file.originalname}`);

      let resumeText = response.data.content[0].text.trim();
      const firstCurly = resumeText.indexOf('{');
      const lastCurly = resumeText.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1) {
        const jsonString = resumeText.substring(firstCurly, lastCurly + 1);
        parsedResumes.push(JSON.parse(jsonString));
        console.log(`Parsed JSON successfully for: ${file.originalname}`);
      } else {
        console.error(`No valid JSON found in Claude response for: ${file.originalname}`);
      }

    } catch (error) {
      console.error(`Error parsing ${file.originalname}:`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    } finally {
      fs.unlinkSync(file.path);
    }
  }

  res.json({ parsedResumes });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
