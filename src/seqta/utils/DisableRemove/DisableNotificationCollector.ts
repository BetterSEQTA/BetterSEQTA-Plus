export function disableNotificationCollector() {
  var alertdiv = document.getElementsByClassName(
    "notifications__bubble___1EkSQ",
  )[0]
  if (typeof alertdiv != "undefined") {
    var currentNumber = parseInt(alertdiv.textContent!)
    if (currentNumber < 9) {
      alertdiv.textContent = currentNumber.toString()
    } else {
      alertdiv.textContent = "9+"
    }
  }
}