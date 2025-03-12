export function enableNotificationCollector() {
  var xhr3 = new XMLHttpRequest()
  xhr3.open("POST", `${location.origin}/seqta/student/heartbeat?`, true)
  xhr3.setRequestHeader("Content-Type", "application/json; charset=utf-8")
  xhr3.onreadystatechange = function () {
    if (xhr3.readyState === 4) {
      var Notifications = JSON.parse(xhr3.response)
      var alertdiv = document.getElementsByClassName(
        "notifications__bubble___1EkSQ",
      )[0]
      if (typeof alertdiv == "undefined") {
        console.info("[BetterSEQTA+] No notifications currently")
      } else {
        alertdiv.textContent = Notifications.payload.notifications.length
      }
    }
  }
  xhr3.send(
    JSON.stringify({
      timestamp: "1970-01-01 00:00:00.0",
      hash: "#?page=/home",
    }),
  )
}