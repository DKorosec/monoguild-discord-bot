import { DiscordMessageEx } from "../../discord-extensions/types";
import { MessageController } from "../message-controller";
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import { getGuildMember, getGuildMemberVoiceChannel } from "../utils/guild";
import { StreamDispatcher, VoiceChannel, VoiceConnection } from "discord.js";
import * as eventWait from 'event-wait';


type PlayCommand = `?!play ${string}`;
type SkipCommand = `?!skip`;
type StfuCommand = `?!stfu`;
type Commands = PlayCommand | SkipCommand | StfuCommand;

const commandKWS: Commands[] = ['?!skip', '?!stfu', '?!play '];

export class MusicPlayerController extends MessageController {
    playQueue: ytsr.Video[] = [];
    queueNextReady = eventWait.createWaitEventObject();
    voiceConnection: VoiceConnection | null = null;
    currentStreamDispatcher: StreamDispatcher | null = null;

    constructor() {
        super();
        this.initQueuePlayer();
    }

    private async searchYoutube(search: string): Promise<ytsr.Video | null> {
        while (true) {
            try {
                const searchResults = await ytsr(search);
                const playResult = searchResults.items
                    .filter(i => i.type === 'video')[0] as (ytsr.Video | undefined) ?? null;
                return playResult;
            } catch (err) {
                console.error('MusicPlayerController::searchYoutube', err.message);
            }
        }
    }

    private async initQueuePlayer(): Promise<void> {
        const highWaterMark = 1048576; // 1 MB;
        while (await this.queueNextReady.wait()) {
            const item = this.playQueue.shift()!;
            this.currentStreamDispatcher = this.voiceConnection!.play(
                ytdl(item.url, { highWaterMark }), { highWaterMark }
            );
            const finishFlag = eventWait.createWaitEventObject();
            this.currentStreamDispatcher.on('error', finishFlag.set);
            this.currentStreamDispatcher.on('finish', finishFlag.set);
            this.currentStreamDispatcher.on('end', finishFlag.set);
            await finishFlag.wait();
            this.currentStreamDispatcher = null;
            if (!this.playQueue.length) {
                // await next loop.
                this.queueNextReady.clear();
                this.voiceConnection!.disconnect();
                this.voiceConnection = null;
            }
        }
    }

    private isPlayerIdle(): boolean {
        return !this.queueNextReady.isSet() && this.playQueue.length === 0;
    }

    private stopCurrentStream(): void {
        if (this.voiceConnection) {
            this.currentStreamDispatcher?.end();
            this.currentStreamDispatcher?.destroy(new Error('END_STREAM'));
        }
    }

    private async playCommand(command: PlayCommand, message: DiscordMessageEx, voiceCh: VoiceChannel): Promise<void> {
        const [, ...playQuerySplit] = command.split(' ');
        const playQuery = playQuerySplit.join(' ');
        const qItem = await this.searchYoutube(playQuery);
        if (!qItem) {
            await message.inlineReply('Sorry, could not find any matching songs.');
            return;
        }
        const isIdle = this.isPlayerIdle();
        this.playQueue.push(qItem);
        if (!isIdle) {
            await message.inlineReply(`"${qItem.title}" is in queue position #${this.playQueue.length}`);
        } else {
            await message.inlineReply(`"${qItem.title}" will play shortly.`);
        }
        this.voiceConnection = await voiceCh.join();
        this.queueNextReady.set();
    }

    private skipCommand(_command: SkipCommand, _message: DiscordMessageEx): void {
        this.stopCurrentStream();
    }

    private stfuCommand(_command: StfuCommand, _message: DiscordMessageEx): void {
        this.playQueue = [];
        this.stopCurrentStream();
    }

    canHandle(message: DiscordMessageEx): boolean {
        return commandKWS.some(keyword => message.content.startsWith(keyword));
    }

    async handle(message: DiscordMessageEx): Promise<void> {
        const command = message.content as Commands;
        const author = getGuildMember(message.author.id);
        const voiceCh = getGuildMemberVoiceChannel(author.id);
        if (!voiceCh) {
            await message.inlineReply('To use music player commands, you must be in a voice channel');
            return;
        }

        if (this.voiceConnection && this.voiceConnection.channel.id !== voiceCh.id) {
            // TODO: ask for server BOT permissions (DiscordAPIError: Missing Permissions)
            // so users cant steal the music bot.
            /*
                await author.voice.setChannel(this.voiceConnection.channel);
            */
            await message.inlineReply(`To use music player commands, you must be in a voice channel that is currently playing (${this.voiceConnection.channel})`);
            return;
        }

        if (command === '?!skip') {
            return await this.skipCommand(command, message);
        }
        if (command === '?!stfu') {
            return await this.stfuCommand(command, message);
        }
        if (command.startsWith('?!play ')) {
            return await this.playCommand(command, message, voiceCh);
        }
    }
}