// Scroll fix: one wheel notch scrolls a fixed number of rows.
//
// The client moves a list by a fixed step on every wheel *event*. Smooth or
// free-spinning wheels and touchpads send many events per notch, so a list
// shoots to the end. This plugin listens for the wheel before the client does,
// adds the movement up, and scrolls one step per notch worth of movement.

const ROW = 32;          // height of one list row in the NPC shop windows
const SHOP = new Set(['NpcStore', 'VendingShop', 'CashShop']);

export default function init(parameters, api) {
	if (api?.version !== 1) throw new Error('scroll-fix needs client API 1');

	const rows = Math.min(10, Math.max(1, Number(parameters?.rows_per_notch) || 1));
	const notch = Math.min(400, Math.max(20, Number(parameters?.sensitivity) || 100));
	const everywhere = parameters?.all_lists !== false;

	const gestures = new WeakMap();   // scrolled element -> { acc, time }
	const attached = new Map();       // component host -> { root, handler }

	// The list under the pointer: the nearest ancestor that can scroll.
	function scroller(event, shopWindow) {
		for (const node of event.composedPath()) {
			if (!(node instanceof HTMLElement)) continue;
			if (node.scrollHeight <= node.clientHeight + 1) continue;
			const overflow = getComputedStyle(node).overflowY;
			const custom = node._roScrollbarApplied === true;
			if (overflow === 'auto' || overflow === 'scroll' || custom || (shopWindow && overflow === 'hidden')) return node;
		}
		return null;
	}

	// While a shop window is open, a wheel turn that is not over a scrollable list
	// is swallowed: the client would otherwise zoom the camera (its wheel handler
	// sits on the game canvas), which leaves the screen shifted with black below.
	// This runs on the window in the capture phase, before the canvas sees it.
	const shops = new Set();
	const pageGuard = event => {
		if (event.ctrlKey || !event.deltaY) return;
		if (scroller(event, false)) return;
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	const pageReset = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
	let savedOverscroll = null;

	function guardOn(host) {
		if (shops.has(host)) return;
		if (!shops.size) {
			window.addEventListener('wheel', pageGuard, { capture: true, passive: false });
			window.addEventListener('scroll', pageReset, { passive: true });
			const root = document.documentElement;
			savedOverscroll = [root.style.overscrollBehavior, document.body.style.overscrollBehavior];
			root.style.overscrollBehavior = 'none';
			document.body.style.overscrollBehavior = 'none';
		}
		shops.add(host);
	}

	function guardOff(host) {
		if (!shops.delete(host) || shops.size) return;
		window.removeEventListener('wheel', pageGuard, { capture: true });
		window.removeEventListener('scroll', pageReset);
		if (savedOverscroll) {
			document.documentElement.style.overscrollBehavior = savedOverscroll[0];
			document.body.style.overscrollBehavior = savedOverscroll[1];
			savedOverscroll = null;
		}
		pageReset();
	}

	function attach(component) {
		if (attached.has(component.host)) return;
		const shopWindow = SHOP.has(component.name);
		if (shopWindow) guardOn(component.host);
		if (!shopWindow && !everywhere) return;

		const handler = event => {
			if (event.ctrlKey || !event.deltaY) return;       // ctrl+wheel is zoom
			const list = scroller(event, shopWindow);
			if (!list) return;

			// Pixels of wheel movement, whatever unit the device reports in.
			let dy = event.deltaY;
			if (event.deltaMode === 1) dy *= 33;               // lines
			else if (event.deltaMode === 2) dy *= list.clientHeight; // pages

			const now = performance.now();
			const state = gestures.get(list) || { acc: 0, time: 0 };
			if (now - state.time > 350 || Math.sign(state.acc) !== Math.sign(dy)) state.acc = 0;
			state.acc += dy;
			state.time = now;
			gestures.set(list, state);

			// Our scroll replaces the client's own: it must not also run.
			event.preventDefault();
			event.stopImmediatePropagation();

			const notches = Math.trunc(state.acc / notch);
			if (!notches) return;
			state.acc -= notches * notch;
			const from = shopWindow ? Math.round(list.scrollTop / ROW) * ROW : list.scrollTop;
			list.scrollTop = from + notches * rows * ROW;
		};

		// Capture on the window's root so this runs before the list's own handlers.
		component.root.addEventListener('wheel', handler, { capture: true, passive: false });
		attached.set(component.host, { root: component.root, handler });
	}

	function detach({ host }) {
		guardOff(host);
		const entry = attached.get(host);
		if (!entry) return;
		entry.root.removeEventListener('wheel', entry.handler, { capture: true });
		attached.delete(host);
	}

	api.on('ui:append', attach, { replay: true });
	api.on('ui:remove', detach);
	api.cleanup(() => { for (const host of [...attached.keys()]) detach({ host }); for (const host of [...shops]) guardOff(host); });
}
