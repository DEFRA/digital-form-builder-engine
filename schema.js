const joi = require('joi')

const componentSchema = joi.object().keys({
  type: joi.string().required(),
  name: joi.string(),
  title: joi.string(),
  hint: joi.string(),
  options: joi.object().default({}),
  schema: joi.object().default({}),
  content: joi.string()
})

const pageSchema = joi.object().keys({
  path: joi.string().required(),
  title: joi.string(),
  condition: joi.string(),
  section: joi.string(),
  controller: joi.string(),
  group: joi.string(),
  components: joi.array().required().items(componentSchema),
  next: joi.array().items(joi.object().keys({
    path: joi.string().required(),
    if: joi.string()
  }))
})

const pagesSchema = joi.array().required().items(pageSchema).unique('path')

const sectionsSchema = joi.array().required().items(joi.object().keys({
  name: joi.string().required(),
  title: joi.string().required()
})).unique('name')

const groupsSchema = joi.array().required().items(joi.object().keys({
  name: joi.string().required(),
  title: joi.string().required(),
  colour: joi.string().required(),
  condition: joi.string()
})).unique('name')

const conditionsSchema = joi.array().required().items(joi.object().keys({
  name: joi.string().required(),
  value: joi.string().required()
})).unique('name')

const baseListItemSchema = joi.object().keys({
  text: joi.string().allow(''),
  description: joi.string().allow('')
})

const stringListItemSchema = baseListItemSchema.append({
  value: joi.string().required()
})

const numberListItemSchema = baseListItemSchema.append({
  value: joi.number().required()
})

const listSchema = joi.object().keys({
  name: joi.string().required(),
  title: joi.string().allow(''),
  type: joi.string().required().valid('string', 'number'),
  items: joi.when('type', {
    is: 'string',
    then: joi.array()
      .items(stringListItemSchema)
      .unique('text')
      .unique('value'),
    otherwise: joi.array()
      .items(numberListItemSchema)
      .unique('text')
      .unique('value')
  })
})

const listsSchema = joi.array().required().items(listSchema).unique('name')

const schema = joi.object().required().keys({
  pages: pagesSchema,
  sections: sectionsSchema,
  groups: groupsSchema,
  conditions: conditionsSchema,
  lists: listsSchema
})

module.exports = schema
