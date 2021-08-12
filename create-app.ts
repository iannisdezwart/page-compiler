import { mkdirSync, writeFileSync } from 'fs'

const touch = (path: string) => writeFileSync(path, '')
const mkdir = (path: string) => mkdirSync(path, { recursive: true })

const USE_SASS = process.argv.includes('--sass')
const USE_PWA = process.argv.includes('--pwa')

// JS directory

mkdir('src/js')
touch('src/js/index.ts')

if (USE_PWA) {
	touch('src/js/service-worker.ts')
}

// CSS directory

if (USE_SASS) {
	mkdir('src/sass')
	touch('src/sass/index.sass')
} else {
	mkdir('src/css')
	touch('src/css/index.css')
}

// Image directory

mkdir('src/img')

// PWA directory

if (USE_PWA) {
	mkdir('src/pwa')
}

// Compiler script

writeFileSync('compiler.ts', /* ts */ `\
import { ${ USE_SASS ? 'inlineSASS' : 'inlineCSS' }, inlineJS, ${ USE_PWA? 'importServiceWorker, createPWAManifest, ' : '' }PageShell, compilePages } from 'page-compiler'

const main = async () => {
	const pageShell = new PageShell({
		head: /* html */ \`
		${ USE_SASS
			? `\${ inlineSASS('src/sass/index.sass') }`
			: `\${ inlineCSS('src/css/index.css') }` }
		\${ inlineJS('src/js/index.js') }\
${ USE_PWA
			? `
		\${ importServiceWorker('src/js/service-worker.js') }`
			: '' }
		\`
	})\

${ USE_PWA
		? `
	await createPWAManifest({
		icon: {
			svg: 'src/pwa/logo.svg',
			png: 'src/pwa/logo.png',
			maskableSvg: 'src/pwa/masked-logo.svg',
			maskablePng: 'src/pwa/masked-logo.png'
		},
		name: 'MyApp',
		shortName: 'MyApp',
		backgroundColour: '#4b5378',
		themeColour: '#515980',
		categories: [ 'MyApp' ],
		description: 'MyDescription',
		display: 'standalone',
		lang: 'en-UK',
		orientation: 'portrait-primary',
		startURL: '/'
	}, pageShell)
`
		: '' }
	const seo = {
		author: 'Me',
		description: 'MyDescription',
		keywords: [ 'MyWebsite' ]
	}

	compilePages([
		{
			html: pageShell.render('MyHomepage', /* html */ \`
			<div id="page">
			</div>
			\`, seo),
			path: '/index.html'
		}
	])
}

main()
`)

// TS Config

writeFileSync('tsconfig.json', `\
{
  "compilerOptions": {
		"target": "es5",
    "watch": true,
    "lib": [
      "dom",
      "esnext",
			"DOM.Iterable"
		],
		"downlevelIteration": true
	}
}
`)

// Git Ignore

writeFileSync('.gitignore', `\
*.js
node_modules
root/
`)

// Readme

writeFileSync('README.md', `\
# MyApp
`)

// Service Worker

