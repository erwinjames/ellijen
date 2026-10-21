# Elli & Jen — wedding site + RSVP admin

Next.js 16 · Three.js + GSAP public site · Firebase (Firestore + Auth) · Tailwind 4

## Routes

| Route          | What                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `/`            | Invitation: 3D envelope → tap to open → music → full site (story, countdown, details, program, entourage, dress code, gallery, FAQ, gifts, travel, RSVP) |
| `/admin/login` | Email/password sign-in (Firebase Auth)                               |
| `/admin`       | Live RSVP list, yes/no/headcount stats, search, CSV export, delete   |

## Setup

1. **Firebase project** → Build → *Firestore Database* (production mode) and *Authentication* → enable **Email/Password**.
2. Authentication → Users → **Add user** for each admin (the couple). There is no sign-up page on purpose.
3. Project settings → Your apps → Web app → copy the config into `.env.local`:

   ```bash
   cp .env.local.example .env.local   # then fill in the NEXT_PUBLIC_FIREBASE_* values
   ```

4. Deploy the security rules (guests can only *create* a well-formed RSVP; only signed-in users can read/delete):

   ```bash
   npx firebase-tools login
   npx firebase-tools use <project-id>
   npx firebase-tools deploy --only firestore:rules
   ```

   Or paste `firestore.rules` into Firestore → Rules in the console.

5. Run it:

   ```bash
   npm run dev
   ```

## Public flow

1. **Envelope**: a 3D sealed envelope floats on screen; scrolling is locked. Tap anywhere (or the button).
2. **Opening**: the wax seal pops, the flap lifts, the invitation card slides out toward the camera, the envelope falls away and the gold rings bloom in.
3. **Music**: the "old disk" (bottom-right vinyl) starts on that tap and is the play/pause control. Put a track at `public/audio/song.mp3` and set `songUrl` in `lib/wedding.ts`; with no file a built-in music-box tune with vinyl crackle plays.
4. **Story mode**: scroll unlocks. Each section is a chapter (`data-chapter`) and whichever one is on screen drives the 3D scene: the rings part and hide behind the photo for "how we met", converge and glow for "the proposal", lie flat under a top-down camera for details, pull back with rising sparkles for the countdown, and close in warm for RSVP. Every chapter pairs a photo (with scroll parallax) and text, and runs its own GSAP entrance (slide, flip, pop).

5. **The rest of the site** follows in order: countdown, when & where with the order of the day, entourage (parents, principal and secondary sponsors, maid of honor, best man, bridesmaids, groomsmen, bearers, flower girls), dress code with colour palette, gallery, FAQ, gifts, travel & stay, then RSVP. A top nav appears once the envelope is open. Every section is a 3D chapter and has its own entrance animation.

**Photos**: story chapters point at `public/story/1.jpg`–`3.jpg`, the gallery at `public/gallery/1.jpg`–`6.jpg`, and any entourage member can take `image: "/entourage/name.jpg"`. Until a file exists its frame shows a labelled photo slot (picture icon + the path to drop the file at). Add the photos and reload; nothing else to change.

## Customise

- Names, date, venue, RSVP deadline, hashtag, max guests: [`lib/wedding.ts`](lib/wedding.ts).
- All content (names, date, venue, story chapters, program, entourage, dress code & palette, gallery paths, FAQ, gifts, travel): [`lib/wedding.ts`](lib/wedding.ts). Section layout: [`app/page.tsx`](app/page.tsx).
- 3D state per section: `CHAPTERS` in [`components/scene/WeddingScene.ts`](components/scene/WeddingScene.ts), keyed by each section's `data-chapter`.
- Envelope / letter card look: [`components/scene/envelope.ts`](components/scene/envelope.ts). Music-box tune: [`lib/music.ts`](lib/music.ts).
- Colours and fonts: `@theme` block in [`app/globals.css`](app/globals.css).
- 3D scene (lights, rings, particles, petals, post-processing): [`components/scene/WeddingScene.ts`](components/scene/WeddingScene.ts). Set `ringsModelUrl` in `lib/wedding.ts` to a GLB under `public/` to replace the procedural rings.

## Checks

```bash
npm run lint
npx tsc --noEmit
node --test lib/rsvp-utils.test.ts
npm run build
```

Note: `firebase@13` declares `node >= 24.12` in its engines field. It builds and runs on Node 22 (the SDK is browser code), but use Node 24 in CI/hosting to silence the warning.
