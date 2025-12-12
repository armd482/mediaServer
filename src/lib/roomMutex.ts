import { Mutex as AsyncMutex } from 'async-mutex';

export const createMutex = () => {
	const mutex = new AsyncMutex();

	const runExclusive = async <T>(fn: () => Promise<T> | T): Promise<T> => mutex.runExclusive(fn);

	return { runExclusive };
};
