import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { aliases, emails, identitas } from "@/lib/db/schema";
import { generateIdentity, randomChoice } from "@/lib/llm";
import { pickIdentityFromCollection } from "@/lib/nama";

const MAX_ATTEMPTS = 10;
const SLUG_MAX = 30; // local part tetap di bawah batas 64 karakter

export type ActiveDomain = { id: string; domain: string };

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// "José" -> "jose"; aksara non-Latin habis terbuang dan ditangani di generateUsername.
function slug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, SLUG_MAX);
}

// Percobaan pertama boleh tanpa angka (budi.santoso); percobaan ulang selalu memakai angka.
function generateUsername(firstName: string, lastName: string, attempt: number): string {
  const first = slug(firstName);
  const last = slug(lastName);
  if (!first && !last) return `user${randomInt(100000, 999999)}`;
  if (!first || !last) return `${first || last}${randomInt(1000, 9999)}`;

  const numbered = [
    () => `${first}${last.slice(0, 3)}${randomInt(10, 99)}`,
    () => `${first[0]}${last}${randomInt(100, 999)}`,
    () => `${first}${randomInt(1000, 9999)}`,
  ];
  const plain = [() => `${first}.${last}`, () => `${first}_${last}`];
  return randomChoice(attempt === 0 ? [...plain, ...numbered] : numbered)();
}

// Alamat terpakai jika pernah diberikan, dipakai alias, atau pernah menerima email.
function isAddressTaken(address: string): boolean {
  const given = db.select({ id: identitas.id }).from(identitas).where(eq(identitas.address, address)).get();
  if (given) return true;

  const alias = db
    .select({ id: aliases.id })
    .from(aliases)
    .where(sql`lower(${aliases.address}) = ${address}`)
    .get();
  if (alias) return true;

  // Bandingkan apa adanya agar idx_emails_to_address terpakai (tabel emails berukuran GB).
  const received = db
    .select({ one: sql<number>`1` })
    .from(emails)
    .where(eq(emails.toAddress, address))
    .limit(1)
    .get();
  return received !== undefined;
}

export async function createIdentity(activeDomains: ActiveDomain[], apiKeyId: string) {
  const fromCollection = pickIdentityFromCollection();
  const person = fromCollection ?? (await generateIdentity());
  const source = fromCollection ? "collection" : "llm";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const domain = randomChoice(activeDomains);
    const address = `${generateUsername(person.firstName, person.lastName, attempt)}@${domain.domain}`.toLowerCase();
    const username = address.slice(0, address.lastIndexOf("@"));

    // IMMEDIATE: kunci tulis diambil sebelum cek, jadi proses lain tidak bisa menyelip.
    const claimed = db.transaction(
      (tx) => {
        if (isAddressTaken(address)) return false;
        return (
          tx
            .insert(identitas)
            .values({
              id: nanoid(),
              address,
              username,
              domainId: domain.id,
              firstName: person.firstName,
              lastName: person.lastName,
              gender: person.gender,
              dateOfBirth: person.dateOfBirth,
              source,
              apiKeyId,
            })
            .onConflictDoNothing()
            .run().changes > 0
        );
      },
      { behavior: "immediate" }
    );

    if (claimed) {
      return {
        firstName: person.firstName,
        lastName: person.lastName,
        username,
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        email: address,
        domain: domain.domain,
        source,
      };
    }
  }

  throw new Error("Gagal mendapatkan alamat email unik. Coba lagi.");
}
