// src/components/FilterControls.jsx
import DatePicker from "react-datepicker";

function FilterControls({
  filters,
  setFilters,
  availableSports,
  availableMarkets,
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters({
      sport: "all",
      market: "all",
      minOdds: "",
      maxOdds: "",
      minEv: "",
      maxEv: "",
      startDate: null,
      endDate: null,
      kelly: "full",
      edgeIncrement: 0.25,
      wagerType: "static",
    });
  };

  return (
    <div className="filter-controls">
      {/* Existing filters... */}
      <div className="filter-group">
        <label htmlFor="filter-sport">Sport</label>
        <select
          id="filter-sport"
          name="sport"
          value={filters.sport}
          onChange={handleInputChange}
        >
          <option value="all">All Sports</option>
          {availableSports.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="filter-market">Market</label>
        <select
          id="filter-market"
          name="market"
          value={filters.market}
          onChange={handleInputChange}
        >
          <option value="all">All Markets</option>
          {availableMarkets.map((market) => (
            <option key={market} value={market}>
              {market}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="filter-minOdds">Min Odds</label>
        <input
          id="filter-minOdds"
          name="minOdds"
          type="number"
          value={filters.minOdds}
          onChange={handleInputChange}
          placeholder="-500"
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-maxOdds">Max Odds</label>
        <input
          id="filter-maxOdds"
          name="maxOdds"
          type="number"
          value={filters.maxOdds}
          onChange={handleInputChange}
          placeholder="+500"
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-minEv">Min Edge %</label>
        <input
          id="filter-minEv"
          name="minEv"
          type="number"
          value={filters.minEv}
          onChange={handleInputChange}
          placeholder="0.5"
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-maxEv">Max Edge %</label>
        <input
          id="filter-maxEv"
          name="maxEv"
          type="number"
          value={filters.maxEv}
          onChange={handleInputChange}
          placeholder="10"
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-startDate">Start Date</label>
        <DatePicker
          selected={filters.startDate}
          onChange={(date) =>
            setFilters((prev) => ({ ...prev, startDate: date }))
          }
          className="date-picker-input"
          placeholderText="MM/DD/YYYY"
          isClearable
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-endDate">End Date</label>
        <DatePicker
          selected={filters.endDate}
          onChange={(date) =>
            setFilters((prev) => ({ ...prev, endDate: date }))
          }
          className="date-picker-input"
          placeholderText="MM/DD/YYYY"
          isClearable
        />
      </div>
      <div className="filter-group">
        <label htmlFor="filter-kelly">Kelly Fraction</label>
        <select
          id="filter-kelly"
          name="kelly"
          value={filters.kelly}
          onChange={handleInputChange}
        >
          <option value="full">Full Kelly</option>
          <option value="half">Half Kelly</option>
          <option value="quarter">Quarter Kelly</option>
        </select>
      </div>
      {/* --- NEW FILTER ADDED HERE --- */}
      <div className="filter-group">
        <label htmlFor="filter-wagerType">Wager Type</label>
        <select
          id="filter-wagerType"
          name="wagerType"
          value={filters.wagerType || "static"}
          onChange={handleInputChange}
        >
          <option value="static">Static</option>
          <option value="dynamic">Dynamic</option>
        </select>
      </div>
      {/* --- NEW FILTER ADDED HERE --- */}
      <div className="filter-group">
        <label htmlFor="filter-edgeIncrement">Edge Increment</label>
        <select
          id="filter-edgeIncrement"
          name="edgeIncrement"
          // Ensure a default value if filters.edgeIncrement is not set yet
          value={filters.edgeIncrement || "0.25"}
          onChange={handleInputChange}
        >
          <option value="0.05">0.05%</option>
          <option value="0.10">0.10%</option>
          <option value="0.25">0.25%</option>
          <option value="0.50">0.50%</option>
          <option value="1.00">1.00%</option>
        </select>
      </div>

      <button onClick={handleReset} className="reset-btn">
        Reset Filters
      </button>
    </div>
  );
}

export default FilterControls;
