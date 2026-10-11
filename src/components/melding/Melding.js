  import { useState, useEffect, useRef } from "react";
  import usePlayers from "../../hooks/usePlayers";
  import useRules from "../../hooks/fetchRules";
  import PlayerSelect from "./PlayerSelect";
  import "./meldStyles.css";
  import { saveBot } from "../../utils/boter";

  const Melding = ({ formData, updateFormData }) => {
    const { brutt, melder, datoBrudd, paragraf, beskrivelse, enheter } =
      formData;
    const players = usePlayers();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitCooldown, setSubmitCooldown] = useState(false);
    const submitButtonRef = useRef(null);
    const submitting = useRef(false);
    const [submitError, setSubmitError] = useState("");
    const [gullPaGul, setGullPaGulv] = useState(false);
    const [selectedTime, setSelectedTime] = useState("");
    const rules = useRules();
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

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (submitting.current || isSubmitting || submitCooldown) return;
      submitting.current = true;
      setSubmitError("");

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
      };

      try {
        await saveBot(bot);
        window.location.href = "/done";
      } catch (error) {
        console.error("Failed to submit data", error);
        setSubmitError("Kunne ikke lagre boten. Prøv igjen.");
        setSubmitCooldown(false);
      } finally {
        submitting.current = false;
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

    const handleParagrafChange = (e) => {
      const selectedRule = e.target.value;
      // Fixed rates are stored at the end of the rule name, e.g. (50) or (50 kr).
      const amount = selectedRule.match(/\(\s*(\d+)\s*(?:kr\.?)?\s*\)\s*$/i);
      updateFormData("paragraf", selectedRule);
      updateFormData("enheter", amount ? Number(amount[1]) : "");
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
            <PlayerSelect
              id="brutt-player"
              label="Hvem har brutt loven?"
              players={players.filter((player) => !brutt.includes(player))}
              onChange={(player) => {
                if (player && !brutt.includes(player)) updateFormData("brutt", [...brutt, player]);
              }}
              required={brutt.length === 0}
            />
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
            <PlayerSelect
              id="melder-player"
              label="Hvem er du?"
              players={players}
              value={melder}
              onChange={(player) => updateFormData("melder", player)}
              required
            />
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
                onChange={handleParagrafChange}
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
              Beløp (kr):
              <br />
              <input
                id="antall_enheter"
                type="number"
                value={enheter}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={handleNumericInputChange}
                min={1}
                placeholder="Skriv inn beløp"
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
            {submitError && <p role="alert">{submitError}</p>}
          </div>
        </form>
      </>
    );
  };

  export default Melding;
