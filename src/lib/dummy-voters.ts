/**
 * Made up people for the practice run. Deterministic, so the same list comes
 * out every time. Replace nothing here for the real election: paste the real
 * list into the admin voter list box instead.
 */

const FIRST = [
  "Amina", "Bilal", "Chandra", "Daniya", "Ehsan", "Farida", "Gulzar", "Hamid",
  "Ibrahim", "Jamila", "Kamran", "Laila", "Mahmood", "Nadia", "Omar", "Parveen",
  "Qasim", "Rashid", "Saira", "Tariq", "Umar", "Vaseem", "Wahida", "Yasmin",
  "Zahid", "Anwar", "Bushra", "Danish", "Erum", "Faisal", "Ghazala", "Haroon",
  "Imran", "Javed", "Kiran", "Latif", "Maryam", "Nasir", "Owais", "Palwasha",
];

const LAST = [
  "Ahmed", "Baig", "Chaudhry", "Dar", "Farooq", "Gul", "Hussain", "Iqbal",
  "Jan", "Khan", "Lodhi", "Malik", "Nawaz", "Orakzai", "Qureshi", "Raza",
  "Shah", "Tanoli", "Usmani", "Wazir", "Yousaf", "Zaman", "Butt", "Cheema",
];

/** Small deterministic generator, so the dummy list never changes. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function dummyVoters(count: number): { voterId: string; name: string }[] {
  const random = lcg(20260827);
  const out: { voterId: string; name: string }[] = [];
  const usedNames = new Set<string>();
  const usedIds = new Set<string>();

  while (out.length < count) {
    const first = FIRST[Math.floor(random() * FIRST.length)];
    const last = LAST[Math.floor(random() * LAST.length)];
    const name = `${first} ${last}`;
    if (usedNames.has(name)) continue;

    let voterId = String(100000 + Math.floor(random() * 899999));
    while (usedIds.has(voterId)) {
      voterId = String(100000 + Math.floor(random() * 899999));
    }

    usedNames.add(name);
    usedIds.add(voterId);
    out.push({ voterId, name });
  }

  return out;
}
