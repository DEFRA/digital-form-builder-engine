const joi = require('joi')
const path = require('path')
const schema = require('./schema')
const Page = require('./page')
const parseJSON = require('jsonic')
const parseExpr = require('logic-query-parser')
const Parser = require('expr-eval').Parser

function walk (obj, callback) {
  callback(obj)
  if (obj.type === 'or') {
    return obj.values.map(o => {
      return walk(o, callback)
    })
  } else if (obj.type === 'and') {
    return obj.values.map(o => {
      return walk(o, callback)
    })
  }
}

class Model {
  constructor (def, options) {
    const result = joi.validate(def, schema, { abortEarly: false })

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

  // makeCondition (condition) {
  //   const obj = parseJSON(condition.value)
  //   const schema = Array.isArray(obj)
  //     ? joi.alternatives(obj)
  //     : joi.object(obj)

  //   const fn = (value) => {
  //     const conditionOptions = this.conditionOptions
  //     const isValid = !joi.validate(value, schema, conditionOptions).error
  //     return isValid
  //   }

  //   return {
  //     name: condition.name,
  //     value: condition.value,
  //     obj,
  //     schema,
  //     fn: fn
  //   }
  // }

  makeCondition (condition) {
    const parser = new Parser()
    const expr = parser.parse(condition.value)
    // console.log(expr.evaluate({ x: { fn: () => 2, aa: {s:9} } })); // 7

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
      name: condition.name,
      value: condition.value,
      expr,
      schema,
      fn: fn
    }
  }

  makeExpression (expression) {
    const tree = parseExpr.parse(expression.value)
    const query = parseExpr.utils.binaryTreeToQueryJson(tree)

    // Resolve conditions and build expressions
    walk(query, (v) => {
      if (v.type === 'string') {
        if (v.value === '!') {
          console.log(v)
        } else {
          let not = false
          let name = v.value
          if (v.value.startsWith('!')) {
            not = true
            name = v.value.slice(1)
          }

          const fn = (this.conditions[name] || this.expressions[name]).fn

          v.fn = not ? (state) => !fn(state) : fn
        }
      } else if (query.type === 'or') {
        v.fn = (value) => {
          return query.values.some(item => item.fn(value))
        }
      } else if (query.type === 'and') {
        v.fn = (value) => {
          return query.values.every(item => item.fn(value))
        }
      } else {
        throw new Error(`Invalid type ${query.type}`)
      }
    })

    const fn = query.fn
    return {
      name: expression.name,
      value: expression.value,
      tree,
      query,
      fn: fn
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
