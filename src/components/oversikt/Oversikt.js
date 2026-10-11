import usePlayers from "../../hooks/usePlayers";
import useRules from "../../hooks/fetchRules";
import { useState, useEffect, useMemo } from "react";
import "../oversikt/oversiktStyles.css";
import { db } from "../../firebaseConfig";
import {
  ref,
  onValue,
  update,
  getDatabase,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";
import RedigerSpillere from "./RedigerSpillere";
import StyringsBot from "./StyringsBot";
import Innbetaling from "./Innbetaling";
import { getPlayerBalance, formatKroner } from "./betalingsoversikt";

const Oversikt = (props) => {
  const players = usePlayers();
  const rules = useRules();
  const [data, setData] = useState([]);
  const [rettsak, setRettsak] = useState("notRettsak");
  const [editing, setEditing] = useState(false);
  const [registreringsMode, setRegistreringsMode] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState({ boter: false, innbetalinger: false });
  const [loadErrors, setLoadErrors] = useState({});
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    forbryter: "",
    innsender: "",
    paragraf: "",
    dato: "",
    beskrivelse: "",
    enheter: "",
  });
  const [filteredData, setFilteredData] = useState([]);
  const reversedData = [...filteredData].reverse();
  const [showStyringsBot, setShowStyringsBot] = useState(false);

  const toggleStyringsBot = () => {
    setShowStyringsBot((prev) => !prev); // Toggle the state
  };

  const balances = useMemo(() => Object.fromEntries(players.map((player) => [
    player, getPlayerBalance(player, data, payments),
  ])), [players, data, payments]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) =>
    balances[b].remaining - balances[a].remaining || a.localeCompare(b, "nb")), [players, balances]);

  const totals = players.reduce((sum, player) => ({
    total: sum.total + balances[player].total,
    paid: sum.paid + balances[player].paid,
    remaining: sum.remaining + balances[player].remaining,
    credit: sum.credit + balances[player].credit,
  }), { total: 0, paid: 0, remaining: 0, credit: 0 });

  useEffect(() => {
    const subscriptions = [
      ["boter", setData],
      ["innbetalinger", setPayments],
    ].map(([path, receive]) => onValue(ref(db, path), (snapshot) => {
      receive(Object.values(snapshot.val() || {}).filter(Boolean));
      setLoaded((previous) => ({ ...previous, [path]: true }));
      setLoadErrors((previous) => ({ ...previous, [path]: false }));
    }, () => {
      setLoadErrors((previous) => ({ ...previous, [path]: true }));
    }));
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, []);

  const handleRettsak = () => {
    if (rettsak === "rettsak") {
      if (window.confirm("Er rettsaken ferdig?")) {
        setRettsak("notRettsak");
        setEditing(false);
      } else {
        setRettsak("rettsak");
        setEditing(true);
      }
    } else {
      setRettsak("rettsak");
      setEditing(true);
    }
  };

  const handleUnitsChange = (id, value) => {
    const db = getDatabase();
    const botRef = ref(db, "boter");
    const q = query(botRef, orderByChild("id"), equalTo(id));
    get(q)
      .then((snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const botKey = childSnapshot.key;

            const updatedBot = {
              ...childSnapshot.val(),
              enheter: Number(value),
            };

            const specificBotRef = ref(db, `boter/${botKey}`);
            update(specificBotRef, updatedBot)
              .then(() => {
                const updatedBots = data.map((bot) =>
                  bot.id === id ? updatedBot : bot,
                );
                setData(updatedBots);
              })
              .catch((error) => {
                console.error(`Failed to update bot with id ${id}:`, error);
              });
          });
        } else {
          console.log(`No bot found with id ${id}`);
        }
      })
      .catch((error) => {
        console.error(`Failed to query bots:`, error);
      });
  };

  useEffect(() => {
    const filterData = () => {
      const filtered = data.filter((entry) => {
        // 1) normalize each field
        const bruttArr = Array.isArray(entry.brutt) ? entry.brutt : [entry.brutt || ""];
        const melder = entry.melder ?? "";
        const paragraf = entry.paragraf ?? "";
        const datoBrudd = entry.datoBrudd ?? "";
        const beskrivelse = entry.beskrivelse ?? "";
        const enheterStr = entry.enheter != null ? String(entry.enheter) : "";

        // 2) do your matching
        const matchesForbryter = bruttArr
          .join(", ")
          .toLowerCase()
          .includes(filterCriteria.forbryter.toLowerCase());

        const matchesInnsender = melder
          .toLowerCase()
          .includes(filterCriteria.innsender.toLowerCase());

        const matchesParagraf =
          filterCriteria.paragraf === "" ||
          paragraf === filterCriteria.paragraf;

        const matchesDato =
          filterCriteria.dato === "" ||
          datoBrudd.toLowerCase().includes(filterCriteria.dato.toLowerCase());

        const matchesBeskrivelse =
          filterCriteria.beskrivelse === "" ||
          beskrivelse
            .toLowerCase()
            .includes(filterCriteria.beskrivelse.toLowerCase());

        const matchesEnheter =
          filterCriteria.enheter === "" ||
          enheterStr === filterCriteria.enheter;

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

    filterData();
  }, [filterCriteria, data]);

  const handleInputChange = (field, value) => {
    setFilterCriteria((prevFilterCriteria) => ({
      ...prevFilterCriteria,
      [field]: value,
    }));
  };

  if (Object.values(loadErrors).some(Boolean)) {
    return <p role="alert">Kunne ikke hente bøter eller innbetalinger. Last siden på nytt for å prøve igjen.</p>;
  }

  if (Object.values(loaded).every(Boolean)) {
    return (
      <>
        {props.botsjef && (
          <button onClick={() => setRegistreringsMode((previous) => !previous)}>
            {registreringsMode ? "Lukk registrering" : "Registrere innbetalte bøter"}
          </button>
        )}

        <div className="container payment-overview">
          <h2>Oversikt</h2>
          <p>Minstebeløpet er 100 kr per person. Innbetalinger trekkes fra etterpå.</p>
          {registreringsMode && props.botsjef && (
            <p>Registrer én innbetaling om gangen på personen som har betalt. Beløpet legges til tidligere innbetalinger.</p>
          )}
          <ul>
            {sortedPlayers.map((player) => {
              const balance = balances[player];
              return <li key={player} className="player-item">
                <div className="player-name-status">
                  <span className="bold">{player}</span>
                  <span className={`status ${balance.remaining === 0 ? "status-done" : "status-missed"}`}>
                    Innbetalt: {formatKroner(balance.paid)}
                  </span>
                </div>
                <div className="player-balance">
                  <span>Bøter: {formatKroner(balance.total)}</span>
                  <strong>Gjenstår: {formatKroner(balance.remaining)}</strong>
                  {balance.credit > 0 && <span>Til gode: {formatKroner(balance.credit)}</span>}
                </div>
                {registreringsMode && props.botsjef && <Innbetaling player={player} />}
              </li>;
            })}
          </ul>
          <div className="total-boter">
            <div>Totale bøter: {formatKroner(totals.total)}</div>
            <div>Totalt innbetalt: {formatKroner(totals.paid)}</div>
            <div>Gjenstår: {formatKroner(totals.remaining)}</div>
            {totals.credit > 0 && <div>Til gode: {formatKroner(totals.credit)}</div>}
          </div>
        </div>
        {props.botsjef && (
          <>
            <RedigerSpillere />
          </>
        )}

        <h2>Alle bøter</h2>
        <button
          onClick={() => {
            setIsFilterVisible((prev) => {
              if (prev) {
                setFilterCriteria({
                  forbryter: "",
                  innsender: "",
                  paragraf: "",
                  dato: "",
                  beskrivelse: "",
                  enheter: "",
                });
              }
              return !prev;
            });
          }}
        >
          Toggle Filter
        </button>

        {isFilterVisible && (
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
              <select
                value={filterCriteria.paragraf}
                onChange={(e) => handleInputChange("paragraf", e.target.value)}
                required
              >
                <option value="">alle paragrafer</option>
                {rules.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
                onChange={(e) =>
                  handleInputChange("beskrivelse", e.target.value)
                }
              />
            </label>
            <label>
              beløp (kr)
              <input
                type="number"
                value={filterCriteria.enheter}
                onChange={(e) => handleInputChange("enheter", e.target.value)}
              />
            </label>
          </div>
        )}

        {props.botsjef && (
          <>
            {/* Rettsak Button */}
            <button onClick={handleRettsak}>
              {rettsak === "rettsak" ? "Ferdig med rettsak" : "Rettsak"}
            </button>

            {/* Show the toggle button only when rettsak is active */}
            {rettsak === "rettsak" && (
              <>
                <button onClick={toggleStyringsBot}>
                  {showStyringsBot ? "Lukk justering" : "Juster enkeltspillere"}
                </button>

                {showStyringsBot && (
                  <StyringsBot onClose={() => setShowStyringsBot(false)} />
                )}
              </>
            )}
          </>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th> Forbryter</th>
                <th className="tablet-hide">Innsender</th>
                <th>Paragraf</th>
                <th>Dato_brudd</th>
                <th className="tablet-hide">Dato_meldt</th>
                <th className="mobile-hide">Beskrivelse</th>
                <th>Beløp (kr)</th>
              </tr>
            </thead>
            <tbody>
              {reversedData.map((bot) => (
                <tr
                  key={bot.id}
                >
                  <td>
                    {Array.isArray(bot.brutt)
                      ? bot.brutt.join(", ")
                      : bot.brutt}
                  </td>
                  <td className="tablet-hide">{bot.melder}</td>
                  <td>{bot.paragraf}</td>
                  <td>{bot.datoBrudd}</td>
                  <td className="tablet-hide">{bot.dato}</td>
                  <td className="mobile-hide">{bot.beskrivelse}</td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        value={bot.enheter}
                        onChange={(e) =>
                          handleUnitsChange(bot.id, e.target.value)
                        }
                        className="units-input"
                      />
                    ) : (
                      bot.enheter
                    )}
                  </td>
                  {/* <button className={rettsak}>delete</button> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else {
    return (
      <>
        <p role="status">Henter bøter og innbetalinger …</p>
      </>
    );
  }
};

export default Oversikt;
