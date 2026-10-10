// BugReport.js

import React, { useState, useEffect } from "react";
import { ref, onValue, off, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import "./BugReport.css";

const BugReport = () => {
  const [inputText, setInputText] = useState("");
  const [bugReports, setBugReports] = useState([]);

  useEffect(() => {
    const dbRef = ref(db, "bugReports");

    const handleDataChange = (snapshot) => {
      if (snapshot && snapshot.val()) {
        const data = snapshot.val();
        setBugReports(data || []);
      }
    };

    onValue(dbRef, handleDataChange);
    return () => {
      off(dbRef, handleDataChange);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newBugId = bugReports.length;

      const bugReport = {
        id: newBugId,
        text: inputText,
        fixed: false,
      };

      const bugReportRef = ref(db, `bugReports/${newBugId}`);
      await set(bugReportRef, bugReport);

      console.log("Bug report submitted successfully!");
      setInputText("");
      setBugReports([...bugReports, bugReport]);
    } catch (error) {
      console.error("Failed to submit bug report:", error.message);
    }
  };

  const handleFixChange = async (bugId) => {
    try {
      const bugReportsCopy = [...bugReports];
      const bugIndex = bugReportsCopy.findIndex((bug) => bug.id === bugId);

      if (bugIndex !== -1) {
        const updatedBug = {
          ...bugReportsCopy[bugIndex],
          fixed: !bugReportsCopy[bugIndex].fixed,
        };

        const bugReportRef = ref(db, `bugReports/${bugId}`);
        await set(bugReportRef, updatedBug);

        bugReportsCopy[bugIndex] = updatedBug;
        setBugReports(bugReportsCopy);
      }
    } catch (error) {
      console.error("Failed to update bug report:", error.message);
    }
  };

  return (
    <div className="bug-report-container">
      <div className="bug-report-form">
        <form onSubmit={handleSubmit}>
          <label>
            <h2>Submit desired feature:</h2>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows="6"
              cols="50"
              required
            />
          </label>
          <br />
          <button type="submit">Submit Request</button>
        </form>
      </div>
      <br />
      <p className="special-paragraphs">✅→ ferdig</p>
      <p className="special-paragraphs">❌→ er på sak</p>

      <div className="bug-list-container">
        <ul className="bug-list">
          {bugReports
            .slice()
            .reverse()
            .map((bugReport) => (
              <li
                key={bugReport.id}
                className={bugReport.fixed ? "fixed" : "not-fixed"}
              >
                <p>{bugReport.text}</p>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default BugReport;
