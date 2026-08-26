import { config } from "dotenv";
import { importBassolsFamilySeed } from "../src/modules/family-tree/application/family-seed-service";
import { findUserByEmail } from "../src/modules/identity/infrastructure/mongo-user-repository";

config({ path: ".env" });
config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm seed:family <email>");
    process.exit(1);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  await importBassolsFamilySeed(user.id);
  console.log(`Family tree seeded for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
