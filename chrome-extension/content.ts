import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
	matches: ["https://enroll.wisc.edu/*"]
}

let detailsPane: HTMLElement
let sectionsPane: HTMLElement
let detailsObserver: MutationObserver
let sectionsObserver: MutationObserver


const observer = new MutationObserver(() => {
  detailsPane = document.getElementById("details")
  if(detailsPane && !detailsObserver) {
    detailsObserver = new MutationObserver(injectMadgrades)
    detailsObserver.observe(detailsPane, {subtree: true, childList: true })
  }
  sectionsPane = document.getElementById("sections")
  if(sectionsPane && !sectionsObserver) {
    sectionsObserver = new MutationObserver(injectRMP)
    sectionsObserver.observe(sectionsPane, {subtree: true, childList: true })
  }
  if(detailsPane && sectionsPane) observer.disconnect();
});
observer.observe(document.body, {subtree: true, childList: true })

let lastUrl = null

const madAnchor = document.createElement("a")
madAnchor.id = "mad"
madAnchor.target = "_blank"

let controller = new AbortController()

async function injectMadgrades() {
  if(!detailsPane) return;

  let [subjectAbbrev, courseNumber] = detailsPane.firstElementChild.firstElementChild.children[1].textContent.split(/ (?=\d)/)

  let madUrl = `${process.env.PLASMO_PUBLIC_BACKEND_URL}/madgrades/courses?subjectAbbrev=${encodeURIComponent(subjectAbbrev)}&courseNumber=${encodeURIComponent(courseNumber)}`
  if (lastUrl == madUrl) return

  controller.abort()
  controller = new AbortController()

  lastUrl = madUrl

  madAnchor.textContent = ""

  let injectionArea = detailsPane.firstElementChild.children[1].firstElementChild.firstElementChild.firstElementChild
  injectionArea.after(madAnchor)

  let courseRes
  let timeout = setTimeout(() => {
    controller.abort()
    madAnchor.href = "https://madgrades.com/"
    madAnchor.textContent = "Madgrades: Request Timed Out"
  }, 3000)

  try {
    courseRes = await fetch(madUrl, { signal: controller.signal })
  } catch(e) {
    clearTimeout(timeout)
    return
  }
  clearTimeout(timeout)
  if(courseRes.status != 200) {
    madAnchor.href = "https://madgrades.com/"
    madAnchor.textContent = "Madgrades: Unknown Error Occured"
    if(courseRes.status == 404) {
      madAnchor.textContent = "Madgrades: Course Not Found"
    }
    return
  }

  let courseData = await courseRes.json()
  let { webUrl, cumulative, confident } = courseData
  madAnchor.href = webUrl
  let { aCount, abCount, bCount, bcCount, cCount, dCount, fCount, total } = cumulative
  let totalGraded = aCount + abCount + bCount + bcCount + cCount + dCount + fCount
  madAnchor.textContent = `Madgrades:${confident ? "" : " *maybe* "} ${totalGraded == 0 ? "no grades yet, may be pass/fail" : Math.round((aCount / total) * 100) + "% get an A"}`
}

async function injectRMP() {
  let instructorElems = Array.from(sectionsPane.querySelectorAll(".one-instructor, .instructor p:nth-child(2) strong"))
  let instructorNameToElems: {[profName: string]: Element[]} = {}
  for(let instructorElem of instructorElems) {
    if(instructorElem.innerHTML.includes("RMP")) continue
    let profName = instructorElem.textContent.trim()
    if(!instructorNameToElems[profName]) instructorNameToElems[profName] = []
    instructorNameToElems[profName].push(instructorElem)
  }
  for(let [profName, elems] of Object.entries(instructorNameToElems)) {
    let url = `${process.env.PLASMO_PUBLIC_BACKEND_URL}/rmp/profs?profQuery=${encodeURIComponent(profName)}`
    let profRes = await fetch(url)
    let profData = await profRes.json()
    let { avgRating, webUrl } = profData
    for(let elem of elems) {
      if(elem.innerHTML.includes("RMP")) continue
      let a = document.createElement("a")
      a.href = webUrl
      a.textContent = `RMP ${avgRating}/5`
      a.style.display = "block"
      a.target = "_blank"
      elem.appendChild(a)
    }
  }
}
