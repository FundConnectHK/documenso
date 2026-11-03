/**
 * Ensure the local Documenso API token from service-core .env exists in Postgres.
 * Run: npm run with:env -- npx tsx scripts/ensure-local-api-token.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { hashString } from '@documenso/lib/server-only/auth/hash';
import { prisma } from '@documenso/prisma';

const repoRoot = path.resolve(__dirname, '../../..');

const readServiceCoreApiKey = (): string | null => {
  const envPath = path.join(repoRoot, '.env');
  try {
    const envContents = readFileSync(envPath, 'utf8');
    const match = envContents.match(/^DOCUMENSO_API_KEY=(.+)$/m);
    if (!match) {
      return null;
    }

    return match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return null;
  }
};

async function main() {
  const apiKey = process.env.DOCUMENSO_API_KEY?.trim() || readServiceCoreApiKey();

  if (!apiKey) {
    console.log('[documenso] No DOCUMENSO_API_KEY found; skipping local API token seed.');
    return;
  }

  const hashedToken = hashString(apiKey);
  const existingToken = await prisma.apiToken.findFirst({
    where: { token: hashedToken },
    select: { id: true },
  });

  if (existingToken) {
    console.log('[documenso] Local API token already present.');
    return;
  }

  const team = await prisma.team.findFirst({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      organisation: {
        select: {
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const owner = team?.organisation.owner;

  if (!team || !owner) {
    throw new Error('No Documenso user/team found. Run npm run dx in service/documenso first.');
  }

  await prisma.apiToken.create({
    data: {
      name: 'service-core-local',
      token: hashedToken,
      expires: null,
      userId: owner.id,
      teamId: team.id,
    },
  });

  console.log(`[documenso] Seeded local API token for ${owner.email}.`);
}

main()
  .catch((error) => {
    console.error('[documenso] Failed to ensure local API token:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
