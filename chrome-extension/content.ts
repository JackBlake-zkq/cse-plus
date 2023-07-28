import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
	matches: ["https://enroll.wisc.edu/*"]
}

const observer = new MutationObserver((records) => {
  if(!records.some(record => Array.from(record.addedNodes).some(node => (
      node instanceof HTMLAnchorElement && node.classList.contains("cse-plus-inserted")
    ))
  )) {
    injectMadgrades();
    injectRMP();
  }
});
observer.observe(document.body, { subtree: true, childList: true })

const madAnchor = document.createElement("a")
madAnchor.id = "mad"
madAnchor.target = "_blank"
madAnchor.classList.add("cse-plus-inserted")

let controller = new AbortController()
let lastUrl = null

async function injectMadgrades() {
  let detailsPane = document.getElementById("details")
  if(!detailsPane) return

  let contentArr = detailsPane.firstElementChild?.firstElementChild?.children
  if(!contentArr ) return

  let courseElem = contentArr[1]
  if(!courseElem) return

  if(!courseElem.textContent) return

  let course = courseElem.textContent.match(/([A-Z] ?)+ \d{1,3}/)[0]

  let [ subjectAbbrev, courseNumber ] = course.split(/ (?=\d)/)

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

function injectRMP() {
  let instructorElems = document.querySelectorAll(".one-instructor, .instructor p:nth-child(2) strong:not(:has(a))")
  let instructorNameToElems: {[profName: string]: Element[]} = {}
  for(let instructorElem of instructorElems) {
    if(instructorElem.innerHTML.includes("RMP")) continue
    let profName = instructorElem.textContent.trim()
    if(!instructorNameToElems[profName]) instructorNameToElems[profName] = []
    instructorNameToElems[profName].push(instructorElem)
  }
  for(let [profName, elems] of Object.entries(instructorNameToElems)) {
    let url = `${process.env.PLASMO_PUBLIC_BACKEND_URL}/rmp/profs?profQuery=${encodeURIComponent(profName)}`
    let profData = null
    let errMsg = null
  
    fetchWithTimeout(url, 5000)
    .then(async res => {
      if(res.status != 200) {
        errMsg = "RMP: Unknown Error Occured"
        if(res.status == 404) {
          errMsg = "RMP: Prof Not Found at UW"
        }
      } else {
        try {
          profData = await res.json()
        } catch(e) {}
      }
    })
    .catch(err => {
      errMsg = "RMP: Unknown Error Occured"
    })
    .finally(() => {
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
        a.classList.add("cse-plus-inserted")
        elem.appendChild(a)
      }
    })  
  }
}

async function fetchWithTimeout(url: string, timeout: number) {
  let controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return fetch(url).finally(() => clearTimeout(timeout))
}