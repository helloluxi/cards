const CACHE_NAME = 'cards-offline-v2';
const BASE = self.registration.scope;
const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
const shell = new URL('./', BASE).href;
const assets = [
    './',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    ...ranks.flatMap(rank => suits.map(suit => `cards/${rank}_of_${suit}.svg`))
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(assets);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('cards-offline-') && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok && new URL(request.url).pathname === new URL(shell).pathname) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(shell, response.clone());
                }
                return response;
            } catch {
                return (await caches.match(shell)) || Response.error();
            }
        })());
        return;
    }

    event.respondWith((async () => {
        return (await caches.match(request)) || fetch(request);
    })());
});
