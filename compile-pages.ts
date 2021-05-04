import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import { db } from 'node-json-database'
import * as chalk from 'chalk'
import {
	deleteEmptyDirectories,
	dotDotSlashAttack,
	getDirectory
} from './util'

interface Page {
	html: string
	path: string
}

interface CompiledPages {
	path: string
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