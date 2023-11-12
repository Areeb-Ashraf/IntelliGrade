import React, { useState } from 'react';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: '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', dangerouslyAllowBrowser: true });

function App() {
  const [graderName, setGraderName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [gradingCriteria, setGradingCriteria] = useState('');
  const [submittedCodes, setSubmittedCodes] = useState([]);
  const [gradedResults, setGradedResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const extractNameAndID = (code) => {
    const regex = /(?:\/\/|#)\s*name\s*:\s*([A-Za-z\s]+),?\s*id\s*:\s*([a-zA-Z]{2}\d{4})/i;
  
    const match = code.match(regex);
  
    if (match) {
      return { student_name: match[1].trim(), student_id: match[2] };
    } else {
      return { student_name: 'Unknown', id: 'Unknown' };
    }
  };
  


  const handleFileUpload = (event) => {
    const files = event.target.files;
    const newSubmittedCodes = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (e) => {
        const fileContent = e.target.result;
        newSubmittedCodes.push(fileContent);

        if (newSubmittedCodes.length === files.length) {
          setSubmittedCodes(newSubmittedCodes);
        }
      };

      reader.readAsText(file);
    }
  };

  async function handleGrade() {
    setIsLoading(true);
    const results = [];

    for (let i = 0; i < submittedCodes.length; i++) {
      const submittedCode = submittedCodes[i];
      const { student_name, student_id } = extractNameAndID(submittedCode);

      const prompt = `
      Act as a Computer Science professor.
      Your name is ${graderName}.
      The following is an assignment you had given: ${programDescription}
      and the following is your grading criteria: ${gradingCriteria}
      The submitted code: ${submittedCode}
      Grade the assignment based on the grading criteria. Be lenient while grading.
      Remember that you are the professor yourself and are giving feedback directly to the students.
      Also note that if the file does not compile, then award zero points to the student and don't bother checking for other grading criteria.
      The name of the student is ${student_name} and id is: ${student_id}
      
      Format your response like:-
      Name: ${student_name}, id: ${student_id}, Grade: (the total grade you awarded the student, the number only and nothing else!), Feedback:
      `;

      const response = await fetchData(prompt);
      results.push(response);
    }

    setGradedResults(results);
    setIsLoading(false);
  }

  async function fetchData(prompt) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
      });

      const choices = completion?.choices;

      if (!choices || !choices[0] || !choices[0]?.message) {
        throw new Error('Invalid response format');
      }

      const assistantMessage = choices[0]?.message?.content || 'No response';
      return assistantMessage;
    } catch (error) {
      console.error('Error fetching data:', error);
      return 'Error fetching data';
    }
  }

  const downloadData = () => {
    const jsonData = JSON.stringify(gradedResults, null, 2);

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradedResults.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  function calculateStatistics(results) {
    const stats = {
      totalStudents: results.length,
      above80: 0,
      between60And80: 0,
      below60: 0,
      totalGradePoints: 0,
    };
  
    results.forEach((result) => {
      // Assuming the result is a string containing grade information (e.g., "Name: John, id: ABC123, Grade: 85, Feedback: ...")
      const grade = parseInt(result.match(/Grade:\s*(\d+)/)[1]);
  
      if (grade >= 80) {
        stats.above80++;
      } else if (grade >= 60) {
        stats.between60And80++;
      } else {
        stats.below60++;
      }
  
      stats.totalGradePoints += grade;
    });
  
    stats.classAverage = stats.totalGradePoints / stats.totalStudents;
  
    return stats;
  }

  const chartRef = useRef(null);

  useEffect(() => {
    if (gradedResults.length > 0) {
      const stats = calculateStatistics(gradedResults);
      console.log(stats); // You can log or use these stats as needed

      // Update or create a chart using Chart.js
      const ctx = chartRef.current.getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Above 80', '60-80', 'Below 60'],
          datasets: [
            {
              label: 'Number of Students',
              data: [stats.above80, stats.between60And80, stats.below60],
              backgroundColor: [
                'rgba(75, 192, 192, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(255, 99, 132, 0.2)',
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 1,
            },
          ],
        },
      });
    }
  }, [gradedResults]);

  const [stats, setStats] = useState(null); // Declare stats as a state variable

  useEffect(() => {
    if (gradedResults.length > 0) {
      const calculatedStats = calculateStatistics(gradedResults);
      console.log(calculatedStats);

      setStats(calculatedStats); // Set the stats using useState
    }
  }, [gradedResults]);


  return (
    <main>

      <div className="title">
        <h2>IntelliGrade</h2>
        <div className="underline"></div>
      </div>

      <div className='space'>
        <label>
          <h4>Grader's Name:  </h4> 
          <input type="text" value={graderName} onChange={(e) => setGraderName(e.target.value)} />
        </label>
      </div>

      <div className='space'>
        <h4>Program Description:</h4>
        <label>
          <textarea rows="7" cols="80" value={programDescription} onChange={(e) => setProgramDescription(e.target.value)} />
        </label>
      </div>

      <div className='space'>
        <h4>Grading Criteria:</h4>
        <label>
          <textarea rows="7" cols="80" value={gradingCriteria} onChange={(e) => setGradingCriteria(e.target.value)} />
        </label>
      </div>

      <div className='space'>
        <h4>Submit Code:</h4>
        <label>
          <input type="file" multiple onChange={handleFileUpload} />
        </label>
      </div>

      <div>
      <button className='btn' onClick={handleGrade} disabled={isLoading}>
          {isLoading ? 'Grading...' : 'Grade'}
        </button>
      </div>

      <div>
        {isLoading && <p>Loading...</p>}
        {gradedResults.map((result, fileIndex) => (
          <div key={fileIndex}>
            <h4>{`File ${fileIndex + 1} Result:`}</h4>
            <div>
              {result}
            </div>
          </div>
        ))}
      </div>

      <div>
        {stats && (
          <div>
            <h4>Statistics:</h4>
            <p>Total Students: {stats.totalStudents}</p>
            <p>Above 80: {stats.above80}</p>
            <p>60-80: {stats.between60And80}</p>
            <p>Below 60: {stats.below60}</p>
            <p>Class Average: {stats.classAverage.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div>
        {gradedResults.length > 0 && (
          <div>
            <canvas ref={chartRef} width="400" height="200"></canvas>
          </div>
        )} 
      </div>

      {gradedResults.length > 0 && (
        <div>
          <button className='btn' onClick={downloadData}>Download result</button>
        </div>
)}

    </main>
  );
}

export default App;
