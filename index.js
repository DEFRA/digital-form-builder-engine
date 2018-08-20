const joi = require('joi')
const boom = require('boom')
const hoek = require('hoek')
const pkg = require('./package.json')
const addressService = require('./address-service')
const { makeModel } = require('./components')
const { SummaryViewModel } = require('./models')
const { proceed } = require('./helpers')

module.exports = {
  plugin: {
    name: pkg.name,
    version: pkg.version,
    dependencies: 'vision',
    register: (server, options) => {
      const { data, getState, mergeState, ordnanceSurveyKey } = options

      const model = makeModel(data)

      model.pages.forEach(page => {
        if (page.path === '/TESTXXX') {
          const options = require('../govuk-site/server/routes/custom.js')
          const defaults = {
            path: page.path,
            options: {
              plugins: {
                [pkg.name]: { page }
              }
            }
          }

          // Clone the required route option(s)
          // and apply the default properties.
          const routes = [].concat(hoek.clone(options))
            .map(route => hoek.merge(route, defaults))

          // Register the route(s)
          server.route(routes)
        } else {
          // GET
          server.route({
            method: 'get',
            path: page.path,
            handler: async (request, h) => {
              const state = await getState()
              const formData = page.getFormDataFromState(state)

              return h.view('index', page.getViewModel(formData))
            }
          })

          // POST
          server.route({
            method: 'post',
            path: page.path,
            handler: async (request, h) => {
              const payload = request.payload
              const options = { abortEarly: false }
              const formResult = joi.validate(payload, page.formSchema, options)

              if (formResult.error) {
                return h.view('index', page.getViewModel(payload, formResult))
              } else {
                const newState = page.getStateFromValidForm(formResult.value)
                const stateResult = joi.validate(newState, page.stateSchema, options)

                if (stateResult.error) {
                  return h.view('index', page.getViewModel(payload, stateResult))
                } else {
                  const update = page.section ? {
                    [page.section.name]: stateResult.value
                  } : stateResult.value

                  const state = await mergeState(update)

                  return proceed(request, h, page.getNext(state))
                }
              }
            }
          })
        }
      })

      // SUMMARY
      server.route({
        method: 'get',
        path: '/summary',
        handler: async (request, h) => {
          const state = await getState()
          const viewModel = new SummaryViewModel(model, state)

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
            query: {
              postcode: joi.string().required()
            }
          }
        }
      })
    }
  }
}
