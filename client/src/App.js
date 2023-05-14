import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import './style.css';

function App() {
  const [code, setCode] = useState("// Write your code here...");
  const [language, setLanguage] = useState("javascript");
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState("")

  const handleEditorChange = (value, event) => {
    setCode(value);
  };

  const handleSubmit = async () => {
    console.log("Submitting the following code:", code);
    try {
      const response = await axios.post('http://192.168.137.43:3000/submit-code', {
        language,
        code,
      });
      const { success, result } = response.data;
      if (success) {
        setResult(result.result)
        setLogs(result.logs)
    } else {
      console.error("Error submitting code:", response.data.message);
      alert("Error: " + response.data.message);
    }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      
      <section id="header">
        <h1>Distributed Task Scheduler</h1>
        <label class="select-button">
            {/* Language  */}
            <select  class="btn btn-info btn-height" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              {/* Add other languages here */}
            </select>
            <button className="btn btn-dark btn-height" onClick={handleSubmit}>Submit</button>
        </label>

        <div class="alert alert-warning text-center" role="alert">
          Select your language, write your code, and click Submit!
        </div>
      </section>

      <section id="editor">
        <Editor
          height="70vh"
          defaultLanguage={language}
          value={code}
          onChange={handleEditorChange}
        />
      </section>
      
      <section id="result">
        <div className="result-window">
          <h3>Execution Result : </h3>
          <pre>x = 2342{result}</pre>
        </div>
        <div className="result-window">
          <h3>Logs : </h3>
          <pre>Code executed fine{logs}</pre>
        </div>
      </section>

    </div>
  );
}

export default App;
