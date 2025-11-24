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
document.body.append(statusPanelDiv);

// Create a dedicated element for text messages
const statusText = document.createElement("div");
statusText.innerHTML = "Welcome! Find and combine tokens.";
statusPanelDiv.append(statusText);

// --- Map Setup ---

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Grid origin (Null Island)
const GRID_ORIGIN = leaflet.latLng(0, 0);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const TOKEN_SPAWN_PROBABILITY = 0.2;

// --- Game State ---
let playerInventory: number | null = null;
let isManualMovementEnabled = true;

const playerState = {
  i: Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES),
  j: Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES),
};

const gridState = new Map<string, CellState>(); // Key: "i,j"
const gridLayerGroup = leaflet.layerGroup();

function updateInventoryUI(value: number | null) {
  playerInventory = value;
  if (playerInventory !== null) {
    inventoryDiv.innerHTML = `Inventory: <b>${playerInventory}</b>`;
  } else {
    inventoryDiv.innerHTML = "Inventory: (empty)";
  }
}

// --- Movement Facade & Geolocation ---

const playerMoveEvent = new EventTarget();

function movePlayerTo(i: number, j: number) {
  const event = new CustomEvent("player-move", { detail: { i, j } });
  playerMoveEvent.dispatchEvent(event);
}

// The "Game Loop" listener for movement
playerMoveEvent.addEventListener("player-move", (event: Event) => {
  const { i, j } = (event as CustomEvent).detail;

  // 1. Update Player State
  playerState.i = i;
  playerState.j = j;

  // 2. Provide UI Feedback
  statusText.innerHTML = `Moved to [${i}, ${j}].`;

  // 3. Redraw & Save
  drawGrid();
  saveGameState();
});

class GeolocationMovement {
  watchId: number | null = null;

  start() {
    if (this.watchId !== null) return;

    console.log("📍 Starting Geolocation tracking...");
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Convert Real-World Lat/Lng to Grid I/J
        const i = Math.floor((lat - GRID_ORIGIN.lat) / TILE_DEGREES);
        const j = Math.floor((lng - GRID_ORIGIN.lng) / TILE_DEGREES);

        // Only move if we actually changed cells
        if (i !== playerState.i || j !== playerState.j) {
          movePlayerTo(i, j);
        }
      },
      (error) => console.error("❌ Geolocation error:", error),
      { enableHighAccuracy: true },
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log("🛑 Stopped Geolocation tracking.");
    }
  }
}

function setCellState(
  i: number,
  j: number,
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
    newLabel.addTo(gridLayerGroup);

    newLabel.on("click", () => {
      handleCellClick(i, j, cellKey, bounds);
    });

    // --- VICTORY CHECK ---
    // (From your plan: check for crafting 8 or 16)
    if (newValue >= 16) {
      console.log(`VICTORY! You crafted a ${newValue} token!`);
      statusText.innerHTML = `VICTORY! You crafted a ${newValue} token!`;
    }
  }

  // 3. Update the state in our Map
  gridState.set(cellKey, { value: newValue, label: newLabel });
}

function handleCellClick(
  i: number,
  j: number,
  cellKey: string,
  bounds: leaflet.LatLngBounds,
) {
  const cell = gridState.get(cellKey);
  if (!cell) return; // Should not happen

  console.log(`Clicked [${cellKey}]. State value is:`, cell.value);

  const distance = Math.max(
    Math.abs(i - playerState.i),
    Math.abs(j - playerState.j),
  );
  if (distance > 1) {
    statusText.innerHTML = "That cell is too far away!";
    return; // Too far, do nothing
  }

  // --- Core Game Logic ---

  if (playerInventory === null) {
    // Cell has a token. Pick it up.
    if (cell.value !== null) {
      statusText.innerHTML = `Picked up ${cell.value}.`;
      updateInventoryUI(cell.value);
      setCellState(i, j, cellKey, null, bounds);
    } // Cell is EMPTY. This is a MOVEMENT click.
    else {
      // Only allow manual movement if enabled!
      if (isManualMovementEnabled) {
        movePlayerTo(i, j);
      } else {
        statusText.innerHTML = "Movement is controlled by GPS.";
      }
    }

    // Inventory is FULL
  } else {
    if (cell.value === playerInventory) {
      const newValue = playerInventory * 2;
      statusText.innerHTML =
        `Combined ${playerInventory} + ${cell.value} = ${newValue}!`;
      setCellState(i, j, cellKey, newValue, bounds);
      updateInventoryUI(null); // Empty inventory
    } // Cell is EMPTY. Place token.
    else if (cell.value === null) {
      statusText.innerHTML = `Placed ${playerInventory}.`;
      setCellState(i, j, cellKey, playerInventory, bounds);
      updateInventoryUI(null); // Empty inventory
    } // Cell has different token. Do nothing.
    else {
      statusText.innerHTML = "Can't combine different tokens!";
    }
  }
  saveGameState();
}

