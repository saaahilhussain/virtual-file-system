function BrandMark({
  text = "FileShelter",
  showText = true,
  size = 28,
  className = "",
}) {
  return (
    <div className={`brand-mark ${className}`.trim()}>
      <img
        className="brand-mark-icon"
        src="/filesheltericon.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
      />
      {showText && <span className="brand-mark-text">{text}</span>}
    </div>
  );
}

export default BrandMark;
