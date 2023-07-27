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
    detailsObserver = new MutationObserver(() => { injectMadgrades(); injectRMP() })
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

  let contentArr = detailsPane.firstElementChild?.firstElementChild?.children
  if(!contentArr ) return
  let courseElem = contentArr[1]
  if(!courseElem) return

  if(!courseElem.textContent) return
  
  let [subjectAbbrev, courseNumber] = courseElem.textContent.split(/ (?=\d)/)
  courseNumber = courseNumber.replace(" sections", "")
  console.log({subjectAbbrev, courseNumber})

  let url = `${process.env.PLASMO_PUBLIC_BACKEND_URL}/madgrades/courses?subjectAbbrev=${encodeURIComponent(subjectAbbrev)}&courseNumber=${encodeURIComponent(courseNumber)}`
  if (lastUrl == url) return

  controller.abort()
  controller = new AbortController()

  lastUrl = url

  madAnchor.textContent = ""

  let injectionArea = detailsPane.firstElementChild.children[1].firstElementChild.firstElementChild.firstElementChild
  injectionArea.after(madAnchor)

  let courseRes: Response
  let timeout = setTimeout(() => {
    controller.abort()
    madAnchor.href = "https://madgrades.com/"
    madAnchor.textContent = "Madgrades: Request Timed Out"
  }, 5000)

  try {
    courseRes = await fetch(url, { signal: controller.signal })
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
  let query = ".one-instructor, .instructor p:nth-child(2) strong"
  let instructorElems = []
  if(sectionsPane) instructorElems.push(...Array.from(
    sectionsPane.querySelectorAll(query)
  ))
  if(detailsPane) instructorElems.push(...Array.from(
    detailsPane.querySelectorAll(query)
  ))
  let instructorNameToElems: {[profName: string]: Element[]} = {}
  for(let instructorElem of instructorElems) {
    if(instructorElem.innerHTML.includes("RMP")) continue
    let profName = instructorElem.textContent.trim()
    if(!instructorNameToElems[profName]) instructorNameToElems[profName] = []
    instructorNameToElems[profName].push(instructorElem)
  }
  for(let [profName, elems] of Object.entries(instructorNameToElems)) {
    let url = `${process.env.PLASMO_PUBLIC_BACKEND_URL}/rmp/profs?profQuery=${encodeURIComponent(profName)}`
    let profRes: Response
    let profData = null
    let errMsg = null
    let timeout = setTimeout(() => {
      controller.abort()
    }, 5000)
  
    try {
      profRes = await fetch(url, { signal: controller.signal })
      if(profRes.status != 200) {
        errMsg = "RMP: Unknown Error Occured"
        if(profRes.status == 404) {
          errMsg = "RMP: Prof Not Found"
        }
      } else {
        profData = await profRes.json()
      }
    } catch(e) {
      errMsg = "RMP: Unknown Error Occured"
    }
    clearTimeout(timeout)
    for(let elem of elems) {
      if(elem.innerHTML.includes("RMP")) continue
      let a = document.createElement("a")
      if(profData) {
        a.href = profData.webUrl
        a.textContent = `RMP avg is ${profData.avgRating}/5 with ${profData.numRatings} ratings`
      } else {
        a.href = `https://www.ratemyprofessors.com/search/professors/18418?q=${encodeURIComponent(profName)}`
        a.textContent = errMsg
      }
      a.style.display = "block"
      a.target = "_blank"
      elem.appendChild(a)
    }
  }
}
