import { useNavigate } from "react-router-dom";

function Breadcrumb({ trail }) {
  const navigate = useNavigate();

  function handleClick(id) {
    if (id === null) {
      navigate("/");
    } else {
      navigate(`/directory/${id}`);
    }
  }

  return (
    <nav className="breadcrumb">
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={item.id ?? "root"} className="breadcrumb-entry">
            {index > 0 && <span className="breadcrumb-separator">›</span>}
            {isLast ? (
              <span className="breadcrumb-current">{item.name}</span>
            ) : (
              <button
                className="breadcrumb-item"
                onClick={() => handleClick(item.id)}
                type="button"
              >
                {item.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
