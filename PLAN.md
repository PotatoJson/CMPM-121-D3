# Jayson Boyanich

## D3: World of Bits

## Game Design Vision

A map-based game where players move around, collect tokens from grid cells, and combine identical tokens to craft new ones of double the value.

## Assignments

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Assemble a map-based user interface using Leaflet.
Key gameplay challenge: Allow players to collect and craft tokens from nearby locations.

#### Steps

- [x] Copy `src/main.ts` to `src/reference.ts` for future reference.
- [x] [cite_start]Delete everything in `src/main.ts`
- [x] Add a basic Leaflet map to `src/main.ts` that centers on the classroom location.
- [ ] [cite_start]Add a marker to the map representing the player at the classroom location.
- [ ] Figure out how to draw one single `leaflet.rectangle` on the map to represent one grid cell.
- [ ] Use loops to draw a grid of cells around the player.
- [ ] Use the `luck` function to decide _if_ a cell should have a token and what its _initial value_ is (e.g., 2 or 4).
- [ ] Display the token's value as text inside its cell rectangle.
- [ ] Create an "inventory" display (a simple `div`) that shows what token the player is holding (or "empty").
- [ ] Add a click handler to the grid cells.
- [ ] Implement click logic:
  - IF player inventory is "empty":
    - Pick up the token from the clicked cell (cell becomes empty, inventory now holds the token).
  - IF player inventory is _not_ "empty":
    - AND the clicked cell's token _matches_ the inventory token:
      - Combine them! Place a new token of _double the value_ in the cell.
      - Clear the player's inventory.
    - AND the clicked cell is _empty_:
      - Place the inventory token into the cell.
      - Clear the player's inventory.
- [ ] Add logic to check if a craft action or pickup created a token of value 16 (or 8) and log a "victory" message.
- [ ] Add a "proximity check" so that clicks only work on cells near the player.
