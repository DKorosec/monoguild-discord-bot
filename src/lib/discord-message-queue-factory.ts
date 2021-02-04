import { DiscordMessageEx } from '../discord-extensions/types';
import * as eventWait from 'event-wait';

export class DiscordMessageQueueFactory {
    readonly messageFactory = eventWait.createConsumerProducerEventObject();
    readonly messageQueue: DiscordMessageEx[] = [];

    produce(message: DiscordMessageEx): void {
        this.messageQueue.push(message);
        this.messageFactory.produce();
    }

    async consume(): Promise<DiscordMessageEx> {
        await this.messageFactory.consume();
        return this.messageQueue.shift()!;
    }
}