// --- Persistence ---

function saveGameState() {
  const gameState = {
    playerInventory,
    playerState,
    gridState: Array.from(gridState.entries()).map(([key, cell]) => [
      key,
      cell.value,
    ]),
  };
  localStorage.setItem("cmpm121-d3-state", JSON.stringify(gameState));
}

function loadGameState() {
  const saved = localStorage.getItem("cmpm121-d3-state");
  if (saved) {
    const gameState = JSON.parse(saved);

    // Restore inventory
    playerInventory = gameState.playerInventory;
    updateInventoryUI(playerInventory);

    // Restore player state
    playerState.i = gameState.playerState.i;
    playerState.j = gameState.playerState.j;

    // Restore grid state (only values, labels will be recreated by drawGrid)
    gridState.clear();
    gameState.gridState.forEach(([key, value]: [string, number | null]) => {
      gridState.set(key, { value, label: null });
    });
  }
}

// --- Reset Button ---
const resetButton = document.createElement("button");
resetButton.innerHTML = "🚮 Reset Game";
resetButton.style.marginTop = "10px";
resetButton.onclick = () => {
  if (confirm("Are you sure you want to wipe your save?")) {
    localStorage.removeItem("cmpm121-d3-state");
    location.reload();
  }
};
statusPanelDiv.append(document.createElement("br"), resetButton);

function drawGrid() {
  // Clear all old layers (rects, labels, markers)
  gridLayerGroup.clearLayers();

  // gridState.clear();

  const origin = GRID_ORIGIN;

  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      // --- Calculate *actual* grid coordinates ---
      const cell_i = playerState.i + i;
      const cell_j = playerState.j + j;
      const cellKey = `${cell_i},${cell_j}`; // Unique key for our Map

      // Calculate the bounds for cell [cell_i, cell_j]
      const bounds = leaflet.latLngBounds([
        // Southwest corner
        [
          origin.lat + cell_i * TILE_DEGREES,
          origin.lng + cell_j * TILE_DEGREES,
        ],
        // Northeast corner
        [
          origin.lat + (cell_i + 1) * TILE_DEGREES,
          origin.lng + (cell_j + 1) * TILE_DEGREES,
        ],
      ]);

      // Draw the cell rectangle
      const rect = leaflet.rectangle(bounds, {
        color: "#888",
        weight: 1,
        fillOpacity: 0.05,
      });
      rect.addTo(gridLayerGroup);

      if (i === 0 && j === 0) { // This is the player's cell
        const playerCenter = bounds.getCenter();
        const playerMarker = leaflet.marker(playerCenter);
        playerMarker.bindTooltip("That's you!");
        playerMarker.addTo(gridLayerGroup);

        // Center the map view on the player
        map.setView(playerCenter, GAMEPLAY_ZOOM_LEVEL);
      }

      // CHECK FOR (OR CREATE) STATE
      if (!gridState.has(cellKey)) {
        let value: number | null = null;
        if (luck([cell_i, cell_j].toString()) < TOKEN_SPAWN_PROBABILITY) {
          value = luck([cell_i, cell_j, "initialValue"].toString()) < 0.8
            ? 2
            : 4;
        }
        gridState.set(cellKey, { value, label: null });
      }

      const cellState = gridState.get(cellKey)!;
      const value = cellState.value;

      if (value !== null) {
        const labelIcon = leaflet.divIcon({
          className: "token-label",
          html: `<b>${value}</b>`,
        });

        const label = leaflet.marker(bounds.getCenter(), {
          icon: labelIcon,
        });
        label.addTo(gridLayerGroup);

        label.on("click", () => {
          handleCellClick(cell_i, cell_j, cellKey, bounds);
        });

        cellState.label = label;
      }

      rect.on("click", () => {
        handleCellClick(cell_i, cell_j, cellKey, bounds);
      });
    } // End of inner loop (j)
  } // End of outer loop (i)

  // We no longer log player state, as the grid is camera-centric
  // console.log(`Grid drawn at [${playerState.i}, ${playerState.j}]`);
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
  dragging: false,
  touchZoom: false,
  doubleClickZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// --- Setup Grid Layer and Events ---
gridLayerGroup.addTo(map);

// 1. Load Saved State (if any)
loadGameState();

// 2. Determine Movement Mode
const urlParams = new URLSearchParams(globalThis.location.search);
if (urlParams.get("movement") === "geo") {
  console.log("🌍 Geolocation Mode Active");
  isManualMovementEnabled = false;

  // Start the GPS watcher
  const movementSystem = new GeolocationMovement();
  movementSystem.start();
} else {
  console.log("🖱️ Manual Mode Active (Click to move)");
  isManualMovementEnabled = true;
}

// 3. Initial Draw
drawGrid();
