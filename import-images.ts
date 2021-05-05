import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import * as chalk from 'chalk'
import * as graphicsMagick from 'gm'
import imageSize from 'image-size'
import { FilePath } from './util'

const standardImageDimensions = [
	640, 960, 1280, 1440, 1600, 1920, 2400, 2560, 2880, 3200, 3840
]

// 1.0x: [  640,  960, 1280, 1920, 2560, 3840 ]
// 1.5x: [  960, 1440, 1920, 2880, 3840, 3840 ]
// 2.0x: [ 1280, 1920, 2560, 3840, 3840, 3840 ]
// 2.5x: [ 1600, 2400, 3200, 3840, 3840, 3840 ]
// 3.0x: [ 1920, 2880, 3840, 3840, 3840, 3840 ]

interface ImportImageOptions {
	widthRatio?: number
	heightRatio?: number,
	quality?: number
	id?: string,
	classes?: string[]
}

const imageMagick = graphicsMagick.subClass({ imageMagick: true })

export const importJPG = (
	path: string,
	alt: string,
	options: ImportImageOptions = {}
) => new Promise<string>(resolve => {
	// Get width, height & aspect ratio of image

	const { width, height } = imageSize(path)
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
		...options
	}

	const imageDimensions = standardImageDimensions.map(el => el * options.widthRatio)
	const inputFilePath = new FilePath(path)
	const outputFilename = `${ inputFilePath.filename }-${ options.widthRatio }`
	const outputDirectory = `root/res/${ inputFilePath.directory }`
	let finishedImages = 0

	// Create output directory, if needed

	if (!fs.existsSync(outputDirectory)) {
		fs.mkdirSync(outputDirectory, { recursive: true })
		console.log(`${ chalk.green('✔') } Created directory: ${ chalk.yellow(outputDirectory) }`)
	}

	// Called when all images have been processed

	const finish = () => {
		const createURL = (size: number, extension: string) => {
			return `/res/${ inputFilePath.directory }/${ outputFilename }-${ size }.${ extension }?cache-age=604800`
		}

		const createSource = (size: number, extension: string) => {
			const url1x = createURL(size, extension)
			const url1_5x = createURL(Math.min(3840, size * 1.5), extension)
			const url2x = createURL(Math.min(3840, size * 2), extension)
			const url2_5x = createURL(Math.min(3840, size * 2.5), extension)
			const url3x = createURL(Math.min(3840, size * 3), extension)

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
				alt="${ alt }" ${ options.id == null ? '' : `id="${ options.id }"` }
				${ options.classes.length == 0 ? '' : `class=${ options.classes.join(' ') }` }>
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
		finish()
		return
	}

	// Process all images and then resolve the html

	for (let i = 0; i < imageDimensions.length; i++) {
		const dimension = imageDimensions[i]
		const standardDimension = standardImageDimensions[i]

		const outputPath = `${ outputDirectory }/${ outputFilename }-${ standardDimension }`

		const imageState = imageMagick(path)
			.resize(dimension, dimension / aspectRatio, '>')
			.quality(options.quality)
			.strip()
			.interlace('Plane')
			.colorspace('RGB')
			.samplingFactor(4, 2)

			const imageWriteCallback = (path: string) => (err: Error) => {
				if (err != null) {
					console.error('error while converting image:', err)
					throw err
				}

				console.log(`${ chalk.green('✔') } Processed image: ${ chalk.yellow(resolvePath(path)) }`)

				finishedImages++
				if (finishedImages == imageDimensions.length * 2) finish()
			}

			imageState.write(outputPath + '.webp', imageWriteCallback(outputPath + '.webp'))
			imageState.write(outputPath + '.jpg', imageWriteCallback(outputPath + '.jpg'))
	}
})