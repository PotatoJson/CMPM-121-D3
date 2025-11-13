// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images
import luck from "./_luck.ts";

// Define a type for our cell state
type CellState = {
  value: number | null;
  label: leaflet.Marker | null;
};

// --- UI Setup ---
const inventoryDiv = document.createElement("div");
inventoryDiv.id = "inventory";
inventoryDiv.innerHTML = "Inventory: (empty)";
document.body.append(inventoryDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
statusPanelDiv.innerHTML = "Welcome! Find and combine tokens.";
document.body.append(statusPanelDiv);

// --- Map Setup ---

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const TOKEN_SPAWN_PROBABILITY = 0.2;

// --- Game State ---
let playerInventory: number | null = null;
const gridState = new Map<string, CellState>(); // Key: "i,j"

function updateInventoryUI(value: number | null) {
  playerInventory = value;
  if (playerInventory !== null) {
    inventoryDiv.innerHTML = `Inventory: <b>${playerInventory}</b>`;
  } else {
    inventoryDiv.innerHTML = "Inventory: (empty)";
  }
}

/**
 * Updates a cell's state, removes its old label, and creates a new one.
 */
function setCellState(
  cellKey: string,
  newValue: number | null,
  bounds: leaflet.LatLngBounds,
) {
  const currentState = gridState.get(cellKey);
  if (!currentState) return; // Should never happen

  // 1. Remove old label (if it exists)
  if (currentState.label) {
    currentState.label.remove();
  }

  // 2. Create new label (if value is not null)
  let newLabel: leaflet.Marker | null = null;
  if (newValue !== null) {
    const labelIcon = leaflet.divIcon({
      className: "token-label",
      html: `<b>${newValue}</b>`,
    });

    newLabel = leaflet.marker(bounds.getCenter(), {
      icon: labelIcon,
    });
    newLabel.addTo(map);

    // --- VICTORY CHECK ---
    // (From your plan: check for crafting 8 or 16)
    if (newValue >= 8) {
      console.log(`VICTORY! You crafted a ${newValue} token!`);
      statusPanelDiv.innerHTML = `VICTORY! You crafted a ${newValue} token!`;
    }
  }

  // 3. Update the state in our Map
  gridState.set(cellKey, { value: newValue, label: newLabel });
}

/**
 * This function is called when any grid cell is clicked.
 * It contains the core game logic.
 */
function handleCellClick(
  i: number,
  j: number,
  cellKey: string,
  bounds: leaflet.LatLngBounds,
) {
  const cell = gridState.get(cellKey);
  if (!cell) return; // Should not happen

  console.log(`Clicked [${cellKey}]. State value is:`, cell.value);

  // --- Proximity Check (from your plan) ---
  // We'll define "nearby" as 1 cell away (distance of 1)
  const distance = Math.max(Math.abs(i), Math.abs(j));
  if (distance > 1) {
    statusPanelDiv.innerHTML = "That cell is too far away!";
    return; // Too far, do nothing
  }

  // --- Core Game Logic ---

  // Case 1: Inventory is EMPTY
  if (playerInventory === null) {
    // 1a: Cell has a token. Pick it up.
    if (cell.value !== null) {
      statusPanelDiv.innerHTML = `Picked up ${cell.value}.`;
      updateInventoryUI(cell.value);
      setCellState(cellKey, null, bounds);
    }
    // 1b: Cell is empty. Do nothing.

    // Case 2: Inventory is FULL
  } else {
    // 2a: Cell has matching token. Combine!
    if (cell.value === playerInventory) {
      const newValue = playerInventory * 2;
      statusPanelDiv.innerHTML =
        `Combined ${playerInventory} + ${cell.value} = ${newValue}!`;
      setCellState(cellKey, newValue, bounds);
      updateInventoryUI(null); // Empty inventory
    } // 2b: Cell is EMPTY. Place token.
    else if (cell.value === null) {
      statusPanelDiv.innerHTML = `Placed ${playerInventory}.`;
      setCellState(cellKey, playerInventory, bounds);
      updateInventoryUI(null); // Empty inventory
    } // 2c: Cell has different token. Do nothing.
    else {
      statusPanelDiv.innerHTML = "Can't combine different tokens!";
    }
  }
}

// Create the map div
const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

// Create the map
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// --- Draw the grid ---
const origin = CLASSROOM_LATLNG;

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    const cellKey = `${i},${j}`; // Unique key for our Map

    // Calculate the bounds for cell [i, j]
    const bounds = leaflet.latLngBounds([
      // Southwest corner
      [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
      // Northeast corner
      [
        origin.lat + (i + 1) * TILE_DEGREES,
        origin.lng + (j + 1) * TILE_DEGREES,
      ],
    ]);

    // Draw the cell rectangle
    const rect = leaflet.rectangle(bounds, {
      color: "#888", // Make the grid lines a bit lighter
      weight: 1,
      fillOpacity: 0.05,
    });
    rect.addTo(map);

    // --- Center player marker in [0, 0] cell ---
    if (i === 0 && j === 0) {
      const playerMarker = leaflet.marker(bounds.getCenter());
      playerMarker.bindTooltip("That's you!");
      playerMarker.addTo(map);
    }

    // --- Initialize Cell State ---
    let value: number | null = null;
    let label: leaflet.Marker | null = null;

    // --- Spawn token logic ---
    if (luck([i, j].toString()) < TOKEN_SPAWN_PROBABILITY) {
      // Use luck again (with a different seed) to determine the value
      value = luck([i, j, "initialValue"].toString()) < 0.8 ? 2 : 4;

      // Create a text label for the token
      const labelIcon = leaflet.divIcon({
        className: "token-label", // We will style this in style.css
        html: `<b>${value}</b>`, // The text to display
      });

      label = leaflet.marker(bounds.getCenter(), {
        icon: labelIcon,
      });
      label.addTo(map);

      label.on("click", () => {
        handleCellClick(i, j, cellKey, bounds);
      });
    }

    // --- (CRITICAL FIX) Store state and add click handler ---
    // These two lines MUST come *after* the spawn logic
    gridState.set(cellKey, { value, label });

    rect.on("click", () => {
      handleCellClick(i, j, cellKey, bounds);
    });
    // --- End of critical fix ---
  } // End of inner loop (j)
} // End of outer loop (i)

console.log("Map initialized!");
