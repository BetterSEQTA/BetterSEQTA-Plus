import type { Subscriber, Unsubscriber } from "svelte/store";

export class Standalone {
	private static instance: Standalone;
	private _standalone = $state(false);
	private subscribers = new Set<Subscriber<boolean>>();

	private constructor() {}

	public static getInstance(): Standalone {
		if (!Standalone.instance) {
			Standalone.instance = new Standalone();
		}
		return Standalone.instance;
	}

	public setStandalone(value: boolean) {
		this._standalone = value;
		this.subscribers.forEach(subscriber => subscriber(value));
	}

	public get standalone() {
		return this._standalone;
	}

	public subscribe(run: Subscriber<boolean>): Unsubscriber {
		this.subscribers.add(run);
		run(this._standalone);

		return () => {
			this.subscribers.delete(run);
		};
	}
}

export const standalone = Standalone.getInstance();