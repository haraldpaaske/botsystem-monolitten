import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { ref, onValue, off } from "firebase/database";
import "./arkivStyles.css";
import useRules from "../../hooks/fetchRules";

const Arkiv = () => {
  const [arkivData, setArkivData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterCriteria, setFilterCriteria] = useState({
    forbryter: "",
    innsender: "",
    paragraf: "",
    dato: "",
    beskrivelse: "",
    enheter: "",
  });
  const rules = useRules();

  useEffect(() => {
    const dbRef = ref(db, "arkiv");

    const handleDataChange = (snapshot) => {
      if (snapshot && snapshot.val()) {
        const reversedData = Object.values(snapshot.val()).reverse();
        setArkivData(reversedData);
        setFilteredData(reversedData); // Initialize filteredData with all data
      }
    };

    onValue(dbRef, handleDataChange);

    // Cleanup
    return () => {
      off(dbRef, handleDataChange);
    };
  }, []);

  useEffect(() => {
    filterData();
  }, [filterCriteria, arkivData]);

  const filterData = () => {
    const filtered = arkivData.filter((entry) => {
      // 1) Safe‐guard every field
      const bruttArr = Array.isArray(entry.brutt) ? entry.brutt : [];
      const melder = entry.melder ?? "";
      const p = entry.paragraf ?? "";
      const datoB = entry.datoBrudd ?? "";
      const beskriv = entry.beskrivelse ?? "";
      const enhet = entry.enheter != null ? String(entry.enheter) : "";

      // 2) Perform your checks
      const matchesForbryter = bruttArr
        .join(", ")
        .toLowerCase()
        .includes(filterCriteria.forbryter.toLowerCase());

      const matchesInnsender = melder
        .toLowerCase()
        .includes(filterCriteria.innsender.toLowerCase());

      const matchesParagraf = p
        .toLowerCase()
        .includes(filterCriteria.paragraf.toLowerCase());

      const matchesDato =
        filterCriteria.dato === "" ||
        datoB.toLowerCase().includes(filterCriteria.dato.toLowerCase());

      const matchesBeskrivelse =
        filterCriteria.beskrivelse === "" ||
        beskriv
          .toLowerCase()
          .includes(filterCriteria.beskrivelse.toLowerCase());

      const matchesEnheter =
        filterCriteria.enheter === "" || enhet === filterCriteria.enheter;

      return (
        matchesForbryter &&
        matchesInnsender &&
        matchesParagraf &&
        matchesDato &&
        matchesBeskrivelse &&
        matchesEnheter
      );
    });

    setFilteredData(filtered);
  };

  const handleInputChange = (field, value) => {
    setFilterCriteria((prevFilterCriteria) => ({
      ...prevFilterCriteria,
      [field]: value,
    }));
  };

  useEffect(() => {
    // Assuming you're fetching and setting arkivData somewhere here
    // After setting arkivData, we check each entry for debugging purposes
    arkivData.forEach((entry, index) => {
      if (!Array.isArray(entry.brutt)) {
        console.error(
          `Entry at index ${index} has 'brutt' that is not an array:`,
          entry
        );
        // Optionally, handle or fix the data here
      }
    });
  }, [arkivData]);

  return (
    <>
      <div>
        <h1 className="h">Arkivet</h1>
        <div className="filter">
          <h2>Filtrer</h2>
          <label>
            Forbryter
            <input
              type="text"
              value={filterCriteria.forbryter}
              onChange={(e) => handleInputChange("forbryter", e.target.value)}
            />
          </label>
          <label>
            indsender
            <input
              type="text"
              value={filterCriteria.innsender}
              onChange={(e) => handleInputChange("innsender", e.target.value)}
            />
          </label>
          <label>
            Paragraf
            <input
              type="text"
              value={filterCriteria.paragraf}
              onChange={(e) => handleInputChange("paragraf", e.target.value)}
            />
          </label>
          <label>
            dato
            <input
              type="text"
              value={filterCriteria.dato}
              onChange={(e) => handleInputChange("dato", e.target.value)}
            />
          </label>
          <label>
            Beskrivelse
            <input
              type="text"
              value={filterCriteria.beskrivelse}
              onChange={(e) => handleInputChange("beskrivelse", e.target.value)}
            />
          </label>
          <label>
            antall enheter
            <input
              type="number"
              value={filterCriteria.enheter}
              onChange={(e) => handleInputChange("enheter", e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Forbryter</th>
              <th className="tablet-hide">Innsender</th>
              <th>Paragraf</th>
              <th>Dato_brudd</th>
              <th className="tablet-hide">Dato_meldt</th>
              <th className="mobile-hide">Beskrivelse</th>
              <th>Antall</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(filteredData) &&
              filteredData.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    {Array.isArray(entry.brutt)
                      ? entry.brutt.join(", ")
                      : entry.brutt || "N/A"}
                  </td>
                  <td className="tablet-hide">{entry.melder}</td>
                  <td>{entry.paragraf}</td>
                  <td>{entry.datoBrudd}</td>
                  <td className="tablet-hide">{entry.dato}</td>
                  <td className="mobile-hide">{entry.beskrivelse}</td>
                  <td>{entry.enheter}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Arkiv;
