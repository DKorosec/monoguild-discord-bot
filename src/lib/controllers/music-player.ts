import { DiscordMessageEx } from "../../discord-extensions/types";
import { MessageController } from "../message-controller";
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import { getGuildMember, getGuildMemberVoiceChannel } from "../utils/guild";
import { StreamDispatcher, VoiceChannel, VoiceConnection } from "discord.js";
import * as eventWait from 'event-wait';
import { canMemberViewChannel } from "../utils/permissions";


type PlayCommand = `play ${string}`;
type SkipCommand = `skip`;
type StfuCommand = `stfu`;
type RestartCommand = 'restart';
type LoopOnCommand = 'loop-on';
type LoopOffCommand = 'loop-off';
type PauseCommand = 'pause';
type ResumeCommand = 'resume';
type Commands = PlayCommand | SkipCommand | StfuCommand | RestartCommand | LoopOnCommand | LoopOffCommand | PauseCommand | ResumeCommand;
type StopStreamReason = 'PLAY_NEXT' | 'STOP_CURRENT';
interface IPlayerSettings {
    restartCurrent: boolean
    loop: boolean,
    volume: number
}

export class MusicPlayerController extends MessageController {
    playQueue: ytsr.Video[] = [];
    queueNextReady = eventWait.createWaitEventObject();
    voiceConnection: VoiceConnection | null = null;
    currentStreamDispatcher: StreamDispatcher | null = null;
    playerSettings: IPlayerSettings = {
        restartCurrent: false,
        loop: false,
        volume: 0.10
    };

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
            let mustPlayNextSong = false;
            this.currentStreamDispatcher = this.voiceConnection!.play(
                ytdl(item.url, { highWaterMark }), { highWaterMark }
            );
            this.currentStreamDispatcher.setVolume(this.playerSettings.volume);
            const finishFlag = eventWait.createWaitEventObject();
            this.currentStreamDispatcher.once('error', (err) => {
                mustPlayNextSong = (err.message as StopStreamReason) === 'PLAY_NEXT';
                finishFlag.set();
            });
            this.currentStreamDispatcher.once('finish', finishFlag.set);
            this.currentStreamDispatcher.once('end', finishFlag.set);
            await finishFlag.wait();
            this.currentStreamDispatcher = null;

            if (!mustPlayNextSong) {
                if (this.playerSettings.restartCurrent || this.playerSettings.loop) {
                    this.playerSettings.restartCurrent = false;
                    this.playQueue.unshift(item);
                }
            }

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

    private stopCurrentStream(reason: StopStreamReason): void {
        if (this.voiceConnection) {
            this.currentStreamDispatcher?.end();
            this.currentStreamDispatcher?.destroy(new Error(reason));
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
        this.stopCurrentStream('PLAY_NEXT');
    }

    private stfuCommand(_command: StfuCommand, _message: DiscordMessageEx): void {
        this.playQueue = [];
        this.stopCurrentStream('PLAY_NEXT');
    }

    private async restartCommand(_command: RestartCommand, message: DiscordMessageEx): Promise<void> {
        if (this.isPlayerIdle()) {
            await message.inlineReply(`Nothing to restart, because player is currently idle.`);
            return;
        }
        this.playerSettings.restartCurrent = true;
        this.stopCurrentStream('STOP_CURRENT');
    }

    private async pauseCommand(_command: PauseCommand, message: DiscordMessageEx): Promise<void> {
        if (this.isPlayerIdle()) {
            await message.inlineReply(`Nothing to pause, because player is currently idle.`);
        }
        this.currentStreamDispatcher!.pause();
    }

    private async resumeCommand(_command: ResumeCommand, message: DiscordMessageEx): Promise<void> {
        if (this.isPlayerIdle()) {
            await message.inlineReply(`Nothing to resume, because player is currently idle.`);
        }
        this.currentStreamDispatcher!.resume();
    }

    private async loopOnCommand(_command: LoopOnCommand, message: DiscordMessageEx): Promise<void> {
        await message.inlineReply(`Looping every song forever. Skip to go to the next song.`);
        this.playerSettings.loop = true;
    }

    private async loopOffCommand(_command: LoopOffCommand, message: DiscordMessageEx): Promise<void> {
        await message.inlineReply(`Loop mode deactivated.`);
        this.playerSettings.loop = false;
    }

    help(): { kw: string, txt: string } {
        const kw = 'player';
        return {
            kw,
            txt: `\`\`\`:: MUSIC-PLAYER ::
?!${kw}::play YOUTUBE_SEARCH_WORDS >>> searches youtube and plays first video result.
?!${kw}::play YOUTUBE_URL >>> plays youtube url.
?!${kw}::skip >>> skips currently playing audio.
?!${kw}::stfu >>> clear audio queue and stop playing (leave channel).
?!${kw}::restart >>> starts playing current audio from beginning .
?!${kw}::pause >>> pauses currently playing audio.
?!${kw}::resume >>> resumes currently playing audio.
?!${kw}::loop-on >>> all tracks that will be played, will repeat when they reach the end. Use '?!${kw}::skip' to go to the next one. 
?!${kw}::loop-off >>> disables ?!${kw}::loop-on mode. \`\`\``
        };
    }

    async handle(command: Commands, message: DiscordMessageEx): Promise<boolean> {
        const author = getGuildMember(message.author.id)!;
        const voiceCh = getGuildMemberVoiceChannel(author.id);
        if (!voiceCh) {
            await message.inlineReply('To use music player commands, you must be in a voice channel');
            return true;
        }

        if (this.voiceConnection && this.voiceConnection.channel.id !== voiceCh.id) {
            const hasPermissions = canMemberViewChannel(author, this.voiceConnection.channel);
            if (!hasPermissions) {
                await message.inlineReply(
                    `To use music player commands, you must be in a voice channel that is currently ` +
                    `playing (${this.voiceConnection.channel.parent} >> ${this.voiceConnection.channel}), but you DON'T have permissions to join the channel.`
                );
                return true;
            }
            await author.voice.setChannel(this.voiceConnection.channel);
        }

        if (command === 'skip') {
            await this.skipCommand(command, message);
            return true;
        }
        if (command === 'stfu') {
            await this.stfuCommand(command, message);
            return true;
        }
        if (command.startsWith('play ')) {
            await this.playCommand(command as PlayCommand, message, voiceCh);
            return true;
        }
        if (command === 'restart') {
            await this.restartCommand(command, message);
            return true;
        }
        if (command === 'pause') {
            await this.pauseCommand(command, message);
            return true;
        }
        if (command === 'resume') {
            await this.resumeCommand(command, message);
            return true;
        }
        if (command === 'loop-on') {
            await this.loopOnCommand(command, message);
            return true;
        }
        if (command === 'loop-off') {
            await this.loopOffCommand(command, message);
            return true;
        }
        return false;
    }
}