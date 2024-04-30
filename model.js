const joi = require('joi')
const path = require('path')
const schema = require('./schema')
const Page = require('./page')
const Parser = require('expr-eval').Parser

class Model {
  constructor (def, options) {
    const result = schema.validate(def, { abortEarly: false })

    if (result.error) {
      throw result.error
    }

    // Make a clone of the shallow copy returned
    // by joi so as not to change the source data.
    def = JSON.parse(JSON.stringify(result.value))

    // Add default lists
    def.lists.push({
      name: '__yesNo',
      title: 'Yes/No',
      type: 'boolean',
      items: [
        {
          text: 'Yes',
          value: true
        },
        {
          text: 'No',
          value: false
        }
      ]
    })

    this.def = def
    this.lists = def.lists
    this.sections = def.sections
    this.options = options

    const { getState, mergeState } = options
    this.getState = getState
    this.mergeState = mergeState

    if (options.defaultPageController) {
      const defaultPageControllerPath = path.resolve(options.relativeTo, options.defaultPageController)
      this.DefaultPageController = require(defaultPageControllerPath)
    }

    this.conditions = {}
    def.conditions.forEach(conditionDef => {
      const condition = this.makeCondition(conditionDef)
      this.conditions[condition.name] = condition
    })

    // this.expressions = {}
    // def.expressions.forEach(expressionDef => {
    //   const expression = this.makeExpression(expressionDef)
    //   this.expressions[expression.name] = expression
    // })

    this.pages = def.pages.map(pageDef => this.makePage(pageDef))
  }

  makeSchema (state) {
    // Build the entire model schema
    // from the individual pages/sections
    let schema = joi.object().required()
    ;[undefined].concat(this.sections).forEach(section => {
      const sectionPages = this.pages.filter(page => page.section === section)

      if (section) {
        let sectionSchema = joi.object().required()

        sectionPages.forEach(sectionPage => {
          sectionSchema = sectionSchema.concat(sectionPage.stateSchema)
        })

        schema = schema.append({
          [section.name]: sectionSchema
        })
      } else {
        sectionPages.forEach(sectionPage => {
          schema = schema.concat(sectionPage.stateSchema)
        })
      }
    })

    return schema
  }

  makePage (pageDef) {
    if (pageDef.controller) {
      const pageControllerPath = path.resolve(this.options.relativeTo, pageDef.controller)
      const PageController = require(pageControllerPath)
      return new PageController(this, pageDef)
    } else if (this.DefaultPageController) {
      const DefaultPageController = this.DefaultPageController
      return new DefaultPageController(this, pageDef)
    } else {
      return new Page(this, pageDef)
    }
  }

  makeCondition (condition) {
    const parser = new Parser()
    const { name, value } = condition
    const expr = parser.parse(value)

    const fn = (value) => {
      const ctx = new EvaluationContext(this.conditions, value)
      try {
        const isValid = expr.evaluate(ctx)
        return isValid
      } catch (err) {
        return false
      }
    }

    return {
      name,
      value,
      expr,
      fn
    }
  }

  get conditionOptions () { return { allowUnknown: true, presence: 'required' } }
}

class EvaluationContext {
  constructor (conditions, value) {
    Object.assign(this, value)

    for (let key in conditions) {
      Object.defineProperty(this, key, {
        get () {
          return conditions[key].fn(value)
        }
      })
    }
  }
}

module.exports = Model
