const required={REJOIN_HOST_PASSWORD:'Instructor sign-in',OPENAI_API_KEY:'Runtime AI',TWITCH_CLIENT_ID:'Twitch integration',TWITCH_ACCESS_TOKEN:'Twitch chat events',TWITCH_CLIENT_SECRET:'Optional learner Twitch linking'};
for(const [key,label] of Object.entries(required))console.log(`${process.env[key]?'CONFIGURED':'MISSING'}: ${label} (${key})`);
console.log('No credentials are printed. Run npm test for local checks; actual API access still needs a live rehearsal.');
