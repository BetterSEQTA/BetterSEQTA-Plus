export function CreateBackground() {
  var bkCheck = document.getElementsByClassName("bg")
  if (bkCheck.length !== 0) {
    return
  }
  // Creating and inserting 3 divs containing the background applied to the pages
  var bklocation = document.getElementById("container")
  var menu = document.getElementById("menu")
  var bk = document.createElement("div")
  bk.classList.add("bg")

  bklocation!.insertBefore(bk, menu)

  var bk2 = document.createElement("div")
  bk2.classList.add("bg")
  bk2.classList.add("bg2")
  bklocation!.insertBefore(bk2, menu)

  var bk3 = document.createElement("div")
  bk3.classList.add("bg")
  bk3.classList.add("bg3")
  bklocation!.insertBefore(bk3, menu)
}