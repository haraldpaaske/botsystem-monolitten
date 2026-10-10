
import { useState } from "react";
import { db } from "../../firebaseConfig";
import { ref, set, remove, push, onValue } from 'firebase/database';

const RedigerSpillere = () => {
  const [playerNameToAdd, setPlayerNameToAdd] = useState('');
  const [playerNameToRemove, setPlayerNameToRemove] = useState('');

  // Function to add a player to Firebase
  const handleAddPlayer = () => {
    if (playerNameToAdd.trim() !== '') {
      const playersRef = ref(db, '/roster');
      const newPlayerRef = push(playersRef); // Generate a new unique key
      set(newPlayerRef, playerNameToAdd)
        .then(() => {
          console.log(`${playerNameToAdd} added to roster`);
          setPlayerNameToAdd(''); // Clear input field
        })
        .catch((error) => {
          console.error('Error adding player: ', error);
          alert('Error adding player: ', error)
        });
    }
  };

  // Function to remove a player from Firebase
  const handleRemovePlayer = () => {
    if (playerNameToRemove.trim() !== '') {
      const playersRef = ref(db, '/roster');
      onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        const playerKey = Object.keys(players).find(key => players[key] === playerNameToRemove);
        
        if (playerKey) {
          const playerRef = ref(db, `/roster/${playerKey}`);
          remove(playerRef)
            .then(() => {
              console.log(`${playerNameToRemove} removed from roster`);
              setPlayerNameToRemove(''); // Clear input field
            })
            .catch((error) => {
              console.error('Error removing player: ', error);
              alert('Error removing player: ', error)
            });
        } else {
          console.error('Player not found in the roster');
          alert('Player not found in the roster')
        }
      }, {
        onlyOnce: true // Ensures the listener is not persistent
      });
    }
  };

  return (
    <div id="redCont">
      <div>
        <input 
          type="text" 
          placeholder="Navn på ny spiller" 
          value={playerNameToAdd} 
          onChange={(e) => setPlayerNameToAdd(e.target.value)} 
        />
        <button id="addPlayer" onClick={handleAddPlayer}>Legg til spiller</button>
      </div>
      <div>
        <input 
          type="text" 
          placeholder="Navn på pensjonert spiller" 
          value={playerNameToRemove} 
          onChange={(e) => setPlayerNameToRemove(e.target.value)} 
        />
        <button id="removePlayer" onClick={handleRemovePlayer}>Slett spiller</button>
      </div>
    </div>
  );
};

export default RedigerSpillere;