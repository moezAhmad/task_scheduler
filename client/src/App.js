import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

function App() {
  const [code, setCode] = useState("// Write your code here...");
  const [language, setLanguage] = useState("javascript");
  const [result, setResult] = useState(null);

  const handleEditorChange = (value, event) => {
    setCode(value);
  };

  const handleSubmit = async () => {
    console.log("Submitting the following code:", code);
    try {
      const response = await axios.post('http://10.0.2.15:3000/submit-code', {
        language,
        code,
      });
      setResult(response.data.result);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <h1>Distributed Task Scheduler</h1>
      <label>
          Language:
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            {/* Add other languages here */}
          </select>
        </label>
      <Editor
        height="70vh"
        defaultLanguage={language}
        value={code}
        onChange={handleEditorChange}
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default App;
