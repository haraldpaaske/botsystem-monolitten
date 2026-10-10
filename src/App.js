import "./App.css";
import Navbar from "./components/navbar/Navbar";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Reglement from "./components/reglement/Reglement";
import Oversikt from "./components/oversikt/Oversikt";
import Melding from "./components/melding/Melding";
import Done from "./components/melding/Done";
import { useState } from "react";
import bcrypt from "bcryptjs";
import Arkiv from "./components/arkiv/Arkiv";
import BugReport from "./components/bug_report/BugReport";
import FeedbackMotatt from "./components/bug_report/FeedbackMottatt";

function App() {
  const [inputPassword, setInputPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    try {
      const response = await fetch(
        "https://api.npoint.io/84df09c2d98b53a80fb4/passord/0"
      );
      const data = await response.json();
      if (bcrypt.compareSync(inputPassword, data.passord1)) {
        setIsLoggedIn(true);
      } else {
        alert("Incorrect Password");
      }
    } catch (error) {
      console.error("An error occurred while fetching the data", error);
    }
  };

  const handlePasswordChange = (event) => {
    setInputPassword(event.target.value);
  };

  const [meldingFormData, setMeldingFormData] = useState({
    brutt: [],
    melder: "",
    datoBrudd: new Date().toString().split(" ").slice(0, 4).join(" "),
    paragraf: "",
    beskrivelse: "",
    enheter: 1,
    dato: new Date().toDateString(),
    id: [],
  });

  // Function to update form data
  const updateMeldingFormData = (fieldName, value) => {
    setMeldingFormData((prevFormData) => ({
      ...prevFormData,
      [fieldName]: value,
    }));
  };

  return (
    <>
      <label id="botsjef">
        Botsjefs passord
        <br />
        <input
          type="password"
          value={inputPassword}
          onChange={handlePasswordChange}
        />
        <input type="button" value="botsjef" onClick={handleLogin} />
      </label>

      <Router>
        <Navbar />
        <Routes>
          <Route
            path="/reglement"
            element={<Reglement botsjef={isLoggedIn} />}
          />
          <Route path="/arkiv" element={<Arkiv botsjef={isLoggedIn} />} />
          <Route path="/oversikt" element={<Oversikt botsjef={isLoggedIn} />} />
          <Route path="/" element={<Oversikt botsjef={isLoggedIn} />} />
          <Route
            path="/melding"
            element={
              <Melding
                formData={meldingFormData}
                updateFormData={updateMeldingFormData}
              />
            }
          />
          <Route path="/done" element={<Done />} />
          <Route path="/motatt" element={<FeedbackMotatt />} />
          <Route path="/request" element={<BugReport />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
