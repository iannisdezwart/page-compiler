import chalk from 'chalk'
import * as fs from 'fs'
import { db } from 'node-json-database'
import { resolve as resolvePath } from 'path'
import { deleteEmptyDirectories, dotDotSlashAttack, FilePath, log } from './util'

interface Page {
	html: string
	path: string
}

interface CompiledPages {
	path: string
}

const pageCache = new Map<string, any>()

export const pageCacheGet = (key: string) => {
	return pageCache.get(key)
}

export const pageCacheSet = (key: string, value: any) => {
	pageCache.set(key, value)
}

export const pageCacheHas = (key: string) => {
	return pageCache.has(key)
}

export const compilePages = async (pageCompileFns: (() => Promise<Page>)[]) => {
	// Store start time

	const start = Date.now()

	log('debug', 'Started compilation')

	// Write the ./root directory if it does not exist

	if (!fs.existsSync('root')) {
		fs.mkdirSync('root')
		log('info', `Created directory: ${ chalk.yellow('root') }`)
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

		log('info', `Created table: ${ chalk.yellow('compiled_pages') }`)
	}

	// Get tables

	const pagesToRemove = new Set<String>()
	const compiledPagesTable = pagesDB.table('compiled_pages')
	const compiledPages = compiledPagesTable.get().rows as CompiledPages[]

	for (const page of compiledPages) {
		pagesToRemove.add(page.path)
	}

	// Compile all pages

	for (const pageCompileFn of pageCompileFns) {
		pageCache.clear()
		const page = await pageCompileFn()

		// Create directory, if needed

		const filePath = new FilePath('./root' + page.path)

		if (!fs.existsSync(filePath.directory)) {
			fs.mkdirSync(filePath.directory, { recursive: true })
			log('info', `Created directory: ${ chalk.yellow(filePath.directory) }`)
		}

		// Security

		if (dotDotSlashAttack(`./root/${ page.path }`, './root')) {
			throw new Error(`Prevented creation of ${ resolvePath(`./root/${ page.path }`) }.`)
		}

		// Write the file

		fs.writeFileSync('./root' + page.path, page.html)
		log('info', `Wrote file: ${ chalk.yellow('./root' + page.path) }`)

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

			log('info', `Deleted file: ${ chalk.yellow(pagePath) }`)
		}

		// Delete path from compiled_pages table

		pagesDB.table('compiled_pages').deleteWhere(row => row.path == pageToRemove)
	}

	deleteEmptyDirectories('./root')

	log('info', `Finished compilation in ${ chalk.yellow(Date.now() - start) }ms`)
}