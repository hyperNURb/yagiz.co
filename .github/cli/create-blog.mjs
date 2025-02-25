import fs from 'node:fs'
import path from 'node:path'
import { cancel, group, outro, select, spinner, text } from '@clack/prompts'

/**
 * Converts a date into `YYYY-MM-DD` format.
 * @param {Date} date
 * @return {string}
 */
function format(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

const contentFolder = path.resolve('./src/content')
const allTags = fs
  .readdirSync(path.join(contentFolder, 'tags'))
  .map((f) => path.basename(f, path.extname(f)))

/**
 * Returns a template for the blog post.
 * @param {{ title: string; description: string; tag: string; status: string; }} param0
 * @return {string}
 */
const getTemplateFor = ({ title, description, tag, status }) =>
  `
---
title: '${title}'
description: >-
  ${description}
type: Blog
date: '${format(new Date())}'
tag: ${tag}
status: ${status}
---
`.trimStart()

export async function createBlog() {
  const { title, slug, description, tag, status } = await group(
    {
      title: () =>
        text({
          message: 'What is the title of your post?',
          hint: 'Recommended length less than 60 characters.',
          validate(value) {
            if (value.length === 0) {
              return 'Value is required'
            }
          },
        }),
      slug: () =>
        text({
          message: 'Which slug do you want to use?',
          required: true,
          validate(value) {
            if (value.length === 0) {
              return 'Value is required'
            }

            if (fs.existsSync(path.join(contentFolder, `blog/${value}.mdx`))) {
              return 'Slug is already used'
            }

            // only allow letters, numbers and hypens
            const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/g
            if (re.exec(value) === null) {
              return 'Slug should be all lowercase and contain only letters, numbers, and hyphens'
            }
          },
        }),
      description: () =>
        text({
          message: 'What do you want as a description?',
          defaultValue: '',
          required: false,
        }),
      tag: () =>
        select({
          message: 'Select a tag',
          required: true,
          options: allTags.map((tag) => ({
            value: tag,
            label: tag,
          })),
        }),
      status: () =>
        select({
          message: 'Select a status',
          required: true,
          options: [
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
          ],
        }),
    },
    {
      onCancel() {
        cancel('Operation cancelled')
        process.exit(0)
      },
    },
  )

  const template = getTemplateFor({
    title,
    description,
    tag,
    status,
  })
  const creating = spinner()
  creating.start('Creating the document')
  const documentPath = path.join(contentFolder, `blog/${slug}.mdx`)
  fs.writeFileSync(documentPath, template.trim(), 'utf-8')
  creating.stop()

  outro(`Blog post is created at ${documentPath}`)
}
