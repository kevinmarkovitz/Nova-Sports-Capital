// src/components/KpiGauge.jsx

function KpiGauge({ title, value, tooltip }) {
  const getGaugeProps = () => {
    let percentage, colorClass, label;

    if (title === "Sharpe Ratio") {
      // Scale from 0 to 3
      percentage = Math.min(Math.max(value / 3, 0), 1) * 100;
      if (value >= 2) {
        colorClass = "gauge-excellent";
        label = "Excellent";
      } else if (value >= 1) {
        colorClass = "gauge-good";
        label = "Good";
      } else {
        colorClass = "gauge-poor";
        label = "Poor";
      }
    } else if (title === "Calmar Ratio") {
      // Scale from 0 to 5
      percentage = Math.min(Math.max(value / 5, 0), 1) * 100;
      if (value >= 3) {
        colorClass = "gauge-excellent";
        label = "Excellent";
      } else if (value >= 1) {
        colorClass = "gauge-good";
        label = "Good";
      } else {
        colorClass = "gauge-poor";
        label = "Poor";
      }
    } else {
      return { percentage: 0, colorClass: "gauge-poor", label: "N/A" };
    }

    if (isNaN(value)) {
      percentage = 0;
      colorClass = "gauge-poor";
      label = "N/A";
    }

    return { percentage, colorClass, label };
  };

  const { percentage, colorClass, label } = getGaugeProps();

  return (
    <div className="kpi-gauge-card">
      <div className="kpi-title" title={tooltip}>
        {title} ⓘ
      </div>
      <div className="gauge-container">
        <div className="gauge-bar">
          <div className="gauge-fill-red"></div>
          <div className="gauge-fill-yellow"></div>
          <div className="gauge-fill-green"></div>
        </div>
        <div className="gauge-arrow" style={{ left: `${percentage}%` }}></div>
      </div>
      <div className="gauge-value-container">
        <span className={`gauge-value ${colorClass}`}>
          {isNaN(value) ? "N/A" : value.toFixed(2)}
        </span>
        <span className={`gauge-label ${colorClass}`}>{label}</span>
      </div>
    </div>
  );
}

export default KpiGauge;
