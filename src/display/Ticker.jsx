export default function Ticker({ text }) {
  // Duplicate text to create seamless loop
  const tickerItems = [text, text, text, text];

  return (
    <div className="display-ticker">
      <div className="ticker-label">
        <span>📢</span> PENGUMUMAN
      </div>
      <div className="ticker-scroll-wrap">
        <div className="ticker-content">
          {tickerItems.map((item, index) => (
            <span key={index}>
              {item}
              <span className="ticker-separator"> • </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
