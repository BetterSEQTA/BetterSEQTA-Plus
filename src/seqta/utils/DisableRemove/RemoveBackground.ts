export function RemoveBackground() {
  var bk = document.getElementsByClassName("bg")
  var bk2 = document.getElementsByClassName("bg2")
  var bk3 = document.getElementsByClassName("bg3")

  if (bk.length == 0 || bk2.length == 0 || bk3.length == 0) return
  bk[0].remove()
  bk2[0].remove()
  bk3[0].remove()
}