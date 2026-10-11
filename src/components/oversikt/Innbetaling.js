import { useRef, useState } from "react";
import { push, ref, set } from "firebase/database";
import { db } from "../../firebaseConfig";

export default function Innbetaling({ player }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(null);
  const submitting = useRef(false);

  const savePayment = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
      setError("Skriv inn et positivt beløp med maks to desimaler.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      // Keep the same ID when retrying a failed write, avoiding duplicate payments.
      if (!pending.current) {
        pending.current = {
          target: push(ref(db, "innbetalinger")),
          payment: { person: player, belop: Math.round(value * 100) / 100, dato: new Date().toISOString() },
        };
      }
      await set(pending.current.target, pending.current.payment);
      pending.current = null;
      setAmount("");
      setMessage("Innbetaling registrert.");
    } catch (err) {
      setError("Kunne ikke lagre innbetalingen. Prøv igjen.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return <form className="payment-form" aria-label={`Registrer innbetaling for ${player}`} onSubmit={savePayment}>
    <label>
      Ny innbetaling (kr)
      <input type="number" aria-label={`Ny innbetaling for ${player}`} min="0.01" step="0.01" required
        inputMode="decimal" value={amount} disabled={saving}
        onChange={(event) => {
          setAmount(event.target.value);
          pending.current = null;
          setMessage("");
          setError("");
        }} />
    </label>
    <button type="submit" disabled={saving}>{saving ? "Lagrer …" : "Registrer innbetaling"}</button>
    {message && <span role="status">{message}</span>}
    {error && <span role="alert">{error}</span>}
  </form>;
}
