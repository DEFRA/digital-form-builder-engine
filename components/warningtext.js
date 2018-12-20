const { Component } = require('.')

class WarningText extends Component {
  getViewModel () {
    return {
      text: this.content,
      iconFallbackText: this.icon
    }
  }
}

module.exports = WarningText
