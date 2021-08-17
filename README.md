# PageCompiler

This is a very simple, yet powerful and intuitive TypeScript framework and a collection of tools that makes web(app) development simple.
PageCompiler does what you might expect: it compiles pages.
With it, you can dynamically create static websites.
PageCompiler's main purpose is performance: the compiled pages are supposed to be as fast as possible.
You can expect near 100% Google Lighthouse scores on well formed pages, even with images.
The most powerful thing of PageCompiler is the ability to interpolate JavaScript/TypeScript in your HTML files.
This code will be executed at compile time.
PageCompiler's built-in tools take advantage of this.

## Try it out!

You can create an example project structure as follows:

```sh
$ npm i page-compiler
$ node node_modules/page-compiler/create-app --sass
```

This will create an empty page-compiler template app with SASS support.
I would recommend installing a JS HTML template string extension like [this one for VSCode](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for best development experience.

Open the `compiler.ts` file that has been created in the root directory.
You will see that the `compilePages()` function is called with an array of pages as its argument.
The HTML of a sample page can be placed here inside an html string.
You can obviously also put the html strings in a seperate files.
You don't have to write an entire HTML shell, as that would be very dull.
The `PageShell` tool does that for you.

The main SASS file for our page shell is located at `src/sass/index.sass`.
The main client-side TS file is located at `src/js/index.ts`.

You need to compile the TypeScript files before you can use import them into the compiler.
Simply keep a terminal window open and execute `$ tsc`.
The TypeScript Configuration file is already set up, so no need to worry about it.

You can import other JS, SASS and CSS files with the inline tools.

When your webapp is ready to be tested, compile the pages with `$ node compiler`.
The pages will be compiled into the `root` directory.
Use your favourite webserver and set the webroot to this directory to host your website.

## Tools reference

### Importing images

This is the main reason I created PageCompiler.
Images of all kinds (JPG, PNG, SVG, etc.) are a very important part of any modern website.
But in plain HTML/CSS/JS, it is really hard to dynamically optimise the imagery on your website.

PageCompiler offers straightforward solutions to loading images into your webapps.

#### Importing raster images

You can import JPGs, PNGs and other raster images with the `importJPG()` tool.
This tool compresses and converts the input images into different sizes and formats.
The `importJPG()` tool creates images in JPG and WEBP formats.
A `<picture>` HTML element is returned containing the source sets of the created images.
This tool takes care of all browser compatibility, so you can simply import an image with a single line of code.
You need to have imagemagick installed on your system in order to use this tool.

Example:

```ts
import { importJPG } from 'page-compiler'

/* html */ `
<div id="my-app">
	${ importJPG('src/img/bear.png', { alt: 'An image of a bear' }) }
</div>
`
```

This code will get compiled into an HTML structure like this:

```html
<div id="my-app">
	<picture>
		<source .../>
		...
		<img src="..."/>
	</picture>
</div>
```

#### Inlining SVGs

SVG images can be directly inlined within the HTML pages of your webapp.
This reduces the request count and server load.

Example:

```ts
import { inlineSVG } from 'page-compiler'

/* html */ `
<div id="my-app">
	${ inlineSVG('src/img/twitter-icon.svg', { class: 'social-icon' }) }
</div>
`
```

This code will get compiled into an HTML structure like this:

```html
<div id="my-app">
	<svg class="social-icon">...</svg>
</div>
```

### Importing Web Fonts

You can easily import fonts from Google Fonts with the `importGoogleFont()` tool.

Example:

```ts
import { importGoogleFont } from 'page-compiler'

const pageShell = new PageShell({
	head: /* html */ `
	${ await importGoogleFont('Roboto', [
		{ weight: 300, italic: true },
		{ weight: 500 }
	]) }
	`
})
```

You can use the font in CSS/SASS files:

```css
.selector {
	font-family: 'Roboto', sans-serif;
	font-size: 500;
}
```

### Inlining code

JS, CSS and SASS scripts can be directly inlined within the HTML pages of your webapp.
This reduces the request count and server load.
CSS and SASS scripts are auto-prefixed.

Example:

```ts
import { inlineJS, inlineSASS, inlineExternalJS, inlineExternalCSS } from 'page-compiler'

/* html */ `
${ await inlineJS('src/js/contact-page.js') }
${ await inlineSASS('src/sass/contact-page.sass') }

${ await inlineExternalJS('https://some-cdn.com/some-contact-form-library.js') }
${ await inlineExternalCSS('https://some-cdn.com/some-contact-form-library.css') }

<div id="contact">
	...
</div>
`
```

This code will get compiled into an HTML structure like this:

```html
<script> ... </script>
<style> ... </style>

<script> ... </script>
<style> ... </style>

<div id="contact">
	...
</div>
```

### Progressive Web Apps (PWA)

PageCompiler also has tools to make creating PWAs much easier.
You can create a project structure for a PWA with SASS support with the following command:

```sh
$ node node_modules/page-compiler/create-app --sass --pwa
```

In the `compiler.ts` you will see the `createPWAManifest()` tool being used.
You can change and add fields of the manifest.

This command also creates a sample service worker file `src/js/service-worker.js` which handles caching.
It is imported using the `importServiceWorker()` tool in `compiler.ts`.