import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick


def analyze_drawdowns_and_roi_edge_correlation(picks_file_path):
    """
    Analyzes betting picks to generate a cumulative P/L (units) chart
    to visualize performance and drawdowns, and calculates the ROI-edge correlation.

    Args:
        picks_file_path (str): The path to the system_picks.json file.
    """
    try:
        # Read the JSON file into a pandas DataFrame
        picks = pd.read_json(picks_file_path)
    except FileNotFoundError:
        print(f"Error: The file {picks_file_path} was not found.")
        return
    except ValueError:
        print(
            f"Error: Could not decode JSON from {picks_file_path}. The file might be empty or corrupt."
        )
        return

    # Filter for only graded picks
    graded_picks = picks[picks["result"].notna()].copy()

    if graded_picks.empty:
        print("No graded picks found to analyze.")
        return

    # --- 1. Cumulative P/L and Drawdown Analysis ---
    # Sort picks by game time to get a correct timeline
    graded_picks.sort_values(by="gameTime", inplace=True)

    # Define bankroll to calculate units
    bankroll = 10000
    graded_picks["units"] = graded_picks["pnl_full"] / (bankroll / 100)

    # Calculate the running total of units won/lost
    graded_picks["cumulative_units"] = graded_picks["units"].cumsum()

    # Calculate the running maximum and the drawdown from that peak
    running_max = graded_picks["cumulative_units"].cummax()
    drawdown = running_max - graded_picks["cumulative_units"]
    max_drawdown = drawdown.max()

    # Create the plot
    plt.style.use("seaborn-v0_8-darkgrid")
    fig, ax = plt.subplots(figsize=(12, 7))

    ax.plot(
        graded_picks["gameTime"],
        graded_picks["cumulative_units"],
        label="Cumulative Units Won/Lost",
        color="royalblue",
        linewidth=2,
    )

    # Shade the area representing drawdowns
    ax.fill_between(
        graded_picks["gameTime"],
        graded_picks["cumulative_units"],
        running_max,
        where=(graded_picks["cumulative_units"] < running_max),
        color="indianred",
        alpha=0.3,
        label="Drawdown",
    )

    ax.set_title(
        "Cumulative Performance & Bankroll Drawdowns", fontsize=16, fontweight="bold"
    )
    ax.set_xlabel("Date of Bet", fontsize=12)
    ax.set_ylabel("Units", fontsize=12)
    ax.legend()
    fig.autofmt_xdate()

    # Display the max drawdown in a text box on the chart
    props = dict(boxstyle="round", facecolor="wheat", alpha=0.5)
    ax.text(
        0.05,
        0.95,
        f"Max Drawdown: {max_drawdown:.2f} Units",
        transform=ax.transAxes,
        fontsize=12,
        verticalalignment="top",
        bbox=props,
    )

    plt.savefig("cumulative_performance_chart.png")
    print("Generated cumulative_performance_chart.png")

    # --- 2. ROI with Edge Correlation Analysis ---
    # Calculate ROI for each pick
    graded_picks["roi"] = graded_picks["pnl_full"] / graded_picks["wager_full"]

    # Calculate the correlation between the 'edge' and 'roi' columns
    correlation = graded_picks["edge"].corr(graded_picks["roi"])

    # Save the correlation result to a CSV file
    correlation_summary = pd.DataFrame(
        {"Metric": ["Edge vs. ROI Correlation"], "Value": [correlation]}
    )

    correlation_summary.to_csv("correlation_analysis.csv", index=False)
    print("Generated correlation_analysis.csv")
    print(f"\nCorrelation between Edge and ROI: {correlation:.4f}")

    if correlation > 0:
        print(
            "This positive correlation is a good sign, suggesting that a higher calculated edge generally leads to a higher return on investment."
        )
    else:
        print(
            "This non-positive correlation may indicate that the edge calculation is not yet effectively predicting profitability."
        )


# --- How to Run ---
# Make sure your system_picks.json file is in the same directory
# and then call the function.
analyze_drawdowns_and_roi_edge_correlation("system_picks.json")
