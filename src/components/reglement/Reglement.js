import { useState, useRef, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { ref, onValue, set, off, push, get, remove } from "firebase/database";
import "./regStyles.css";

const Reglement = (props) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef(null);
  const [content, setContent] = useState("");
  const [newRule, setNewRule] = useState(""); // State for the new rule input field

  useEffect(() => {
    const dbRef = ref(db, "regler/0");

    const handleDataChange = (snapshot) => {
      if (snapshot && snapshot.val() && snapshot.val().text) {
        setContent(snapshot.val().text);
      }
    };

    onValue(dbRef, handleDataChange);

    // Cleanup
    return () => {
      off(dbRef, handleDataChange);
    };
  }, []);

  const saveContent = async () => {
    const newContent = contentRef.current.innerHTML;
    setIsEditing(false);

    // Update the content state immediately
    setContent(newContent);

    // Update the content in the database
    await updateContent(newContent);
  };

  const updateContent = async (newContent) => {
    try {
      await set(ref(db, "regler/0"), { text: newContent });
      console.log("Content saved:", newContent);
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  const insertElements = () => {
    const currentHTML = contentRef.current.innerHTML;
    const newHTML = `
      ${currentHTML}
      <h2>§ New Paragraph</h1>
      <p>New Paragraph</p>
      <ul>
        <li>Bullet Point 1</li>
      </ul>
    `;
    contentRef.current.innerHTML = newHTML;
  };

  const saveNewRule = async () => {
    try {
      if (newRule.trim() !== '') {
        // Get a reference to the 'regler/1' path
        const rulesRef = ref(db, '/regler/1');
  
        // Generate a new unique key for the new rule
        const newRuleRef = push(rulesRef);
  
        // Save the new rule content directly under the generated key
        await set(newRuleRef, newRule);
  
        console.log(`${newRule} added to regler/1`);
  
        // Optionally, clear the input field or update UI state here
        setNewRule('');  // Clear the input field after adding the rule
  
      } else {
        console.error("New rule content is empty.");
      }
    } catch (error) {
      console.error('Error adding rule: ', error);
      alert('Error adding rule: ', error);
    }
  };

  const deleteRule = async () => {
    try {
      if (newRule.trim() === '') {
        alert('Skriv inn navnet på paragrafen du vil slette.');
        return;
      }
  
      // Reference to the 'regler/1' path
      const rulesRef = ref(db, '/regler/1');
  
      // Fetch all rules
      const snapshot = await get(rulesRef);
      if (!snapshot.exists()) {
        alert('Ingen paragrafer funnet i systemet.');
        return;
      }
  
      const rules = snapshot.val();
      const userInput = newRule.trim(); // Get the user's input
  
      // Find the matching rule key
      const ruleKey = Object.keys(rules).find(key => {
        const ruleName = rules[key];
    
        // Match the full rule (with parentheses) or just the main part (without parentheses)
        // Remove any trailing parentheses from the rule name for comparison purposes
        const cleanedRuleName = ruleName.replace(/\s*\(.*\)$/, '').trim(); // Remove anything after the parentheses
        
        // Match either the full rule or just the main identifier part
        return ruleName === userInput || cleanedRuleName === userInput;
      });
  
      if (ruleKey) {
        const confirmDelete = window.confirm(`Er du sikker på at du vil slette paragraf "${rules[ruleKey]}"?`);
        if (confirmDelete) {
          // Delete the rule
          await remove(ref(db, `/regler/1/${ruleKey}`));
          alert(`Paragraf "${rules[ruleKey]}" er slettet.`);
          setNewRule(''); // Clear the input field
        }
      } else {
        alert(`Paragraf "${newRule}" eksisterer ikke.`);
      }
    } catch (error) {
      console.error('Error deleting rule: ', error);
      alert('Error deleting rule: ', error.message);
    }
  };

  return (
    <>
    {isEditing ? (
      <button onClick={saveContent}>Save</button>
    ):(
      <>
      {props.botsjef && (
        <button onClick={() => setIsEditing(true)}>Rediger</button>
      )}
      </>
    )}
      <div className="reglement">
        {isEditing ? (
          <div>
            <div
              ref={contentRef}
              contentEditable={true}
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <button onClick={saveContent}>Save</button><br/><br/>
            {isEditing && (
              <>
                <button onClick={insertElements}>Legg til paragraf</button><br/><br/>
                
                <input
                  id="newRule"  
                  placeholder="§ 3 Forfall til trening (1-3)"
                  value={newRule} // Bind the input value to the state
                  onChange={(e) => setNewRule(e.target.value)} // Update the state on input change
                /><br/>
                <button onClick={saveNewRule}>Legg til paragraf i systemet</button>
                <button onClick={deleteRule}>Slett paragraf</button><br/>
                
              </>
            )}
          </div>
        ) : (
          <div>
            <div dangerouslySetInnerHTML={{ __html: content }} />
            {props.botsjef && (
              <button onClick={() => setIsEditing(true)}>Rediger</button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Reglement;