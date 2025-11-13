# Jayson Boyanich

## D3: World of Bits

## Game Design Vision

A map-based game where players move around, collect tokens from grid cells, and combine identical tokens to craft new ones of double the value.

## Assignments

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Assemble a map-based user interface using Leaflet.
Key gameplay challenge: Allow players to collect and craft tokens from nearby locations.

#### Steps a

- [x] Copy `src/main.ts` to `src/reference.ts` for future reference.
- [x] [cite_start]Delete everything in `src/main.ts`
- [x] Add a basic Leaflet map to `src/main.ts` that centers on the classroom location.
- [x] [cite_start]Add a marker to the map representing the player at the classroom location.
- [x] Figure out how to draw one single `leaflet.rectangle` on the map to represent one grid cell.
- [x] Use loops to draw a grid of cells around the player.
- [x] Use the `luck` function to decide _if_ a cell should have a token and what its _initial value_ is (e.g., 2 or 4).
- [x] Display the token's value as text inside its cell rectangle.
- [x] Create an "inventory" display (a simple `div`) that shows what token the player is holding (or "empty").
- [x] Add a click handler to the grid cells.
- [x] Implement click logic:
  - IF player inventory is "empty":
    - Pick up the token from the clicked cell (cell becomes empty, inventory now holds the token).
  - IF player inventory is _not_ "empty":
    - AND the clicked cell's token _matches_ the inventory token:
      - Combine them! Place a new token of _double the value_ in the cell.
      - Clear the player's inventory.
    - AND the clicked cell is _empty_:
      - Place the inventory token into the cell.
      - Clear the player's inventory.
- [x] Add logic to check if a craft action or pickup created a token of value 16 (or 8) and log a "victory" message.
- [x] Add a "proximity check" so that clicks only work on cells near the player.

### D3.b: Player Movement

Key technical challenge: Make the map and grid respond to player movement.
Key gameplay challenge: Allow the player to explore and find new tokens.

#### Steps b

- [x] Create a "player state" object to hold the player's `i` and `j` grid coordinates (starting at `0, 0`).
- [x] Add `click` handlers to the four main grid rectangles adjacent to the player (N, S, E, W).
- [x] When an adjacent cell is clicked:
  - IF the cell is empty (no token):
    - Update the player's `i, j` coordinates to match the clicked cell.
    - "Re-center" the grid by:
      - Deleting all existing grid cells and tokens.
      - Re-running the grid-drawing loops, but using the _new_ player `i, j` as the origin.
      - (This will make new, unexplored cells appear at the edges).
- [x] Update the `handleCellClick` proximity check to use the new player `i, j` state instead of just `[0, 0]`.
- [x] Update the map's "view" (camera) to follow the player marker.

### D3.c: Persistent State & Global Coordinates

Key technical challenge: Refactor the grid-spawning logic to use a persistent `gridState` (fixing the "memoryless"-by-design behavior from D3.b) and anchor the world grid to Null Island (0,0).

Key gameplay challenge: Ensure the player starts at the classroom location, even though the grid is anchored at (0,0), and that cells now correctly remember their state (e.g., if a token has been picked up, it stays picked up).

#### Steps c

- [ ] In `src/main.ts`, change the `CLASSROOM_LATLNG` constant to `GRID_ORIGIN` and set it to `leaflet.latLng(0, 0)`.
- [ ] Create a _new_ constant, `const CLASSROOM_LATLNG = leaflet.latLng(36.997936938057016, -122.05703507501151);`, to use as a starting position.
- [ ] Update all grid calculation logic (in `drawGrid` and `handleCellClick`) to use `GRID_ORIGIN` as the anchor instead of the classroom constant.
- [ ] Update the initial `playerState` object to hold the grid coordinates of the classroom _relative to Null Island_.
  - `i: Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES)`
  - `j: Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES)`
- [ ] Update the initial `map` center in `leaflet.map()` to use `CLASSROOM_LATLNG`, so the camera starts on the player.
- [ ] Update the `playerMarker` creation to use the _classroom's coordinates_, not the grid origin's.
- [ ] In `drawGrid()`, remove the `gridState.clear()` line. This will re-enable persistent memory, and the `!gridState.has(cellKey)` check will now correctly "discover" and save cell states permanently.
