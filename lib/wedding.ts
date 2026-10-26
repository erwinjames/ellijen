// Single source of truth for the couple's details. Edit this file only.
type Person = { name: string; note?: string; image?: string };

export const wedding = {
  couple: { a: "Elijah", b: "Jennifer" },
  // Couple logo pressed into the wax seal, e.g. "/logo.png" under public/ (dark artwork on a transparent background). Empty = initials.
  sealLogo: "" as string,
  // ISO date-time of the ceremony (local time of the venue).
  date: "2027-06-12T15:00:00+08:00",
  venue: {
    name: "The Glass Pavilion",
    address: "Tagaytay, Cavite, Philippines",
    mapsUrl: "https://maps.google.com/?q=Tagaytay",
  },
  rsvpDeadline: "2027-05-01",
  // Order of the day.
  program: [
    { time: "2:30 PM", title: "Guests arrive", note: "Welcome drinks at the garden entrance." },
    { time: "3:00 PM", title: "Ceremony", note: "The Glass Pavilion. Please be seated by 2:50." },
    { time: "4:30 PM", title: "Cocktails & photos", note: "Canapés on the terrace while we take portraits." },
    { time: "6:00 PM", title: "Reception", note: "Dinner, toasts, first dance." },
    { time: "10:00 PM", title: "Send-off", note: "Sparklers at the driveway." },
  ],
  // Entourage. Add `image: "/entourage/name.jpg"` to any person to show a photo instead of initials.
  entourage: [
    { role: "Parents of the Bride", people: [{ name: "Mr. Roberto Santos" }, { name: "Mrs. Lourdes Santos" }] },
    { role: "Parents of the Groom", people: [{ name: "Mr. Antonio Reyes" }, { name: "Mrs. Carmen Reyes" }] },
    {
      role: "Principal Sponsors",
      people: [
        { name: "Mr. & Mrs. Delgado" },
        { name: "Mr. & Mrs. Villanueva" },
        { name: "Mr. & Mrs. Castillo" },
        { name: "Mr. & Mrs. Mercado" },
      ],
    },
    { role: "Maid of Honor", people: [{ name: "Patricia Santos" }] },
    { role: "Best Man", people: [{ name: "Miguel Reyes" }] },
    { role: "Bridesmaids", people: [{ name: "Andrea Cruz" }, { name: "Bianca Lim" }, { name: "Celine Tan" }, { name: "Diana Ramos" }] },
    { role: "Groomsmen", people: [{ name: "Carlo Bautista" }, { name: "Dennis Ocampo" }, { name: "Francis Dela Cruz" }, { name: "Gabriel Torres" }] },
    {
      role: "Secondary Sponsors",
      people: [
        { name: "Hannah & Joshua Perez", note: "Candle" },
        { name: "Isabel & Marco Flores", note: "Veil" },
        { name: "Nicole & Paulo Garcia", note: "Cord" },
      ],
    },
    { role: "Ring Bearer", people: [{ name: "Lucas Santos" }] },
    { role: "Coin Bearer", people: [{ name: "Noah Reyes" }] },
    { role: "Bible Bearer", people: [{ name: "Ethan Cruz" }] },
    { role: "Flower Girls", people: [{ name: "Sofia Lim" }, { name: "Mia Tan" }] },
  ] as { role: string; people: Person[] }[],
  dressCode: {
    title: "Formal attire",
    note: "Gentlemen in suits or barong, ladies in long gowns. We would love to see you in our colours.",
    palette: [
      ["Champagne gold", "#e8c069"],
      ["Wine", "#7a2a52"],
      ["Midnight", "#1b1033"],
      ["Ivory", "#f5ead9"],
    ],
  },
  // Drop photos at these paths under public/ (missing files show a photo slot).
  gallery: ["/gallery/1.jpg", "/gallery/2.jpg", "/gallery/3.jpg", "/gallery/4.jpg", "/gallery/5.jpg", "/gallery/6.jpg"],
  faq: [
    { q: "Can I bring a plus one?", a: "Seats are reserved for the names on your invitation. If your invite says 'and guest', yes! Add them in the RSVP." },
    { q: "Are children welcome?", a: "We love your little ones, but the ceremony and reception are adults-only except for the children in our entourage." },
    { q: "Is there parking?", a: "Yes, free parking at the venue. A shuttle also runs from the hotels below from 1:30 PM." },
    { q: "What if it rains?", a: "The pavilion is covered, so the day goes on rain or shine." },
    { q: "Can I take photos during the ceremony?", a: "We ask for an unplugged ceremony. Our photographers will share everything after. Snap away at the reception!" },
  ],
  gifts: {
    note: "Your presence is the greatest gift. Should you wish to give more, a contribution to our new home would mean the world.",
    registryUrl: "",
  },
  travel: {
    note: "Tagaytay is about 90 minutes from Manila. We recommend staying the night.",
    stays: [
      { name: "Taal Vista Hotel", note: "10 min from the venue · shuttle pickup", url: "https://www.taalvistahotel.com" },
      { name: "Escala Tagaytay", note: "15 min from the venue", url: "https://www.escalatagaytay.com" },
      { name: "Anya Resort", note: "20 min from the venue", url: "https://www.anyaresorts.com" },
    ],
  },
  hashtag: "#ElliAndJen",
  // Story chapters shown after the envelope opens. Drop photos at these paths under public/ (missing files show a photo slot).
  story: [
    {
      key: "met",
      year: "2019",
      title: "How we met",
      text: "A rainy Tuesday, a shared umbrella, and a coffee that turned into three hours of talking.",
      image: "/story/1.jpg",
    },
    {
      key: "growing",
      year: "2021",
      title: "Growing together",
      text: "Road trips, burnt dinners, moving boxes, and a thousand small ordinary days that became our favourite ones.",
      image: "/story/2.jpg",
    },
    {
      key: "proposal",
      year: "2025",
      title: "The proposal",
      text: "Under the same sky we first walked beneath, one knee, two rings, and a very loud yes.",
      image: "/story/3.jpg",
    },
  ],
  maxGuestsPerRsvp: 5,
  // Optional: path under public/ to a GLB that replaces the procedural rings, e.g. "/models/rings.glb".
  ringsModelUrl: "",
  // The kitten bride & groom dancing behind the rings (components/scene/dancers.ts). Off for now; true shows them.
  showDancers: false,
  // Optional: path under public/ to the song, e.g. "/audio/song.mp3". Empty = built-in music-box tune.
  songUrl: "",
};
