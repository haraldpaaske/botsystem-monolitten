import { useState, useEffect, useRef } from "react";
import usePlayers from "../../hooks/usePlayers";
import useRules from "../../hooks/fetchRules";
import "../melding/meldStyles.css";
import { db } from "../../firebaseConfig";
import { ref, onValue, set, off } from "firebase/database";

const StyringsBot = ({ onClose }) => {
  // Accept onClose as a prop
  const players = usePlayers() || []; // Ensure it's always an array
  const rules = useRules() || [];

  const [brutt, setBrutt] = useState([]);
  const [beskrivelse, setBeskrivelse] = useState("");
  const [enheter, setEnheter] = useState(-1);
  const [id, setId] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCooldown, setSubmitCooldown] = useState(false);
  const submitButtonRef = useRef(null);
  const [selectedBrutt, setSelectedBrutt] = useState("");

  useEffect(() => {
    if (submitCooldown) {
      if (submitButtonRef.current) submitButtonRef.current.disabled = true;
      const timer = setTimeout(() => {
        setSubmitCooldown(false);
        if (submitButtonRef.current) submitButtonRef.current.disabled = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitCooldown]);

  useEffect(() => {
    const dbRef = ref(db, "boter");
    const handleDataChange = (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setId(Object.keys(snapshot.val()).length);
      } else {
        setId(0);
      }
    };
    onValue(dbRef, handleDataChange);
    return () => off(dbRef, handleDataChange);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || submitCooldown) return;

    setIsSubmitting(true);
    setSubmitCooldown(true);

    const bot = {
      brutt,
      melder: "Systemet",
      datoBrudd: "",
      paragraf: "§ 0 Rettssamfunnets prinsipp",
      dato: new Date().toDateString(),
      beskrivelse,
      enheter: Number(enheter),
      id,
    };

    try {
      await set(ref(db, `boter/${id}`), bot);

      // Reset form fields
      setBrutt([]);
      setBeskrivelse("");
      setEnheter(1);
      setSelectedBrutt("");

      // Automatically close StyringsBot after submission
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to submit data", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form id="mform" onSubmit={handleSubmit}>
        <div id="formDiv">
          <label>
            Hvem skal justeres?
            <br />
            <select
              value={selectedBrutt}
              onChange={(e) => {
                const newBrutt = e.target.value;
                if (newBrutt) setBrutt([...brutt, newBrutt]);
                setSelectedBrutt("");
              }}
              required={brutt.length === 0}
            >
              <option value="" disabled>
                Velg spiller
              </option>
              {players.length > 0 &&
                players
                  .filter((p) => !brutt.includes(p))
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
            </select>
          </label>
          {brutt.map((selectedPlayer) => (
            <span key={selectedPlayer}>
              {selectedPlayer}
              <button
                className="remove_button"
                type="button"
                onClick={() =>
                  setBrutt(brutt.filter((p) => p !== selectedPlayer))
                }
              >
                fjern
              </button>
              <br />
            </span>
          ))}

          <br />
          <label>
            Notat
            <br />
            <textarea
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              rows="5"
              cols="50"
              placeholder="Beskriv justeringen..."
              required
            ></textarea>
          </label>

          <br />
          <label>
            Antall enheter:
            <br />
            <input
              id="antall_enheter"
              type="number"
              value={enheter}
              inputMode="numeric"
              pattern="[-]?[0-9]*"
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^-?\d*$/.test(value)) {
                  setEnheter(value);
                }
              }}
              required
            />
          </label>
          <br />
          <button
            ref={submitButtonRef}
            type="submit"
            disabled={isSubmitting || submitCooldown}
          >
            {submitCooldown ? "Sender inn..." : "Meld justering"}
          </button>
          {submitCooldown && <p>Sender inn</p>}
        </div>
      </form>
    </>
  );
};

export default StyringsBot;
