# Super Driving Racing Prototype

Original-asset open-world city game prototype (no copyrighted GTA/BMW assets).

## Run
Open `index.html` in a modern browser, or use a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls (Current Playable Milestone)
- **WASD**: Move character on foot
- **Shift**: Run
- **E**: Enter/exit nearby car
- **W/S/A/D** in car: Drive
- **Space** in car: Handbrake
- **Mouse drag**: Rotate camera

## Implemented in this milestone
- Start screen with Start Game button
- Large procedurally tiled city (roads, blocks, buildings, trees, lamps, mall markers, signs)
- Third-person player controller (walk/run)
- Original i8-inspired placeholder sports car + car controls
- Enter/exit car interaction
- Smooth third-person camera
- Clean modular architecture for expansion

## Next milestones
- Traffic cars and pathing
- Pedestrian NPC system
- Weapon wheel + arcade combat
- Mobile phone UI and shops
- Mission system and economy loop
