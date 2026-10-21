# The Playable Spaces kit (read this, not the kit source)

A new space is one config file. The kit builds everything else: renderer, light, camera, materials, the UI, share links.

## Folders

| Folder | What lives there | Touch it when |
|---|---|---|
| `rooms/<id>/room.js` | One space: shell, materials, moods, furniture layout, camera | Every new space |
| `products/` | Every piece a space can place. `standins.js` holds the generic pieces from the first flat; each real product gets its own file | A new product |
| `kit/` | The engine (`app.js`, `shell.js`, `materials.js`, `textures.js`, `daylight.js`, `studio.js`, `util.js`) | Only when the kit itself changes |

Open a space with `?room=<id>` (for example `playablespaces.vercel.app/?room=studio`). No parameter opens `studio`.

## The room config

Copy `rooms/studio/room.js` and change the numbers. Units are metres; x runs left to right, z runs back (negative) to front (positive), y is up, the floor is y = 0. Walls are named `left` (x = x0), `right` (x = x1), `back` (z = z0) and `front` (z = z1).

| Key | What it is |
|---|---|
| `title`, `plinth.label` | Name of the space and the text on the front of the plinth |
| `shell.x0 x1 z0 z1 height thick low` | Floor rectangle, wall height, wall thickness, height of low walls |
| `shell.walls[]` | One per side: `side`, `tall` (full height, otherwise low so the camera sees in), `slot` (which material slot paints it: `wallL` or `wallB`), `windows[]`, `doors[]` |
| window | `from`, `to` (along the wall), `y0`, `y1` (sill and head height), `mullions` (vertical bars), `transom` (a horizontal bar as a fraction of the height), `curtains` (`['start']`, `['end']` or both) |
| door | `from`, `to`, `h` (head height on a tall wall, default 2.1), `mat: true` for a doormat |
| `shell.partitions` | `height`, `thick`, and `list[]` of runs: `{ x, z: [from, to], doors }` runs along z at that x; `{ z, x: [from, to], doors }` runs along x at that z. `doors` is a list of `[from, to]` gaps |
| `shell.slatWall` | Optional battens: `{ side, from, to }` |
| `shell.hang[]` | Where shelves and prints can hang, on the left or back wall: `{ side, from, to, inset, name }`. Share links store a wall piece by its number in this list, so only ever append |
| `start`, `moods` | The mood a visitor lands on, and each mood: `name`, `note`, `h` (hour of day), `mats` (a material id per slot) |
| `layout[]` | `[product, x, z, rotation degrees]` on the floor, `[product, hang index, along, height]` on a wall |
| `camera.home`, `camera.shots[]` | The landing view (`target`, `yaw`, `pitch`, `dist`) and the cinematic shots. On a tall phone screen the kit backs the camera off by itself |
| `notes` | The floating swatch cards: `y`, `z`, and `cards[]` of `[slot, x]` |
| `materials`, `onlyRoomMaterials` | The room's own samples (its Wada palette, each with its `combo` number) and whether the swatch tray shows only those |
| `furniture` | The pieces the Furniture tab offers in this room (default: every piece) |
| `anchors` | A point on each slot, `[x, y, z]`, or `{ piece: [ids], at: [x, y, z], or: [x, y, z] }` to follow a product wherever it is moved |

## Products

A real product is one file in `products/`, added with `addProduct()` from `products/index.js`:

```js
export default {
  id: 'store-sofa-name',
  name: 'Name as the store sells it',
  store: 'Store name', url: 'product page', price: 'as listed, with the date checked',
  dims: { w: 84, d: 36, h: 32, unit: 'in' },   // from the listing, never guessed (units: m, cm, mm, in, ft)
  ref: 'products/ref/store-sofa-name.jpg',      // the store photo it is compared against
  parts: { upholstery: 'fabric', legs: 'wood' },
  variants: { upholstery: ['boucle-cream', 'linen-oat'] },  // only colours the store really sells
  build() { /* returns a THREE.Group built around the origin, at real size, facing +z */ },
};
```

Check a new product alone on `kit/turntable.html?id=<id>&yaw=30&pitch=8` (add `&part=upholstery&v=Red` for a colour); the label prints the built size next to the listed size. The page is local only (kept off Vercel).

`addProduct` turns `dims` into the footprint and height the kit uses for snapping and collisions. Product ids are appended to `PIECE_ORDER`, which share links also depend on, so ids are never removed or reordered.

## Rules

0. **Design rules, locked:** every space colour comes from Wada's *A Dictionary of Color Combinations* (data: mattdesl/dictionary-of-colour-combinations `colors.json`), with the combination number noted in the config; and every space is designed around its products from 3 to 5 real interior references recorded in `rooms/<id>/design.md`, never by reusing another room. Full text in `House Walkthrough/INTERIOR_SPACES.md`.

1. A new space touches only `rooms/<id>/` and any new `products/` files.
2. Check every new space on a desktop and at 375 px wide before it ships.
3. UI stays in the locked brand (`style.css`); never copy another site's UI.
