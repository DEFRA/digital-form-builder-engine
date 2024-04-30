const joi = require('joi')
const boom = require('@hapi/boom')
const pkg = require('./package.json')
const addressService = require('./address-service')
const Model = require('./model')
// const { SummaryViewModel } = require('./models')
const { proceed } = require('./helpers')

module.exports = {
  plugin: {
    name: pkg.name,
    version: pkg.version,
    dependencies: '@hapi/vision',
    register: (server, options) => {
      const { getState, mergeState, ordnanceSurveyKey, playgroundModel, relativeTo } = options

      const getModel = (request) => {
        return new Model(request.yar.get('model') || playgroundModel, { getState, mergeState, relativeTo })
      }

      async function get (request, page, h) {
        const state = await getState(request)
        const formData = page.getFormDataFromState(state)
        return h.view('index', page.getViewModel(formData))
      }

      async function post (request, page, h) {
        const payload = request.payload
        const options = { abortEarly: false }
        const schema = page.formSchema
        const formResult = schema.validate(payload, options)

        if (formResult.error) {
          const errors = page.getErrors(formResult)
          return h.view('index', page.getViewModel(payload, errors))
        } else {
          const newState = page.getStateFromValidForm(formResult.value)
          const schema = page.stateSchema
          const stateResult = schema.validate(newState, options)

          if (stateResult.error) {
            const errors = page.getErrors(stateResult)
            return h.view('index', page.getViewModel(payload, errors))
          } else {
            const update = page.section ? {
              [page.section.name]: stateResult.value
            } : stateResult.value

            const state = await mergeState(request, update)

            return proceed(request, h, page.getNext(state))
          }
        }
      }

      const findPage = (model, request) => {
        return model.pages.find(page => {
          return page.path === '/' + (request.params.path || '')
        })
      }

      // GET PLAYGROUND
      server.route({
        method: 'get',
        path: '/{path*}',
        handler: async (request, h) => {
          const model = getModel(request)
          const page = findPage(model, request)

          if (!page) {
            return boom.notFound(page.path)
          }

          return get(request, page, h)
        }
      })

      // POST PLAYGROUND
      server.route({
        method: 'post',
        path: '/{path*}',
        handler: async (request, h) => {
          const model = getModel(request)
          const page = findPage(model, request)

          if (!page) {
            return boom.notFound(page.path)
          }

          return post(request, page, h)
        }
      })

      // SUMMARY
      server.route({
        method: 'get',
        path: '/summary',
        handler: async (request, h) => {
          const state = await getState(request)
          const viewModel = new SummaryViewModel(getModel(request), state)

          return h.view('summary', viewModel)
        }
      })

      // FIND ADDRESS
      server.route({
        method: 'get',
        path: '/find-address',
        handler: async (request, h) => {
          try {
            const results = await addressService(ordnanceSurveyKey, request.query.postcode)

            return results
          } catch (err) {
            return boom.badImplementation('Failed to find addresses', err)
          }
        },
        options: {
          validate: {
            query: joi.object().keys({
              postcode: joi.string().required()
            })
          }
        }
      })
    }
  }
}
