  import { useState, useEffect, useRef } from "react";
  import usePlayers from "../../hooks/usePlayers";
  import useRules from "../../hooks/fetchRules";
  import "./meldStyles.css";
  import { db } from "../../firebaseConfig";
  import { ref, onValue, set, off } from "firebase/database";

  const Melding = ({ formData, updateFormData }) => {
    const { brutt, melder, datoBrudd, paragraf, beskrivelse, enheter, id } =
      formData;
    const players = usePlayers();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitCooldown, setSubmitCooldown] = useState(false);
    const submitButtonRef = useRef(null);
    const [gullPaGul, setGullPaGulv] = useState(false);
    const [selectedTime, setSelectedTime] = useState("");
    const rules = useRules();
    const [selectedBrutt, setSelectedBrutt] = useState("");



    const handleBruttSelectChange = (e) => {
      const newBrutt = e.target.value;
      setSelectedBrutt(newBrutt); // Set the selected player
      updateFormData("brutt", [...brutt, newBrutt]); // Add the selected player to the formData
      setSelectedBrutt(""); // Reset the select field
    };
    

    useEffect(() => {
      setGullPaGulv(paragraf.includes("Gull på gulv"));
    }, [paragraf]);

    const handleTimeChange = (e) => {
      setSelectedTime(e.target.value);
    };

    useEffect(() => {
      if (submitCooldown) {
        // If cooldown is active, disable the button
        if (submitButtonRef.current) {
          submitButtonRef.current.disabled = true;
        }
        const timer = setTimeout(() => {
          setSubmitCooldown(false);
          if (submitButtonRef.current) {
            submitButtonRef.current.disabled = false;
          }
        }, 5000); // Cooldown period of 5 seconds

        return () => clearTimeout(timer);
      }
    }, [submitCooldown]);

    useEffect(() => {
      const dbRef = ref(db, "boter");
      const handleDataChange = (snapshot) => {
        if (snapshot.exists()) {
          updateFormData("id", Object.keys(snapshot.val()).length);
        }
      };

      onValue(dbRef, handleDataChange);
      return () => off(dbRef, handleDataChange);
    }, [updateFormData]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isSubmitting || submitCooldown) return;

      setIsSubmitting(true);
      setSubmitCooldown(true);

      // Prepend the selectedTime to the description if "Gull på gulv" is selected
      const finalDescription =
        gullPaGul && selectedTime
          ? `${selectedTime} - ${beskrivelse}`
          : beskrivelse;

      const bot = {
        brutt,
        melder,
        datoBrudd,
        paragraf,
        dato: new Date().toDateString(),
        beskrivelse: finalDescription,
        enheter: Number(enheter),
        id,
      };

      try {
        await set(ref(db, `boter/${id}`), bot);
        window.location.href = "/done";
      } catch (error) {
        console.error("Failed to submit data", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleNumericInputChange = (e) => {
      const value = e.target.value;

      // Update only if the input value is a number or empty (to allow clearing the input)
      if (value === "" || /^\d+$/.test(value)) {
        updateFormData("enheter", value === "" ? "" : Number(value));
      }
    };

    const handleRemoveBrutt = (playerToRemove) => {
      updateFormData(
        "brutt",
        brutt.filter((player) => player !== playerToRemove)
      );
    };
    return (
      <>
        <form id="mform" onSubmit={handleSubmit}>
          <div id="formDiv">
            <label>
              Hvem har brutt loven?
              <br />
              <select
                value={selectedBrutt}
                onChange={handleBruttSelectChange}
                required={brutt.length === 0}
              >
                <option value="" disabled>
                  Velg spiller
                </option>
                {players
                  .filter((p) => !brutt.includes(p)) // Filter out selected players
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
                  onClick={() => handleRemoveBrutt(selectedPlayer)}
                >
                  fjern
                </button>
                <br />
              </span>
            ))}

            <br />
            <label>
              Hvem er du?
              <br />
              <select
                value={melder}
                onChange={(e) => updateFormData("melder", e.target.value)}
                required
              >
                <option value="" disabled>
                  Velg spiller
                </option>
                {players.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <br />
            <label>
              Når skjedde lovbruddet
              <br />
              <input
                type="date"
                onChange={(e) => updateFormData("datoBrudd", e.target.value)}
                defaultValue={datoBrudd}
              ></input>
            </label>
            <br />
            <label>
              Hvilken paragraf er brudt?
              <br />
              <select
                value={paragraf}
                onChange={(e) => updateFormData("paragraf", e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a rule
                </option>
                {rules.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <br />
            {gullPaGul && (
              <>
                <label>
                  Tidspunkt for hendelsen:
                  <br />
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={handleTimeChange}
                    required={gullPaGul} // Make it required only if Gull på gulv is selected
                  />
                </label>
              </>
            )}

            <br />
            <label>
              Beskrivelse av situasjonen:
              <br />
              <textarea
                value={beskrivelse}
                onChange={(e) => updateFormData("beskrivelse", e.target.value)}
                rows="5" // You can adjust the number of rows
                cols="50" // You can adjust the number of columns
                placeholder="Beskriv hendelsen her..."
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
                inputmode="numeric"
                pattern="[0-9]*"
                onChange={handleNumericInputChange}
                min={1}
                max={30}
                required
              />
            </label>
            <br />
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={isSubmitting || submitCooldown}
            >
              {submitCooldown ? "Sender inn..." : "Meld bot"}
            </button>
            {submitCooldown && <p>Sender inn</p>}
          </div>
        </form>
      </>
    );
  };

  export default Melding;
