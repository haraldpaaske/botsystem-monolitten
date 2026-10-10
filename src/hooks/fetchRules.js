import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

const useRules = () => {

  const [rules, setRules] = useState([]);

  useEffect(() => {
    const rulesRef = ref(db, "/regler/1");

    const unsubscribe = onValue(rulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rulesList = Object.values(data);

        // Sort the rules based on the number
        const sortedRules = rulesList.sort((a, b) => {
          const getRuleNumber = (rule) => {
            const match = rule.match(/§\s*(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };

          const numberA = getRuleNumber(a);
          const numberB = getRuleNumber(b);

          // Sorting logic to move 30 to the end
          if (numberA === 30) return 1; // Move rule 30 to the end
          if (numberB === 30) return -1; // Move rule 30 to the end

          return numberA - numberB; // Regular numerical sort for other numbers
        });

        setRules(sortedRules);
      } else {
        setRules([]); // handle the case where there's no data
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  return rules;
};

export default useRules;