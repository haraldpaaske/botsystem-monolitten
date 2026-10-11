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

        // Alphabetize by the rule text, ignoring the paragraph number prefix.
        const ruleText = (rule) => rule.replace(/^\s*§\s*\d+[a-zæøå]?\s*[.):-]?\s*/i, "").trim();
        const sortedRules = rulesList.sort((a, b) =>
          ruleText(a).localeCompare(ruleText(b), "nb", { sensitivity: "base" })
        );

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