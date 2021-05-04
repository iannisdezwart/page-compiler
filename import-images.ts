import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import * as chalk from 'chalk'
import * as graphicsMagick from 'gm'
import imageSize from 'image-size'
import { FilePath } from './util'

const standardImageDimensions = [ 640, 900, 1280, 1920, 2560, 3840 ]

interface ImportImageOptions {
	widthRatio?: number
	heightRatio?: number,
	id?: string,
	classes?: string[]
}

const imageMagick = graphicsMagick.subClass({ imageMagick: true })

let importedImages = 0

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
		const id = importedImages++

		resolve(/* html */ `
		<img ${ options.id != null ? `id="${ options.id }"` : '' } class="img-${ id } ${ options.classes.join(' ') }" alt="${ alt }">
		<script>
			var img = document.querySelector('.img-${ id }');
			var width = screen.width * devicePixelRatio;

			if (width <= 640) {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-640.jpg';
			}
			else if (width <= 900) {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-900.jpg';
			}
			else if (width <= 1280) {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-1280.jpg';
			}
			else if (width <= 1920) {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-1920.jpg';
			}
			else if (width <= 2560) {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-2560.jpg';
			}
			else {
				img.src = '/res/${ inputFilePath.directory }/${ outputFilename }-3840.jpg';
			}
		</script>
		`)
	}

	// Check if the images have already been processed

	let imagesAlreadyProcessed = true

	for (const standardDimension of standardImageDimensions) {
		if (!fs.existsSync(`${ outputDirectory }/${ outputFilename }-${ standardDimension }.jpg`)) {
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

		const outputPath = `${ outputDirectory }/${ outputFilename }-${ standardDimension }.jpg`

		imageMagick(path)
			.resize(dimension, dimension / aspectRatio, '>')
			.quality(85)
			.strip()
			.interlace('Plane')
			.colorspace('RGB')
			.samplingFactor(4, 2)
			.write(outputPath, err => {
				if (err != null) {
					console.error('error while converting image:', err)
					throw err
				}

				console.log(`${ chalk.green('✔') } Processed image: ${ chalk.yellow(resolvePath(outputPath)) }`)

				finishedImages++
				if (finishedImages == imageDimensions.length) finish()
			})
	}
})