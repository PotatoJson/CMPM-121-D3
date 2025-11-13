// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images
import luck from "./_luck.ts";

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

const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// --- Draw the grid ---
const origin = CLASSROOM_LATLNG;

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
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

    // --- Spawn token logic ---
    // Use luck to decide if a token spawns here
    if (luck([i, j].toString()) < TOKEN_SPAWN_PROBABILITY) {
      // Use luck again (with a different seed) to determine the value
      // We'll make 2s more common than 4s (80% chance for 2)
      const value = luck([i, j, "initialValue"].toString()) < 0.8 ? 2 : 4;

      // Create a text label for the token
      const labelIcon = leaflet.divIcon({
        className: "token-label", // We will style this in style.css
        html: `<b>${value}</b>`, // The text to display
      });

      const label = leaflet.marker(bounds.getCenter(), {
        icon: labelIcon,
      });
      label.addTo(map);
    }
  }
}

console.log("Map initialized!");
