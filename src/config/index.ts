import fs from 'fs';

const secrets = JSON.parse(fs.readFileSync(process.cwd() + '/secrets.json', 'utf8')) as {
    DISCORD_BOT_TOKEN: string
};

const config = {
    secrets,
    discordGuild: {
        id: '627178364716974091',
    }
} as const;

export { config };