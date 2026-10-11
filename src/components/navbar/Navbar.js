import { Link } from "react-router-dom";
import "./navStyles.css";
const Navbar = () => {
  return (
    <>
      <div className="navbar">
        <Link to="/oversikt">
          <button>botoversikt</button>
        </Link>
        <Link to="/melding">
          <button>melding av bøter</button>
        </Link>
        <Link to="/reglement">
          <button>botreglement</button>
        </Link>
        <Link to="/arkiv">
          <button>arkiv</button>
        </Link>
      </div>
    </>
  );
};

export default Navbar;
