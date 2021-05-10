interface SEO {
	description: string
	keywords: string[]
	author: string
}

interface PageShellOptions {
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

	render(title: string, body: string, seo: SEO) {
		return /* html */ `
		<!DOCTYPE html>
		<html lang="en" dir="ltr">
			<head>
				<meta charset="utf-8">
				<meta name="description" content="${ seo.description }">
				<meta name="keywords" content="${ seo.keywords.join(', ') }">
				<meta name="author" content="${ seo.author }">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${ title }</title>
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