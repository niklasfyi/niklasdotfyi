#!/usr/bin/env tsx

import * as p from '@clack/prompts';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Helper: Convert title to URL-safe slug
function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Helper: Get current UTC date in ISO 8601 format
function getCurrentUTCDate(): string {
	return new Date().toISOString();
}

// Helper: Get Unix timestamp in seconds
function getUnixTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

// Helper: Ensure directory exists
function ensureDirectory(dirPath: string): void {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive: true });
	}
}

// Helper: Recursively scan directories for markdown files
function getAllMarkdownFiles(dir: string, fileList: string[] = []): string[] {
	if (!existsSync(dir)) {
		return fileList;
	}

	const files = readdirSync(dir, { withFileTypes: true });

	for (const file of files) {
		const fullPath = join(dir, file.name);
		if (file.isDirectory()) {
			getAllMarkdownFiles(fullPath, fileList);
		} else if (file.name.endsWith('.md')) {
			fileList.push(fullPath);
		}
	}

	return fileList;
}

// Helper: Extract tags from frontmatter
function extractTagsFromFile(filePath: string): string[] {
	try {
		const content = readFileSync(filePath, 'utf-8');
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

		if (!frontmatterMatch) return [];

		const frontmatter = frontmatterMatch[1];
		const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);

		if (tagsMatch) {
			return tagsMatch[1]
				.split(',')
				.map((tag) => tag.trim().replace(/['"]/g, ''))
				.filter((tag) => tag.length > 0);
		}

		// Handle YAML array format
		const tagsLines = frontmatter.match(/tags:\n((?:  - .+\n?)+)/);
		if (tagsLines) {
			return tagsLines[1]
				.split('\n')
				.map((line) => line.trim().replace(/^- /, '').replace(/['"]/g, ''))
				.filter((tag) => tag.length > 0);
		}

		return [];
	} catch (error) {
		return [];
	}
}

// Helper: Scan existing tags from all articles and notes
function scanExistingTags(contentDir: string): string[] {
	const articleFiles = getAllMarkdownFiles(join(contentDir, 'article'));
	const noteFiles = getAllMarkdownFiles(join(contentDir, 'note'));

	const allTags = new Set<string>();

	for (const file of [...articleFiles, ...noteFiles]) {
		const tags = extractTagsFromFile(file);
		for (const tag of tags) {
			allTags.add(tag);
		}
	}

	return Array.from(allTags).sort();
}

// Main function
async function main() {
	console.clear();

	p.intro('✨ Create new content');

	const contentDir = join(process.cwd(), 'src', 'content');

	// Step 1: Select content type
	const contentType = await p.select({
		message: 'What type of content do you want to create?',
		options: [
			{ value: 'article', label: 'Article', hint: 'Long-form blog post' },
			{ value: 'note', label: 'Note', hint: 'Short-form post' },
		],
	});

	if (p.isCancel(contentType)) {
		p.cancel('Operation cancelled');
		process.exit(0);
	}

	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	const date = getCurrentUTCDate();

	let filePath: string;
	let frontmatter: string;

	if (contentType === 'article') {
		// Article flow
		const title = await p.text({
			message: 'What is the article title?',
			placeholder: 'My Awesome Article',
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Title is required';
				}
				if (value.length > 60) {
					return 'Title must be 60 characters or less';
				}
			},
		});

		if (p.isCancel(title)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		// Generate and confirm slug
		const suggestedSlug = slugify(title as string);
		const slug = await p.text({
			message: 'Confirm or edit the slug:',
			placeholder: suggestedSlug,
			defaultValue: suggestedSlug,
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Slug is required';
				}
				if (!/^[a-z0-9-]+$/.test(value)) {
					return 'Slug must contain only lowercase letters, numbers, and hyphens';
				}
			},
		});

		if (p.isCancel(slug)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		// Scan for existing tags
		const spinner = p.spinner();
		spinner.start('Scanning existing tags...');
		const existingTags = scanExistingTags(contentDir);
		spinner.stop('Found ' + existingTags.length + ' existing tags');

		// Tag selection
		let selectedTags: string[] = [];
		if (existingTags.length > 0) {
			const tagChoice = await p.multiselect({
				message: 'Select tags (space to select, enter to continue):',
				options: existingTags.map((tag) => ({ value: tag, label: tag })),
				required: false,
			});

			if (p.isCancel(tagChoice)) {
				p.cancel('Operation cancelled');
				process.exit(0);
			}

			selectedTags = tagChoice as string[];
		}

		// Option to add custom tags
		const customTags = await p.text({
			message: 'Add additional tags (comma-separated):',
			placeholder: 'web, javascript',
			required: false,
		});

		if (p.isCancel(customTags)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		if (customTags && typeof customTags === 'string' && customTags.trim().length > 0) {
			const additionalTags = customTags
				.split(',')
				.map((tag) => tag.trim().toLowerCase())
				.filter((tag) => tag.length > 0);
			selectedTags = [...selectedTags, ...additionalTags];
		}

		// Remove duplicates
		selectedTags = Array.from(new Set(selectedTags));

		// Create article file
		const fileName = `${year}-${month}-${day}-${slug}.md`;
		const dirPath = join(contentDir, 'article', String(year));
		filePath = join(dirPath, fileName);

		ensureDirectory(dirPath);

		// Build frontmatter
		const tagsYaml = selectedTags.length > 0 ? `[${selectedTags.map((t) => `"${t}"`).join(', ')}]` : '[]';
		frontmatter = `---
title: "${title}"
description: ""
date: "${date}"
tags: ${tagsYaml}
---

`;
	} else {
		// Note flow
		const timestamp = getUnixTimestamp();

		// Scan for existing tags
		const spinner = p.spinner();
		spinner.start('Scanning existing tags...');
		const existingTags = scanExistingTags(contentDir);
		spinner.stop('Found ' + existingTags.length + ' existing tags');

		// Tag selection
		let selectedTags: string[] = [];
		if (existingTags.length > 0) {
			const tagChoice = await p.multiselect({
				message: 'Select tags (space to select, enter to continue):',
				options: existingTags.map((tag) => ({ value: tag, label: tag })),
				required: false,
			});

			if (p.isCancel(tagChoice)) {
				p.cancel('Operation cancelled');
				process.exit(0);
			}

			selectedTags = tagChoice as string[];
		}

		// Option to add custom tags
		const customTags = await p.text({
			message: 'Add additional tags (comma-separated):',
			placeholder: 'thoughts, ideas',
			required: false,
		});

		if (p.isCancel(customTags)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		if (customTags && typeof customTags === 'string' && customTags.trim().length > 0) {
			const additionalTags = customTags
				.split(',')
				.map((tag) => tag.trim().toLowerCase())
				.filter((tag) => tag.length > 0);
			selectedTags = [...selectedTags, ...additionalTags];
		}

		// Remove duplicates
		selectedTags = Array.from(new Set(selectedTags));

		// Create note file
		const fileName = `${timestamp}.md`;
		const dirPath = join(contentDir, 'note', String(year), month, day);
		filePath = join(dirPath, fileName);

		ensureDirectory(dirPath);

		// Build frontmatter
		const tagsYaml = selectedTags.length > 0 ? `[${selectedTags.map((t) => `"${t}"`).join(', ')}]` : '[]';
		frontmatter = `---
date: "${date}"
tags: ${tagsYaml}
---

`;
	}

	// Write file
	writeFileSync(filePath, frontmatter, 'utf-8');

	p.outro(`✅ Created ${contentType} at ${filePath.replace(process.cwd(), '.')}`);

	// Open in VS Code
	try {
		execSync(`code "${filePath}"`, { stdio: 'ignore' });
	} catch (error) {
		console.log('\n💡 Run `code "${filePath}"` to open in VS Code');
	}
}

main().catch(console.error);
