require('dotenv').config();

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
} = process.env;

async function testAirtableConnection() {
  if (!AIRTABLE_TOKEN) {
    console.error('AIRTABLE_TOKEN manquant dans .env');
    process.exit(1);
  }

  if (!AIRTABLE_BASE_ID) {
    console.error('AIRTABLE_BASE_ID manquant dans .env');
    process.exit(1);
  }

  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Erreur Airtable :');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Connexion Airtable OK ✅');
  console.log('Tables trouvées :');

  data.tables.forEach((table) => {
    console.log(`- ${table.name} | ID: ${table.id}`);
  });
}

testAirtableConnection().catch((error) => {
  console.error(error);
  process.exit(1);
});