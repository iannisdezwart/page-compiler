import chalk from 'chalk'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as graphicsMagick from 'gm'
import imageSize from 'image-size'
import { XMLNode, buildXML, parseXML } from 'node-xml-parser'
import { OptimizedSvg, optimize as optimiseSVG } from 'svgo'
import { FilePath, log } from './util'

const standardImageDimensions = [
	640, 960, 1280, 1920, 2560, 3840
]

const imageScales = new Map<number, [ number, number, number, number, number ]>([
	[  640, [  640,  960, 1280, 1920, 1920 ] ],
	[  960, [  960, 1920, 1920, 2560, 3840 ] ],
	[ 1280, [ 1280, 1920, 2560, 3840, 3840 ] ],
	[ 1920, [ 1920, 2560, 3840, 3840, 3840 ] ],
	[ 2560, [ 2560, 3840, 3840, 3840, 3840 ] ],
	[ 3840, [ 3840, 3840, 3840, 3840, 3840 ] ],
])

interface ImportImageOptions {
	widthRatio?: number
	heightRatio?: number
	quality?: number
	id?: string
	classes?: string[]
	alt: string
	extensions?: string[]
	forceSize?: boolean
}

const imageMagick = graphicsMagick.subClass({ imageMagick: true })

export const compressImage = (
	path: string,
	outputPath: string,
	dimension: number,
	aspectRatio: number,
	options: ImportImageOptions,
) => new Promise<void>(resolve => {
	const imageState = imageMagick(path)

	if (options.forceSize) {
		imageState
			.resize(dimension, dimension / aspectRatio, '^')
			.gravity('Center')
			.extent(dimension, dimension / aspectRatio)
	} else {
		imageState
			.resize(dimension, dimension / aspectRatio, '>')
	}

	imageState
		.quality(options.quality)
		.strip()
		.interlace('Plane')
		.samplingFactor(4, 2)

	let finishedImages = 0

	const imageWriteCallback = (path: string) => (err: Error) => {
		if (err != null) {
			console.error('error while converting image:', err)
			throw err
		}

		log('info', `Processed image: ${ chalk.yellow(path) }`)

		finishedImages++
		if (finishedImages == options.extensions.length) resolve()
	}

	for (const extension of options.extensions) {
		imageState.write(outputPath + '.' + extension, imageWriteCallback(outputPath + '.' + extension))
	}
})

export const importJPG = (
	path: string,
	options: ImportImageOptions
) => new Promise<string>(async resolve => {
	log('debug', `Importing JPG: ${ chalk.yellow(path) }`)

	// Get width, height & aspect ratio of image

	const { width, height } = imageSize(fs.readFileSync(path))
	const aspectRatio = width / height

	// Set default options

	if (options.widthRatio == null) {
		if (options.heightRatio == null) {
			options.widthRatio = 1
			options.heightRatio = 1
		} else {
			options.widthRatio = aspectRatio * options.heightRatio
		}
	} else if (options.heightRatio == null) {
		options.heightRatio = options.widthRatio / aspectRatio
	}

	options = {
		quality: 65,
		id: null,
		classes: [],
		extensions: [ 'jpg', 'webp' ],
		...options
	}

	const imageDimensions = standardImageDimensions.map(el => el * options.widthRatio)
	const inputFilePath = new FilePath(path)
	const outputFilename = `${ inputFilePath.filename }-${ options.widthRatio }`
	const outputDirectory = `root/res/${ inputFilePath.directory }`

	// Create output directory, if needed

	if (!fs.existsSync(outputDirectory)) {
		fs.mkdirSync(outputDirectory, { recursive: true })
		log('info', `Created directory: ${ chalk.yellow(outputDirectory) }`)
	}

	// Called when all images have been processed

	const finish = () => {
		const createURL = (size: number, extension: string) => {
			return encodeURI(`/res/${ inputFilePath.directory }/${ outputFilename }-${ size }.${ extension }?cache-age=604800`)
		}

		const createSource = (size: number, extension: string) => {
			const sizes = imageScales.get(size)

			const url1x = createURL(sizes[0], extension)
			const url1_5x = createURL(sizes[1], extension)
			const url2x = createURL(sizes[2], extension)
			const url2_5x = createURL(sizes[3], extension)
			const url3x = createURL(sizes[4], extension)

			return /* html */ `
			<source type="image/${ extension }" media="(max-width: ${ size }px)"
				srcset="${ url1x } ${ size }w, ${ url1_5x } 1.5x, ${ url2x } 2x, ${ url2_5x } 2.5x, ${ url3x } 3x">
			`
		}

		resolve(/* html */ `
		<picture>
			${ createSource(640, 'webp') }
			${ createSource(640, 'jpg') }
			${ createSource(960, 'webp') }
			${ createSource(960, 'jpg') }
			${ createSource(1280, 'webp') }
			${ createSource(1280, 'jpg') }
			${ createSource(1920, 'webp') }
			${ createSource(1920, 'jpg') }
			${ createSource(2560, 'webp') }
			${ createSource(2560, 'jpg') }
			${ createSource(3840, 'webp') }
			${ createSource(3840, 'jpg') }
			<img src="/res/${ inputFilePath.directory }/${ outputFilename }-640.jpg?cache-age=604800"
				alt="${ options.alt }" ${ options.id == null ? '' : `id="${ options.id }"` }
				${ options.classes.length == 0 ? '' : `class="${ options.classes.join(' ') }"` }>
		</picture>
		`)
	}

	// Check if the images have already been processed

	let imagesAlreadyProcessed = true

	for (const standardDimension of standardImageDimensions) {
		const path = `${ outputDirectory }/${ outputFilename }-${ standardDimension }`

		if (!fs.existsSync(path + '.jpg') && !fs.existsSync(path + '.webp')) {
			imagesAlreadyProcessed = false
			break
		}
	}

	if (imagesAlreadyProcessed) {
		log('debug', `Images already processed: ${ chalk.yellow(path) }`)
		finish()
		return
	}

	// Process all images and then resolve the html

	for (let i = 0; i < imageDimensions.length; i++) {
		const dimension = imageDimensions[i]
		const standardDimension = standardImageDimensions[i]
		const outputPath = `${ outputDirectory }/${ outputFilename }-${ standardDimension }`

		await compressImage(path, outputPath, dimension, aspectRatio, options)
	}

	finish()
})

