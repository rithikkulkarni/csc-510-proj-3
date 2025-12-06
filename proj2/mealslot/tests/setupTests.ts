import '@testing-library/jest-dom';
import React from 'react';

// Expose React globally in case some compiled code expects a runtime React symbol
; (globalThis as any).React = React;

// Stub Google Maps minimal API used by components in tests
; (globalThis as any).google = (globalThis as any).google || {};
; (globalThis as any).google.maps = (globalThis as any).google.maps || {
    Map: class { },
    Marker: class { },
    LatLng: class { },
    LatLngBounds: class { },
    event: { addListener: () => ({ remove: () => { } }) },
    places: {
        AutocompleteService: class { },
        PlacesService: class { }
    }
};

// Minimal geolocation stub (use defineProperty because some DOM implementations expose a getter-only navigator)
; (globalThis as any).navigator = (globalThis as any).navigator || {};
try {
    Object.defineProperty((globalThis as any).navigator, "geolocation", {
        configurable: true,
        value: {
            getCurrentPosition: (success: any, _err?: any) => {
                success({ coords: { latitude: 39.7392, longitude: -104.9903 } });
            },
            watchPosition: () => 0,
            clearWatch: () => { },
        },
    });
} catch (e) {
    // fallback if defineProperty not allowed
    try { (globalThis as any).navigator.geolocation = { getCurrentPosition: (s: any) => s({ coords: { latitude: 39.7392, longitude: -104.9903 } }) }; } catch { }
}

// Avoid script-loading side-effects in happy-dom by making script elements harmless
const originalCreateElement = document.createElement.bind(document);
// Keep attribute setters so tests that assert `script.id` or `script.src`
// can still observe them. Only prevent execution/side-effects by making
// appendChild a no-op for script nodes (which prevents automatic network
// loading/execution in DOM environments used by tests).
(document as any).createElement = (tagName: string) => {
    const el = originalCreateElement(tagName);
    if (tagName.toLowerCase() === 'script') {
        // allow setting attributes (id, src, async, defer)
        // but prevent any appended child operations from triggering side-effects
        try {
            (el as any).appendChild = () => { };
        } catch (e) {
            // ignore if not writable
        }
        // ensure addEventListener exists so tests can attach onload handlers
        if (!(el as any).addEventListener) (el as any).addEventListener = () => { };
    }
    return el;
};

// Provide a safe global fetch stub to avoid network errors from iframes/embed fetches
if (typeof (globalThis as any).fetch === 'undefined') {
    (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
} else {
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = async (...args: any[]) => {
        try {
            return await originalFetch(...args);
        } catch (err) {
            return { ok: false, status: 0, json: async () => ({}) } as any;
        }
    };
}

// Reduce noisy console.error messages from benign DOM/network errors during tests
const _origConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
    try {
        const s = String(args[0] ?? '');
        if (s.includes('Failed to load script') || s.includes('AbortError') || s.includes('No Neon user found after callback')) {
            return;
        }
    } catch (_) { }
    _origConsoleError(...args);
};
