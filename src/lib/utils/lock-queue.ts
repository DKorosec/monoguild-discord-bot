import * as eventWait from 'event-wait';

export class LockQueue {
    private lockFlag = eventWait.createConsumerProducerEventObject(1);
    private locked = false;
    async lock(): Promise<void> {
        await this.lockFlag.consume();
        this.locked = true;
    }

    unlock(): void {
        if (!this.locked) {
            throw new Error('Cannot unlock, if lock was not set.');
        }
        this.lockFlag.produce();
        this.locked = false;
    }

    async lockCallback<T>(cb: { (): Promise<T> | T }): Promise<T> {
        try {
            await this.lock();
            return await cb();
        } finally {
            this.unlock();
        }
    }

}