interface ImportSVGOptions {
	alt?: string
	id?: string
	classes?: string[]
}

export const inlineSVG = (path: string, options: ImportSVGOptions = {}) => {
	options = {
		alt: '',
		classes: [],
		...options
	}

	const svgFile = fs.readFileSync(path, 'utf-8')
	const hash = createHash('md5').update(svgFile).digest('hex')

	if (fs.existsSync(`cache/svg/${ hash }.svg`)) {
		log('debug', `Inlined cached SVG for ${ chalk.yellow(path) }`)
		return fs.readFileSync(`cache/svg/${ hash }.svg`, 'utf-8')
	}

	log('debug', `Inlining SVG: ${ chalk.yellow(path) }`)

	const optimisedSVG = optimiseSVG(
		svgFile,
		{
			multipass: true,
			path: `./${ path }`,
			plugins: [
				'cleanupAttrs',
				'mergeStyles',
				'inlineStyles',
				'removeDoctype',
				'removeXMLProcInst',
				'removeComments',
				'removeMetadata',
				'removeTitle',
				'removeDesc',
				'removeUselessDefs',
				'removeXMLNS',
				'removeEmptyAttrs',
				'removeHiddenElems',
				'removeEmptyText',
				'removeEmptyContainers',
				// 'removeViewBox',
				'cleanupEnableBackground',
				'minifyStyles',
				'convertStyleToAttrs',
				'convertColors',
				'convertPathData',
				'convertTransform',
				'removeUnknownsAndDefaults',
				'removeNonInheritableGroupAttrs',
				'removeUselessStrokeAndFill',
				'removeUnusedNS',
				'prefixIds',
				// 'cleanupIDs',
				'cleanupNumericValues',
				// 'cleanupListOfValues',
				'moveElemsAttrsToGroup',
				'moveGroupAttrsToElems',
				'collapseGroups',
				'mergePaths',
				'convertShapeToPath',
				'convertEllipseToCircle',
				'sortAttrs',
				'sortDefsChildren',
			]
		}
	)

	if (optimisedSVG.error != null) {
		throw 'Error inlining SVG: ' + optimisedSVG.error
	}

	const svg = parseXML((optimisedSVG as OptimizedSvg).data)

	if (options.id != null) {
		svg.attributes.set('id', options.id)
	}

	if (options.classes.length > 0) {
		svg.attributes.set('class', options.classes.join(' '))
	}

	svg.children.unshift(new XMLNode('title', {}, [ options.alt ]))

	const svgString = buildXML(svg, {
		indentationSize: 0,
		seperator: ''
	})

	const cachedFilename = `cache/svg/${ hash }.svg`

	if (!fs.existsSync('cache/svg')) {
		fs.mkdirSync('cache/svg', { recursive: true })
		log('debug', `Created directory: ${ chalk.yellow('cache/svg') }`)
	}

	fs.writeFileSync(cachedFilename, svgString)

	return svgString
}

export const inlineSVGBackgroundImage = (path: string) => {
	const svgFile = fs.readFileSync(path, 'utf-8')
	const svg = parseXML(svgFile)

	return encodeURI('data:image/svg+xml;base64,' + Buffer.from(buildXML(svg, { indentationSize: 0, seperator: '' })).toString('base64'))
}