import { createHash } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { compressImage } from './import-images'

export interface SEO {
	description: string
	keywords: string[]
	author: string
	image?: string
	type?: string
	siteUrl?: string
}

export interface PageShellOptions {
	head?: string
	tail?: string
	bodyClasses?: string[]
}

export class PageShell {
	options: PageShellOptions

	constructor(options: PageShellOptions = {}) {
		this.options = options
	}

	appendToHead(html: string) {
		this.options.head += html
	}

	appendToTail(html: string) {
		this.options.tail += html
	}

	private renderHead() {
		return this.options.head == null ? '' : this.options.head
	}

	private renderTail() {
		return this.options.tail == null ? '' : this.options.tail
	}

	async render(title: string, body: string, seo: SEO, lang: string = "en") {
		let wideSeoImagePath: string

		if (seo.image != null) {
			mkdirSync('root/res/seo', { recursive: true })
			const imagePathHash = createHash('md5').update(seo.image).digest('hex')
			wideSeoImagePath = `/res/seo/${ imagePathHash }-wide`
			if (!existsSync('root' + wideSeoImagePath + '.jpg')) {
				await compressImage(
					seo.image,
					'root' + wideSeoImagePath,
					1200,
					1.905,
					{
						quality: 65,
						alt: 'SEO Image',
						extensions: [ 'jpg' ],
						forceSize: true,
					}
				)
			}
		}

		const seoImagePrefix = seo.siteUrl || ''

		return /* html */ `
		<!DOCTYPE html>
		<html lang="${lang}" dir="ltr">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${ title }</title>
				<meta content="${ title }" property="og:title">
				${ seo.type != null ? /* html */ `
				<meta content="${ seo.type || 'article' }" property="og:type">
				` : '' }
				${ seo.image != null ? /* html */ `
				<meta name="thumbnail" content="${ seoImagePrefix + wideSeoImagePath }.jpg">
				<meta name="og:image" content="${ seoImagePrefix + wideSeoImagePath }.jpg">
				<meta name="og:image:width" content="1200">
				<meta name="og:image:height" content="630">
				` : '' }
				<meta name="description" content="${ seo.description }">
				<meta name="og:description" content="${ seo.description }">
				<meta name="keywords" content="${ seo.keywords.join(', ') }">
				<meta name="author" content="${ seo.author }">
				${ this.renderHead() }
			</head>
			<body ${ this.options.bodyClasses == null || this.options.bodyClasses.length == 0
				? '' : `class="${ this.options.bodyClasses.join(' ') }"` }>
				${ body }
				${ this.renderTail() }
			</body>
		</html>
		`
	}
}