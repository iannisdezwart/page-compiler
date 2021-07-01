import { inlineExternalCSS } from './inline-code'

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

	return /* html */ `
	<link rel="preconnect" href="https://fonts.gstatic.com">
	${ await inlineExternalCSS(url) }
	`
}