if (USE_PWA) {
	writeFileSync('src/js/service-worker.ts', `\
const cacheVersion = '0.0.1'
const staticCache = \`static-cache-v\${ cacheVersion }\`
const dynamicCache = \`dynamic-cache-v\${ cacheVersion }\`

// Place all assets that you want to pre-cache here

const assets = [
	'/',
	'/offline'
]

// Empties the caches

const clearCaches = async () => {
	const cacheNames = await caches.keys()
	const deleteCachePromises: Promise<boolean>[] = []

	for (const cacheName of cacheNames) {
		deleteCachePromises.push(caches.delete(cacheName))
	}

	return Promise.all(deleteCachePromises)
}

// Handle incoming messages

self.addEventListener('message', async e => {
	const command = e?.data?.command

	if (command == null) return

	if (command == 'clear-cache') {
		await clearCaches()
		e.ports[0].postMessage('Cleared cache!')
	}

	// Add other custom commands here
})

// On install, pre-cache the selected assets

self.addEventListener('install', (e: ExtendableEvent) => {
	const preCache = async () => {
		const cache = await caches.open(staticCache)
		await cache.addAll(assets)
	}

	const work = Promise.all([ preCache() ])

	e.waitUntil(work)
	self.skipWaiting()
})

// On activation, delete the old caches, and enable navigation preload

self.addEventListener('activate', (e: ExtendableEvent) => {
	const deleteOldCaches = async () => {
		const cacheNames = await caches.keys()
		const deleteCachePromises: Promise<boolean>[] = []

		for (const cacheName of cacheNames) {
			if (cacheName == staticCache || cacheName == dynamicCache) {
				continue
			}

			deleteCachePromises.push(caches.delete(cacheName))
		}

		return Promise.all(deleteCachePromises)
	}

	const navigationPreload = async () => {
		if ('navigationPreload' in self.registration) {
			await self.registration.navigationPreload.enable()
		}
	}

	const work = Promise.all([ deleteOldCaches(), navigationPreload() ])

	e.waitUntil(work)
	self.clients.claim()
})

// Request interceptor

self.addEventListener('fetch', (e: FetchEvent) => {
	const addResponseToCache = async (clonedResponse: Response) => {
		const cache = await caches.open(dynamicCache)
		cache.put(e.request.url, clonedResponse)
	}

	e.respondWith((async () => {
		try {
			// See if we have the resource in our caches

			const cacheResponse = await caches.match(e.request)

			if (cacheResponse != null) {
				return cacheResponse
			}

			// Respond with preloaded response if it exists and add it to the cache

			const preloadResponse = await e.preloadResponse

			if (preloadResponse != null) {
				addResponseToCache(preloadResponse.clone())
				return preloadResponse
			}

			// Fetch the resource and add it to the cache

			const networkResponse = await fetch(e.request)
			addResponseToCache(networkResponse.clone())
			return networkResponse
		} catch (err) {
			// We're offline and the page is not in our caches, send the fallback page

			if (e.request.mode == 'navigate') {
				const fallbackResponse = await caches.match('/offline')
				return fallbackResponse
			}

			return new Response('', { status: 408, statusText: 'Offline' })
		}
	})())
})
`)

	mkdir('src/js/typings')
	writeFileSync('src/js/typings/service-worker.d.ts', `\
/**
 * Copyright (c) 2016, Tiernan Cridland
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
 * granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER
 * IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 *
 * Typings for Service Worker
 * @author Tiernan Cridland
 * @email tiernanc@gmail.com
 * @license: ISC
 */

interface ExtendableEvent extends Event {
	waitUntil(fn: Promise<any>): void;
}

interface ServiceWorkerContainer {
	onerror?: (event?: Event) => any;
	getRegistration(scope?: string): Promise<ServiceWorkerRegistration>;
	getRegistrations(): Promise<Array<ServiceWorkerRegistration>>;
	register(url: string, options?: ServiceWorkerRegistrationOptions): Promise<ServiceWorkerRegistration>;
}

interface ServiceWorkerNotificationOptions {
	tag?: string;
}

interface ServiceWorkerRegistration {
	getNotifications(options?: ServiceWorkerNotificationOptions): Promise<Array<Notification>>;
	update(): void;
	unregister(): Promise<boolean>;
}

interface ServiceWorkerRegistrationOptions {
	scope?: string;
}

// CacheStorage API

interface Cache {
	add(request: Request): Promise<void>;
	addAll(requestArray: Array<Request>): Promise<void>;
	'delete'(request: Request, options?: CacheStorageOptions): Promise<boolean>;
	keys(request?: Request, options?: CacheStorageOptions): Promise<Array<string>>;
	match(request: Request, options?: CacheStorageOptions): Promise<Response>;
	matchAll(request: Request, options?: CacheStorageOptions): Promise<Array<Response>>;
	put(request: Request|string, response: Response): Promise<void>;
}

interface CacheStorage {
	'delete'(cacheName: string): Promise<boolean>;
	has(cacheName: string): Promise<boolean>;
	keys(): Promise<Array<string>>;
	match(request: Request, options?: CacheStorageOptions): Promise<Response>;
	open(cacheName: string): Promise<Cache>;
}

interface CacheStorageOptions {
	cacheName?: string;
	ignoreMethod?: boolean;
	ignoreSearch?: boolean;
	ignoreVary?: boolean;
}

// Client API

interface Client {
	frameType: ClientFrameType;
	id: string;
	url: string;
	postMessage(data: any): void
}

interface Clients {
	claim(): Promise<any>;
	get(id: string): Promise<Client>;
	matchAll(options?: ClientMatchOptions): Promise<Array<Client>>;
	openWindow(url: string): Promise<WindowClient>;
}

interface ClientMatchOptions {
	includeUncontrolled?: boolean;
	type?: ClientMatchTypes;
}

interface WindowClient {
	focused: boolean;
	visibilityState: WindowClientState;
	focus(): Promise<WindowClient>;
	navigate(url: string): Promise<WindowClient>;
}

type ClientFrameType = "auxiliary" | "top-level" | "nested" | "none";
type ClientMatchTypes = "window" | "worker" | "sharedworker" | "all";
type WindowClientState = "hidden" | "visible" | "prerender" | "unloaded";

// Fetch API

interface Body {
	arrayBuffer(): Promise<ArrayBuffer>;
	blob(): Promise<Blob>;
	formData(): Promise<FormData>;
	json(): Promise<any>;
	text(): Promise<string>;
}

interface FetchEvent extends ExtendableEvent {
	request: Request;
	preloadResponse: Promise<Response>;
	respondWith(response: Promise<Response>|Response): Promise<Response>;
}

interface InstallEvent extends ExtendableEvent {
	activeWorker: ServiceWorker
}

interface ActivateEvent extends ExtendableEvent {
}

interface Headers {
	new(init?: any): Headers;
	append(name: string, value: string): void;
	'delete'(name: string): void;
	entries(): Array<Array<string>>;
	get(name: string): string;
	getAll(name: string): Array<string>;
	has(name: string): boolean;
	keys(): Array<string>;
	set(name: string, value: string): void;
	values(): Array<string>;
}

interface Request extends Body {
	new(url: string, init?: {
		method?: string,
		url?: string,
		referrer?: string,
		mode?: 'cors'|'no-cors'|'same-origin'|'navigate',
		credentials?: 'omit'|'same-origin'|'include',
		redirect?: 'follow'|'error'|'manual',
		integrity?: string,
		cache?: 'default'|'no-store'|'reload'|'no-cache'|'force-cache'
		headers?: Headers
	}): Request;
	clone(): Request;
}

interface Response extends Body {
	new(url: string): Response;
	new(body: Blob|BufferSource|FormData|String, init: {
		status?: number,
		statusText?: string,
		headers?: (Headers|{ [k: string]: string })
	}): Response;
	useFinalURL: boolean;
	clone(): Response;
	error(): Response;
	redirect(): Response;
}

// Notification API

interface Notification {
	close(): void;
	requestPermission(): Promise<string>;
}

interface NotificationEvent {
	action: string;
	notification: Notification;
}

// Push API

interface PushEvent extends ExtendableEvent {
	data: PushMessageData;
}

interface PushManager {
	getSubscription(): Promise<PushSubscription>;
	permissionState(): Promise<string>;
	subscribe(): Promise<PushSubscription>;
}

interface PushMessageData {
	arrayBuffer(): ArrayBuffer;
	blob(): Blob;
	json(): any;
	text(): string;
}

interface PushSubscription {
	getKey(method: string): ArrayBuffer;
	toJSON(): string;
	unsubscribe(): Promise<boolean>;
}

// Sync API

interface SyncEvent extends Event {
	lastChance: boolean;
	tag: string;
}

// ServiceWorkerGlobalScope

declare var caches: CacheStorage;
declare var clients: Clients;
declare var onactivate: (event?: ExtendableEvent) => any;
declare var onfetch: (event?: FetchEvent) => any;
declare var oninstall: (event?: ExtendableEvent) => any;
declare var onmessage: (event: MessageEvent) => any;
declare var onnotificationclick: (event?: NotificationEvent) => any;
declare var onnotificationclose: (event?: NotificationEvent) => any;
declare var onpush: (event?: PushEvent) => any;
declare var onpushsubscriptionchange: () => any;
declare var onsync: (event?: SyncEvent) => any;
declare var registration: ServiceWorkerRegistration;

declare function fetch(request: Request|string): Promise<Response>;
declare function skipWaiting(): void;
`)
}