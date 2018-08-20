/* global $ */

$(function () {
  var $components = $('.uk-address-component')
  var $forms = $components.parents('form')

  $components.each(function (index, component) {
    if ($(component).find('.uk-address-manual .govuk-form-group--error').length === 0) {
      showLookup($(component))
    } else {
      showManual($(component))
    }
  })

  $forms.on('click', 'button.postcode-lookup', function (e) {
    e.preventDefault()
    var $btn = $(this)
    var $postcode = $btn.prev()
    var $component = $btn.closest('.uk-address-component')
    var $select = $('.uk-address-selector select', $component)
    var postcodeQuery = $postcode.val().trim().toUpperCase()

    if (!postcodeQuery) {
      return showManual($component)
    }

    $.getJSON('/find-address?postcode=' + postcodeQuery, function (results) {
      var label = `${results.length} Address${results.length > 1 ? 'es' : ''} found`
      $select.html(`<option>${label}</option>` + results.map(result => (
        `<option value="${result.uprn}">${result.address}</option>`
      )).join(''))
      $('.postcode-query-display', $component).text(postcodeQuery)
      $component.closest('form').find('button[type=submit]').show()
      $component.find('.uk-address-query').hide()
      $component.find('.uk-address-selector').show()
      $select.data('results', results)
    })
  })

  $forms.on('change', '.uk-address-selector select', function () {
    var $select = $(this)
    var results = $select.data('results')
    var value = $select.val()
    var result = results.find(result => result.uprn === value).item
    console.log(result)
    var $form = $select.closest('form')
    $form.find('[name$="premises"]').val(result.BUILDING_NUMBER || result.BUILDING_NAME)
    $form.find('[name$="street"]').val(result.THOROUGHFARE_NAME)
    $form.find('[name$="locality"]').val(result.DEPENDENT_LOCALITY)
    $form.find('[name$="town"]').val(result.POST_TOWN)
    $form.find('[name$="postcode"]').val(result.POSTCODE)
  })

  $forms.on('click', '.postcode-query-link', function (e) {
    e.preventDefault()
    var $component = $(this).closest('.uk-address-component')
    showLookup($component)
    $component.find('.uk-address-query').show()
    $component.find('.uk-address-selector').hide()
  })

  $forms.on('click', '.postcode-manual-link', function (e) {
    e.preventDefault()
    var $component = $(this).closest('.uk-address-component')
    showManual($component)
  })

  function showManual ($component) {
    $component.find('.uk-address-lookup').hide()
    $component.find('.uk-address-manual').show()
    $component.parents('form').find('button[type=submit]').show()
  }

  function showLookup ($component) {
    $component.find('.uk-address-lookup').show()
    $component.find('.uk-address-manual').hide()
    $component.parents('form').find('button[type=submit]').hide()
  }
})
