import fs from 'fs';

const secrets = JSON.parse(fs.readFileSync(process.cwd() + '/secrets.json', 'utf8')) as {
    DISCORD_BOT_TOKEN: string
};

const config = {
    secrets,
    discordGuild: {
        id: '807195459956899880',
    }
} as const;

export { config };