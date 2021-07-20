import { inlineExternalCSS } from './inline-code'
import * as LRU from 'lru-cache'

const fontCache = new LRU<string, string>({
	max: 100 * 1024 * 1024, // 100 MB
	length: value => value.length
})

interface FontStyle {
	weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
	italic: boolean
}

export const importGoogleFont = async (fontFamily: string, styles: FontStyle[]) => {
	const stylesString = styles
		.sort((a, b) => {
			if (a.italic && !b.italic) return 1
			if (b.italic && !a.italic) return -1
			return a.weight - b.weight
		})
		.map(style => `${ style.italic ? 1 : 0 },${ style.weight }`)
		.join(';')

	const url = `https://fonts.googleapis.com/css2?family=${ fontFamily }:ital,wght@${ stylesString }&display=swap`

	if (fontCache.has(url)) return fontCache.get(url)

	const css = /* html */ `
	<link rel="preconnect" href="https://fonts.gstatic.com">
	${ await inlineExternalCSS(url) }
	`

	fontCache.set(url, css)
	return css
}