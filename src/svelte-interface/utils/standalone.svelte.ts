export function createStandalone() {
	let standalone = $state(false);

	function setStandalone(value: boolean) {
		standalone = value;
	}

	return {
		get standalone() {
			return standalone;
		},
		setStandalone
	};
}

export const standalone = createStandalone();