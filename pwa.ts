import * as fs from 'fs'
import { FilePath, scaleImages } from './util'
import * as mime from 'mime-types'
import { PageShell } from './page-shell'

interface PWAManifestProtocolHandler {
	protocol: string
	url: string
}

interface PWAManifestRelatedApplication {
	platform: 'chrome_web_store' | 'play' | 'itunes' | 'webapp' | 'windows'
	url: string
	id?: string
}

interface PWAManifestShortcut {
	name: string
	shortName?: string
	description?: string
	url: string
	icon?: string
}

interface PWAManifest {
	backgroundColour?: string
	categories?: string[]
	description?: string
	dir?: 'auto' | 'ltr' | 'rtl'
	display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'
	iarcRatingID?: string
	icon: {
		svg?: string
		png?: string
	}
	lang?: string
	name: string
	orientation?: 'any' | 'natural' | 'landscape' | 'landscape-primary'
		| 'landscape-secondary' | 'portrait' | 'portrait-primary' | 'portrait-secondary'
	preferRelatedApplications?: boolean
	protocolHandlers?: PWAManifestProtocolHandler[]
	relatedApplications?: PWAManifestRelatedApplication[]
	scope?: string
	screenshots?: string[]
	shortName?: string
	shortcuts?: PWAManifestShortcut[]
	startURL?: string
	themeColour?: string
}

export const createPWAManifest = async (manifest: PWAManifest, page: PageShell) => {
	const json = {}

	if (manifest.backgroundColour != null) {
		json['background_color'] = manifest.backgroundColour
	}

	if (manifest.categories != null && manifest.categories.length != 0) {
		json['categories'] = manifest.categories
	}

	if (manifest.description != null) {
		json['description'] = manifest.description
	}

	if (manifest.dir != null) {
		json['dir'] = manifest.dir
	}

	if (manifest.display != null) {
		json['display'] = manifest.display
	}

	if (manifest.iarcRatingID != null) {
		json['iarc_rating_id'] = manifest.iarcRatingID
	}

	if (manifest.icon != null) {
		if (!fs.existsSync('root/res/pwa')) {
			fs.mkdirSync('root/res/pwa', { recursive: true })
		}

		json['icons'] = []

		if (manifest.icon.svg != null) {
			fs.copyFileSync(manifest.icon.svg, 'root/res/pwa/icon.svg')

			json['icons'].push({
				src: '/res/pwa/icon.svg',
				type: 'image/svg'
			})
		}

		if (manifest.icon.png != null) {
			const sizes = [ 72, 96, 128, 144, 152, 192, 384, 512 ]
			const { extension } = new FilePath(manifest.icon.png)

			await scaleImages(manifest.icon.png,
				sizes.map(size => ({ width: size, height: size })),
				90, 'root/res/pwa', 'icon')

			json['icons'].push(...sizes.map(size => ({
				src: `/res/pwa/icon-${ size }x${ size }.${ extension }`,
				sizes: `${ size }x${ size }`,
				type: mime.lookup(extension)
			})))
		}
	}

	if (manifest.lang != null) {
		json['lang'] = manifest.lang
	}

	if (manifest.name != null) {
		json['name'] = manifest.name
	}

	if (manifest.orientation != null) {
		json['orientation'] = manifest.orientation
	}

	if (manifest.preferRelatedApplications != null) {
		json['prefer_related_applications'] = manifest.preferRelatedApplications
	}

	if (manifest.protocolHandlers != null && manifest.protocolHandlers.length > 0) {
		json['protocol_handlers'] = manifest.protocolHandlers
	}

	if (manifest.relatedApplications != null && manifest.relatedApplications.length > 0) {
		json['related_applications'] = manifest.relatedApplications
	}

	if (manifest.scope != null) {
		json['scope'] = manifest.scope
	}

	if (manifest.screenshots != null && manifest.screenshots.length > 0) {
		json['screenshots'] = manifest.screenshots
	}

	if (manifest.shortName != null) {
		json['short_name'] = manifest.shortName
	}

	if (manifest.shortcuts != null && manifest.shortcuts.length > 0) {
		json['shortcuts'] = manifest.shortcuts
	}

	if (manifest.startURL != null) {
		json['start_url'] = manifest.startURL
	}

	if (manifest.themeColour != null) {
		json['theme_color'] = manifest.themeColour
	}

	fs.writeFileSync('root/manifest.json', JSON.stringify(json))

	page.appendToHead(/* html */ `
	<link rel="manifest" href="/manifest.json">
	`)
}