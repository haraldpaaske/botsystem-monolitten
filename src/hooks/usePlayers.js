

import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

const usePlayers = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const playersRef = ref(db, "/roster");

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const playersList = Object.values(data);
        setPlayers(playersList);
      } else {
        setPlayers([]); // handle the case where there's no data
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  return players;
};

export default usePlayers;
