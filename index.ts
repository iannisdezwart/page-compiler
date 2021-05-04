import * as fs from 'fs'
import * as https from 'https'
import * as chalk from 'chalk'
import { resolve as resolvePath } from 'path'
import { db } from 'node-json-database'
import * as graphicsMagick from 'gm'
import imageSize from 'image-size'

interface Page {
	html: string
	path: string
}

interface CompiledPages {
	path: string
}

const getDirectory = (path: string) => {
	let i = path.length - 1
	while (path.charAt(i) != '/' && path.length > 0) i--
	return path.slice(0, i)
}

const getFilename = (path: string) => {
	let i = path.length - 1
	while (path.charAt(i) != '/' && path.length > 0) i--
	return path.slice(i + 1)
}

const getFilenameWithoutExtension = (filename: string) => {
	let i = filename.length - 1
	while (filename.charAt(i) != '.' && filename.length > 0) i--
	return filename.slice(0, i)
}

const deleteEmptyDirectories = (dirPath: string) => {
	const files = fs.readdirSync(dirPath)

	if (files.length == 0) {
		// This directory is empty, delete it

		fs.rmdirSync(dirPath)
		console.log(`${ chalk.green('✔') } Deleted empty directory: ${ chalk.red(resolvePath(dirPath)) }`)
	} else {
		// Recursively call deleteEmptyDirectories on any subdirectory

		for (let file of files) {
			const subDirPath = `${ dirPath }/${ file }`

			if (fs.statSync(subDirPath).isDirectory()) {
				deleteEmptyDirectories(subDirPath)
			}
		}
	}
}

const dotDotSlashAttack = (path: string, root: string) => {
	const resolvedPath = resolvePath(path)
	const rootPath = resolvePath(root)

	if (!resolvedPath.startsWith(rootPath)) {
		return true
	}

	return false
}

export const compilePages = (pages: Page[]) => {
	// Store start time

	const start = Date.now()

	// Write the ./root directory if it does not exist

	if (!fs.existsSync('root')) {
		fs.mkdirSync('root')
	}

	const pagesDB = db('pages.json')

	// Create database if it does not exist

	if (!pagesDB.exists) {
		pagesDB.create()
	}

	// Create the table structure if it does not exist

	if (!pagesDB.table('compiled_pages').exists) {
		const compiledPages = pagesDB.table('compiled_pages')
		compiledPages.create()

		compiledPages.columns.add([
			{
				name: 'path',
				dataType: 'String',
				constraints: [ 'primaryKey' ]
			}
		])
	}

	// Get tables

	const pagesToRemove = new Set<String>()
	const compiledPagesTable = pagesDB.table('compiled_pages')
	const compiledPages = compiledPagesTable.get().rows as CompiledPages[]

	for (const page of compiledPages) {
		pagesToRemove.add(page.path)
	}

	// Compile all pages

	for (const page of pages) {
		// Create directory, if needed

		const directory = getDirectory('./root' + page.path)

		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory, { recursive: true })
			console.log(`${ chalk.green('✔') } Created directory: ${ chalk.yellow(directory) }`)
		}

		// Security

		if (dotDotSlashAttack(`./root/${ page.path }`, './root')) {
			throw new Error(`Prevented creation of ${ resolvePath(`./root/${ page.path }`) }.`)
		}

		// Write the file

		fs.writeFileSync('./root' + page.path, page.html)
		console.log(`${ chalk.green('✔') } Wrote file: ${ chalk.yellow(resolvePath('./root' + page.path)) }`)

		// Remove the file from pagesToRemove

		pagesToRemove.delete(page.path)

		// Store the page path in the database

		const alreadyCompiledPages = compiledPagesTable
			.get()
			.where(row => row.path == page.path)
			.rows

		// Only store if the path does not exist yet

		if (alreadyCompiledPages.length == 0) {
			compiledPagesTable.insert([ { path: page.path } ])
		}
	}

	// Remove all unnecessary files

	for (const pageToRemove of pagesToRemove) {
		const pagePath = './root' + pageToRemove

		if (fs.existsSync(pagePath)) {
			// Security

			if (dotDotSlashAttack(pagePath, './root')) {
				throw new Error(`Prevented deletion of ${ resolvePath(pagePath) }.`)
			}

			// Delete file

			fs.unlinkSync(pagePath)

			console.log(`${ chalk.green('✔') } Deleted unnecessary file: ${ chalk.red(resolvePath(pagePath)) }`)
		}

		// Delete path from compiled_pages table

		pagesDB.table('compiled_pages').deleteWhere(row => row.path == pageToRemove)
	}

	deleteEmptyDirectories('./root')

	console.log(`${ chalk.green('✔') } Finished compilation in ${ Date.now() - start }ms`)
}

export const inlineJS = (path: string) => /* html */ `
<script>
	${ fs.readFileSync(path, 'utf-8') }
</script>
`

export const inlineCSS = (path: string) => /* html */ `
<style>
	${ fs.readFileSync(path, 'utf-8') }
</style>
`

export const inlineExternalJS = (url: string) => new Promise<string>(resolve => {
	let html = '<script>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</script>'
			resolve(html)
		})
	})
})

export const inlineExternalCSS = (url: string) => new Promise<string>(resolve => {
	let html = '<style>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</style>'
			resolve(html)
		})
	})
})

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
	const inputDirectory = getDirectory(path)
	const filename = getFilename(path)
	const filenameWithoutExtension = `${ getFilenameWithoutExtension(filename) }-${ options.widthRatio }`
	const outputDirectory = `root/res/${ inputDirectory }`
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
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-640.jpg';
			}
			else if (width <= 900) {
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-900.jpg';
			}
			else if (width <= 1280) {
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-1280.jpg';
			}
			else if (width <= 1920) {
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-1920.jpg';
			}
			else if (width <= 2560) {
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-2560.jpg';
			}
			else {
				img.src = '/res/${ inputDirectory }/${ filenameWithoutExtension }-3840.jpg';
			}
		</script>
		`)
	}

	// Check if the images have already been processed

	let imagesAlreadyProcessed = true

	for (const standardDimension of standardImageDimensions) {
		if (!fs.existsSync(`${ outputDirectory }/${ filenameWithoutExtension }-${ standardDimension }.jpg`)) {
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

		const outputPath = `${ outputDirectory }/${ filenameWithoutExtension }-${ standardDimension }.jpg`

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